const Todo = require("../models/Todo");
const Group = require("../models/Group");
const { containsInappropriateLanguage } = require("../utils/languageFilter");

const TODO_POPULATE = [
  { path: "tags" },
  { path: "userId", select: "name email" },
  { path: "groupId", select: "name" },
];

function todoOwnerId(todo) {
  if (!todo || !todo.userId) return null;
  return todo.userId._id ? String(todo.userId._id) : String(todo.userId);
}

function isOwner(user, todo) {
  return todoOwnerId(todo) === String(user._id);
}

function isGroupMember(user, todo) {
  if (!todo.groupId) return false;
  const groupId = todo.groupId._id ? String(todo.groupId._id) : String(todo.groupId);
  return (user.groups || []).some((g) => String(g) === groupId);
}

function canToggleTask(user, todo) {
  return user.role === "admin" || isOwner(user, todo) || isGroupMember(user, todo);
}

function canFullyEditTask(user, todo) {
  return user.role === "admin" || isOwner(user, todo);
}

function scopedTodoFilter(user) {
  if (user.role === "admin") {
    return {};
  }
  return {
    $or: [
      { userId: user._id },
      { groupId: { $in: user.groups || [] } },
    ],
  };
}

const createTodo = async (req, res) => {
  const { title, description, tags, project, groupId } = req.body;

  try {
    if (!tags || tags.length === 0) {
      return res.status(400).send({ message: "At least one tag is required" });
    }

    if (containsInappropriateLanguage(title, description, project)) {
      return res.status(400).send({ message: "Task contains inappropriate language" });
    }

    let resolvedGroupId;
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(400).send({ message: "Group not found" });
      }
      const isMember = group.members.some((m) => String(m) === String(req.user._id));
      if (!isMember && req.user.role !== "admin") {
        return res.status(403).send({ message: "Not a member of this group" });
      }
      resolvedGroupId = group._id;
    }

    const addTodo = await Todo.create({
      title,
      description,
      tags,
      project: project || "",
      userId: req.user._id,
      groupId: resolvedGroupId,
    });
    const populated = await Todo.findById(addTodo._id).populate(TODO_POPULATE);
    res.status(201).send(populated);
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

    if (!canFullyEditTask(req.user, todo)) {
      return res.status(403).send({ message: "Not allowed to delete this task" });
    }

    await Todo.findByIdAndDelete(id);
    res.status(200).send({ message: "Todo deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
};

const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find(scopedTodoFilter(req.user)).populate(TODO_POPULATE);
    res.status(200).send(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).send({ message: "Todo not found" });
    }

    if (updates.tags && updates.tags.length === 0) {
      return res.status(400).send({ message: "At least one tag is required" });
    }

    if (containsInappropriateLanguage(updates.title, updates.description, updates.project)) {
      return res.status(400).send({ message: "Task contains inappropriate language" });
    }

    const keys = Object.keys(updates);
    const toggleOnly = keys.length > 0 && keys.every((k) => k === "completed" || k === "priority");

    if (canFullyEditTask(req.user, todo)) {
      // owner or admin: full edit, including other users' tasks for admin
    } else if (toggleOnly && canToggleTask(req.user, todo)) {
      // group members may only complete / priority
    } else {
      return res.status(403).send({ message: "Not allowed to update this task" });
    }

    delete updates.userId;

    if (updates.groupId) {
      const group = await Group.findById(updates.groupId);
      if (!group) {
        return res.status(400).send({ message: "Group not found" });
      }
      const isMember = group.members.some((m) => String(m) === String(req.user._id));
      if (!isMember && req.user.role !== "admin") {
        return res.status(403).send({ message: "Not a member of this group" });
      }
    }

    const data = await Todo.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate(TODO_POPULATE);

    if (data != null) {
      res.status(200).send(data);
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
    const count = await Todo.countDocuments(scopedTodoFilter(req.user));
    res.status(200).send({ totalTasks: count });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

module.exports = {
  createTodo,
  getTodos,
  deleteTodo,
  updateTodo,
  getTotalTasks,
};
