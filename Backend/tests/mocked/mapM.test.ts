import "../../controllers/mapController";
import "../../routes/mapRoutes";
import { app, server, closeServer } from "../../index";
import request from "supertest";
import { clinet } from "../../services"; // Ensure clinet is properly imported

const TEST_USER = "exalex16@gmail.com";

afterAll(async () => {
    await closeServer(); 
});

describe("Mocked API Tests - get /map/popular-locations/:userEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on getRecommendation", async () => {
        // ✅ Ensure clinet.db().collection().find() is properly mocked to throw an error
        const mockFind = jest.fn(() => ({
            toArray: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),
        }));

        jest.spyOn(clinet, "db").mockReturnValue({
            collection: jest.fn().mockReturnValue({
                find: mockFind,
            }),
        } as any);

        const res = await request(app).get(`/map/popular-locations/${TEST_USER}`);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });
});
