const { createUser, loginUser, getUser, updateUser, deleteUser } = require("../controllers/userController");

const express = require("express");
const router = express.Router();

router.get("/", getUser);
router.post("/create", createUser);
router.post("/login", loginUser);
router.put("/:id", updateUser);
router.delete("/delete/:id", deleteUser);

module.exports = router;
