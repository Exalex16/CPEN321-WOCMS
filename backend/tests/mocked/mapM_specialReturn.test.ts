import { app, closeServer } from "../../index";
import request from "supertest";
import * as turf from "@turf/turf";


const TEST_USER = "exalex16@gmail.com";

jest.mock("../../services", () => {
    const actualServices = jest.requireActual("../../services");

    return {
        ...actualServices,
        clinet: {
            connect: jest.fn().mockResolvedValue(undefined), 
            close: jest.fn(),
            db: jest.fn(() => ({
                collection: jest.fn(() => ({
                    find: jest.fn(() => ({
                        toArray: jest.fn(() => [
                            {
                                location: {
                                    position: { lat: 49.195, lng: -122.699 },
                                },
                                tags: ["TestTag"],
                            },
                        ]),
                    })),
                })),
            })),
        },
    };
});

afterAll(async () => {
    await closeServer(); 
});

// Interface: GET /map/popular-locations/:userEmail
describe("Mocked API Tests - get /map/popular-locations/:userEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Input: Simulated scenario where `turf.clustersDbscan` returns an **undefined `properties`** value
    // Expected status code: 200
    // Expected behavior: API should handle the missing cluster properties gracefully and return `null` coordinates
    // Expected output: { position: { lat: null, lng: null }, tags: [] }
    test("200 - Force cluster.properties to be undefined", async () => {
        jest.spyOn(turf, "clustersDbscan").mockImplementationOnce(() => {
            return {
                features: [
                    { geometry: { coordinates: [-122.699, 49.195] }, properties: undefined },
                ],
            } as unknown as ReturnType<typeof turf.clustersDbscan>;
        });

        const res = await request(app).get(`/map/popular-locations/${TEST_USER}`);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });
});
