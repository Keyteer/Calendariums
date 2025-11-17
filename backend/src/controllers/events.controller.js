import { getEventsByUserId } from "../services/eventsService.js";
import { buildUserCalendar } from "../utils/events.js";

export async function getUserCalendar(req, res) {
  const userId = req.params.userId;
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({
      error: "Missing ?start=YYYY-MM-DD&end=YYYY-MM-DD"
    });
  }

  const { data, error } = await getEventsByUserId(userId);

  if (error) {
    return res.status(500).json({ error });
  }

  // Generar calendario
  const calendar = buildUserCalendar(data, start, end);

  return res.json({
    range: { start, end },
    events: calendar.all
  });
}
