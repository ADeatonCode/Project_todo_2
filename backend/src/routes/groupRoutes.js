const { getGroups, createGroup, addGroupMember, deleteGroup } = require("../controllers/groupController");
const { requireAuth } = require("../middleware/auth");

const express = require("express");
const router = express.Router();

router.use(requireAuth);

router.get("/", getGroups);
router.post("/", createGroup);
router.post("/:id/members", addGroupMember);
router.delete("/:id", deleteGroup);

module.exports = router;
