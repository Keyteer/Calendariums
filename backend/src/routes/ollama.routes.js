import { Router } from "express";
import { getSuggestion, getGroupSuggestion, parseEvent, parseEventAdvanced } from "../controllers/ollama.controller.js";

const router = Router();

router.post("/suggest", getSuggestion);
router.post("/group-suggest", getGroupSuggestion);

router.post("/chat", parseEvent);
router.post("/chat-advanced", parseEventAdvanced); // Nueva ruta con tool calling

export default router;
