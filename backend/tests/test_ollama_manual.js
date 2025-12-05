// Standalone test script for Ollama
// Usage: node tests/test_ollama_manual.js

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const MODEL = "tinyllama";

async function testOllama() {
    console.log(`Testing Ollama connectivity at ${OLLAMA_HOST}...`);
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            console.log("Ollama is reachable.");
            console.log("Available models:", data.models.map(m => m.name).join(", "));

            const hasModel = data.models.some(m => m.name.includes(MODEL));
            if (!hasModel) {
                console.warn(`WARNING: Model '${MODEL}' not found.`);
                console.warn(`Please run: docker exec -it calendarium-ollama ollama pull ${MODEL}`);
            } else {
                console.log(`SUCCESS: Model '${MODEL}' is available.`);
            }

            // Try a simple generation
            console.log("\nTesting generation...");
            const genResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: "Say hello",
                    stream: false
                }),
            });

            if (genResponse.ok) {
                const genData = await genResponse.json();
                console.log("Generation response:", genData.response);
            } else {
                console.error("Generation failed:", genResponse.statusText);
            }

        } else {
            console.error("Ollama reachable but returned error:", response.statusText);
        }
    } catch (error) {
        console.error("Could not reach Ollama:", error.message);
        console.error("Make sure the Ollama container is running and ports are mapped (11434:11434).");
    }
}

testOllama();
