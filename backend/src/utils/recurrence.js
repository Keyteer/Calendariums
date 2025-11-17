import pkg from "rrule";
const { RRule } = pkg;
import { DateTime } from "luxon";

/**
 * Convierte una RRULE del backend en un objeto RRule usable
 */
function buildRRuleInstance(rule, event) {
  // Punto de inicio del evento (dtstart)
  const dtStart = DateTime
    .fromISO(event.start_datetime, { zone: rule.timezone || "UTC" })
    .toJSDate();

  return new RRule({
    ...RRule.fromString(rule.rrule).origOptions,
    dtstart: dtStart
  });
}


/**
 * Expande TODAS las reglas de recurrencia del evento
 * dentro de un rango dado (rangeStart - rangeEnd).
 *
 * Devuelve un array de ocurrencias:
 *
 * [
 *   {
 *     start: DateTime,
 *     end: DateTime,
 *     event_id: "...",
 *     base_event: {...}
 *   }
 * ]
 */
export function expandEvent(event, rangeStart, rangeEnd) {
  if (!event.recurrence_rules || event.recurrence_rules.length === 0) {
    return []; // no hay reglas, no se expande
  }

  const startRange = DateTime.fromISO(rangeStart, { zone: "utc" });
  const endRange = DateTime.fromISO(rangeEnd, { zone: "utc" });
  const duration = DateTime.fromISO(event.end_datetime).diff(DateTime.fromISO(event.start_datetime));

  let occurrences = [];

  for (const rule of event.recurrence_rules) {
    const rrule = buildRRuleInstance(rule, event);

    const dates = rrule.between(
      startRange.toJSDate(),
      endRange.toJSDate(),
      true
    );

    for (const d of dates) {
      const start = DateTime.fromJSDate(d).setZone(rule.timezone || "UTC");
      const end = start.plus(duration);

      occurrences.push({
        event_id: event.id,
        start,
        end,
        base_event: event
      });
    }
  }

  // Ordenamos cronológicamente
  occurrences.sort((a, b) => a.start.toMillis() - b.start.toMillis());

  return occurrences;
}



/**
 * Devuelve SOLO la próxima ocurrencia futura del evento.
 */
export function getNextOccurrence(event, from = DateTime.utc()) {
  if (!event.recurrence_rules) return null;

  const duration = DateTime.fromISO(event.end_datetime).diff(DateTime.fromISO(event.start_datetime));

  let next = null;

  for (const rule of event.recurrence_rules) {
    const rrule = buildRRuleInstance(rule, event);
    const nextDate = rrule.after(from.toJSDate(), true);

    if (!nextDate) continue;

    const start = DateTime.fromJSDate(nextDate).setZone(rule.timezone || "UTC");
    const end = start.plus(duration);

    if (!next || start < next.start) {
      next = {
        event_id: event.id,
        start,
        end,
        base_event: event
      };
    }
  }

  return next;
}
