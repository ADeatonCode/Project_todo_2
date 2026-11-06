/*
 * These routes let a logged-in user list, make, change, or delete tags.
 * Tags are color labels that get stuck on tasks.
 */
const { createTag, getTags, updateTag, deleteTag, getTagById } = require("../controllers/tagController");
const { requireAuth } = require("../middleware/auth");

const express = require("express");
const router = express.Router();

router.use(requireAuth);

router.get("/", getTags); // list all tags
router.post("/create", createTag); // make a tag
router.put("/:id", updateTag); // change a tag
router.delete("/delete/:id", deleteTag); // remove a tag
router.get("/:id", getTagById); // get one tag by id

module.exports = router; 