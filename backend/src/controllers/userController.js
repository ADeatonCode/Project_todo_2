const User = require("../models/user.js");
const { isAdminEmail, publicUser } = require("../utils/admin.js");

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
    const role = isAdminEmail(email) ? "admin" : "user";
    const addUser = await User.create({ name, email, password, role, banned: false });
    res.status(201).send(publicUser(addUser));
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
    if (!user || user.password !== password) {
      return res.status(401).send({ message: "Invalid email or password" });
    }
    if (user.banned) {
      return res.status(403).send({ message: "This account is banned" });
    }
    await applyAdminRole(user);
    res.status(200).send(publicUser(user));
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
    const users = await User.find().select("-password");
    res.status(200).send(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const data = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select("-password");
    if (data != null) {
      res.status(200).send(data);
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
