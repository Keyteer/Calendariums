import { Router } from "express";
import { getUserCalendar, createNewEvent } from "../controllers/events.controller.js";

const router = Router();

// GET /events/user/:userId?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/user/:userId", getUserCalendar);

// POST /events
router.post("/", createNewEvent);

export default router;
