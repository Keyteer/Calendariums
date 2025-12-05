import { Router } from "express";
import { getSuggestion, getGroupSuggestion } from "../controllers/ollama.controller.js";

const router = Router();

router.post("/suggest", getSuggestion);
router.post("/group-suggest", getGroupSuggestion);

export default router;
