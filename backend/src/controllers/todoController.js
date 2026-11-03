const mongoose = require("mongoose");
const Todo = require("../models/Todo");
const Group = require("../models/Group");
const User = require("../models/user");
const { containsInappropriateLanguage } = require("../utils/languageFilter");
const { isStaff } = require("../utils/admin");

const TODO_POPULATE = [
  { path: "tags" },
  { path: "userId", select: "name email" },
  { path: "assignedTo", select: "name email" },
  { path: "groupId", select: "name createdBy" },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const ALLOWED_UPDATE_FIELDS = [
  "title",
  "description",
  "project",
  "tags",
  "completed",
  "priority",
  "groupId",
  "assignedTo",
  "dueDate",
  "repeatEvery",
  "repeatUnit",
  "showBeforeValue",
  "showBeforeUnit",
];

const REPEAT_UNITS = ["none", "hours", "days", "weeks", "months"];
const SHOW_BEFORE_UNITS = ["hours", "days"];

function idString(value) {
  if (!value) return "";
  if (value._id) return String(value._id);
  return String(value);
}

function todoOwnerId(todo) {
  return idString(todo && todo.userId);
}

function isOwner(user, todo) {
  return todoOwnerId(todo) === String(user._id);
}

function isAssignee(user, todo) {
  return (todo.assignedTo || []).some((assignee) => idString(assignee) === String(user._id));
}

function isGroupMember(user, todo) {
  if (!todo.groupId) return false;
  const groupId = idString(todo.groupId);
  return (user.groups || []).some((group) => String(group) === groupId);
}

function canWorkOnTask(user, todo) {
  return isStaff(user) || isOwner(user, todo) || isAssignee(user, todo) || isGroupMember(user, todo);
}

function scopedTodoFilter(user) {
  if (isStaff(user)) {
    return {};
  }
  return {
    $or: [
      { userId: user._id },
      { assignedTo: user._id },
      { groupId: { $in: user.groups || [] } },
    ],
  };
}

function notDeletedFilter() {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function activeTodoFilter(user) {
  const scope = scopedTodoFilter(user);
  if (!scope || Object.keys(scope).length === 0) {
    return notDeletedFilter();
  }
  return { $and: [scope, notDeletedFilter()] };
}

function parseNonNegativeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return number;
}

function parseRepeatEvery(value) {
  return Math.floor(parseNonNegativeNumber(value, 0));
}

function parseRepeatUnit(value) {
  const unit = String(value || "none").toLowerCase();
  return REPEAT_UNITS.includes(unit) ? unit : "none";
}

function parseShowBeforeValue(value) {
  return parseNonNegativeNumber(value, 0);
}

function parseShowBeforeUnit(value) {
  const unit = String(value || "days").toLowerCase();
  return SHOW_BEFORE_UNITS.includes(unit) ? unit : "days";
}

function parseDueDate(value) {
  if (value === "" || value === null || value === undefined) return { dueDate: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: { status: 400, message: "Invalid due date" } };
  }
  return { dueDate: date };
}

function showBeforeMs(todo) {
  const value = parseShowBeforeValue(todo && todo.showBeforeValue);
  const unitMs = (todo && todo.showBeforeUnit) === "hours" ? 3600000 : 86400000;
  return value * unitMs;
}

function isVisibleNow(todo, now = new Date()) {
  if (!todo || !todo.dueDate) return true;
  const due = new Date(todo.dueDate).getTime();
  if (Number.isNaN(due)) return true;
  return now.getTime() >= due - showBeforeMs(todo);
}

function visibleNowFilter(now = new Date()) {
  return {
    $or: [
      { dueDate: null },
      { dueDate: { $exists: false } },
      {
        $expr: {
          $lte: [
            {
              $subtract: [
                "$dueDate",
                {
                  $multiply: [
                    { $ifNull: ["$showBeforeValue", 0] },
                    { $cond: [{ $eq: ["$showBeforeUnit", "hours"] }, 3600000, 86400000] },
                  ],
                },
              ],
            },
            now,
          ],
        },
      },
    ],
  };
}

function listTodoFilter(user) {
  const active = activeTodoFilter(user);
  if (isStaff(user)) return active;
  return { $and: [active, visibleNowFilter()] };
}

function addRepeat(fromDate, every, unit) {
  const date = new Date(fromDate);
  const amount = Math.max(1, parseRepeatEvery(every) || 1);
  if (unit === "hours") date.setTime(date.getTime() + amount * 3600000);
  else if (unit === "days") date.setDate(date.getDate() + amount);
  else if (unit === "weeks") date.setDate(date.getDate() + amount * 7);
  else if (unit === "months") date.setMonth(date.getMonth() + amount);
  return date;
}

function withUpcomingFlag(todos) {
  return todos.map((todo) => {
    const json = typeof todo.toObject === "function" ? todo.toObject() : { ...todo };
    json.upcoming = !isVisibleNow(json);
    return json;
  });
}

