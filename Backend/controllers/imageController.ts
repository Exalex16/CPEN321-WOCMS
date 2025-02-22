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
    
                console.log("🔹 Request body:", req.body);
                console.log("🔹 Uploaded files:", req.files);
    
                if (!req.files || !("image" in req.files)) {
                    return res.status(400).send({ error: "No file uploaded" });
                }
    
                const file = (req.files as { [fieldname: string]: Express.Multer.File[] })["image"][0];
                const fileName = `images/${Date.now()}-${file.originalname}`;
    
                // Extract metadata fields
                const description = req.body.description ? req.body.description.toString() : "No description provided";
                const uploadedBy = req.body.uploadedBy ? req.body.uploadedBy.toString() : "Anonymous";
                const timestamp = new Date().toISOString();
                const tags = req.body.tags ? req.body.tags.toString().split(",") : [];
    
                // Attach metadata for S3
                const metadata = {
                    "x-amz-meta-description": description,
                    "x-amz-meta-uploaded-by": uploadedBy,
                    "x-amz-meta-timestamp": timestamp
                };
    
                const params = {
                    Bucket: "cpen321-photomap-images",
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    Metadata: metadata,
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

