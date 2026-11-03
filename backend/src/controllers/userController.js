const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const { isAdminEmail, publicUser, authUser } = require("../utils/admin.js");

function looksLikeBcrypt(stored) {
  return typeof stored === "string" && stored.startsWith("$2");
}

function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

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

async function applyAdminRole(user) {
  let changed = false;
  if (isAdminEmail(user.email)) {
    if (user.role !== "admin") {
      user.role = "admin";
      changed = true;
    }
  } else if (!user.role) {
    user.role = "user";
    changed = true;
  }
  if (typeof user.banned !== "boolean") {
    user.banned = false;
    changed = true;
  }
  if (changed) {
    await user.save();
  }
  return user;
}

const createUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!password || typeof password !== "string") {
      return res.status(400).send({ message: "Password required" });
    }
    const role = isAdminEmail(email) ? "admin" : "user";
    const hashed = await bcrypt.hash(password, 10);
    const addUser = await User.create({
      name,
      email,
      password: hashed,
      sessionToken: newSessionToken(),
      role,
      banned: false,
    });
    res.status(201).send(authUser(addUser));
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return res.status(400).send({ message: "Email already in use" });
    }
    return res.status(500).send({ message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await verifyAndMigratePassword(user, password))) {
      return res.status(401).send({ message: "Invalid email or password" });
    }
    if (user.banned) {
      return res.status(403).send({ message: "This account is banned" });
    }
    await applyAdminRole(user);
    user.sessionToken = newSessionToken();
    await user.save();
    res.status(200).send(authUser(user));
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (deletedUser) {
      res.status(200).send({ message: "User deleted" });
    } else {
      res.status(404).send({ message: "User not found" });
    }
  } catch (err) {
    console.error(err);
  }
};

const getUser = async (req, res) => {
  try {
    const users = await User.find().select("-password -sessionToken");
    res.status(200).send(users.map(publicUser));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.password;
    delete updates.sessionToken;
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
  deleteUser,
  updateUser,
};
