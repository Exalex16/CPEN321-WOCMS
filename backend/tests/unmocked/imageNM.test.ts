import path from "path";
import {app, closeServer} from "../../index"
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

afterAll(async () => {
    await closeServer(); 
});

// Interface: POST /upload 
describe("Unmocked API Tests - post /upload", () => {
    // Input: Valid user details
    // Expected status code: 200 or 201
    // Expected behavior: User is created or updated in the database
    // Expected output: some information back
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

    // Input: Valid recipient user details
    // Expected status code: 200 or 201
    // Expected behavior: Recipient user is created or updated in the database
    // Expected output: some information back
    test("Ensure Test RECIPIENT Exists", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_RECIPIENT,
                googleName: "token1 Example",
            });
    
        expect([200, 201]).toContain(res.status);
        expect(res.body).toHaveProperty("message");
    });

    // Input: Valid profile update request with a location
    // Expected status code: 200
    // Expected behavior: User profile is updated successfully
    // Expected output: some information back
    test("Update Recipient Profile with Test Location", async () => {
        const res = await request(app)
            .put(`/user/${TEST_RECIPIENT}`)
            .field("googleName", "token1 Example")
            .field("location", TEST_LOCATION2); 
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body).toHaveProperty("addedLocation");
    });

    // Input: Valid image upload request with a location
    // Expected status code: 200
    // Expected behavior: Image is uploaded and stored successfully
    // Expected output: valid filename and have url
    test("Upload Image with Location", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE); 

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("fileName");
        expect(res.body).toHaveProperty("imageUrl");

        uploadedFileName = res.body.fileName;
    });

    // Input: Image upload request with no file attached
    // Expected status code: 400
    // Expected behavior: Request fails with an error message
    // Expected output: "No file uploaded"
    test("400 - No File Uploaded", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION); 

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("No file uploaded");
    });

    // Input: Image upload request with no file attached
    // Expected status code: 400
    // Expected behavior: Request fails with an error message
    // Expected output: "Invalid location format. Ensure it's valid JSON."
    test("400 - Invalid Location Format", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", "invalid_json") 
            .attach("image", TEST_IMAGE);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid location format. Ensure it's valid JSON.");
    });

    // Input: Image upload request with incorrect file type
    // Expected status code: 400
    // Expected behavior: Request fails with an error message
    // Expected output: "Invalid form data"
    test("400 - Invalid Form Data (Incorrect File Type)", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER) 
            .field("description", "Test invalid upload")
            .attach("image", Buffer.from("invalid file content"), "test.jpg") 
            .attach("nottrue", Buffer.from("invalid file content"), "test.txt"); 
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid form data");
    });
});

// Interface: GET /metadata/:key 
describe("Unmocked API Tests - get /metadata/:key", () => {
    // Input: Valid image key
    // Expected status code: 200
    // Expected behavior: Returns metadata of the uploaded image
    // Expected output: image with same filename as uploading
    test("Get Image Metadata", async () => {
        const res = await request(app).get(`/metadata/${uploadedFileName}`);
        expect(res.status).toBe(200);
        expect(res.body.fileName).toBe(uploadedFileName);
    });

    // Input: Non-existent image key
    // Expected status code: 404
    // Expected behavior: Request fails with an error message
    // Expected output: 404 error code
    test("404 - Get Non-Existing Image Metadata", async () => {
        const res = await request(app).get("/metadata/non-existing.jpg");
        expect(res.status).toBe(404);
    });
});

