
import { parseEventFromText } from "../src/services/ollama.service.js";

async function test() {
    const userId = "45e2d13e-b0a6-4bf3-80ff-09195ae3aed0";

    // User reported: "Certamen" -> Clase, "certamen" -> Proyecto
    const cases = [
        "Certamen",
        "certamen",
        "Certamen de matemáticas",
        "Tengo un certamen",
        "Estudiar para el certamen"
    ];

    console.log("Starting Debugging Test (Event Type - Certamen)...");

    for (const text of cases) {
        console.log(`\n--- Testing: "${text}" ---`);
        try {
            const { data, error } = await parseEventFromText(userId, text);
            if (error) {
                console.error("Service Error:", error);
            } else {
                console.log(`Parsed Title: ${data.title}`);
                console.log(`Detected Type: ${data.event_type_id}`);
            }
        } catch (e) {
            console.error("Test Crash:", e);
        }
    }
}

test();
