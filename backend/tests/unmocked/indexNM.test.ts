import {app, closeServer} from "../../index"
import request from "supertest";

afterAll(async () => {
    await closeServer(); 
});

// Interface: GET /
describe("Unmocked API Tests - post /", () => {
    // Input: Standard GET request to the root route `/`
    // Expected status code: 200
    // Expected behavior: The route should respond successfully
    // Expected output: "CPEN321 2024W2 PhotoMap Placeholder"
    test("200 - Root route responds successfully", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
        expect(res.text).toBe("CPEN321 2024W2 PhotoMap Placeholder");
    });
});