// Interface: GET /images/uploader/:uploaderEmail
describe("Unmocked API Tests - get /images/uploader/:uploaderEmail", () => {
    // Input: Valid uploader email
    // Expected status code: 200
    // Expected behavior: Returns all images uploaded by the user
    // Expected output: Have image in the array
    test("Get Images By Uploader", async () => {
        const res = await request(app).get(`/images/uploader/${TEST_USER}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.images)).toBe(true);
    });

    // Input: Non-existent uploader email
    // Expected status code: 404
    // Expected behavior: Request fails with an error message
    // Expected output: "User not found"
    test("404 - User Does Not Exist", async () => {
        const res = await request(app).get(`/images/uploader/nonexistent@example.com`);
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });
});

// Interface: GET /images 
describe("Unmocked API Tests - get /images", () => {
    // Input: No specific input, just retrieving all images
    // Expected status code: 200
    // Expected behavior: Returns an array of images
    // Expected output: Have any image
    test("Get All Images", async () => {
        const res = await request(app).get("/images");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.images)).toBe(true);
    });
});

// Interface: PUT /image/update-description 
describe("Unmocked API Tests - put /image/update-description", () => {
    // Input: Valid image key
    // Expected status code: 200
    // Expected behavior: Image is deleted successfully
    // Expected output: Same filename with new description
    test("Update Image Description", async () => {
        const res = await request(app)
            .put("/image/update-description")
            .send({ fileName: uploadedFileName, newDescription: "Updated test description" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Image description updated successfully");
        expect(res.body.fileName).toBe(uploadedFileName);
        expect(res.body.newDescription).toBe("Updated test description");
    });

    // Input: Non-existent image key
    // Expected status code: 404
    // Expected behavior: Request fails with an error message
    // Expected output: "Image not found"
    test("404 - Update Description for Non-Existing Image", async () => {
        const res = await request(app)
            .put("/image/update-description")
            .send({ fileName: "non-existing.jpg", newDescription: "This should fail" });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Image not found");
    });

    // Input: Missing newDescription field in request body
    // Expected status code: 400
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Both fileName and newDescription are required." }
    test("400 - Update Description for Missing Body Value", async () => {
        const res = await request(app).put("/image/update-description").send({ fileName: "non-existing.jpg" });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Both fileName and newDescription are required.");
    });
});

// Interface: POST /image/share 
describe("Unmocked API Tests - post /image/share", () => {
    // Input: Valid recipient, image key, and sender email
    // Expected status code: 200
    // Expected behavior: Image is shared successfully
    // Expected output: { message: "Image shared successfully" }
    test("Share Image Successfully", async () => {
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

    // Input: Missing senderEmail field
    // Expected status code: 400
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Recipient email, image key, and sender email are required" }
    test("400 - Missing Required Parameters", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: TEST_RECIPIENT,
                imageKey: uploadedFileName, 
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Recipient email, image key, and sender email are required");
    });
    
    // Input: Recipient already has access to the image
    // Expected status code: 400
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Recipient already has access to this image" }
    test("400 - Recipient Already Has Access", async () => {
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
    
    // Input: Sender is not the owner of the image
    // Expected status code: 403
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Only the owner can share this image" }
    test("403 - Sender Is Not the Owner", async () => {
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
    
    // Input: Image does not exist
    // Expected status code: 404
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Image not found" }
    test("404 - Image Not Found", async () => {
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

    // Input: Recipient user does not exist
    // Expected status code: 404
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Recipient user not found" }
    test("404 - Recipient User Not Found", async () => {
        const res = await request(app)
            .post("/image/share")
            .send({
                recipientEmail: "nonexistent@example.com", 
                imageKey: uploadedFileName,
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Recipient user not found");
    });
});

// Interface: GET /image/shared/:userEmail 
describe("Unmocked API Tests - get /image/shared/:userEmail", () => {
    // Input: Valid user email
    // Expected status code: 200
    // Expected behavior: Returns a list of shared images
    // Expected output: Some image in the list
    test("Retrieve Shared Images Successfully", async () => {
        const res = await request(app)
            .get(`/image/shared/${TEST_RECIPIENT}`);
    
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.sharedImages)).toBe(true);
    });
});

// Interface: POST /image/cancel-share
describe("Unmocked API Tests - post /image/cancel-share", () => {
    // Input: Valid image key and sender email
    // Expected status code: 200
    // Expected behavior: The sharing is canceled successfully
    // Expected output: { message: "Sharing canceled successfully" }
    test("Cancel Sharing Successfully", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                imageKey: uploadedFileName,
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Sharing canceled successfully");
    });
    
    // Input: Missing imageKey field in request body
    // Expected status code: 400
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Image key and sender email are required" }
    test("400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                senderEmail: TEST_USER, 
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Image key and sender email are required");
    });
    
    // Input: Unauthorized user (not the original sharer) tries to cancel sharing
    // Expected status code: 403
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Only the original sharer can cancel sharing" }
    test("403 - Unauthorized User Trying to Cancel Sharing", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                imageKey: uploadedFileName,
                senderEmail: "randomuser@example.com",
            });
    
        expect(res.status).toBe(403);
        expect(res.body.error).toBe("Only the original sharer can cancel sharing");
    });
    
    // Input: Non-existing image
    // Expected status code: 404
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Image not found" }
    test("404 - Canceling a Non-Existing Image", async () => {
        const res = await request(app)
            .post("/image/cancel-share")
            .send({
                imageKey: "non-existing-image.png",
                senderEmail: TEST_USER,
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Image not found");
    });
});

// Interface: DELETE /image/:key
describe("Unmocked API Tests - delete /image/:key", () => {
    // Input: Valid image key
    // Expected status code: 200
    // Expected behavior: Image is deleted successfully
    // Expected output: { message: "Image deleted successfully" }
    test("Delete Uploaded Image", async () => {
        const res = await request(app).delete(`/image/${uploadedFileName}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Image deleted successfully");
    });

    // Input: Non-existent image key
    // Expected status code: 404
    // Expected behavior: Request fails with an error message
    // Expected output: { error: "Metadata not found in MongoDB" }
    test("404 - Delete Non-Existing Image", async () => {
        const res = await request(app).delete("/image/non-existing.jpg");
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Metadata not found in MongoDB");
    });
});

// Interface: DELETE /image/delete-all/:userEmail
describe("Unmocked API Tests - delete /image/delete-all/:userEmail", () => {
    // Input: Upload an image first before testing delete all
    // Expected status code: 200
    // Expected behavior: Image is uploaded successfully
    // Expected output: Have filename and url link properties
    test("Upload Image with Location for Delete All", async () => {
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE); 

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("fileName");
        expect(res.body).toHaveProperty("imageUrl");

        uploadedFileName = res.body.fileName;
    });

    // Input: Valid user email (user with uploaded images)
    // Expected status code: 200
    // Expected behavior: All images uploaded by the user are deleted
    // Expected output: Have succeed message
    test("Delete All Images by User", async () => {
        const res = await request(app).delete(`/image/delete-all/${TEST_USER}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message");
    });
});


