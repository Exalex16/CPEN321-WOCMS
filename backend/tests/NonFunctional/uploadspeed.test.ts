import request from "supertest";
import path from "path";
import {app, closeServer} from "../../index"

const TEST_IMAGE = path.join(__dirname, "../test1.png");
const TEST_USER = "exalex16@gmail.com";
let uploadedFileName1 = "";  
let uploadedFileName2 = "";  

const TEST_LOCATION = JSON.stringify({
    position: {
        lat: 49.1957796162,
        lng: -122.69934184
    },
    title: "g",
    location: "Surrey",
    icon: "Green"
});

const TEST_LOCATION2 = JSON.stringify({
    position: {
        lat: 49.1957796162123,
        lng: -122.69934184123
    },
    title: "g",
    location: "Surrey",
    icon: "Green"
});

// Track overall test time
let overallStartTime: number;
let overallEndTime: number;

// Track image upload test times
let upload1Start: number, upload1End: number;
let upload2Start: number, upload2End: number;

const safeLog = (message: string) => {
    process.stdout.write(message.replace(/[\r\n]/g, '') + '\n'); // Ensures no CRLF injection
};

afterAll(async () => {
    overallEndTime = Date.now();
    safeLog(`Total Test Execution Time: ${(overallEndTime - overallStartTime) / 1000}s`);
    safeLog(`Image Upload Test 1 Execution Time: ${(upload1End - upload1Start) / 1000}s`);
    safeLog(`Image Upload Test 2 Execution Time: ${(upload2End - upload2Start) / 1000}s`);
    await closeServer();
});

// Non Functional one: Upload speed
describe("Unmocked API Tests - post /upload", () => {
    jest.setTimeout(6000);
    overallStartTime = Date.now();
    // Post a user
    test("Ensure Test User Exists", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_USER,
                googleName: "Alex Example",
            });
    
        expect([200, 201]).toContain(res.status);
        expect(res.body).toHaveProperty("message");
    });


    // Input two locations
    test("Update Recipient Profile with Test Location", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "token1 Example")
            .field("location", TEST_LOCATION2); 
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body).toHaveProperty("addedLocation");
    });

    
    test("Update Recipient Profile with Test Location", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "token1 Example")
            .field("location", TEST_LOCATION); 
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body).toHaveProperty("addedLocation");
    });
    

    // Upload Second Photo in Location2
    test("Upload Image with Location", async () => {
        upload1Start = Date.now();
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE); 
        upload1End = Date.now();
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("fileName");
        expect(res.body).toHaveProperty("imageUrl");

        uploadedFileName1 = res.body.fileName;
    });

    // Upload Second Photo in Location2
    test("Upload Image with Location", async () => {
        upload2Start = Date.now();
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("location", TEST_LOCATION2)
            .attach("image", TEST_IMAGE); 
        upload2End = Date.now();
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("fileName");
        expect(res.body).toHaveProperty("imageUrl");

        uploadedFileName2 = res.body.fileName;
    });

    // Delete Second Photo
    test("Delete Uploaded Image", async () => {
        const res = await request(app).delete(`/image/${uploadedFileName1}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Image deleted successfully");
    });

    // Delete Second Photo
    test("Delete Uploaded Image", async () => {
        const res = await request(app).delete(`/image/${uploadedFileName2}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Image deleted successfully");
    });    
});
