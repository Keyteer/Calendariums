import { getEventsByUserId, createEvent, deleteEventById, addParticipantToEvent } from "../services/events.service.js";
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
  console.log(">> createNewEvent - BODY:", JSON.stringify(req.body, null, 2));
  const {
    title,
    description,
    event_type_id,
    creator_id,
    start_datetime,
    end_datetime,
    location,
    recurrence_rule,
    recurrence_rules
  } = req.body;
  // Normalizar reglas a array uniforme
  let normalizedRecurrenceRules = [];
  if (Array.isArray(recurrence_rules)) {
    normalizedRecurrenceRules = recurrence_rules;
  } else if (Array.isArray(recurrence_rule)) {
    normalizedRecurrenceRules = recurrence_rule;
  } else if (recurrence_rule && typeof recurrence_rule === "object") {
    normalizedRecurrenceRules = [recurrence_rule];
  } else if (typeof recurrence_rule === "string") {
    normalizedRecurrenceRules = [recurrence_rule];
  } else if (typeof recurrence_rules === "string") {
    normalizedRecurrenceRules = [recurrence_rules];
  }
  // Limpieza final
  normalizedRecurrenceRules = normalizedRecurrenceRules.map(rule => {
    if (typeof rule === "string") {
      return { rrule: rule, timezone: "UTC" };
    }
    return {
      rrule: rule.rrule,
      timezone: rule.timezone || "UTC"
    };
  });
  // Validaciones
  if (!title || !event_type_id || !creator_id || !start_datetime || !end_datetime) {
    return res.status(400).json({
      error: "Missing required fields: title, event_type_id, creator_id, start_datetime, end_datetime"
    });
  }
  if (new Date(end_datetime) <= new Date(start_datetime)) {
    return res.status(400).json({
      error: "end_datetime must be after start_datetime"
    });
  }
  try {
    const { data, error } = await createEvent({
      title,
      description,
      event_type_id,
      creator_id,
      start_datetime,
      end_datetime,
      location,
      recurrence_rules: normalizedRecurrenceRules
    });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({
      message: "Event created successfully",
      event: data
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}



export async function deleteEvent(req, res) {
  const { id } = req.params;

  const { data, error } = await deleteEventById(id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Event deleted", event: data });
}


export async function addEventParticipant(req, res) {
  const { id } = req.params; // event id
  const { user_id, status } = req.body;

  if (!id || !user_id) {
    return res.status(400).json({
      error: "Missing required fields: event id param, user_id in body"
    });
  }

  const { data, error } = await addParticipantToEvent(id, user_id, status);

  if (error) {
    if (error.code === "duplicate") {
      return res.status(409).json({ error: error.message, participant: data });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    message: "Participant added",
    participant: data
  });
}
