import { getEventsByUserId, createEvent } from "../services/events.service.js";
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
    return res.status(500).json({ error: error.message });
  }

  // Generar calendario
  const calendar = buildUserCalendar(data, start, end);

  return res.json({
    range: { start, end },
    events: calendar.all
  });
}

export async function createNewEvent(req, res) {
  const {
    title,
    description,
    event_type_id,
    creator_id,
    start_datetime,
    end_datetime,
    location,
    recurrence_rule
  } = req.body;

  // Validaciones
  if (!title || !event_type_id || !creator_id || !start_datetime || !end_datetime) {
    return res.status(400).json({
      error: "Missing required fields: title, event_type_id, creator_id, start_datetime, end_datetime"
    });
  }

  // Validar que end_datetime > start_datetime
  if (new Date(end_datetime) <= new Date(start_datetime)) {
    return res.status(400).json({
      error: "end_datetime must be after start_datetime"
    });
  }

  const { data, error } = await createEvent({
    title,
    description,
    event_type_id,
    creator_id,
    start_datetime,
    end_datetime,
    location,
    recurrence_rule
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    message: "Event created successfully",
    event: data
  });
}
