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
    // Solo incluir eventos con status 'accepted'
    if (record.status !== 'accepted') {
      continue;
    }

    const ev = record.events;

    // Si el evento NO es recurrente → va directo
    if (!ev.recurrence_rules || ev.recurrence_rules.length === 0) {
      baseEvents.push({
        ...ev,
        is_recurring_instance: false,
        // Incluir información de grupo si existe
        group_id: ev.group_id || null,
        groups: ev.groups || null,
        // Incluir participantes
        event_participants: ev.event_participants || []
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
        start_datetime: occ.start.toISO(),
        end_datetime: occ.end.toISO(),
        event_types: occ.base_event.event_types,
        created_by_ai: occ.base_event.created_by_ai,
        is_recurring_instance: true,
        // Incluir información de grupo si existe
        group_id: occ.base_event.group_id || null,
        groups: occ.base_event.groups || null,
        // Incluir participantes
        event_participants: occ.base_event.event_participants || []
      });
    });
  }

  return {
    base: baseEvents,
    recurring: expanded,
    all: [...baseEvents, ...expanded].sort(
      (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
    )
  };
}
