/*
 * This file is the blueprint for a person in the database.
 * It stores name, username, scrambled password, role, and which groups they joined.
 * Passwords here should already be hashed. Never put a real password in comments.
 */
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  sessionToken: { type: String, default: null, index: true },
  role: { type: String, enum: ["user", "admin", "head"], default: "user" },
  banned: { type: Boolean, default: false },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
});

// Database rule: only one user may have the role "head" at a time.
userSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: "head" }, name: "unique_head_role" }
);

module.exports = mongoose.model("User", userSchema);
