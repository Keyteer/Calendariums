import { DateTime } from "luxon";
import { getEventsByUserId } from "./events.service.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://ollama:11434";
const MODEL = "tinyllama";

/**
 * Genera una sugerencia de horario para un solo usuario.
 */
export async function generateScheduleSuggestion(userId, request) {
  try {
    const { data: existingEvents, error } = await getEventsByUserId(userId);
    if (error) throw new Error("Could not fetch user events");

    const now = DateTime.now();
    const durationMinutes = parseInt(request.duration || 60);

    const freeSlots = [];
    let searchTime = now.plus({ minutes: 15 }).set({ second: 0, millisecond: 0 });

    const remainder = searchTime.minute % 30;
    if (remainder !== 0) {
      searchTime = searchTime.plus({ minutes: 30 - remainder });
    }

    const searchEnd = now.plus({ days: 7 });
    let iterations = 0;
    while (freeSlots.length < 15 && searchTime < searchEnd && iterations < 1000) {
      iterations++;
      const slotEnd = searchTime.plus({ minutes: durationMinutes });
      const hasConflict = existingEvents.some(e => {
        const eventStart = DateTime.fromISO(e.events.start_datetime);
        const eventEnd = DateTime.fromISO(e.events.end_datetime);
        return (searchTime < eventEnd && slotEnd > eventStart);
      });

      if (!hasConflict) {
        freeSlots.push({ start: searchTime.toISO(), end: slotEnd.toISO() });
        searchTime = searchTime.plus({ minutes: durationMinutes + 30 });
      } else {
        searchTime = searchTime.plus({ minutes: 30 });
      }
    }

    if (freeSlots.length === 0) return { data: [], error: "No free slots found in the next 7 days." };

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

Your Response (JSON Array only):
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    let response;
    try {
      response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt: prompt, stream: false, format: "json" }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const result = await response.json();

    try {
      let suggestions = JSON.parse(result.response);
      if (!Array.isArray(suggestions)) {
        if (suggestions.task && Array.isArray(suggestions.task)) suggestions = suggestions.task;
        else if (suggestions.suggestions && Array.isArray(suggestions.suggestions)) suggestions = suggestions.suggestions;
        else if (suggestions.schedule && Array.isArray(suggestions.schedule)) suggestions = suggestions.schedule;
        else if (suggestions.start_datetime) suggestions = [suggestions];
      }

      if (Array.isArray(suggestions)) {
        suggestions = suggestions
          .map(s => {
            const startRaw = s.start_datetime || s.startDateTime || s.start || s.startTime;
            const endRaw = s.end_datetime || s.endDateTime || s.end || s.endTime;
            if (!startRaw) return null;
            return {
              start_datetime: startRaw,
              end_datetime: endRaw,
              reason: s.reason || s.description || `Sugerencia para ${request.description}`
            };
          })
          .filter(s => s !== null);

        if (suggestions.length === 0 && freeSlots.length > 0) {
          suggestions = freeSlots.slice(0, 3).map(slot => ({
            start_datetime: slot.start,
            end_datetime: slot.end,
            reason: "Available slot (AI fallback)"
          }));
        }
      }
      return { data: suggestions || [], error: null };
    } catch (e) {
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
 * Genera una sugerencia de horario para un grupo.
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

    const eventsContext = allEvents
      .map(e => {
        const start = DateTime.fromISO(e.events.start_datetime);
        const end = DateTime.fromISO(e.events.end_datetime);
        return `- User ${e.userId} has ${e.events.title}: ${start.toFormat("HH:mm")} to ${end.toFormat("HH:mm")}`;
      })
      .join("\n");

    const prompt = `
You are a smart group scheduling assistant.
Group Request: "${request.description}"
Duration needed: ${request.duration || "60"} minutes.

Existing Schedules:
${eventsContext}

Task: Suggest 3 possible time slots where ALL participants are free in the next 5 days.
Return ONLY a JSON array of objects with 'start_datetime', 'end_datetime', and 'reason'.
    `;

    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt: prompt, stream: false, format: "json" }),
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
 * Procesa un evento desde texto natural y lo convierte en objeto.
 */
export async function parseEventFromText(userId, text) {
  try {
    const userNow = DateTime.now().setZone("UTC-3");
    const humanDate = userNow.toFormat("cccc, dd LLL yyyy, HH:mm");

    let historyContext = "No history available.";
    try {
      const { data: eventsData, error: eventsError } = await getEventsByUserId(userId);
      if (!eventsError && eventsData) {
        const recentEvents = eventsData.map(e => e.events).filter(e => e.title).slice(-20);
        if (recentEvents.length > 0) {
          historyContext = recentEvents.map(e => {
            const start = DateTime.fromISO(e.start_datetime);
            return `- ${e.title} @ ${start.toFormat("HH:mm")}`;
          }).join("\n");
        }
      }
    } catch (hErr) { console.warn("Failed to load history:", hErr); }

    console.log(`Parsing chat event. Input: "${text}", User Now: ${humanDate}`);

    const prompt = `
You are a smart scheduling assistant.
Current Date: ${humanDate}
User Input: "${text}"

Task: Extract event details from Input.
Ref: User habits:
${historyContext}

Valid Event Types: Clase, Evento Social, Examen, Otro, Proyecto, Reunión, Tarea.

Rules:
1. Return strictly ONE JSON object.
2. If text mentions "Mañana", date is tomorrow.
3. If text mentions "Hoy", date is today.
4. If no time, use habits or default 09:00.
5. "title" = Input text (capitalized).
6. "event_type_id" = Exact string from Valid Types.

Response Format (JSON):
{
  "title": "string",
  "date": "YYYY-MM-DD",
  "start_time": "HH:mm",
  "end_time": "HH:mm",
  "event_type_id": "string",
  "description": ""
}
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response;
    try {
      response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt: prompt, stream: false, format: "json" }),
        signal: controller.signal
      });
    } finally { clearTimeout(timeoutId); }

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const result = await response.json();

    let parsedEvent;
    try {
      parsedEvent = JSON.parse(result.response);
    } catch (e) {
      console.log("Raw AI response failed parse, trying cleanup:", result.response);
      const cleanJson = result.response.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedEvent = JSON.parse(cleanJson);
    }

    if (parsedEvent.output) parsedEvent = parsedEvent.output;
    else if (parsedEvent.outputs && parsedEvent.outputs.event) parsedEvent = parsedEvent.outputs.event;
    else if (parsedEvent.event) parsedEvent = parsedEvent.event;
    else if (parsedEvent.response) parsedEvent = parsedEvent.response;

    // --- LIMPIEZA DE FECHA ---
    let cleanDate = null;
    const lowerText = text.toLowerCase();

    // 0. Verificar patrón de fecha específica "20 de diciembre"
    const months = {
      "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
      "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12
    };
    const dateRegex = /(\d{1,2})\s*de\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
    const dateMatch = lowerText.match(dateRegex);

    // 0.5 Verificar patrón "Sábado 20" o "El 20" (Mes implícito)
    const simpleDateRegex = /(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|el|dia)\s+(\d{1,2})\b/i;
    const simpleDateMatch = lowerText.match(simpleDateRegex);

    // 0.6 Verificar fechas relativas avanzadas "en X dias/semanas"
    const relativeRegex = /en\s+(\d+)\s+(dias|días|semanas?|meses|mes|años?|anos?)/i;
    const relativeMatch = lowerText.match(relativeRegex);

    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const monthName = dateMatch[2].toLowerCase();
      const month = months[monthName];

      let year = userNow.year;
      let putativeDate = DateTime.fromObject({ year, month, day }, { zone: "UTC-3" });
      if (putativeDate < userNow.minus({ days: 30 })) {
        putativeDate = putativeDate.plus({ years: 1 });
      }
      cleanDate = putativeDate.toISODate();
      console.log(`Specific date parsed: ${cleanDate} (${day} de ${monthName})`);
    }
    // Lógica para fechas relativas "en X ..."
    else if (relativeMatch) {
      const val = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      let addConfig = {};
      if (unit.includes("dia") || unit.includes("día")) addConfig = { days: val };
      else if (unit.includes("semana")) addConfig = { weeks: val };
      else if (unit.includes("mes")) addConfig = { months: val };
      else if (unit.includes("año") || unit.includes("ano")) addConfig = { years: val };

      cleanDate = userNow.plus(addConfig).toISODate();
      console.log(`Relative date parsed: ${cleanDate} (in ${val} ${unit})`);
    }
    // Lógica para fecha implícita (ej. "Sábado 20")
    // Lógica para fecha implícita (ej. "Sábado 20")
    else if (simpleDateMatch) {
      const day = parseInt(simpleDateMatch[1]);
      if (day > 0 && day <= 31) {
        let candidate = userNow.set({ day });
        // Si la fecha candidata es anterior a hoy, asumir el próximo mes
        if (candidate < userNow.startOf('day')) {
          candidate = candidate.plus({ months: 1 });
        }
        cleanDate = candidate.toISODate();
        console.log(`Implicit date parsed: ${cleanDate} (Day ${day})`);
      }
    }
    // 1. Verificar palabras clave (Mañana, Hoy)
    else if (lowerText.includes("mañana") && !lowerText.includes("de la mañana")) {
      cleanDate = userNow.plus({ days: 1 }).toISODate();
      console.log("Date forced to tomorrow");
    } else if (lowerText.includes("hoy")) {
      cleanDate = userNow.toISODate();
      console.log("Date forced to today");
    } else {
      const daysOfWeek = [
        { name: "lunes", val: 1 }, { name: "martes", val: 2 }, { name: "miércoles", val: 3 }, { name: "miercoles", val: 3 },
        { name: "jueves", val: 4 }, { name: "viernes", val: 5 }, { name: "sábado", val: 6 }, { name: "sabado", val: 6 }, { name: "domingo", val: 7 }
      ];
      for (const d of daysOfWeek) {
        if (lowerText.includes(d.name)) {
          let diff = d.val - userNow.weekday;
          if (diff < 0) diff += 7;
          cleanDate = userNow.plus({ days: diff }).toISODate();
          console.log(`Date inferred from '${d.name}': ${cleanDate}`);
          break;
        }
      }
    }

    if (!cleanDate && parsedEvent.date) {
      const d = parsedEvent.date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) cleanDate = d;
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
        const parts = d.split("/");
        cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        const iso = DateTime.fromISO(d);
        if (iso.isValid) cleanDate = iso.toISODate();
      }
    }
    if (!cleanDate) cleanDate = userNow.toISODate();

    // --- LIMPIEZA DE TÍTULO ---
    let cleanTitle = parsedEvent.title;
    const hasLetters = /[a-zA-Z]/.test(text);
    if (text.length < 60 && hasLetters) {
      cleanTitle = text.charAt(0).toUpperCase() + text.slice(1);
    } else {
      const isGeneric = !cleanTitle || cleanTitle === "Nuevo Evento";
      const looksLikeDate = cleanTitle && (/\d{4}/.test(cleanTitle) || /\d{1,2}:\d{2}/.test(cleanTitle));
      if (isGeneric || looksLikeDate) cleanTitle = "Nuevo Evento";
    }

    // --- TIPO DE EVENTO ---
    const EVENT_TYPES = ["Clase", "Evento Social", "Examen", "Otro", "Proyecto", "Reunión", "Tarea"];
    let cleanEventType = "Otro"; // Default as requested

    // Mapeo de palabras clave
    const typeKeywords = {
      "Clase": ["clase", "clases", "aula", "cátedra", "catedra", "taller"],
      "Reunión": ["reunión", "reunion", "junta", "meet", "meeting", "cita"],
      "Proyecto": ["proyecto", "entrega", "avance", "proyectos"],
      "Examen": ["examen", "prueba", "certamen", "parcial", "test", "evaluación", "evaluacion", "quiz"],
      "Tarea": ["tarea", "deberes", "trabajo"],
      "Evento Social": ["fiesta", "cumpleaños", "cumple", "salida", "juntada", "carrete", "cena", "almuerzo", "evento", "social"]
    };

    // 1. Intentar coincidencia exacta de palabra clave usando 'some'
    let keywordFound = false;
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(k => lowerText.includes(k))) {
        cleanEventType = type;
        keywordFound = true;
        console.log(`Event Type inferred from keyword: ${cleanEventType}`);
        break;
      }
    }

    // 2. Si no hay palabra clave, intentar detección por IA (si el ID es válido)
    if (!keywordFound && parsedEvent.event_type_id) {
      const match = EVENT_TYPES.find(t => t.toLowerCase() === String(parsedEvent.event_type_id).toLowerCase());
      if (match) cleanEventType = match;
    }

    // --- PARSEO DE HORA (PRIORIDAD TEXTO) ---
    let cleanStartTime = null;
    let cleanEndTime = null;
    let timeFound = false;

    // Rango: "1 a 2", "13:00 a 14:00", "5 a 6"
    const rangeRegex = /(\d{1,2})(?::(\d{2}))?\s*(?:a|to|-)\s*(\d{1,2})(?::(\d{2}))?/;
    const rangeMatch = lowerText.match(rangeRegex);

    // Individual: "a las 5", "at 14:30"
    const singleRegex = /(?:a las|at|@)\s*(\d{1,2})(?::(\d{2}))?/;
    const singleMatch = lowerText.match(singleRegex);

    const isPm = /tarde|noche|pm|p\.m\./i.test(text);
    const to24h = (h, m, pm) => {
      h = parseInt(h);
      m = m ? parseInt(m) : 0;
      if (pm && h < 12) h += 12;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    if (rangeMatch) {
      let [_, h1, m1, h2, m2] = rangeMatch;

      // Smart AM/PM Logic (e.g. "10 a 2 de la tarde")
      const modifierMatch = lowerText.match(/(?:de la|por la)\s*(tarde|noche|mañana|manana)/i);
      let smartPm = isPm;

      if (modifierMatch) {
        const modStr = modifierMatch[1].toLowerCase();
        const isModPm = modStr.includes("tarde") || modStr.includes("noche");
        const isModAm = modStr.includes("mañana") || modStr.includes("manana");

        let h1Int = parseInt(h1);
        let h2Int = parseInt(h2);

        // Si el rango es invertido numéricamente (ej. 10 a 2), asume cruce de mediodía o medianoche
        if (h1Int > h2Int) {
          // Caso: "10 a 2 de la tarde" -> End es tarde (14), Start es AM (10)
          if (isModPm) {
            // End es PM, Start es AM
            h2 = (h2Int < 12 ? h2Int + 12 : h2Int).toString(); // End PM
            // Start se mantiene AM (no se suma 12 a 10)
            smartPm = false; // Ya manejamos la conversión manual para End
          }
          // Caso: "10 a 1 de la mañana" -> End es AM (1), Start es PM (22)
          else if (isModAm) {
            // End es AM (se mantiene 1)
            // Start es PM anterior
            h1 = (h1Int < 12 ? h1Int + 12 : h1Int).toString();
            smartPm = false;
          }
        } else {
          // Caso normal: "1 a 5 de la tarde" -> Ambos PM
          if (isModPm) smartPm = true;
          // "10 a 11 de la mañana" -> Ambos AM
          if (isModAm) smartPm = false;
        }
      }

      cleanStartTime = to24h(h1, m1, smartPm);
      cleanEndTime = to24h(h2, m2, smartPm);
      timeFound = true;
      console.log(`Time Extracted (Range): ${cleanStartTime} - ${cleanEndTime}`);
    } else if (singleMatch) {
      const [_, h1, m1] = singleMatch;
      cleanStartTime = to24h(h1, m1, isPm);
      timeFound = true;
      console.log(`Time Extracted (Single): ${cleanStartTime}`);
    } else {
      const simpleTime = lowerText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|hrs|hs)/);
      if (simpleTime) {
        const isPmLocal = simpleTime[3] && simpleTime[3].startsWith('p');
        cleanStartTime = to24h(simpleTime[1], simpleTime[2], isPmLocal || isPm);
        timeFound = true;
      }
    }

    if (!cleanStartTime && parsedEvent.start_time) {
      let t = parsedEvent.start_time.trim();
      const isoTime = DateTime.fromISO(t);
      if (isoTime.isValid) cleanStartTime = isoTime.toFormat("HH:mm");
      else if (/^\d{1,2}:\d{2}$/.test(t)) cleanStartTime = t.padStart(5, '0');
      else if (/^\d{1,2}$/.test(t)) cleanStartTime = `${t.padStart(2, '0')}:00`;
    }

    if (!cleanStartTime) cleanStartTime = "09:00";

    if (!timeFound && parseInt(cleanStartTime.split(":")[0]) < 6) {
      if (!/\d/.test(text.replace(/mañana|hoy|tarde/gi, ''))) cleanStartTime = "09:00";
    }

    if (!cleanEndTime) {
      if (parsedEvent.end_time && !timeFound) {
        const t = parsedEvent.end_time.trim();
        const iso = DateTime.fromISO(t);
        if (iso.isValid) cleanEndTime = iso.toFormat("HH:mm");
        else if (/^\d{1,2}:\d{2}$/.test(t)) cleanEndTime = t.padStart(5, '0');
      }
    }

    const startObj = DateTime.fromFormat(`${cleanDate} ${cleanStartTime}`, "yyyy-MM-dd HH:mm", { zone: "UTC-3" });
    const startIso = startObj.toISO();

    let endIso = null;
    let endObj = null;
    if (cleanEndTime) {
      endObj = DateTime.fromFormat(`${cleanDate} ${cleanEndTime}`, "yyyy-MM-dd HH:mm", { zone: "UTC-3" });
      // Si la hora de fin es menor que la de inicio (ej. 22:00 a 01:00), asumimos que es al día siguiente
      if (endObj < startObj) {
        endObj = endObj.plus({ days: 1 });
      }
      // Asegurar duración mínima si sigue siendo <= (caso igual hora)
      if (endObj <= startObj) endObj = startObj.plus({ hours: 1 });
    } else {
      endObj = startObj.plus({ hours: 1 });
    }
    endIso = endObj.toISO();

    // --- RESOLUCIÓN DE CONFLICTOS ---
    const hasExplicitTime = timeFound || /\d{1,2}(:|.\d{2})?\s*(am|pm)/i.test(text);

    if (!hasExplicitTime) {
      const { data: userEvents } = await getEventsByUserId(userId);
      if (userEvents) {
        const hasConflict = userEvents.some(e => {
          const eStart = DateTime.fromISO(e.events.start_datetime);
          const eEnd = DateTime.fromISO(e.events.end_datetime);
          return (startObj < eEnd && endObj > eStart);
        });

        if (hasConflict) {
          console.log("Implicit time conflict. Rescheduling...");
          let newStart = startObj.plus({ hours: 1 });
          let newEnd = endObj.plus({ hours: 1 });
          let found = false;
          for (let i = 0; i < 5; i++) {
            const conflict = userEvents.some(e => {
              const eStart = DateTime.fromISO(e.events.start_datetime);
              const eEnd = DateTime.fromISO(e.events.end_datetime);
              return (newStart < eEnd && newEnd > eStart);
            });
            if (!conflict) { found = true; break; }
            newStart = newStart.plus({ hours: 1 });
            newEnd = newEnd.plus({ hours: 1 });
          }
          if (found) {
            return {
              data: {
                title: cleanTitle,
                start_datetime: newStart.toISO(),
                end_datetime: newEnd.toISO(),
                location: "TBD",
                description: "",
                event_type_id: cleanEventType,
                created_by_ai: true
              },
              error: null
            };
          }
        }
      }
    }

    return {
      data: {
        title: cleanTitle,
        start_datetime: startIso,
        end_datetime: endIso,
        location: "TBD",
        description: "",
        event_type_id: cleanEventType,
        created_by_ai: true
      },
      error: null
    };

  } catch (error) {
    console.error("Error parsing event:", error);
    return { data: null, error: error.message };
  }
}
