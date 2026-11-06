/*
 * These routes let a logged-in user work with groups (teams of people).
 * Only group creators and staff can add members or delete a group.
 */
const { getGroups, createGroup, addGroupMember, deleteGroup } = require("../controllers/groupController");
const { requireAuth } = require("../middleware/auth");

const express = require("express");
const router = express.Router();

router.use(requireAuth);

router.get("/", getGroups); // groups I belong to (staff see all)
router.post("/", createGroup); // start a new group
router.post("/:id/members", addGroupMember); // add a person by username
router.delete("/:id", deleteGroup); // delete the group

module.exports = router;
