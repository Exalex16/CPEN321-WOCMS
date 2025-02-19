import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
// import dotenv from "dotenv";

// dotenv.config();

// MongoDB Connection
export const clinet = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017")

// AWS S3 Connection
// export const s3 = new AWS.S3({
//     region: process.env.AWS_REGION
// });

