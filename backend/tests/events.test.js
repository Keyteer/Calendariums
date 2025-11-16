import request from "supertest";
import app from "../src/app.js";

describe("GET /events", () => {
  it("debería responder con 200 y retornar eventos", async () => {
    const response = await request(app).get("/events?user_id=test-user");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
