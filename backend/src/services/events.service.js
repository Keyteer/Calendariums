import { supabase } from "../config/supabase.js";

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
  const { title, description, event_type_id, creator_id, start_datetime, end_datetime, location, recurrence_rule } = eventData;

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

  // Si hay regla de recurrencia, agregarla
  if (recurrence_rule) {
    const { error: rruleError } = await supabase
      .from("recurrence_rules")
      .insert({
        event_id: event.id,
        rrule: recurrence_rule.rrule,
        timezone: recurrence_rule.timezone || "UTC"
      });

    if (rruleError) {
      console.error("Error adding recurrence rule:", rruleError);
    }
  }

  return { data: event, error: null };
}

/**
 * Elimina un evento por ID
 */
export async function deleteEventById(eventId) {
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