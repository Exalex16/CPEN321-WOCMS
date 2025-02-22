import { Request, Response, NextFunction } from "express";
import { s3, clinet, uploadMiddleware } from "../services"; // Import S3Client from services.ts
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { ObjectId } from "mongodb";
import { AthenaClient, StartQueryExecutionCommand, GetQueryResultsCommand, GetQueryExecutionCommand } from "@aws-sdk/client-athena";

const athenaClient = new AthenaClient({ region: "us-west-2" });

export class imageController {
    async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
        uploadMiddleware(req, res, async (err) => {
            if (err) {
                return res.status(400).send({ error: "Multer Error: " + err.message });
            }

            if (!req.file) {
                return res.status(400).send({ error: "No file uploaded" });
            }

            const file = req.file; // Change from req.files to req.file
            const fileName = `images/${Date.now()}-${file.originalname}`;

            // Extract metadata fields
            const description = req.body.description || "No description provided";
            const uploadedBy = req.body.uploadedBy || "Anonymous";
            const timestamp = new Date().toISOString();
            const tags = req.body.tags ? req.body.tags.split(",") : [];

            // Attach metadata for S3
            const metadata = {
                "x-amz-meta-description": description,
                "x-amz-meta-uploaded-by": uploadedBy,
                "x-amz-meta-timestamp": timestamp,
            };

            // Upload image to S3
            const s3Params = {
                Bucket: "cpen321-photomap-images",
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                Metadata: metadata,
            };

            await s3.send(new PutObjectCommand(s3Params));

            // Store metadata in MongoDB
            const db = clinet.db("images"); // New database
            await db.collection("metadata").insertOne({
                fileName,
                imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/${fileName}`,
                description,
                uploadedBy,
                timestamp,
                tags,
            });

            res.status(200).send({
                message: "Upload successful",
                imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/${fileName}`,
                metadata: { description, uploadedBy, timestamp, tags },
            });
        });
    } catch (error) {
        next(error);
    }
}

    async getImageMetadata(req: Request, res: Response, next: NextFunction) {
        try {
            const { key } = req.params;
            if (!key) {
                return res.status(400).send({ error: "Image key is required" });
            }

            const fileKey = `images/${key}`; // Ensure correct key format

            const params = {
                Bucket: "cpen321-photomap-images",
                Key: fileKey,
            };

            const response = await s3.send(new HeadObjectCommand(params));

            // Extract metadata
            const metadata = response.Metadata || {};

            // Fix AWS's "double x-amz-meta-" issue
            const cleanedMetadata: Record<string, string> = {};
            Object.keys(metadata).forEach((key) => {
                cleanedMetadata[key.replace(/^x-amz-meta-x-amz-meta-/, "")] = metadata[key];
            });

            res.status(200).send({
                message: "Metadata retrieved successfully",
                metadata: cleanedMetadata
            });
        } catch (error) {
            next(error);
        }
    }

    async getImagesByUploader(req: Request, res: Response, next: NextFunction) {
        try {
            const { uploader } = req.params;
            if (!uploader) {
                return res.status(400).send({ error: "Uploader name is required" });
            }

            const db = clinet.db("images");
            const images = await db.collection("metadata").find({ uploadedBy: uploader }).toArray();

            res.status(200).send({ images });
        } catch (error) {
            next(error);
        }
    }
    

    async deleteImage(req: Request, res: Response, next: NextFunction) {
        try {
            const { key } = req.params;
            if (!key) {
                return res.status(400).send({ error: "Image key is required" });
            }

            const fileKey = `images/${key}`;

            // Delete from S3
            const s3Params = { Bucket: "cpen321-photomap-images", Key: fileKey };
            await s3.send(new DeleteObjectCommand(s3Params));

            // Delete metadata from MongoDB
            const db = clinet.db("images");
            const deleteResult = await db.collection("metadata").deleteOne({ fileName: fileKey });

            if (deleteResult.deletedCount === 0) {
                return res.status(404).send({ error: "Metadata not found in MongoDB" });
            }

            res.status(200).send({ message: "Image deleted successfully" });
        } catch (error) {
            next(error);
        }
    }
}

