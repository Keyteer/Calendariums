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
        group_id,
        event_types:event_type_id (
          name,
          color,
          icon
        ),
        recurrence_rules (*),
        event_participants (
          user_id,
          status,
          users:user_id (
            full_name,
            username
          )
        ),
        groups:group_id (
          name
        )
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
    group_id
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
      created_by_ai: false,
      group_id: group_id || null
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

/**
 * Actualiza el estado de un participante de evento
 */
export async function updateParticipantStatus(participantId, newStatus) {
  const { data, error } = await supabase
    .from("event_participants")
    .update({ status: newStatus })
    .eq("id", participantId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Obtiene las invitaciones pendientes de eventos de un usuario
 */
export async function getPendingInvitationsByUser(userId) {
  const { data, error } = await supabase
    .from("event_participants")
    .select(`
      id,
      status,
      added_at,
      events (
        id,
        title,
        description,
        start_datetime,
        end_datetime,
        location,
        group_id,
        event_type_id,
        creator_id,
        event_types (
          name,
          color,
          icon
        )
      )
    `)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Obtiene el ID de un participante específico de un evento
 */
export async function getEventParticipantId(eventId, userId) {
  const { data, error } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}