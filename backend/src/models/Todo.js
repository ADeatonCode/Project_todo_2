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
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
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
