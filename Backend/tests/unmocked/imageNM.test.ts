import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import "../../controllers/imageController";
import "../../routes/imageRoutes";

const BASE_URL = "https://wocmpphotomap.com";
const TEST_IMAGE = path.join(__dirname, "../test1.png");
const TEST_USER = "exalex16@gmail.com";
let uploadedFileName = "";  // ✅ Store the uploaded file name dynamically
const EXISTING_IMAGE = "exalex16@gmail.com-2025-03-07T03-30-05.309Z.jpg";

const TEST_LOCATION = JSON.stringify({
    position: {
        lat: 49.19577961620053,
        lng: -122.69934184849262
    },
    title: "g",
    location: "Surrey",
    icon: "Green"
});

describe("Unmocked API Tests - imageController", () => {
    // test("✅ Upload Image with Location", async () => {
    //     const formData = new FormData();
    //     formData.append("image", fs.createReadStream(TEST_IMAGE)); 
    //     formData.append("uploadedBy", TEST_USER);
    //     formData.append("description", "Test upload");
    //     formData.append("location", TEST_LOCATION);

    //     try {
    //         const res = await axios.post(`${BASE_URL}/upload`, formData, {
    //             headers: formData.getHeaders(),
    //         });

    //         expect(res.status).toBe(200);
    //         expect(res.data).toHaveProperty("fileName");
    //         expect(res.data).toHaveProperty("imageUrl");

    //         uploadedFileName = res.data.fileName;  // ✅ Store file name for deletion
    //         // console.log(`📝 Uploaded file name: ${uploadedFileName}`);
    //     } catch (error: any) {
    //         console.error("❌ Upload failed:", error.response?.data || error.message);
    //         throw error;
    //     }
    // });

    // test("❌ 400 - Multer Error (Unexpected field)", async () => {
    //     const formData = new FormData();
    //     formData.append("wrongField", fs.createReadStream(TEST_IMAGE)); // ❌ Wrong field name
    //     formData.append("uploadedBy", TEST_USER);
    //     formData.append("description", "Test upload");
    //     formData.append("location", TEST_LOCATION);

    //     try {
    //         await axios.post(`${BASE_URL}/upload`, formData, {
    //             headers: formData.getHeaders(),
    //         });
    //     } catch (error: any) {
    //         expect(error.response.status).toBe(400);
    //         expect(error.response.data.error).toContain("Multer Error");
    //         console.error("❌ Expected Multer error:", error.response.data);
    //     }
    // });

    // test("❌ 400 - No File Uploaded", async () => {
    //     const formData = new FormData();
    //     formData.append("uploadedBy", TEST_USER);
    //     formData.append("description", "Test upload");
    //     formData.append("location", TEST_LOCATION);

    //     try {
    //         await axios.post(`${BASE_URL}/upload`, formData, {
    //             headers: formData.getHeaders(),
    //         });
    //     } catch (error: any) {
    //         expect(error.response.status).toBe(400);
    //         expect(error.response.data.error).toBe("No file uploaded");
    //         console.error("❌ Expected No file uploaded error:", error.response.data);
    //     }
    // });

    // test("❌ 400 - Invalid Location Format", async () => {
    //     const formData = new FormData();
    //     formData.append("image", fs.createReadStream(TEST_IMAGE));
    //     formData.append("uploadedBy", TEST_USER);
    //     formData.append("description", "Test upload");
    //     formData.append("location", "invalid_json"); // ❌ Broken JSON

    //     try {
    //         await axios.post(`${BASE_URL}/upload`, formData, {
    //             headers: formData.getHeaders(),
    //         });
    //     } catch (error: any) {
    //         expect(error.response.status).toBe(400);
    //         expect(error.response.data.error).toBe("Invalid location format. Ensure it's valid JSON.");
    //         console.error("❌ Expected Invalid location format error:", error.response.data);
    //     }
    // }, 10000); 

    // test("✅ Get Image Metadata", async () => {
    //     const res = await axios.get(`${BASE_URL}/metadata/${uploadedFileName}`);
    //     expect(res.status).toBe(200);
    //     expect(res.data.fileName).toBe(uploadedFileName);
    // });

    // test("❌ Get Non-Existing Image Metadata", async () => {
    //     try {
    //         await axios.get(`${BASE_URL}/metadata/non-existing.jpg`);
    //     } catch (err: any) {
    //         expect(err.response.status).toBe(404);
    //     }
    // });

    // test("✅ Get Images By Uploader", async () => {
    //     const res = await axios.get(`${BASE_URL}/images/uploader/${TEST_USER}`);
    //     expect(res.status).toBe(200);
    //     expect(Array.isArray(res.data.images)).toBe(true);
    // });

    // test("❌ 404 - User Does Not Exist", async () => {
    //     try {
    //         await axios.get(`${BASE_URL}/images/uploader/nonexistent@example.com`);
    //     } catch (err: any) {
    //         expect(err.response.status).toBe(404);
    //         expect(err.response.data.error).toBe("User not found");
    //     }
    // });

    // test("✅ Delete Uploaded Image", async () => {
    //     if (!uploadedFileName) {
    //         throw new Error("❌ No file name stored from upload test.");
    //     }

    //     const res = await axios.delete(`${BASE_URL}/image/${uploadedFileName}`);
    //     expect(res.status).toBe(200);
    //     expect(res.data.message).toBe("Image deleted successfully");
    //     console.log(`🗑️ Deleted file: ${uploadedFileName}`);
    // });

    // test("❌ 404 - Delete Non-Existing Image", async () => {
    //     try {
    //         await axios.delete(`${BASE_URL}/image/non-existing.jpg`);
    //     } catch (err: any) {
    //         expect(err.response.status).toBe(404);
    //         expect(err.response.data.error).toBe("Metadata not found in MongoDB");
    //     }
    // });

    // test("✅ Get All Images", async () => {
    //     const res = await axios.get(`${BASE_URL}/images`);
    //     expect(res.status).toBe(200);
    //     expect(Array.isArray(res.data.images)).toBe(true);
    // });

    test("✅ Update Image Description", async () => {
        const res = await axios.put(`${BASE_URL}/image/update-description`, {
            fileName: EXISTING_IMAGE,
            newDescription: "Updated test description",
        });

        expect(res.status).toBe(200);
        expect(res.data.message).toBe("Image description updated successfully");
        expect(res.data.fileName).toBe(EXISTING_IMAGE);
        expect(res.data.newDescription).toBe("Updated test description");
    });

    test("❌ 404 - Update Description for Non-Existing Image", async () => {
        try {
            await axios.put(`${BASE_URL}/image/update-description`, {
                fileName: "non-existing.jpg",
                newDescription: "This should fail",
            });
        } catch (err: any) {
            expect(err.response.status).toBe(404);
            expect(err.response.data.error).toBe("Image not found");
        }
    });

    test("❌ 500 - Update Fails (No Changes Made)", async () => {
        try {
            await axios.put(`${BASE_URL}/image/update-description`, {
                fileName: EXISTING_IMAGE,
                newDescription: "Updated test description",  // ❌ Same description as before
            });
        } catch (err: any) {
            expect(err.response.status).toBe(500);
            expect(err.response.data.error).toBe("Failed to update image description.");
        }
    });
});
