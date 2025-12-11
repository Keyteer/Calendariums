
import { parseEventFromText } from "../src/services/ollama.service.js";

async function test() {
    const userId = "45e2d13e-b0a6-4bf3-80ff-09195ae3aed0";

    // Scenarios requested by user
    const cases = [
        "Reunión en 3 días",
        "Proyecto en 2 semanas",
        "Vacaciones en 5 meses",
        "Evento en 1 año",
        // Smart Time Ranges
        "Clase de 10 a 2 de la tarde",  // Expect: 10:00 - 14:00 (Start is AM because 10 < 14 and 'tarde' implies range ends in PM)
        "Fiesta de 10 a 1 de la mañana", // Expect: 22:00 - 01:00 (+1 day) (Start is PM because range crosses midnight)
        "Trabajo de 11 a 5 de la tarde" // Expect: 11:00 - 17:00
    ];

    console.log("Starting Debugging Test (Relative Dates & Smart Time)...");

    for (const text of cases) {
        console.log(`\n--- Testing: "${text}" ---`);
        try {
            const { data, error } = await parseEventFromText(userId, text);
            if (error) {
                console.error("Service Error:", error);
            } else {
                console.log(`Parsed Title: ${data.title}`);
                console.log(`Date: ${data.start_datetime.split('T')[0]}`);
                console.log(`Time: ${data.start_datetime.split('T')[1].substring(0, 5)} - ${data.end_datetime.split('T')[1].substring(0, 5)}`);
                // Check if end date is different (for overnight events)
                const endYMD = data.end_datetime.split('T')[0];
                if (endYMD !== data.start_datetime.split('T')[0]) {
                    console.log(`End Date: ${endYMD} (Overnight)`);
                }
            }
        } catch (e) {
            console.error("Test Crash:", e);
        }
    }
}

test();
