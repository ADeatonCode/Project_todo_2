const User = require("../models/user");
const Todo = require("../models/Todo");
const Group = require("../models/Group");

const listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -sessionToken").sort({ email: 1 });
    res.status(200).send(users);
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const setBanned = async (req, res) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;

    if (String(id) === String(req.user._id)) {
      return res.status(400).send({ message: "You cannot ban your own account" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { banned: !!banned },
      { new: true, runValidators: true }
    ).select("-password -sessionToken");

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.status(200).send(user);
  } catch (error) {
    console.error("Error updating ban:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const removeUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id) === String(req.user._id)) {
      return res.status(400).send({ message: "You cannot remove your own account" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
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
    const user = await User.findById(id).select("-password -sessionToken");
    if (!user) {
      return res.status(404).send({ message: "User not found" });
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
  setBanned,
  removeUser,
  resetUserTasks,
};
