import { MongoClient } from "mongodb";
// import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";
import { RequestHandler } from "express";
import multer from "multer";

// dotenv.config();

// MongoDB Connection
export const clinet = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017")

// AWS S3 Connection
export const s3 = new S3Client({
    region: "us-west-2", // Set your AWS region
});

const storage = multer.memoryStorage();
export const uploadMiddleware: RequestHandler = multer({ storage }).single("image");