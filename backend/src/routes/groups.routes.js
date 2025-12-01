import { Router } from "express";
import {
  createNewGroup,
  getUserGroups,
  updateGroupInfo,
  addUserToGroup,
  removeUserFromGroup,
  updateGroupMemberRole,
  createGroupEvent,
  getGroupActivities,
  deleteGroup
} from "../controllers/groups.controller.js";

const router = Router();

// GET /groups/user/:userId
router.get("/user/:userId", getUserGroups);

// POST /groups
router.post("/", createNewGroup);

// PATCH /groups/:groupId
router.patch("/:groupId", updateGroupInfo);

// POST /groups/members
router.post("/members", addUserToGroup);

// DELETE /groups/members
router.delete("/members", removeUserFromGroup);

// PATCH /groups/members
router.patch("/members", updateGroupMemberRole);

// POST /groups/:groupId/events
router.post("/:groupId/events", createGroupEvent);

// GET /groups/:groupId/events
router.get("/:groupId/events", getGroupActivities);

// DELETE /groups/:id
router.delete("/:id", deleteGroup);

export default router;