const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const {
  isAdminEmail,
  isHead,
  isStaff,
  publicUser,
  authUser,
  normalizeEmail,
  ensureSingleHead,
} = require("../utils/admin.js");

function looksLikeBcrypt(stored) {
  return typeof stored === "string" && stored.startsWith("$2");
}

function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return User.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  });
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

const createUser = async (req, res) => {
  const name = req.body.name;
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  try {
    if (!password || typeof password !== "string") {
      return res.status(400).send({ message: "Password required" });
    }
    const existingHead = await User.exists({ role: "head" });
    let role = "user";
    if (isAdminEmail(email)) {
      role = existingHead ? "admin" : "head";
    }
    const hashed = await bcrypt.hash(password, 10);
    const addUser = await User.create({
      name,
      email,
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
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user || !(await verifyAndMigratePassword(user, password))) {
      return res.status(401).send({ message: "Invalid email or password" });
    }
    if (user.banned) {
      return res.status(403).send({ message: "This account is banned" });
    }
    await ensureSingleHead(User, user);
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
  deleteUser,
  updateUser,
};
