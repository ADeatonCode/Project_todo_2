/*
 * These routes handle signup, login, and admin user tools.
 * Signup and login are public. Everything else needs a login, and some need admin.
 */
const { createUser, loginUser, getUser, listAssignableUsers, updateUser, deleteUser } = require("../controllers/userController");
const { listUsers, createAdminUser, patchAdminUser, makeHead, removeUser, resetUserTasks } = require("../controllers/adminController");
const { requireAuth, requireAdmin, requireHead } = require("../middleware/auth");

const express = require("express");
const router = express.Router();

router.post("/create", createUser); // signup (public)
router.post("/login", loginUser); // login (public)

router.get("/assignable", requireAuth, listAssignableUsers); // people I can assign a task to
// Admin-only: manage users, bans, roles, and the single head admin.
router.get("/admin/users", requireAuth, requireAdmin, listUsers);
router.post("/admin/users", requireAuth, requireAdmin, createAdminUser);
router.patch("/admin/users/:id", requireAuth, requireAdmin, patchAdminUser);
router.post("/admin/users/:id/make-head", requireAuth, requireHead, makeHead);
router.delete("/admin/users/:id", requireAuth, requireAdmin, removeUser);
router.post("/admin/users/:id/reset-tasks", requireAuth, requireAdmin, resetUserTasks);

router.get("/", requireAuth, requireAdmin, getUser);
router.put("/:id", requireAuth, updateUser);
router.delete("/delete/:id", requireAuth, requireAdmin, deleteUser);

module.exports = router;
