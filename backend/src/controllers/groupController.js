const Group = require("../models/Group");
const User = require("../models/user");
const Todo = require("../models/Todo");
const { isStaff } = require("../utils/admin");

const GROUP_POPULATE = [
  { path: "members", select: "name email" },
  { path: "createdBy", select: "name email" },
];

function isGroupAdminOrCreator(user, group) {
  if (isStaff(user)) return true;
  return String(group.createdBy) === String(user._id) ||
    (group.createdBy && group.createdBy._id && String(group.createdBy._id) === String(user._id));
}

const getGroups = async (req, res) => {
  try {
    const filter = isStaff(req.user)
      ? {}
      : { members: req.user._id };
    const groups = await Group.find(filter).populate(GROUP_POPULATE).sort({ name: 1 });
    res.status(200).send(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const createGroup = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).send({ message: "Group name is required" });
    }

    const group = await Group.create({
      name,
      members: [req.user._id],
      createdBy: req.user._id,
    });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { groups: group._id } });
    const populated = await Group.findById(group._id).populate(GROUP_POPULATE);
    res.status(201).send(populated);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const addGroupMember = async (req, res) => {
  try {
    const { id } = req.params;
    const email = String(req.body.email || "").trim();
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).send({ message: "Group not found" });
    }
    if (!isGroupAdminOrCreator(req.user, group)) {
      return res.status(403).send({ message: "Not allowed to add members" });
    }

    const member = await User.findOne({ email });
    if (!member) {
      return res.status(404).send({ message: "User not found" });
    }

    await Group.findByIdAndUpdate(id, { $addToSet: { members: member._id } });
    await User.findByIdAndUpdate(member._id, { $addToSet: { groups: group._id } });
    const populated = await Group.findById(id).populate(GROUP_POPULATE);
    res.status(200).send(populated);
  } catch (error) {
    console.error("Error adding group member:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).send({ message: "Group not found" });
    }
    if (!isGroupAdminOrCreator(req.user, group)) {
      return res.status(403).send({ message: "Not allowed to delete this group" });
    }

    await User.updateMany({ groups: group._id }, { $pull: { groups: group._id } });
    await Todo.updateMany({ groupId: group._id }, { $unset: { groupId: 1 } });
    await Group.findByIdAndDelete(id);
    res.status(200).send({ message: "Group deleted" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = {
  getGroups,
  createGroup,
  addGroupMember,
  deleteGroup,
};
