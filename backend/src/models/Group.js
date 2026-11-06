/*
 * This file is the blueprint for a team of users who share tasks.
 * members is the list of people in the group. createdBy is who started it.
 */
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Group", groupSchema);
