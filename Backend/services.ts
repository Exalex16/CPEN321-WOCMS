import { MongoClient } from "mongodb";
// import AWS from "aws-sdk";
// import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";

// dotenv.config();

// MongoDB Connection
export const clinet = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017")

// AWS S3 Connection
// export const s3 = new AWS.S3({
//     region: process.env.AWS_REGION
// });

export const s3 = new S3Client({
    region: "us-west-2", // Set your AWS region
});
