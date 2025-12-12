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
  deleteGroup,
  generateGroupInvite,
  getGroupByInviteCode,
  joinGroupByInviteCode
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

// POST /groups/:groupId/invite - Generate invite code
router.post("/:groupId/invite", generateGroupInvite);

// GET /groups/invite/:code - Get group info by invite code
router.get("/invite/:code", getGroupByInviteCode);

// POST /groups/join/:code - Join group by invite code
router.post("/join/:code", joinGroupByInviteCode);

export default router;