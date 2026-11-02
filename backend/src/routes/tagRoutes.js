const { createTag, getTags, updateTag, deleteTag, getTagById } = require("../controllers/tagController");

const express = require("express");
const router = express.Router();

router.get("/", getTags);
router.post("/create", createTag);
router.put("/:id", updateTag);
router.delete("/delete/:id", deleteTag);
router.get("/:id", getTagById);

module.exports = router; 