import { Router } from "express";
import { getUserCalendar } from "../controllers/eventsController.js";

const router = Router();

router.get("/user/:userId", getUserCalendar);

export default router;
