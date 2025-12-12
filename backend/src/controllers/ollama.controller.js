import { generateScheduleSuggestion, generateGroupScheduleSuggestion, parseEventFromText, parseEventWithToolCalling } from "../services/ollama.service.js";

export async function getSuggestion(req, res) {
    try {
        const { userId, description, duration } = req.body;

        if (!userId || !description) {
            return res.status(400).json({ error: "Missing userId or description" });
        }

        const { data, error } = await generateScheduleSuggestion(userId, { description, duration });

        if (error) {
            return res.status(500).json({ error });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getGroupSuggestion(req, res) {
    try {
        const { userIds, description, duration } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !description) {
            return res.status(400).json({ error: "Missing userIds array or description" });
        }

        const { data, error } = await generateGroupScheduleSuggestion(userIds, { description, duration });

        if (error) {
            return res.status(500).json({ error });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function parseEvent(req, res) {
    try {
        const { userId, text } = req.body;

        if (!userId || !text) {
            return res.status(400).json({ error: "Missing userId or text" });
        }

        // Usar la nueva función con tool calling
        const { data, error } = await parseEventWithToolCalling(userId, text);

        if (error) {
            return res.status(500).json({ error });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function parseEventAdvanced(req, res) {
    try {
        const { userId, text } = req.body;

        if (!userId || !text) {
            return res.status(400).json({ error: "Missing userId or text" });
        }

        const { data, error } = await parseEventWithToolCalling(userId, text);

        if (error) {
            return res.status(500).json({ error });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