function readSchedule(body) {
  const schedule = {
    dueDate: undefined,
    repeatEvery: undefined,
    repeatUnit: undefined,
    showBeforeValue: undefined,
    showBeforeUnit: undefined,
  };
  if (Object.prototype.hasOwnProperty.call(body || {}, "dueDate")) {
    const parsed = parseDueDate(body.dueDate);
    if (parsed.error) return parsed;
    schedule.dueDate = parsed.dueDate;
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "repeatEvery")) {
    schedule.repeatEvery = parseRepeatEvery(body.repeatEvery);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "repeatUnit")) {
    schedule.repeatUnit = parseRepeatUnit(body.repeatUnit);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "showBeforeValue")) {
    schedule.showBeforeValue = parseShowBeforeValue(body.showBeforeValue);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "showBeforeUnit")) {
    schedule.showBeforeUnit = parseShowBeforeUnit(body.showBeforeUnit);
  }
  return schedule;
}

async function trashTodoFilter(user) {
  const deleted = { deletedAt: { $ne: null } };
  if (isStaff(user)) {
    return deleted;
  }
  const createdGroups = await Group.find({ createdBy: user._id }).select("_id");
  const groupIds = createdGroups.map((group) => group._id);
  if (!groupIds.length) {
    return { _id: { $in: [] } };
  }
  return { ...deleted, groupId: { $in: groupIds } };
}

async function canRestoreTask(user, todo) {
  if (isStaff(user)) return true;
  if (!todo.groupId) return false;
  const group = await Group.findById(idString(todo.groupId)).select("createdBy");
  if (!group || !group.createdBy) return false;
  return String(group.createdBy) === String(user._id);
}

async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  try {
    const result = await Todo.deleteMany({
      deletedAt: { $ne: null, $lt: cutoff },
    });
    return result.deletedCount || 0;
  } catch (error) {
    console.error("Error purging expired trash:", error);
    return 0;
  }
}

function collectIds(values) {
  const ids = [];
  for (const value of values || []) {
    const id = idString(value);
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      ids.push(id);
    }
  }
  return [...new Set(ids)];
}

async function allowedAssigneeIdSet(user) {
  if (isStaff(user)) {
    const users = await User.find().select("_id");
    return new Set(users.map((item) => String(item._id)));
  }
  const groups = await Group.find({
    $or: [{ members: user._id }, { _id: { $in: user.groups || [] } }],
  }).select("members");
  const ids = new Set([String(user._id)]);
  for (const group of groups) {
    for (const member of group.members || []) {
      ids.add(String(member));
    }
  }
  return ids;
}

async function resolveAssignedTo(user, requested, creatorId) {
  const allowed = await allowedAssigneeIdSet(user);
  const resolved = collectIds(requested).filter((id) => allowed.has(id));
  const creator = idString(creatorId);
  if (creator && !resolved.includes(creator)) {
    resolved.unshift(creator);
  }
  if (!resolved.length && creator) {
    resolved.push(creator);
  }
  return resolved;
}

async function resolveGroupId(user, groupId) {
  if (groupId === "" || groupId === null || groupId === undefined) {
    return { groupId: null };
  }
  const group = await Group.findById(groupId);
  if (!group) {
    return { error: { status: 400, message: "Group not found" } };
  }
  const isMember = group.members.some((member) => String(member) === String(user._id));
  if (!isMember && !isStaff(user)) {
    return { error: { status: 403, message: "Not a member of this group" } };
  }
  return { groupId: group._id };
}

