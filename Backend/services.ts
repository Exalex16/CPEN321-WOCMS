import { MongoClient } from "mongodb";
import { S3Client } from "@aws-sdk/client-s3";
import { RequestHandler } from "express";
import multer from "multer";
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DB_URI } = process.env;

require('dotenv').config();

// MongoDB Connection
export const clinet = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017")

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error("Missing AWS credentials in environment variables.");
}

// AWS S3 Connection
export const s3 = new S3Client({
  region: "us-west-2",
  credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID, // ✅ Guaranteed to be defined
      secretAccessKey: AWS_SECRET_ACCESS_KEY, // ✅ Guaranteed to be defined
  }
});

const storage = multer.memoryStorage();
export const uploadMiddleware: RequestHandler = multer({ storage }).single("image");
export const formDataMiddleware: RequestHandler = multer().none();