const User = require("../models/user.js");

const createUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const addUser = await User.create({ name, email, password });
    res.status(201).send(addUser);
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return res.status(400).send({ message: "Email already in use" });
    }
    res.status(500).send({ message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).send({ message: "Invalid email or password" });
    }
    const userObj = user.toObject();
    delete userObj.password;
    res.status(200).send(userObj);
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
    const users = await User.find();
    res.status(200).send(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Internal server error" });
  }
}

const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const data = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    if (data != null) {
      res.status(200).send(data)

    } else {
      res.status(404).send({ message: "User not found" })

    }
  } catch (error) {
    console.error(error)
    res.status(500).send(error)
  }
}


module.exports = {
  createUser,
  loginUser,
  getUser,
  deleteUser,
  updateUser
};
