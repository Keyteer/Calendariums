import { getEventsByUserId } from "../services/events.service.js";

export async function listEvents(req, res) {
  try {
    const userId = req.query.user_id;

    const { data, error } = await getEventsByUserId(userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);

  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
