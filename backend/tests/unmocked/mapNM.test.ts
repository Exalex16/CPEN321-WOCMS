import path from "path";
import {app, closeServer} from "../../index"
import request from "supertest";

const TEST_IMAGE = path.join(__dirname, "../test1.png");
const TEST_USER = "exalex16@gmail.com";

const TEST_LOCATION = JSON.stringify({
    position: { lat: 49.1957796162, lng: -122.69934184 },
    title: "Valid Location",
    location: "Surrey",
    icon: "Green"
});

const TEST_LOCATION_BAD = JSON.stringify({
    position: { lat: 1234, lng: 5432 }, // Invalid lat/lng
    title: "Invalid Location",
    location: "Unknown",
    icon: "Red"
});

afterAll(async () => {
    await closeServer();
});

// Interface: GET /map/popular-locations/:userEmail
describe("Unmocked API Tests - get /map/popular-locations/:userEmail", () => {
    // Input: User with no uploaded images
    // Expected status code: 200
    // Expected behavior: Returns message stating no images exist
    // Expected output: { popularLocation: null, message: "No images uploaded. Cannot generate recommendation." }
    test("200 - No Images Found for User", async () => {
        const res = await request(app).get(`/map/popular-locations/${TEST_USER}`);

        expect(res.status).toBe(200);
        expect(res.body.popularLocation).toBeNull();
        expect(res.body.message).toBe("No images uploaded. Cannot generate recommendation.");
    });

    // Input: Upload an image **without** a location field
    // Expected status code: 200
    // Expected behavior: Returns message stating no valid locations were found
    // Expected output: { message: "No valid image locations found. Cannot generate recommendation." }
    test("200 - No Location Locations Found", async () => {
        // Upload an image with invalid location
        await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload with bad location")
            .attach("image", TEST_IMAGE, "test_bad.png");

        // Request recommendation
        const res = await request(app).get(`/map/popular-locations/${TEST_USER}`);

        expect(res.status).toBe(200);
        expect(res.body.popularLocation).toBeNull();
        expect(res.body.message).toBe("No valid image locations found. Cannot generate recommendation.");
    });

    // Input: Upload an image with **invalid** location (bad lat/lng)
    // Expected status code: 200
    // Expected behavior: Returns message stating no valid locations exist
    // Expected output: No valid image locations found. Cannot generate recommendation.
    test("200 - No Valid Locations Found", async () => {
        // Upload an image with invalid location
        await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload with bad location")
            .field("location", TEST_LOCATION_BAD)
            .attach("image", TEST_IMAGE, "test_bad.png");

        // Request recommendation
        const res = await request(app).get(`/map/popular-locations/${TEST_USER}`);

        expect(res.status).toBe(200);
        expect(res.body.popularLocation).toBeNull();
        expect(res.body.message).toBe("No valid image locations found. Cannot generate recommendation.");
    });

    // Input: Upload an image with a **valid** location and request recommendations
    // Expected status code: 200
    // Expected behavior: Returns a location recommendation with valid lat/lng
    // Expected output: Get recommendation location with valiad information
    test("200 - Successfully Generate Recommendation", async () => {
        // Upload an image with a valid location
        await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload with good location")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test_valid.png");

        // Request recommendation
        const res = await request(app).get(`/map/popular-locations/${TEST_USER}`);

        expect(res.status).toBe(200);
        expect(res.body.popularLocation).toHaveProperty("position");
        expect(res.body.popularLocation.position).toHaveProperty("lat");
        expect(res.body.popularLocation.position).toHaveProperty("lng");
        expect(Array.isArray(res.body.popularLocation.tags)).toBe(true);
    });

    // Input: Delete all images uploaded by the user
    // Expected status code: 200
    // Expected behavior: Deletes all images successfully
    // Expected output: { message: "Images deleted successfully" }
    test("Delete All Images by User", async () => {
        const res = await request(app).delete(`/image/delete-all/${TEST_USER}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message");
    });
});