import { s3, clinet} from "../../services";
import {PutObjectCommand } from "@aws-sdk/client-s3";
import request from "supertest";
import { app, closeServer } from "../../index";
import * as ImageController from "../../controllers/imageController";
const { rekognition } = ImageController;


jest.mock("../../services", () => {
    const actualServices = jest.requireActual("../../services");

    return {
        ...actualServices,
        clinet: {
            db: jest.fn(() => ({
                collection: jest.fn(() => ({
                    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
                    findOne: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),  
                    insertOne: jest.fn().mockRejectedValue(new Error("MongoDB Insert Error")),  
                    find: jest.fn(() => ({
                        toArray: jest.fn().mockRejectedValue(new Error("MongoDB Find Error")),  
                    })),
                    deleteOne: jest.fn().mockRejectedValue(new Error("MongoDB Delete Error")),  
                })),
            })),
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        },
        s3: {
            send: jest.fn().mockImplementation((command) => {
                if (command instanceof PutObjectCommand) {
                    return Promise.reject(new Error("S3 Upload Failed"));
                }
                return Promise.resolve({});
            }),
        },
    };
});

jest.mock("sharp", () => {
    return () => ({
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from("fake_image_data")),
    });
});

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn().mockResolvedValue("https://mocked-url.com/image.jpg"),
}));

const TEST_USER = "exalex16@gmail.com";
const TEST_IMAGE = Buffer.from("fake_image_data"); 
const TEST_LOCATION = JSON.stringify({
    position: { lat: 49.1957796162, lng: -122.69934184 },
    title: "Test Location",
    location: "Surrey",
    icon: "Green"
});

afterAll(async () => {
    await closeServer(); 
});

// Interface: POST /upload
describe("Mocked API Tests - post /upload", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: Rekognition label detection fails
    // Input: Image upload request with valid location
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - Rekognition Label Detection Error", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never);

        jest.spyOn(rekognition, "send")
            .mockRejectedValueOnce(new Error("Rekognition Label Detection Error") as never);

        const res = await request(app)
            .post("/upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test");
    
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });
    
    // Mocked behavior: Rekognition moderation detection fails
    // Input: Image upload request with valid location
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - Rekognition Moderation Detection Error", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never);

        jest.spyOn(rekognition, "send")
            .mockResolvedValueOnce({ Labels: [{ Name: "TestLabel", Confidence: 99 }] } as never) 
            .mockRejectedValueOnce(new Error("Rekognition Moderation Detection Error") as never); 

        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });

    // Mocked behavior: Coever Moderation and Normal Labels Extraction, amd 
    // Input: Image upload request with valid location
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("Cover Moderation Labels Extraction", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never);
    
        jest.spyOn(rekognition, "send")
            .mockResolvedValueOnce({ Labels: [{ Name: "TestLabel", Confidence: 99 }] } as never) 
            .mockResolvedValueOnce({ ModerationLabels: [{ Name: "Explicit Content", Confidence: 95 }] } as never); 
    
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });

    // Mocked behavior: Sharp image processing fails
    // Input: Image upload request with valid location
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - Sharp Image Processing Error", async () => {
        jest.spyOn(ImageController, "processImage").mockRejectedValue(new Error("Sharp Processing Error"));
    
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });

    // Mocked behavior: Rekognition moderation and normal detection fails
    // Input: Image upload request with valid location
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - General Rekognition API Failure", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never); 
    
        jest.spyOn(ImageController, "analyzeImageLabels")
            .mockRejectedValue(new Error("General Rekognition API Failure"));
        jest.spyOn(ImageController, "analyzeImageModeration")
            .mockRejectedValue(new Error("General Rekognition API Failure"));
    
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });

    // Mocked behavior: MongoDB insert operation fails
    // Input: Image upload request with valid location
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Insert Failure", async () => {
        const dbSpy = jest.spyOn(clinet.db("images").collection("metadata"), "insertOne")
            .mockImplementationOnce(() => Promise.reject(new Error("MongoDB Insert Failed")));

        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", JSON.stringify({
                position: { lat: 49.1957796162, lng: -122.69934184 },
                title: "Test Location",
                location: "Surrey",
                icon: "Green"
            }))
            .attach("image", Buffer.from("fake_image_data"), "test1.jpg");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");

        dbSpy.mockRestore(); 
    });

    // Mocked behavior: S3 upload fails
    // Input: Image upload request with valid location
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - S3 Upload Failure", async () => {
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 Upload Failed") as never);

        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", JSON.stringify({
                position: { lat: 49.1957796162, lng: -122.69934184 },
                title: "Test Location",
                location: "Surrey",
                icon: "Green"
            }))
            .attach("image", Buffer.from("fake_image_data"), "test1.jpg");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: GET /metadata/:key 
