import { DateTime } from "luxon";
import { getEventsByUserId } from "./events.service.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://ollama:11434";
const MODEL = "tinyllama"; // Changed to tinyllama due to memory constraints

/**
 * Generates a schedule suggestion for a single user.
 * @param {string} userId - The user ID.
 * @param {object} request - The user's request (e.g., "I want to study math for 2 hours").
 */
export async function generateScheduleSuggestion(userId, request) {
  try {
    // 1. Get existing events
    const { data: existingEvents, error } = await getEventsByUserId(userId);
    if (error) throw new Error("Could not fetch user events");

    const now = DateTime.now();
    const durationMinutes = parseInt(request.duration || 60);

    // 2. Find actual free slots deterministically
    const freeSlots = [];
    let searchTime = now.plus({ minutes: 15 }).set({ second: 0, millisecond: 0 }); // Start 15 mins from now

    // Round up to next 30 minute mark for cleaner times
    const remainder = searchTime.minute % 30;
    if (remainder !== 0) {
      searchTime = searchTime.plus({ minutes: 30 - remainder });
    }

    const searchEnd = now.plus({ days: 7 }); // Look ahead 7 days

    // Safety loop limit
    let iterations = 0;
    while (freeSlots.length < 15 && searchTime < searchEnd && iterations < 1000) {
      iterations++;
      const slotEnd = searchTime.plus({ minutes: durationMinutes });

      // Check for conflicts
      const hasConflict = existingEvents.some(e => {
        const eventStart = DateTime.fromISO(e.events.start_datetime);
        const eventEnd = DateTime.fromISO(e.events.end_datetime);
        // Check for overlap: (StartA < EndB) and (EndA > StartB)
        return (searchTime < eventEnd && slotEnd > eventStart);
      });

      if (!hasConflict) {
        freeSlots.push({
          start: searchTime.toISO(),
          end: slotEnd.toISO()
        });
        // Jump forward by duration + 30 mins to give variety
        searchTime = searchTime.plus({ minutes: durationMinutes + 30 });
      } else {
        // If conflict, jump 30 mins and try again
        searchTime = searchTime.plus({ minutes: 30 });
      }
    }

    if (freeSlots.length === 0) {
      return { data: [], error: "No free slots found in the next 7 days." };
    }

    // 3. Ask AI to pick the best slots
    const slotsContext = freeSlots.map((s, i) => `Slot ${i + 1}: ${DateTime.fromISO(s.start).toFormat("cccc, dd LLL HH:mm")} - ${DateTime.fromISO(s.end).toFormat("HH:mm")}`).join("\n");

    const prompt = `
You are a smart scheduling assistant.
User Request: "${request.description}"
Duration: ${durationMinutes} minutes.

Here are the ONLY available time slots found in the user's calendar:
${slotsContext}

Task: Select the 3 BEST slots for "${request.description}" from the list above.
Return ONLY a JSON array of objects with 'start_datetime', 'end_datetime', and 'reason'.
Use the EXACT dates and times from the selected slots.

Example Output:
[
  { "start_datetime": "2025-12-06T10:00:00.000Z", "end_datetime": "2025-12-06T11:00:00.000Z", "reason": "Good morning slot" }
]

Your Response (JSON Array only):
    `;

    // 4. Call Ollama with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    let response;
    try {
      response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          prompt: prompt,
          stream: false,
          format: "json"
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result = await response.json();

    // 5. Parse response
    try {
      let suggestions = JSON.parse(result.response);
      console.log("Ollama raw response:", JSON.stringify(suggestions, null, 2));

      // Handle wrapping
      if (!Array.isArray(suggestions)) {
        if (suggestions.task && Array.isArray(suggestions.task)) suggestions = suggestions.task;
        else if (suggestions.suggestions && Array.isArray(suggestions.suggestions)) suggestions = suggestions.suggestions;
        else if (suggestions.schedule && Array.isArray(suggestions.schedule)) suggestions = suggestions.schedule;
        else if (suggestions.suggested_timeslots && Array.isArray(suggestions.suggested_timeslots)) suggestions = suggestions.suggested_timeslots;
        else if (suggestions.timeSlotRecommendations && Array.isArray(suggestions.timeSlotRecommendations)) suggestions = suggestions.timeSlotRecommendations;
        else if (suggestions.results && Array.isArray(suggestions.results)) suggestions = suggestions.results;
        else if (suggestions.data && Array.isArray(suggestions.data)) suggestions = suggestions.data;
        else if (suggestions.start_datetime) suggestions = [suggestions];
        else {
          const values = Object.values(suggestions);
          const arrayVal = values.find(v => Array.isArray(v));
          if (arrayVal) suggestions = arrayVal;
        }
      }

      if (Array.isArray(suggestions)) {
        suggestions = suggestions
          .map(s => {
            const startRaw = s.start_datetime || s.startDateTime || s.startTime || s.start;
            const endRaw = s.end_datetime || s.endDateTime || s.endTime || s.end;
            if (!startRaw) return null;

            return {
              start_datetime: startRaw,
              end_datetime: endRaw,
              reason: s.reason || s.description || `Sugerencia para ${request.description}`
            };
          })
          .filter(s => s !== null)
          .filter(s => {
            // Final safety check
            const start = DateTime.fromISO(s.start_datetime);
            const end = DateTime.fromISO(s.end_datetime);
            const hasConflict = existingEvents.some(e => {
              const eStart = DateTime.fromISO(e.events.start_datetime);
              const eEnd = DateTime.fromISO(e.events.end_datetime);
              return (start < eEnd && end > eStart);
            });
            if (hasConflict) console.log(`AI hallucinated a conflict: ${s.start_datetime}`);
            return !hasConflict;
          });

        // Fallback: If AI returned nothing valid (or hallucinated), return the first 3 free slots directly.
        if (suggestions.length === 0 && freeSlots.length > 0) {
          console.log("AI failed to pick valid slots, returning raw free slots.");
          suggestions = freeSlots.slice(0, 3).map(slot => ({
            start_datetime: slot.start,
            end_datetime: slot.end,
            reason: "Available slot (AI fallback)"
          }));
        }
      }

      return { data: suggestions || [], error: null };

    } catch (e) {
      console.error("Failed to parse AI response", e);
      // Fallback on error
      if (freeSlots.length > 0) {
        return {
          data: freeSlots.slice(0, 3).map(slot => ({
            start_datetime: slot.start,
            end_datetime: slot.end,
            reason: "Available slot (Fallback)"
          })),
          error: null
        };
      }
      return { data: null, error: "AI returned invalid format and no free slots found" };
    }

  } catch (error) {
    console.error("Error generating suggestion:", error);
    return { data: null, error: error.message };
  }
}

/**
 * Generates a schedule suggestion for a group of users.
 * @param {string[]} userIds - Array of user IDs.
 * @param {object} request - The group request.
 */
export async function generateGroupScheduleSuggestion(userIds, request) {
  try {
    let allEvents = [];
    for (const uid of userIds) {
      const { data, error } = await getEventsByUserId(uid);
      if (!error && data) {
        allEvents = allEvents.concat(data.map(e => ({ ...e, userId: uid })));
      }
    }

    const now = DateTime.now();

    const eventsContext = allEvents
      .map(e => {
        const start = DateTime.fromISO(e.events.start_datetime);
        const end = DateTime.fromISO(e.events.end_datetime);
        return `- User ${e.userId} has ${e.events.title}: ${start.toFormat("HH:mm")} to ${end.toFormat("HH:mm")} (${start.toISODate()})`;
      })
      .join("\n");

    const prompt = `
You are a smart group scheduling assistant.
Current Date/Time: ${now.toISO()}
Group Request: "${request.description}"
Duration needed: ${request.duration || "60"} minutes.

Existing Schedules of Participants:
${eventsContext}

Task: Suggest 3 possible time slots where ALL participants are free in the next 5 days.
Return ONLY a JSON array of objects with 'start_datetime' (ISO 8601) and 'end_datetime' (ISO 8601) and 'reason' (short text).
Do not include any markdown or explanation outside the JSON.
        `;

    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        format: "json"
      }),
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const result = await response.json();
    const suggestions = JSON.parse(result.response);
    return { data: suggestions, error: null };

  } catch (error) {
    console.error("Error generating group suggestion:", error);
    return { data: null, error: error.message };
  }
}

