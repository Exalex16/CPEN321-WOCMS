import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import "../../controllers/imageController";
import "../../routes/imageRoutes";
import {app} from "../../index"
import request from "supertest";

const TEST_IMAGE = path.join(__dirname, "../test1.png");
const TEST_USER = "exalex16@gmail.com";
let uploadedFileName = "";  
const TEST_RECIPIENT = "token1";

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

describe("Unmocked API Tests - imageController", () => {
    test("✅ Ensure Test User Exists", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_USER,
                googleName: "Alex Example",
            });
    
        expect([200, 201]).toContain(res.status);
        expect(res.body).toHaveProperty("message");
    });

    test("✅ Ensure Test RECIPIENT Exists", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_RECIPIENT,
                googleName: "token1 Example",
            });
    
        expect([200, 201]).toContain(res.status);
        expect(res.body).toHaveProperty("message");
    });

    test("✅ Update Recipient Profile with Test Location", async () => {
        const res = await request(app)
            .put(`/user/${TEST_RECIPIENT}`)
            .field("googleName", "token1 Example")
            .field("location", TEST_LOCATION2); 
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body).toHaveProperty("addedLocation");
    });

    test("✅ Upload Image with Location", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE); // ✅ Correct way to send a file

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("fileName");
        expect(res.body).toHaveProperty("imageUrl");

        uploadedFileName = res.body.fileName;
    });

    test("❌ 400 - No File Uploaded", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION); // ❌ No `.attach()`

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("No file uploaded");
    });

    test("❌ 400 - Invalid Location Format", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", "invalid_json") // ❌ Invalid JSON
            .attach("image", TEST_IMAGE);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid location format. Ensure it's valid JSON.");
    });

    test("✅ Get Image Metadata", async () => {
        const res = await request(app).get(`/metadata/${uploadedFileName}`);
        expect(res.status).toBe(200);
        expect(res.body.fileName).toBe(uploadedFileName);
    });

    test("❌ 404 - Get Non-Existing Image Metadata", async () => {
        const res = await request(app).get("/metadata/non-existing.jpg");
        expect(res.status).toBe(404);
    });

    test("✅ Get Images By Uploader", async () => {
        const res = await request(app).get(`/images/uploader/${TEST_USER}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.images)).toBe(true);
    });

    test("❌ 404 - User Does Not Exist", async () => {
        const res = await request(app).get(`/images/uploader/nonexistent@example.com`);
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });

    test("✅ Get All Images", async () => {
        const res = await request(app).get("/images");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.images)).toBe(true);
    });

    test("✅ Update Image Description", async () => {
        const res = await request(app)
            .put("/image/update-description")
            .send({ fileName: uploadedFileName, newDescription: "Updated test description" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Image description updated successfully");
        expect(res.body.fileName).toBe(uploadedFileName);
        expect(res.body.newDescription).toBe("Updated test description");
    });

    test("❌ 404 - Update Description for Non-Existing Image", async () => {
        const res = await request(app)
            .put("/image/update-description")
            .send({ fileName: "non-existing.jpg", newDescription: "This should fail" });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Image not found");
    });

    test("❌ 400 - Update Description for Missing Body Value", async () => {
        const res = await request(app).put("/image/update-description").send({ fileName: "non-existing.jpg" });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Both fileName and newDescription are required.");
    });

    test("✅ Share Image Successfully", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: TEST_RECIPIENT,
                imageKey: uploadedFileName,
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Image shared successfully");
    });

    test("❌ 400 - Missing Required Parameters", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: TEST_RECIPIENT,
                imageKey: uploadedFileName, // Missing senderEmail
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Recipient email, image key, and sender email are required");
    });
    
    test("❌ 400 - Recipient Already Has Access", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: TEST_RECIPIENT,
                imageKey: uploadedFileName,
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Recipient already has access to this image");
    });
    
    test("❌ 403 - Sender Is Not the Owner", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: TEST_RECIPIENT,
                imageKey: uploadedFileName,
                senderEmail: "randomuser@gmail.com", // Not the owner
            });
    
        expect(res.status).toBe(403);
        expect(res.body.error).toBe("Only the owner can share this image");
    });
    
    test("❌ 404 - Image Not Found", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: TEST_RECIPIENT,
                imageKey: "non-existing-image.png",
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Image not found");
    });

    test("❌ 404 - Recipient User Not Found", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: "nonexistent@example.com", // ❌ Invalid recipient
                imageKey: uploadedFileName,
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Recipient user not found");
    });

    test("✅ Retrieve Shared Images Successfully", async () => {
        const res = await request(app)
            .get(`/image/shared/${TEST_RECIPIENT}`);
    
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.sharedImages)).toBe(true);
    });

    test("✅ Cancel Sharing Successfully", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                imageKey: uploadedFileName,
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Sharing canceled successfully");
    });
    
    test("❌ 400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                senderEmail: TEST_USER, // ❌ Missing `imageKey`
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Image key and sender email are required");
    });
    
    test("❌ 403 - Unauthorized User Trying to Cancel Sharing", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                imageKey: uploadedFileName,
                senderEmail: "randomuser@example.com",
            });
    
        expect(res.status).toBe(403);
        expect(res.body.error).toBe("Only the original sharer can cancel sharing");
    });
    
    test("❌ 404 - Canceling a Non-Existing Image", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                imageKey: "non-existing-image.png",
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Image not found");
    });

    test("✅ Delete Uploaded Image", async () => {
        const res = await request(app).delete(`/image/${uploadedFileName}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Image deleted successfully");
    });

    test("❌ 404 - Delete Non-Existing Image", async () => {
        const res = await request(app).delete("/image/non-existing.jpg");
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Metadata not found in MongoDB");
    });

    test("✅ Upload Image with Location for Delete All", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE); // ✅ Correct way to send a file

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("fileName");
        expect(res.body).toHaveProperty("imageUrl");

        uploadedFileName = res.body.fileName;
    });

    test("✅ Delete All Images by User", async () => {
        const res = await request(app).delete(`/image/delete-all/${TEST_USER}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message");
    });

});


