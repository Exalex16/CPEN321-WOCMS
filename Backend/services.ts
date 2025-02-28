import { MongoClient } from "mongodb";
import { S3Client } from "@aws-sdk/client-s3";
import { RequestHandler } from "express";
import multer from "multer";


// MongoDB Connection
export const clinet = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017")

// AWS S3 Connection
export const s3 = new S3Client({
    region: "us-west-2", 
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
});

const storage = multer.memoryStorage();
export const uploadMiddleware: RequestHandler = multer({ storage }).single("image");
export const formDataMiddleware: RequestHandler = multer().none();