import "../../controllers/mapController";
import "../../routes/mapRoutes";
import { app, closeServer } from "../../index";
import request from "supertest";
import { clinet } from "../../services"; 

const TEST_USER = "exalex16@gmail.com";

afterAll(async () => {
    await closeServer(); 
});

// Interface: GET /map/popular-locations/:userEmail
describe("Mocked API Tests - get /map/popular-locations/:userEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Input: Simulated MongoDB failure when retrieving user image locations
    // Expected status code: 500
    // Expected behavior: API should handle the failure and return an "Internet Error" response
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on getRecommendation", async () => {
        const mockFind = jest.fn(() => ({
            toArray: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),
        }));

        jest.spyOn(clinet, "db").mockReturnValue({
            collection: jest.fn().mockReturnValue({
                find: mockFind,
            }),
        } as unknown as ReturnType<typeof clinet.db>);

        const res = await request(app).get(`/map/popular-locations/${TEST_USER}`);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });
});
