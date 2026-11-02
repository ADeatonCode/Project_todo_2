const { createTodo, getTodos, updateTodo, deleteTodo,getTotalTasks } = require("../controllers/todoController");

const express = require("express");
const router = express.Router();

router.get("/", getTodos);
router.post("/create", createTodo);
router.put("/:id", updateTodo);
router.delete("/delete/:id", deleteTodo);
router.get("/total", getTotalTasks)
module.exports = router;
