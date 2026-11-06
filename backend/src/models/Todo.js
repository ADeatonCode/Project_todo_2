/*
 * This file is the blueprint for one task (a "todo").
 * A task can belong to a person, a group, and have tags, due dates, and repeats.
 * deletedAt is not a hard delete: it means the task is in the trash.
 */
const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  project: { type: String, default: "" },
  completed: { type: Boolean, default: false },
  priority: { type: Boolean, default: false },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
  },
  deletedAt: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  repeatEvery: { type: Number, default: 0 },
  repeatUnit: {
    type: String,
    enum: ["none", "hours", "days", "weeks", "months"],
    default: "none",
  },
  showBeforeValue: { type: Number, default: 0 },
  showBeforeUnit: {
    type: String,
    enum: ["hours", "days"],
    default: "days",
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tag",
    required: true,
  }],
  subTodos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubTodo",
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model("Todo", todoSchema);
