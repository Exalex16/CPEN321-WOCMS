import { Request, Response, NextFunction } from "express";
import { s3 } from "../services"; // Import S3Client from services.ts
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { uploadMiddleware } from "../services";


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
                const fileName = `images/${Date.now()}-${file.originalname}`;

                // Extract metadata from the request
                const metadata = {
                    "x-amz-meta-description": req.body.description || "No description provided",
                    "x-amz-meta-uploaded-by": req.body.uploadedBy || "Anonymous",
                    "x-amz-meta-timestamp": new Date().toISOString(),
                };

                const params = {
                    Bucket: "cpen321-photomap-images",
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    Metadata: metadata, // Attach custom metadata here
                };

                await s3.send(new PutObjectCommand(params));

                res.status(200).send({
                    message: "Upload successful",
                    imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/${fileName}`,
                    metadata: metadata
                });
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteImage(req: Request, res: Response, nextFunction: NextFunction) {
        try {
            const { key } = req.params;
            if (!key) {
                return res.status(400).send({ error: "Image key is required" });
            }

            // Ensure the correct S3 key format by always looking inside "images/"
            const fileKey = `images/${key}`;

            const params = {
                Bucket: "cpen321-photomap-images",
                Key: fileKey,
            };

            await s3.send(new DeleteObjectCommand(params));

            res.status(200).send({ message: "Image deleted successfully" });
        } catch (error) {
            nextFunction(error);
        }
    }
}

