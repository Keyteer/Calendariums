import { Router } from "express";
import {
  getUserCalendar,
  createNewEvent,
  deleteEvent,
  addEventParticipant,
  updateEventParticipantStatus,
  getPendingInvitations
} from "../controllers/events.controller.js";

const router = Router();

// GET /events/user/:userId?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/user/:userId", getUserCalendar);

// POST /events
router.post("/", createNewEvent);

// DELETE /events/:id
router.delete("/:id", deleteEvent);

// POST /events/:id/participants
router.post("/:id/participants", addEventParticipant);

// PATCH /events/participants/:participantId - Update participant status
router.patch("/participants/:participantId", updateEventParticipantStatus);

// GET /events/pending/:userId - Get pending event invitations for user
router.get("/pending/:userId", getPendingInvitations);

export default router;
