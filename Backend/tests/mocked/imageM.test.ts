import { s3, clinet} from "../../services";
import {PutObjectCommand } from "@aws-sdk/client-s3";
import "../../controllers/imageController";
import "../../routes/imageRoutes";
import { rekognition } from "../../controllers/imageController";
import request from "supertest";
import { app, server, closeServer } from "../../index";
import * as ImageController from "../../controllers/imageController";


jest.mock("../../services", () => {
    const actualServices = jest.requireActual("../../services");

    return {
        ...actualServices,
        clinet: {
            db: jest.fn((dbName) => ({
                collection: jest.fn(() => ({
                    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
                    findOne: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),  
                    insertOne: jest.fn().mockRejectedValue(new Error("MongoDB Insert Error")),  
                    find: jest.fn().mockReturnValue({ 
                        toArray: jest.fn().mockRejectedValue(new Error("MongoDB Find Error")),  
                    }),
                    deleteOne: jest.fn().mockRejectedValue(new Error("MongoDB Delete Error")),  
                })),
            })),
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        },
        s3: {
            send: jest.fn().mockImplementation((command) => {
                if (command instanceof PutObjectCommand) {
                    return Promise.reject(new Error("S3 Upload Failed")); // ✅ Force failure
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
const TEST_IMAGE = Buffer.from("fake_image_data"); // Simulated image
const TEST_LOCATION = JSON.stringify({
    position: { lat: 49.1957796162, lng: -122.69934184 },
    title: "Test Location",
    location: "Surrey",
    icon: "Green"
});

afterAll(async () => {
    await closeServer(); // ✅ Ensure server and DB are closed
});

describe("Mocked API Tests - post /user", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - Rekognition Label Detection Error", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never);

        // ✅ Make Rekognition fail at first label detection step
        jest.spyOn(rekognition, "send")
            .mockRejectedValueOnce(new Error("Rekognition Label Detection Error") as never);

        const res = await request(app)
            .post("/upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test");
    
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });
    
    test("❌ 500 - Rekognition Moderation Detection Error", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never);

        // ✅ First Rekognition call succeeds (for analyzeImageLabels)
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

    test("✅ Cover Moderation Labels Extraction", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never);
    
        jest.spyOn(rekognition, "send")
            .mockResolvedValueOnce({ Labels: [{ Name: "TestLabel", Confidence: 99 }] } as never) 
            .mockResolvedValueOnce({ ModerationLabels: [{ Name: "Explicit Content", Confidence: 95 }] } as never); // ✅ Ensure ModerationLabels exists
    
        const res = await request(app)
            .post("/upload")
            .field("uploadedBy", TEST_USER)
            .field("description", "Test upload")
            .field("location", TEST_LOCATION)
            .attach("image", TEST_IMAGE, "test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });

    test("❌ 500 - Sharp Image Processing Error", async () => {
        // ✅ Correctly spy on processImage function
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

    test("❌ 500 - General Rekognition API Failure", async () => {
        jest.spyOn(s3, "send").mockResolvedValueOnce(Promise.resolve({}) as never); 
    
        // ✅ Ensure both Rekognition functions fail
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

    test("❌ 500 - MongoDB Insert Failure", async () => {
        // ✅ Spy on MongoDB `insertOne` and force an immediate failure
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

        dbSpy.mockRestore(); // ✅ Restore behavior
    });

    test("❌ 500 - S3 Upload Failure", async () => {
        // ✅ Force `s3.send()` to fail immediately
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

describe("🛠️ Mocked API Tests - get /metadata/:key", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on getImage", async () => {
        // ✅ Spy on `findOne` and force a failure
        jest.spyOn(clinet.db("images").collection("metadata"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));
    
        const res = await request(app).get("/metadata/test.jpg");
    
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    test("❌ 500 - S3 GetObjectCommand Failure", async () => {
        // ✅ Spy on `s3.send()` and force failure
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);
    
        // ✅ Mock `findOne` to return a valid image entry
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

describe("🛠️ Mocked API Tests - get /images/uploader/:uploaderEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on User Lookup", async () => {
        // ✅ Spy on `findOne` for user existence and force failure
        jest.spyOn(clinet.db("User").collection("users"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));

        const res = await request(app).get("/images/uploader/exalex16@gmail.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    test("❌ 500 - S3 GetObjectCommand Failure", async () => {
        // ✅ Mock user exists
        jest.spyOn(clinet.db("User").collection("users"), "findOne")
            .mockResolvedValueOnce({ googleEmail: "exalex16@gmail.com" });

        // ✅ Mock image metadata exists
        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValueOnce({
                toArray: jest.fn().mockResolvedValue([
                    { fileName: "test1.jpg", location: { title: "Test", position: { lat: 49.1, lng: -122.7 } } },
                    { fileName: "test2.jpg", location: { title: "Another", position: { lat: 50.1, lng: -121.9 } } },
                ]),
            } as any);

        // ✅ Force failure on S3 getSignedUrl
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);

        const res = await request(app).get("/images/uploader/exalex16@gmail.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("🛠️ Mocked API Tests - delete /image/:key", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on deleteImage", async () => {
        // ✅ Spy on MongoDB `deleteOne` and force failure
        jest.spyOn(clinet.db("images").collection("metadata"), "deleteOne")
            .mockRejectedValueOnce(new Error("MongoDB Delete Error"));

        const res = await request(app).delete("/image/test.jpg");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    test("❌ 500 - S3 DeleteObjectCommand Failure", async () => {
        // ✅ Force failure on S3 delete operation
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 DeleteObjectCommand Failed") as never);

        // ✅ Mock MongoDB to return a valid delete result
        jest.spyOn(clinet.db("images").collection("metadata"), "deleteOne").mockResolvedValue({ deletedCount: 1 } as any);

        const res = await request(app).delete("/image/test.jpg");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("🛠️ Mocked API Tests - get /images", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on getAllImages", async () => {
        // ✅ Spy on `find().toArray()` and force failure
        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValue({ toArray: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")) } as any);

        const res = await request(app).get("/images");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    test("❌ 500 - S3 GetObjectCommand Failure on getAllImages", async () => {
        // ✅ Mock MongoDB to return image metadata
        jest.spyOn(clinet.db("images").collection("metadata"), "find").mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                { fileName: "test1.jpg", location: { position: { lat: 49.195, lng: -122.699 }, title: "Location1" } },
                { fileName: "test2.jpg", location: { position: { lat: 50.123, lng: -120.456 }, title: "Location2" } },
            ]),
        } as any);

        // ✅ Force failure on `getSignedUrl`
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);

        const res = await request(app).get("/images");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("🛠️ Mocked API Tests - put /image/update-description", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on updateImageDescription", async () => {
        // ✅ Spy on `updateOne()` and force a failure
        jest.spyOn(clinet.db("images").collection("metadata"), "updateOne")
            .mockRejectedValueOnce(new Error("MongoDB Update Error"));

        // ✅ Mock `findOne()` to return a valid image entry
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

describe("🛠️ Mocked API Tests - delete /image/delete-all/:userEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on deleteAllImagesByUser", async () => {
        // ✅ Spy on `find().toArray()` and force failure
        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValue({ toArray: jest.fn().mockRejectedValueOnce(new Error("MongoDB Find Error")) } as any);

        const res = await request(app).delete("/image/delete-all/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    test("❌ 500 - S3 DeleteObjectCommand Failure", async () => {
        // ✅ Mock MongoDB to return image metadata
        jest.spyOn(clinet.db("images").collection("metadata"), "find").mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                { fileName: "test1.jpg" },
                { fileName: "test2.jpg" },
            ]),
        } as any);

        // ✅ Force failure on `s3.send()`
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 DeleteObjectCommand Failed") as never);

        const res = await request(app).delete("/image/delete-all/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("🛠️ Mocked API Tests - post /image/share", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on Finding Image", async () => {
        // ✅ Mock `findOne` for images to throw an error
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

describe("🛠️ Mocked API Tests - get /image/shared/:userEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on getSharedImages", async () => {
        // ✅ Spy on `find().toArray()` and force failure
        jest.spyOn(clinet.db("images").collection("metadata"), "find")
            .mockReturnValue({ toArray: jest.fn().mockRejectedValueOnce(new Error("MongoDB Read Error")) } as any);

        const res = await request(app).get("/image/shared/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });

    test("❌ 500 - S3 GetObjectCommand Failure on getSharedImages", async () => {
        // ✅ Mock MongoDB to return shared images metadata
        jest.spyOn(clinet.db("images").collection("metadata"), "find").mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                { fileName: "test1.jpg", location: { position: { lat: 49.195, lng: -122.699 }, title: "Location1" } },
                { fileName: "test2.jpg", location: { position: { lat: 50.123, lng: -120.456 }, title: "Location2" } },
            ]),
        } as any);

        // ✅ Force failure on `s3.send()` for presigned URL generation
        jest.spyOn(s3, "send").mockRejectedValueOnce(new Error("S3 GetObjectCommand Failed") as never);

        const res = await request(app).get("/image/shared/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("🛠️ Mocked API Tests - post /image/cancel-share", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        server.close(); // ✅ Properly shut down the server after tests
    });

    test("❌ 500 - MongoDB Failure on cancelShare", async () => {
        jest.spyOn(clinet.db("images").collection("metadata"), "findOne")
            .mockRejectedValueOnce(new Error("MongoDB Read Error"));
    
        const res = await request(app)
            .post("/image/cancel-share")
            .send({ imageKey: "test1.jpg", senderEmail: "testuser@example.com" });
    
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    
        await new Promise((resolve) => setTimeout(resolve, 500)); // ✅ Ensures Jest has time to clean up
    });
});
