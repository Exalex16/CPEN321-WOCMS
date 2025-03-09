import request from "supertest";
import { app } from "../index";  
import fs from "fs";
import path from "path";
import { s3 } from "../services"; // ✅ Use existing S3 client
import { clinet } from "../services"; // ✅ Use existing MongoDB client
import dotenv from "dotenv";

jest.setTimeout(10000);


describe("Debug MongoDB Connection", () => {
    test("Should connect to MongoDB and list databases", async () => {
        console.log("🔹 Using MongoDB URI:", process.env.DB_URI);

        try {
            await clinet.db().admin().ping(); // ✅ Just ping the DB instead of reconnecting
            console.log("✅ Successfully connected to MongoDB");

            const databases = await clinet.db().admin().listDatabases();
            console.log("📂 Available Databases:", databases);

            expect(databases.databases.length).toBeGreaterThan(0);
        } catch (error) {
            console.error("❌ MongoDB Connection Error:", error);
            throw error;
        }
    });
});


describe("Unmocked: Image API Tests", () => {
    let uploadedFileName = "";

    // test("Should upload an image successfully", async () => {
    //     const imagePath = path.join(__dirname, "test1.png");
    //     const imageStream = fs.createReadStream(imagePath);

    //     const response = await request(app)
    //         .post("/upload")
    //         .field("uploadedBy", "exalex16@gmail.com")
    //         .field("description", "This is a test description")
    //         .field("location", JSON.stringify({
    //             position: { lat: 49.2827, lng: -123.1207 },
    //             title: "Vancouver",
    //             location: "Canada",
    //             icon: "Red"
    //         }))
    //         .attach("image", imageStream, { filename: "test1.png", contentType: "image/png" });

    //     expect(response.status).toBe(200);
    //     expect(response.body).toHaveProperty("fileName");
    //     expect(response.body).toHaveProperty("imageUrl");

    //     uploadedFileName = response.body.fileName;
    // }, 30000);

    // /** ✅ 2️⃣ Get Image Metadata */
    // test("Should fetch image metadata", async () => {
    //     const response = await request(app)
    //         .get(`/metadata/${uploadedFileName}`);

    //     expect(response.status).toBe(200);
    //     expect(response.body.fileName).toBe(uploadedFileName);
    // });

    // test("Should return 404 for non-existent image metadata", async () => {
    //     const response = await request(app)
    //         .get(`/metadata/nonexistent.jpg`);

    //     expect(response.status).toBe(404);
    // });

    // /** ✅ 3️⃣ Get Images by Uploader */
    // test("Should fetch uploaded images by user", async () => {
    //     const response = await request(app)
    //         .get("/images/uploader/test@example.com");

    //     expect(response.status).toBe(200);
    //     expect(response.body.images.length).toBeGreaterThan(0);
    // });

    // /** ✅ 4️⃣ Update Image Description */
    // test("Should update image description", async () => {
    //     const response = await request(app)
    //         .put("/image/update-description")
    //         .send({
    //             fileName: uploadedFileName,
    //             newDescription: "Updated Description",
    //         });

    //     expect(response.status).toBe(200);
    //     expect(response.body.newDescription).toBe("Updated Description");
    // });

    // test("Should return 404 when updating non-existent image description", async () => {
    //     const response = await request(app)
    //         .put("/image/update-description")
    //         .send({
    //             fileName: "nonexistent.jpg",
    //             newDescription: "Updated Description",
    //         });

    //     expect(response.status).toBe(404);
    // });

    // /** ✅ 5️⃣ Delete Image */
    // test("Should delete the uploaded image", async () => {
    //     const response = await request(app)
    //         .delete(`/image/${uploadedFileName}`);

    //     expect(response.status).toBe(200);
    // });

    // test("Should return 404 for deleting a non-existent image", async () => {
    //     const response = await request(app)
    //         .delete("/image/nonexistent.jpg");

    //     expect(response.status).toBe(404);
    // });
});