/**
 * Parses a natural language text into a structured event object.
 * @param {string} userId - The user ID.
 * @param {string} text - The natural language text (e.g., "Reunion mañana de 7 a 9").
 */
export async function parseEventFromText(userId, text) {
  try {
    // Force -03:00 timezone for the user context
    const userNow = DateTime.now().setZone("UTC-3");
    const humanDate = userNow.toFormat("cccc, dd LLL yyyy, HH:mm"); // e.g. Sunday, 07 Dec 2025, 23:20

    console.log(`Parsing chat event. Input: "${text}", User Now: ${humanDate}`);

    const prompt = `
You are a smart scheduling assistant.
Current Date/Time: ${humanDate}
User Input: "${text}"

Task: Extract event details.
Rules:
1. "Mañana" = Day after Current Date.
2. "Hoy" = Current Date.
3. "12pm" is NOON (12:00). "12am" is MIDNIGHT (00:00).
4. Extract the DATE (YYYY-MM-DD) and TIME (HH:mm) separately.

Fields required:
- title: Short title.
- date: YYYY-MM-DD (The date of the event).
- start_time: HH:mm (24-hour format).
- end_time: HH:mm (24-hour format). If not specified, add 1 hour to start_time.
- location: "TBD" if not specified.
- description: Empty string if not specified.

Return ONLY a single JSON object. NO nesting.

Your Response (JSON only):
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response;
    try {
      response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          prompt: prompt,
          stream: false,
          format: "json"
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const result = await response.json();

    console.log("Ollama chat response:", result.response);

    let parsedEvent;
    try {
      parsedEvent = JSON.parse(result.response);
    } catch (e) {
      console.log("Raw AI response for chat (failed parse):", result.response);
      const cleanJson = result.response.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedEvent = JSON.parse(cleanJson);
    }

    // Robust unwrapping
    if (parsedEvent.output) parsedEvent = parsedEvent.output;
    else if (parsedEvent.outputs && parsedEvent.outputs.event) parsedEvent = parsedEvent.outputs.event;
    else if (parsedEvent.event) parsedEvent = parsedEvent.event;
    else if (parsedEvent.response) parsedEvent = parsedEvent.response;
    else if (parsedEvent.result) parsedEvent = parsedEvent.result;

    // Validate extracted fields
    if (!parsedEvent.date || !parsedEvent.start_time) {
      throw new Error("AI failed to extract date or start_time");
    }

    // Sanitize date (take only YYYY-MM-DD)
    const cleanDate = parsedEvent.date.substring(0, 10);

    // Sanitize time (ensure HH:mm format)
    const cleanStartTime = parsedEvent.start_time.substring(0, 5);
    const cleanEndTime = parsedEvent.end_time ? parsedEvent.end_time.substring(0, 5) : null;

    // Construct ISO strings in JS with correct offset
    const startIso = DateTime.fromFormat(
      `${cleanDate} ${cleanStartTime}`,
      "yyyy-MM-dd HH:mm",
      { zone: "UTC-3" }
    ).toISO();

    let endIso = null;
    if (cleanEndTime) {
      endIso = DateTime.fromFormat(
        `${cleanDate} ${cleanEndTime}`,
        "yyyy-MM-dd HH:mm",
        { zone: "UTC-3" }
      ).toISO();
    } else {
      // Default to 1 hour later
      endIso = DateTime.fromISO(startIso).plus({ hours: 1 }).toISO();
    }

    if (!startIso) throw new Error(`Invalid date/time format: ${cleanDate} ${cleanStartTime}`);

    // Return the final structure expected by the frontend
    return {
      data: {
        title: parsedEvent.title,
        start_datetime: startIso,
        end_datetime: endIso,
        location: parsedEvent.location || "TBD",
        description: parsedEvent.description || ""
      },
      error: null
    };

  } catch (error) {
    console.error("Error parsing event from text:", error);
    return { data: null, error: error.message };
  }
}
