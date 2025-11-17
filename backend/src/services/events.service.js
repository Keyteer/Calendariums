import { supabase } from "../config/supabase.js";

/**
 * Obtiene todos los eventos de un usuario
 */
import { supabase } from "../config/supabase.js";

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
        event_types (
          name,
          color,
          icon
        ),
        recurrence_rules:recurrence_rules!recurrence_rules_event_id_fkey (*),
        event_participants ( user_id, status )
      )
    `)
    .eq("user_id", userId);
}