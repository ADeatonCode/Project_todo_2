/*
 * These routes are the task URLs the website calls.
 * Every route here requires a logged-in user first (requireAuth).
 */
const { createTodo, getTodos, restoreTodo, updateTodo, deleteTodo, getTotalTasks } = require("../controllers/todoController");
const { requireAuth } = require("../middleware/auth");

const express = require("express");
const router = express.Router();

router.use(requireAuth);

router.get("/", getTodos); // list my tasks (or trash if asked)
router.post("/create", createTodo); // make a new task
router.post("/:id/restore", restoreTodo); // pull a task out of trash
router.put("/:id", updateTodo); // change a task
router.delete("/delete/:id", deleteTodo); // trash it, or erase it for good if already trashed
router.get("/total", getTotalTasks); // how many tasks I can see

module.exports = router;