const createTodo = async (req, res) => {
  const { title, description, tags, project, groupId, assignedTo } = req.body;

  try {
    if (!tags || tags.length === 0) {
      return res.status(400).send({ message: "At least one tag is required" });
    }

    if (containsInappropriateLanguage(title, description, project)) {
      return res.status(400).send({ message: "Task contains inappropriate language" });
    }

    const schedule = readSchedule(req.body);
    if (schedule.error) {
      return res.status(schedule.error.status).send({ message: schedule.error.message });
    }

    let resolvedGroupId;
    if (groupId) {
      const resolved = await resolveGroupId(req.user, groupId);
      if (resolved.error) {
        return res.status(resolved.error.status).send({ message: resolved.error.message });
      }
      resolvedGroupId = resolved.groupId;
    }

    const assignees = await resolveAssignedTo(req.user, assignedTo, req.user._id);

    const addTodo = await Todo.create({
      title,
      description,
      tags,
      project: project || "",
      userId: req.user._id,
      assignedTo: assignees,
      groupId: resolvedGroupId,
      deletedAt: null,
      dueDate: schedule.dueDate === undefined ? null : schedule.dueDate,
      repeatEvery: schedule.repeatEvery === undefined ? 0 : schedule.repeatEvery,
      repeatUnit: schedule.repeatUnit === undefined ? "none" : schedule.repeatUnit,
      showBeforeValue: schedule.showBeforeValue === undefined ? 0 : schedule.showBeforeValue,
      showBeforeUnit: schedule.showBeforeUnit === undefined ? "days" : schedule.showBeforeUnit,
    });
    const populated = await Todo.findById(addTodo._id).populate(TODO_POPULATE);
    res.status(201).send(withUpcomingFlag([populated])[0]);
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).send({ message: "Todo not found" });
    }

    if (todo.deletedAt) {
      if (!isStaff(req.user)) {
        return res.status(403).send({ message: "Not allowed to permanently delete this task" });
      }
      await Todo.findByIdAndDelete(id);
      return res.status(200).send({ message: "Todo permanently deleted" });
    }

    if (!canWorkOnTask(req.user, todo)) {
      return res.status(403).send({ message: "Not allowed to delete this task" });
    }

    todo.deletedAt = new Date();
    await todo.save();
    res.status(200).send({ message: "Todo moved to trash" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
};

const getTodos = async (req, res) => {
  try {
    await purgeExpiredTrash();
    const trash = String(req.query.trash || "") === "1" || String(req.query.trash || "").toLowerCase() === "true";
    const filter = trash ? await trashTodoFilter(req.user) : listTodoFilter(req.user);
    const todos = await Todo.find(filter).populate(TODO_POPULATE);
    res.status(200).send(withUpcomingFlag(todos));
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const restoreTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).send({ message: "Todo not found" });
    }
    if (!todo.deletedAt) {
      return res.status(400).send({ message: "Task is not in trash" });
    }
    if (!(await canRestoreTask(req.user, todo))) {
      return res.status(403).send({ message: "Not allowed to restore this task" });
    }

    todo.deletedAt = null;
    await todo.save();
    const populated = await Todo.findById(todo._id).populate(TODO_POPULATE);
    res.status(200).send(populated);
  } catch (error) {
    console.error("Error restoring todo:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).send({ message: "Todo not found" });
    }

    if (todo.deletedAt) {
      return res.status(400).send({ message: "Restore this task before editing" });
    }

    if (!canWorkOnTask(req.user, todo)) {
      return res.status(403).send({ message: "Not allowed to update this task" });
    }

    const updates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        updates[field] = req.body[field];
      }
    }

    if (updates.tags && updates.tags.length === 0) {
      return res.status(400).send({ message: "At least one tag is required" });
    }

    if (containsInappropriateLanguage(updates.title, updates.description, updates.project)) {
      return res.status(400).send({ message: "Task contains inappropriate language" });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "assignedTo")) {
      updates.assignedTo = await resolveAssignedTo(
        req.user,
        updates.assignedTo,
        todoOwnerId(todo) || req.user._id
      );
    }

    if (Object.prototype.hasOwnProperty.call(updates, "groupId")) {
      const resolved = await resolveGroupId(req.user, updates.groupId);
      if (resolved.error) {
        return res.status(resolved.error.status).send({ message: resolved.error.message });
      }
      updates.groupId = resolved.groupId;
    }

    const schedule = readSchedule(updates);
    if (schedule.error) {
      return res.status(schedule.error.status).send({ message: schedule.error.message });
    }
    if (schedule.dueDate !== undefined) updates.dueDate = schedule.dueDate;
    if (schedule.repeatEvery !== undefined) updates.repeatEvery = schedule.repeatEvery;
    if (schedule.repeatUnit !== undefined) updates.repeatUnit = schedule.repeatUnit;
    if (schedule.showBeforeValue !== undefined) updates.showBeforeValue = schedule.showBeforeValue;
    if (schedule.showBeforeUnit !== undefined) updates.showBeforeUnit = schedule.showBeforeUnit;

    const nextRepeatUnit = updates.repeatUnit !== undefined ? updates.repeatUnit : todo.repeatUnit;
    const nextRepeatEvery = updates.repeatEvery !== undefined ? updates.repeatEvery : todo.repeatEvery;
    const markingComplete = updates.completed === true && !todo.completed;
    if (markingComplete && nextRepeatUnit && nextRepeatUnit !== "none" && parseRepeatEvery(nextRepeatEvery) > 0) {
      const currentDue = updates.dueDate !== undefined ? updates.dueDate : todo.dueDate;
      updates.dueDate = addRepeat(currentDue || new Date(), nextRepeatEvery, nextRepeatUnit);
      updates.completed = false;
    }

    const data = await Todo.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate(TODO_POPULATE);

    if (data != null) {
      res.status(200).send(withUpcomingFlag([data])[0]);
    } else {
      res.status(404).send({ message: "Todo not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const getTotalTasks = async (req, res) => {
  try {
    const count = await Todo.countDocuments(listTodoFilter(req.user));
    res.status(200).send({ totalTasks: count });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

module.exports = {
  createTodo,
  getTodos,
  restoreTodo,
  deleteTodo,
  updateTodo,
  getTotalTasks,
  purgeExpiredTrash,
};
