import { supabase } from "../config/supabase.js";

export async function getEventsByUserId(userId) {
  return await supabase
    .from("event_participants")
    .select(`
      events (*)
    `)
    .eq("user_id", userId);
}
