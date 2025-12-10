
import { getEventsByUserId } from "../src/services/events.service.js";

async function test() {
    const userId = "45e2d13e-b0a6-4bf3-80ff-09195ae3aed0"; // User from logs
    console.log("Testing getEventsByUserId for:", userId);
    try {
        const { data, error } = await getEventsByUserId(userId);
        if (error) {
            console.error("DB Error:", error);
        } else {
            console.log("Success! Found events:", data.length);
            if (data.length > 0) {
                console.log("Sample event:", JSON.stringify(data[0], null, 2));
            }
        }
    } catch (e) {
        console.error("Crash:", e);
    }
}

test();
