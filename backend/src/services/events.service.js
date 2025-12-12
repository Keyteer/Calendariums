import { supabase } from "../config/supabaseClient.js";

/**
 * Obtiene todos los eventos de un usuario
 */
export async function getEventsByUserId(userId) {
  return await supabase
    .from("event_participants")
    .select(`
      status,
      events (
        id,
        title,
        description,
        location,
        start_datetime,
        end_datetime,
        created_by_ai,
        event_type_id,
        event_types:event_type_id (
          name,
          color,
          icon
        ),
        recurrence_rules (*),
        event_participants ( user_id, status )
      )
    `)
    .eq("user_id", userId);
}

/**
 * Crea un nuevo evento
 */
export async function createEvent(eventData) {
  const {
    title,
    description,
    event_type_id,
    creator_id,
    start_datetime,
    end_datetime,
    location,
    recurrence_rules,
    time_anticipation
  } = eventData;
  
  // Insertar el evento principal
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      title,
      description,
      event_type_id,
      creator_id,
      start_datetime,
      end_datetime,
      location,
      created_by_ai: false
    })
    .select()
    .single();

  if (eventError) {
    return { data: null, error: eventError };
  }

  // Agregar al creador como participante
  const { error: participantError } = await supabase
    .from("event_participants")
    .insert({
      event_id: event.id,
      user_id: creator_id,
      status: "accepted"
    });

  if (participantError) {
    console.error("Error adding creator as participant:", participantError);
  }

  // Create reminder for the creator
  if (time_anticipation && time_anticipation > 0) {
    const { error: reminderError } = await supabase
      .from("reminders")
      .insert({
        event_id: event.id,
        user_id: creator_id,
        time_anticipation: time_anticipation,
        sent: false
      });

    if (reminderError) {
      console.error("Error creating reminder:", reminderError);
    }
  }

  // Si hay reglas de recurrencia (múltiples)
  if (Array.isArray(recurrence_rules) && recurrence_rules.length > 0) {
    const inserts = recurrence_rules.map(rule => {
      // Soportar regla como string o como objeto
      if (typeof rule === "string") {
        return {
          event_id: event.id,
          rrule: rule,
          timezone: "UTC"
        };
      }

      // Si es objeto { rrule, timezone }
      return {
        event_id: event.id,
        rrule: rule.rrule,
        timezone: rule.timezone || "UTC"
      };
    });

    const { error: rruleError } = await supabase
      .from("recurrence_rules")
      .insert(inserts);

    if (rruleError) {
      console.error("ERROR RRULE:", rruleError);
    } else {
      console.log("RRULES INSERTADAS:", inserts.length);
    }
  }
  return { data: event, error: null };
}

/**
 * Elimina un evento por ID
 */
export async function deleteEventById(inputId) {
  // Intentar obtener evento por ID
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", inputId)
    .single();
  let eventId = inputId;
  // si no existe el evento
  if (!event && !eventError) {
    // Buscar si el inputId corresponde a una regla de recurrencia
    const { data: recurrence, error: recurrenceError } = await supabase
      .from("recurrence_rules")
      .select("event_id")
      .eq("id", inputId)
      .single();
    if (recurrenceError || !recurrence) {
      return { data: null, error: { message: "Event or recurrence not found" } };
    }
    eventId = recurrence.event_id;
  } else if (eventError) {
    return { data: null, error: eventError };
  }
  // Eliminar recurrencias del evento
  const { error: rrError } = await supabase
    .from("recurrence_rules")
    .delete()
    .eq("event_id", eventId);
  if (rrError) {
    return { data: null, error: rrError };
  }
  // Eliminar participantes del evento
  const { error: epError } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId);
  if (epError) {
    return { data: null, error: epError };
  }
  // Eliminar evento
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .select()
    .single();
  if (error) {
    return { data: null, error };
  }
  return { data, error: null };
}


/**
 * Añade un participante a un evento
 */
export async function addParticipantToEvent(eventId, userId, status = "pending") {
  // Comprobar si ya existe
  const { data: existing, error: existingError } = await supabase
    .from("event_participants")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError };
  }

  if (existing) {
    return { data: existing, error: { message: "Participant already added", code: "duplicate" } };
  }

  const { data, error } = await supabase
    .from("event_participants")
    .insert({
      event_id: eventId,
      user_id: userId,
      status
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}