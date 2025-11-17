import { expandEvent } from "./recurrence.js";

/**
 * Recibe eventos desde Supabase (sin expandir)
 * y devuelve:
 *    → eventos individuales sin recurrencia
 *    → todas las ocurrencias generadas por RRULE
 */
export function buildUserCalendar(events, rangeStart, rangeEnd) {
  const expanded = [];
  const baseEvents = [];

  for (const record of events) {
    const ev = record.events;

    // Si el evento NO es recurrente → va directo
    if (!ev.recurrence_rules || ev.recurrence_rules.length === 0) {
      baseEvents.push({
        ...ev,
        is_recurring_instance: false
      });
      continue;
    }

    // Evento recurrente → expandir
    const occurrences = expandEvent(ev, rangeStart, rangeEnd);

    occurrences.forEach((occ) => {
      expanded.push({
        id: `${occ.event_id}_${occ.start.toMillis()}`, // identificador único
        event_id: occ.event_id,
        title: occ.base_event.title,
        description: occ.base_event.description,
        location: occ.base_event.location,
        start: occ.start.toISO(),
        end: occ.end.toISO(),
        event_type: occ.base_event.event_types,
        is_recurring_instance: true
      });
    });
  }

  return {
    base: baseEvents,
    recurring: expanded,
    all: [...baseEvents, ...expanded].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    )
  };
}