describe("Mocked API Tests - get /metadata/:key", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB find operation fails
    // Input: Request for metadata of an existing image
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on getImage", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));
    
        const res = await request(app).get("/metadata/test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    // Mocked behavior: S3 GetObjectCommand fails
    // Input: Request for metadata of an existing image
    // Expected status code: 500
    // Expected behavior: The server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - S3 GetObjectCommand Failure", async () => {
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);
    
        jest.spyOn(clinet.db("images").collection("metadata"), "findOne").mockResolvedValue({
            fileName: "test.jpg",
            location: {
                position: { lat: 49.1957796162, lng: -122.69934184 },
                title: "Test Location",
                location: "Surrey",
                icon: "Green",
            },
        });
    
        const res = await request(app).get("/metadata/test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: GET /images/uploader/:uploaderEmail
describe("Mocked API Tests - get /images/uploader/:uploaderEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails to fetch user
    // Input: A request to fetch images for a valid user
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on User Lookup", async () => {
        jest.spyOn(clinet.db("User").collection("users"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));

        const res = await request(app).get("/images/uploader/exalex16@gmail.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    // Mocked behavior: S3 fails to generate signed URLs for images
    // Input: Valid user email, images exist in the database
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - S3 GetObjectCommand Failure", async () => {
        jest.spyOn(clinet.db("User").collection("users"), "findOne")
            .mockResolvedValueOnce({ googleEmail: "exalex16@gmail.com" });

        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValueOnce({
                toArray: jest.fn().mockResolvedValue([
                    { fileName: "test1.jpg", location: { title: "Test", position: { lat: 49.1, lng: -122.7 } } },
                    { fileName: "test2.jpg", location: { title: "Another", position: { lat: 50.1, lng: -121.9 } } },
                ]),
            } as never);

        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);

        const res = await request(app).get("/images/uploader/exalex16@gmail.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: DELETE /image/:key
describe(" Mocked API Tests - delete /image/:key", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB delete operation fails
    // Input: Request to delete an existing image
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on deleteImage", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "deleteOne")
            .mockRejectedValueOnce(new Error("MongoDB Delete Error"));

        const res = await request(app).delete("/image/test.jpg");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    // Mocked behavior: S3 fails to delete the file
    // Input: Request to delete an existing image
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - S3 DeleteObjectCommand Failure", async () => {
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 DeleteObjectCommand Failed") as never);
        jest.spyOn(clinet.db("images").collection("metadata"), "deleteOne").mockResolvedValue({ deletedCount: 1 } as never);

        const res = await request(app).delete("/image/test.jpg");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: GET /images
describe("Mocked API Tests - get /images", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails while fetching images
    // Input: A request get all images
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on getAllImages", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValue({ toArray: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")) } as never);

        const res = await request(app).get("/images");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    // Mocked behavior: S3 fails while getting objects
    // Input: A request to get all images
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - S3 GetObjectCommand Failure on getAllImages", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "find").mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                { fileName: "test1.jpg", location: { position: { lat: 49.195, lng: -122.699 }, title: "Location1" } },
                { fileName: "test2.jpg", location: { position: { lat: 50.123, lng: -120.456 }, title: "Location2" } },
            ]),
        } as never);

        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);

        const res = await request(app).get("/images");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: POST /image/cancel-share
describe("Mocked API Tests - put /image/update-description", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails to find image
    // Input: Request to cancel sharing an image
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on updateImageDescription", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "updateOne")
            .mockRejectedValueOnce(new Error("MongoDB Update Error"));

        jest.spyOn(clinet.db("images").collection("metadata"), "findOne").mockResolvedValue({
            fileName: "test1.jpg",
            description: "Old Description",
        });

        const res = await request(app)
            .put("/image/update-description")
            .send({ fileName: "test1.jpg", newDescription: "Updated Description" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: DELETE /image/delete-all/:userEmail
describe("Mocked API Tests - delete /image/delete-all/:userEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails while fetching images to delete
    // Input: A request to delete all images for a specific user
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on deleteAllImagesByUser", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValue({ toArray: jest.fn().mockRejectedValueOnce(new Error("MongoDB Find Error")) } as never);

        const res = await request(app).delete("/image/delete-all/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    // Mocked behavior: S3 fails while deleting objects
    // Input: A request to delete all images for a specific user
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - S3 DeleteObjectCommand Failure", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "find").mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                { fileName: "test1.jpg" },
                { fileName: "test2.jpg" },
            ]),
        } as never);
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 DeleteObjectCommand Failed") as never);

        const res = await request(app).delete("/image/delete-all/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: POST /image/share
describe("Mocked API Tests - post /image/share", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails to find the image to share
    // Input: Request to share an image with a recipient
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on Finding Image", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));

        const res = await request(app).post("/image/share").send({
            recipientEmail: "recipient@example.com",
            imageKey: "test.jpg",
            senderEmail: "owner@example.com"
        });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: GET /image/shared/:userEmail
describe("Mocked API Tests - get /image/shared/:userEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails while fetching shared images
    // Input: Request to retrieve shared images for a user
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on getSharedImages", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValue({ toArray: jest.fn().mockRejectedValueOnce(new Error("MongoDB Read Error")) } as never);

        const res = await request(app).get("/image/shared/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    // Mocked behavior: S3 fails while generating presigned URLs for shared images
    // Input: Request to retrieve shared images for a user
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - S3 GetObjectCommand Failure on getSharedImages", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "find").mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                { fileName: "test1.jpg", location: { position: { lat: 49.195, lng: -122.699 }, title: "Location1" } },
                { fileName: "test2.jpg", location: { position: { lat: 50.123, lng: -120.456 }, title: "Location2" } },
            ]),
        } as never);

        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);

        const res = await request(app).get("/image/shared/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: POST /image/cancel-share
describe("Mocked API Tests - post /image/cancel-share", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails to find the shared image entry
    // Input: Request to cancel sharing an image
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on cancelShare", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));
    
        const res = await request(app)
            .post("/image/cancel-share")
            .send({ imageKey: "test1.jpg", senderEmail: "testuser@example.com" });
    
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    
        await new Promise((resolve) => setTimeout(resolve, 500)); 
    });
});

// Interface: POST /image/cancel-share-individual
describe("Mocked API Tests - post /image/cancel-share-individual", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails to find the image
    // Expected status code: 500
    // Expected behavior: Server should return an "Internet Error"
    test("500 - MongoDB Failure on Finding Image", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));

        const res = await request(app)
            .post("/image/cancel-share-individual")
            .send({
                imageKey: "test1.jpg",
                senderEmail: "testuser@example.com",
                recipientEmail: "recipient@example.com",
            });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});
