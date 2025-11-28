import { Router } from "express";
import { getUserCalendar, createNewEvent, deleteEvent, addEventParticipant } from "../controllers/events.controller.js";

const router = Router();

// GET /events/user/:userId?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/user/:userId", getUserCalendar);

// POST /events
router.post("/", createNewEvent);

// DELETE /events/:id
router.delete("/:id", deleteEvent);

// POST /events/:id/participants
router.post("/:id/participants", addEventParticipant);

export default router;
