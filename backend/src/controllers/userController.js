/*
 * This file signs people up, logs them in, and lists who can be assigned a task.
 * Passwords are scrambled (hashed) before we save them.
 * After signup we add a few sample tasks so a new account is not empty.
 */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Todo = require("../models/Todo.js");
const {
  isAdminEmail,
  isHead,
  isStaff,
  publicUser,
  authUser,
  normalizeEmail,
  normalizeUsername,
  identifierToUsername,
  isValidUsername,
  findUserByLogin,
  findUserByUsername,
  ensureUsername,
  ensureSingleHead,
} = require("../utils/admin.js");

// True if this password is already scrambled with bcrypt (starts with $2).
function looksLikeBcrypt(stored) {
  return typeof stored === "string" && stored.startsWith("$2");
}

// Make a random hall-pass token the browser sends on later requests.
function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Login form may send username or email; take whichever was filled in.
function loginIdentifier(body) {
  return body?.username || body?.email || "";
}

// Give a brand-new user a few example tasks so the list is not blank.
async function seedSampleTodos(userId) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 2);
  dueDate.setHours(17, 0, 0, 0);

  await Todo.insertMany([
    {
      title: "Try adding a new task",
      description: "This sample is yours to edit or delete.",
      project: "Getting started",
      userId,
      assignedTo: [userId],
      completed: false,
      priority: false,
    },
    {
      title: "Finish the weekly report",
      description: "A priority sample so you can see the Priority flag.",
      project: "Work",
      userId,
      assignedTo: [userId],
      completed: false,
      priority: true,
    },
    {
      title: "Weekly planning check-in",
      description: "Due soon and repeats so you can see dates and repeat.",
      project: "Planning",
      userId,
      assignedTo: [userId],
      completed: false,
      priority: false,
      dueDate,
      showBeforeValue: 7,
      showBeforeUnit: "days",
      repeatEvery: 1,
      repeatUnit: "weeks",
    },
  ]);
}

// Check the password. If an old account stored it in plain text, upgrade it to a hash.
async function verifyAndMigratePassword(user, password) {
  const stored = user.password || "";
  if (looksLikeBcrypt(stored)) {
    return bcrypt.compare(password, stored);
  }
  if (stored === password) {
    user.password = await bcrypt.hash(password, 10);
    return true;
  }
  return false;
}

// Sign up: check the username, hash the password, and maybe make this person an admin.
const createUser = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const username = identifierToUsername(req.body.username || req.body.email);
  const emailRaw = normalizeEmail(req.body.email);
  const email = emailRaw.includes("@") ? emailRaw : undefined;
  const { password } = req.body;

  try {
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
    const existing = await findUserByUsername(User, username);
    if (existing) {
      return res.status(400).send({ message: "Username already in use" });
    }
    const existingHead = await User.exists({ role: "head" });
    let role = "user";
    // Known owner emails become head if none exists, otherwise a regular admin.
    if (isAdminEmail(username) || isAdminEmail(email)) {
      role = existingHead ? "admin" : "head";
    }
    // Hash so the real password is not stored in the database.
    const hashed = await bcrypt.hash(password, 10);
    const addUser = await User.create({
      name,
      username: normalizeUsername(username),
      ...(email ? { email } : {}),
      password: hashed,
      sessionToken: newSessionToken(),
      role,
      banned: false,
    });
    if (role === "head") {
      await User.updateMany(
        { _id: { $ne: addUser._id }, role: "head" },
        { $set: { role: "admin" } }
      );
    }
    try {
      await seedSampleTodos(addUser._id);
    } catch (seedError) {
      console.error("Error seeding sample todos:", seedError);
    }
    res.status(201).send(authUser(addUser));
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return res.status(400).send({ message: "Username already in use" });
    }
    return res.status(500).send({ message: "Internal server error" });
  }
};

// Log in: find the user, check the password, then give them a new session token.
const loginUser = async (req, res) => {
  const identifier = loginIdentifier(req.body);
  const { password } = req.body;

  try {
    const user = await findUserByLogin(User, identifier);
    if (!user || !(await verifyAndMigratePassword(user, password))) {
      return res.status(401).send({ message: "Invalid username or password" });
    }
    if (user.banned) {
      return res.status(403).send({ message: "This account is banned" });
    }
    await ensureUsername(User, user);
    await ensureSingleHead(User, user);
    // New token each login so an old stolen token stops working.
    user.sessionToken = newSessionToken();
    await user.save();
    res.status(200).send(authUser(user));
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

// Admin delete. You cannot delete yourself, the head, or (if you are not head) another admin.
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    if (String(user._id) === String(req.user._id)) {
      return res.status(403).send({ message: "You cannot remove your own account" });
    }
    if (isHead(user)) {
      return res.status(403).send({ message: "Cannot modify the head admin" });
    }
    if (!isHead(req.user) && isStaff(user)) {
      return res.status(403).send({ message: "Admins cannot modify other admins" });
    }
    await User.findByIdAndDelete(id);
    res.status(200).send({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
};

// Admin list of all users, without passwords or tokens.
const getUser = async (req, res) => {
  try {
    const users = await User.find().select("-password -sessionToken");
    res.status(200).send(users.map(publicUser));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

// People this user may assign tasks to: staff see everyone, others see groupmates.
const listAssignableUsers = async (req, res) => {
  try {
    let users;
    if (isStaff(req.user)) {
      users = await User.find().select("-password -sessionToken").sort({ name: 1, username: 1, email: 1 });
    } else {
      const Group = require("../models/Group");
      const groups = await Group.find({
        $or: [{ members: req.user._id }, { _id: { $in: req.user.groups || [] } }],
      }).select("members");
      const ids = new Set([String(req.user._id)]);
      for (const group of groups) {
        for (const member of group.members || []) {
          ids.add(String(member));
        }
      }
      users = await User.find({ _id: { $in: [...ids] } })
        .select("-password -sessionToken")
        .sort({ name: 1, username: 1, email: 1 });
    }
    res.status(200).send(users.map(publicUser));
  } catch (error) {
    console.error("Error listing assignable users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

// Update name-like fields. Password, token, role, and banned cannot be changed here.
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    // Strip secret/admin fields so a regular update cannot steal a role or token.
    delete updates.password;
    delete updates.sessionToken;
    delete updates.role;
    delete updates.banned;
    const data = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select("-password -sessionToken");
    if (data != null) {
      res.status(200).send(publicUser(data));
    } else {
      res.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

module.exports = {
  createUser,
  loginUser,
  getUser,
  listAssignableUsers,
  deleteUser,
  updateUser,
};
