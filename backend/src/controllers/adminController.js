const User = require("../models/user");
const Todo = require("../models/Todo");
const Group = require("../models/Group");
const { isHead, isStaff, publicUser } = require("../utils/admin");

function cannotModerate(req, target) {
  if (!target) {
    return { status: 404, message: "User not found" };
  }
  if (String(target._id) === String(req.user._id)) {
    return { status: 403, message: "You cannot modify your own account" };
  }
  if (isHead(target)) {
    return { status: 403, message: "Cannot modify the head admin" };
  }
  if (!isHead(req.user) && isStaff(target)) {
    return { status: 403, message: "Admins cannot modify other admins" };
  }
  return null;
}

const listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -sessionToken").sort({ email: 1 });
    res.status(200).send(users.map(publicUser));
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const patchAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const hasBanned = Object.prototype.hasOwnProperty.call(req.body || {}, "banned");
    const hasRole = Object.prototype.hasOwnProperty.call(req.body || {}, "role");

    if (!hasBanned && !hasRole) {
      return res.status(400).send({ message: "Nothing to update" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).send({ message: "User not found" });
    }

    if (hasRole) {
      if (!isHead(req.user)) {
        return res.status(403).send({ message: "Only the head admin can change roles" });
      }
      if (isHead(target)) {
        return res.status(403).send({ message: "Cannot demote the head admin" });
      }
      if (String(target._id) === String(req.user._id)) {
        return res.status(403).send({ message: "You cannot change your own role" });
      }

      const role = String(req.body.role || "").toLowerCase().trim();
      if (role === "head") {
        return res.status(403).send({ message: "Cannot set role to head" });
      }
      if (role !== "admin" && role !== "user") {
        return res.status(400).send({ message: "Role must be admin or user" });
      }
      target.role = role;
    }

    if (hasBanned) {
      const blocked = cannotModerate(req, target);
      if (blocked) {
        return res.status(blocked.status).send({ message: blocked.message });
      }
      target.banned = !!req.body.banned;
    }

    await target.save();
    res.status(200).send(publicUser(target));
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const removeUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    const blocked = cannotModerate(req, user);
    if (blocked) {
      return res.status(blocked.status).send({ message: blocked.message });
    }

    await Todo.deleteMany({ userId: id });
    await Group.updateMany({ members: id }, { $pull: { members: id } });
    await User.findByIdAndDelete(id);
    res.status(200).send({ message: "User deleted" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const resetUserTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    const blocked = cannotModerate(req, user);
    if (blocked) {
      return res.status(blocked.status).send({ message: blocked.message });
    }
    const result = await Todo.deleteMany({ userId: id });
    res.status(200).send({ message: "User tasks reset", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Error resetting tasks:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = {
  listUsers,
  patchAdminUser,
  removeUser,
  resetUserTasks,
};
