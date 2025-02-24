import { Request, Response, NextFunction } from "express";
import { s3, clinet, uploadMiddleware } from "../services"; // Import S3Client from services.ts
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer"; // For email sharing
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
    
                const file = req.file;
                const uploadedBy = req.body.uploadedBy || "anonymous@example.com"; // Use Gmail instead of name
                const timestamp = new Date().toISOString();
                const rawFileName = `${uploadedBy}-${timestamp.replace(/:/g, "-")}`; // No 'images/' prefix
    
                // Extract metadata fields
                const description = req.body.description || "No description provided";
                const tags = req.body.tags ? req.body.tags.split(",") : [];
    
                // Attach metadata for S3
                const metadata = {
                    "x-amz-meta-description": description,
                    "x-amz-meta-uploaded-by": uploadedBy,
                    "x-amz-meta-timestamp": timestamp,
                };
    
                // Upload image to S3 with 'images/' prefix
                const s3Params = {
                    Bucket: "cpen321-photomap-images",
                    Key: `images/${rawFileName}`,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    Metadata: metadata,
                };
    
                await s3.send(new PutObjectCommand(s3Params));
    
                // Store metadata in MongoDB (without 'images/' prefix)
                const db = clinet.db("images");
                await db.collection("metadata").insertOne({
                    fileName: rawFileName,  // ✅ Store only the filename
                    imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
                    description,
                    uploadedBy: [uploadedBy],
                    timestamp,
                    tags,
                });
    
                res.status(200).send({
                    message: "Upload successful",
                    fileName: rawFileName, // ✅ Send only the filename
                    imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
                    metadata: { description, uploadedBy, timestamp, tags },
                });
            });
        } catch (error) {
            next(error);
        }
    }
    

    /**
     * Get image metadata and full-size image URL.
     */
    async getImage(req: Request, res: Response, next: NextFunction) {
        try {
            const { key } = req.params;
            if (!key) {
                return res.status(400).send({ error: "Image key is required" });
            }
    
            const db = clinet.db("images");
            const image = await db.collection("metadata").findOne({ fileName: key });
    
            if (!image) {
                return res.status(404).send({ error: "Image not found" });
            }
    
            // Generate a presigned URL valid for 1 hour (manually add `images/`)
            const presignedUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({
                    Bucket: "cpen321-photomap-images",
                    Key: `images/${key}`,
                }),
                { expiresIn: 3600 } // 1 hour expiration
            );
    
            res.status(200).send({
                message: "Image retrieved successfully",
                fileName: key,  // ✅ Send only the filename
                presignedUrl,
                metadata: image,
            });
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Get all images uploaded by a user.
     */
    async getImagesByUploader(req: Request, res: Response, next: NextFunction) {
        try {
            const { uploaderEmail  } = req.params;
            if (!uploaderEmail ) {
                return res.status(400).send({ error: "Uploader name is required" });
            }
    
            const db = clinet.db("images");
            // Find images where uploader is in the uploadedBy array
            const images = await db.collection("metadata").find({ uploadedBy: uploaderEmail }).toArray();
    
            res.status(200).send({ images });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete image from S3 and remove metadata from MongoDB.
     */
    async deleteImage(req: Request, res: Response, next: NextFunction) {
        try {
            const { key } = req.params;
            if (!key) {
                return res.status(400).send({ error: "Image key is required" });
            }
    
            // Manually add 'images/' before deleting from S3
            const fileKey = `images/${key}`;
    
            // Delete from S3
            const s3Params = { Bucket: "cpen321-photomap-images", Key: fileKey };
            await s3.send(new DeleteObjectCommand(s3Params));
    
            // Delete metadata from MongoDB
            const db = clinet.db("images");
            const deleteResult = await db.collection("metadata").deleteOne({ fileName: key });
    
            if (deleteResult.deletedCount === 0) {
                return res.status(404).send({ error: "Metadata not found in MongoDB" });
            }
    
            res.status(200).send({ message: "Image deleted successfully" });
        } catch (error) {
            next(error);
        }
    }


    /**
     * Share an image by sending an email with the image link.
     */
    async shareImage(req: Request, res: Response, next: NextFunction) {
        try {
            const { recipientEmail, imageKey, senderEmail } = req.body;
            if (!recipientEmail || !imageKey || !senderEmail) {
                return res.status(400).send({ error: "Recipient email, image key, and sender email are required" });
            }
    
            const db = clinet.db("images");
    
            // Update the image metadata to include recipient's Gmail
            const updateResult = await db.collection("metadata").updateOne(
                { fileName: `${imageKey}` },
                { $addToSet: { uploadedBy: recipientEmail } } // Add recipient Gmail if not already there
            );
    
            if (updateResult.matchedCount === 0) {
                return res.status(404).send({ error: "Image not found" });
            }
    
            res.status(200).send({ message: "Image shared successfully" });
        } catch (error) {
            next(error);
        }
    }
    
    
}

