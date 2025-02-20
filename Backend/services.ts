import { MongoClient } from "mongodb";
// import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";

// dotenv.config();

// MongoDB Connection
export const clinet = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017")

// AWS S3 Connection
export const s3 = new S3Client({
    region: "us-west-2", // Set your AWS region
});

let uploadMiddleware;

try {
    const storage = multer.memoryStorage();
    uploadMiddleware = multer({ storage }).single("image");
    console.log("Multer initialized successfully");
} catch (error) {
    console.error("Error initializing Multer:", error);
}

export { uploadMiddleware };
