/*
 * This file is the teacher desk for the app: list users, ban, change roles, reset tasks.
 * Only the head admin can create other admins or pass the head role to someone else.
 * You cannot ban, delete, or demote yourself or the current head.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Todo = require("../models/Todo");
const Group = require("../models/Group");
const {
  isHead,
  isStaff,
  publicUser,
  normalizeEmail,
  normalizeUsername,
  identifierToUsername,
  isValidUsername,
  findUserByUsername,
  sortAdminUsers,
} = require("../utils/admin");

// Shared "no" reasons: missing user, yourself, the head, or another admin if you are not head.
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

// List every user with group names, sorted for the admin table.
const listUsers = async (req, res) => {
  try {
    const [users, groups] = await Promise.all([
      User.find().select("-password -sessionToken"),
      Group.find().select("name members"),
    ]);

    const namesByUser = new Map();
    for (const group of groups) {
      const name = String(group.name || "").trim();
      if (!name) continue;
      for (const member of group.members || []) {
        const id = String(member);
        if (!namesByUser.has(id)) namesByUser.set(id, new Set());
        namesByUser.get(id).add(name);
      }
    }

    const payload = users.map((user) => {
      const names = [...(namesByUser.get(String(user._id)) || [])]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      return { ...publicUser(user), groups: names };
    });

    res.status(200).send(sortAdminUsers(payload));
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

// Admin creates a user. Only the head can set the new person's role to admin.
const createAdminUser = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const username = identifierToUsername(req.body?.username || req.body?.email);
    const emailRaw = normalizeEmail(req.body?.email);
    const email = emailRaw.includes("@") ? emailRaw : undefined;
    const password = req.body?.password;
    const requestedRole = String(req.body?.role || "user").toLowerCase().trim();

    if (!name) {
      return res.status(400).send({ message: "Name required" });
    }
    if (!username) {
      return res.status(400).send({ message: "Username required" });
    }
    if (!isValidUsername(username)) {
      return res.status(400).send({ message: "Username can use letters, numbers, periods, underscores, and hyphens" });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).send({ message: "Password required" });
    }

    if (requestedRole === "head") {
      return res.status(403).send({ message: "Cannot set role to head" });
    }
    if (requestedRole !== "admin" && requestedRole !== "user") {
      return res.status(400).send({ message: "Role must be admin or user" });
    }
    if (requestedRole === "admin" && !isHead(req.user)) {
      return res.status(403).send({ message: "Only the head admin can create admin users" });
    }

    const role = requestedRole === "admin" && isHead(req.user) ? "admin" : "user";

    const existing = await findUserByUsername(User, username);
    if (existing) {
      return res.status(400).send({ message: "Username already in use" });
    }

    // Hash the password the same way signup does.
    const hashed = await bcrypt.hash(password, 10);
    const created = await User.create({
      name,
      username: normalizeUsername(username),
      ...(email ? { email } : {}),
      password: hashed,
      role,
      banned: false,
    });

    res.status(201).send(publicUser(created));
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return res.status(400).send({ message: "Username already in use" });
    }
    res.status(500).send({ message: "Internal server error" });
  }
};

// Ban/unban a user, or (head only) change admin/user role. Head role cannot be set here.
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

// Delete a user and their tasks, and pull them out of any groups.
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

// Head-only: give the head role to someone else, then this person becomes a regular admin.
const makeHead = async (req, res) => {
  try {
    if (!isHead(req.user)) {
      return res.status(403).send({ message: "Only the head admin can transfer the head role" });
    }

    const { id } = req.params;
    if (!id || String(id) === String(req.user._id)) {
      return res.status(400).send({ message: "You are already the head admin" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).send({ message: "User not found" });
    }
    if (target.banned) {
      return res.status(403).send({ message: "Cannot transfer head to a banned user" });
    }
    if (target.role === "head") {
      return res.status(400).send({ message: "That user is already the head admin" });
    }

    // Use a database transaction so two heads never exist at the same time.
    const session = await mongoose.startSession();
    let headUser = target;
    let formerHead;
    try {
      await session.withTransaction(async () => {
        const liveTarget = await User.findById(id).session(session);
        if (!liveTarget) {
          const err = new Error("User not found");
          err.status = 404;
          throw err;
        }
        if (liveTarget.banned) {
          const err = new Error("Cannot transfer head to a banned user");
          err.status = 403;
          throw err;
        }

        await User.updateMany(
          { role: "head" },
          { $set: { role: "admin" } },
          { session }
        );
        liveTarget.role = "head";
        await liveTarget.save({ session });
        formerHead = await User.findById(req.user._id).session(session);
        headUser = liveTarget;
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).send({ message: error.message });
      }
      // Some hosts do not support transactions. Fall back to two updates in a row.
      const noTransactions = error.code === 20 || /replica set|Transaction numbers/i.test(error.message || "");
      if (!noTransactions) {
        throw error;
      }
      await User.updateMany({ role: "head" }, { $set: { role: "admin" } });
      target.role = "head";
      await target.save();
      formerHead = await User.findById(req.user._id);
      headUser = target;
    } finally {
      await session.endSession();
    }

    res.status(200).send({
      head: publicUser(headUser),
      formerHead: publicUser(formerHead),
    });
  } catch (error) {
    console.error("Error transferring head:", error);
    if (error.code === 11000) {
      return res.status(409).send({ message: "Only one head admin is allowed" });
    }
    res.status(500).send({ message: "Internal server error" });
  }
};

// Wipe every task this user created (admin tool for a messy account).
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
  createAdminUser,
  patchAdminUser,
  makeHead,
  removeUser,
  resetUserTasks,
};
