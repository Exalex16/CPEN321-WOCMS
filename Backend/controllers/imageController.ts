import { Request, Response, NextFunction } from "express";
import { s3, clinet, uploadMiddleware } from "../services"; // Import S3Client from services.ts
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from "mongodb";
import sharp from "sharp";
import { RekognitionClient, DetectLabelsCommand, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({ region: "us-west-2" });

export class imageController {
    // async uploadImage(req: Request, res: Response, next: NextFunction) {
    //     try {
    //         uploadMiddleware(req, res, async (err) => {
    //             if (err) {
    //                 return res.status(400).send({ error: "Multer Error: " + err.message });
    //             }
    
    //             if (!req.file) {
    //                 return res.status(400).send({ error: "No file uploaded" });
    //             }
    
    //             const file = req.file;
    //             const uploadedBy = req.body.uploadedBy || "anonymous@example.com";
    //             const timestamp = new Date().toISOString();
    //             const rawFileName = `${uploadedBy}-${timestamp.replace(/:/g, "-")}`;
    
    //             // Extract metadata fields
    //             const description = req.body.description || "No description provided";
    //             const tags = req.body.tags ? req.body.tags.split(",") : [];

    //             // Extract location metadata
    //             let location = null;
    //             if (req.body.location) {
    //                 try {
    //                     location = JSON.parse(req.body.location); // Convert string to JSON
    //                 } catch (e) {
    //                     return res.status(400).send({ error: "Invalid location format. Ensure it's valid JSON." });
    //                 }
    //             }
    
    //             // Attach metadata for S3
    //             const metadata = {
    //                 "x-amz-meta-description": description,
    //                 "x-amz-meta-uploaded-by": uploadedBy,
    //                 "x-amz-meta-timestamp": timestamp,
    //                 "x-amz-meta-location": JSON.stringify(location), // Store location as JSON string
    //             };

    //             const allowedMimeTypes: Record<string, string> = {
    //                 "jpg": "image/jpeg",
    //                 "jpeg": "image/jpeg",
    //                 "png": "image/png",
    //                 "gif": "image/gif",
    //                 "webp": "image/webp",
    //             };
                
    //             const fileExtension = file.originalname.split(".").pop()?.toLowerCase();
    //             const correctedMimeType = allowedMimeTypes[fileExtension || ""] || "application/octet-stream";
                
    //             // Upload image to S3
    //             const s3Params = {
    //                 Bucket: "cpen321-photomap-images",
    //                 Key: `images/${rawFileName}`,
    //                 Body: file.buffer,
    //                 ContentType: correctedMimeType,
    //                 Metadata: metadata,
    //             };
    
    //             await s3.send(new PutObjectCommand(s3Params));
    
    //             // Store metadata in MongoDB (including location)
    //             const db = clinet.db("images");
    //             await db.collection("metadata").insertOne({
    //                 fileName: rawFileName,
    //                 imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
    //                 description,
    //                 uploadedBy: [uploadedBy],
    //                 timestamp,
    //                 tags,
    //                 location, // Store structured location
    //             });
    
    //             // Update user database with location history
    //             const userDb = clinet.db("User");
    //             if (location) {
    //                 await userDb.collection("users").updateOne(
    //                     { googleEmail: uploadedBy },
    //                     { $addToSet: { locations: location } } // Prevent duplicates
    //                 );
    //             }
    
    //             res.status(200).send({
    //                 message: "Upload successful",
    //                 fileName: rawFileName,
    //                 imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
    //                 metadata: { description, uploadedBy, timestamp, tags, location },
    //             });
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    async uploadImage(req: Request, res: Response, next: NextFunction) {
        try {
            uploadMiddleware(req, res, async (err) => {
                if (err) {
                    return res.status(400).send({ error: "Multer Error: " + err.message });
                }
    
                if (!req.file) {
                    return res.status(400).send({ error: "No file uploaded" });
                }
    
                // Extract metadata fields
                const uploadedBy = req.body.uploadedBy || "anonymous@example.com";
                const timestamp = new Date().toISOString();

                // Convert image to JPG or PNG
                const processedImage = await processImage(req.file);

                // Force file extension to match converted type
                const rawFileName = `${uploadedBy}-${timestamp.replace(/:/g, "-")}.${processedImage.fileExtension}`;

                // Extract location metadata
                let location = null;
                if (req.body.location) {
                    try {
                        location = JSON.parse(req.body.location); // Convert string to JSON

                        location.position.lat = parseFloat(location.position.lat);
                        location.position.lng = parseFloat(location.position.lng);
                    } catch (e) {
                        return res.status(400).send({ error: "Invalid location format. Ensure it's valid JSON." });
                    }
                }
                
                // Upload image to S3
                const s3Params = {
                    Bucket: "cpen321-photomap-images",
                    Key: `images/${rawFileName}`,
                    Body: processedImage.buffer, // Upload converted image
                    ContentType: processedImage.mimeType, // Correct MIME type (image/jpeg or image/png)
                    Metadata: { "x-amz-meta-uploaded-by": uploadedBy, 
                                "x-amz-meta-timestamp": timestamp,
                                "x-amz-meta-location": JSON.stringify(location),
                            },
                };
    
                await s3.send(new PutObjectCommand(s3Params));

                // Send image to AWS Rekognition
                const labels = await analyzeImageLabels("cpen321-photomap-images", `images/${rawFileName}`);
                const moderationLabels = await analyzeImageModeration("cpen321-photomap-images", `images/${rawFileName}`);
    
                // Store metadata in MongoDB (including location)
                const db = clinet.db("images");
                await db.collection("metadata").insertOne({
                    fileName: rawFileName,
                    imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
                    description: req.body.description || "No description provided",
                    uploadedBy: [uploadedBy],
                    timestamp,
                    tags: labels,
                    moderationLabels,
                    location, // Store structured location
                });
    
                // Update user database with location history
                const userDb = clinet.db("User");
                if (location) {
                    await userDb.collection("users").updateOne(
                        { googleEmail: uploadedBy },
                        { $addToSet: { locations: location } } // Prevent duplicates
                    );
                }
    
                res.status(200).send({
                    message: "Upload successful",
                    fileName: rawFileName,
                    imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
                    metadata: { uploadedBy, timestamp,tags: labels, moderationLabels, location},
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

            // Ensure lat/lng are always returned as double
            const formattedLocation = image.location
            ? {
                position: {
                    lat: parseFloat(image.location.position.lat),
                    lng: parseFloat(image.location.position.lng),
                },
                title: image.location.title,
                location: image.location.location,
                icon: image.location.icon,
            }
            : null; // If no location, return null
    
            // Generate a presigned URL valid for 1 hour
            const presignedUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({
                    Bucket: "cpen321-photomap-images",
                    Key: `images/${key}`,
                }),
                { expiresIn: 604800 }
            );
            
    
            res.status(200).send({
                ...image, // Include all image metadata directly at the top level
                presignedUrl, 
                location: formattedLocation, 
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
            const { uploaderEmail } = req.params;
            if (!uploaderEmail) {
                return res.status(400).send({ error: "Uploader email is required" });
            }
    
            const db = clinet.db("images");
            const images = await db.collection("metadata").find({ uploadedBy: uploaderEmail }).toArray();
    
            // Generate presigned URLs for each image
            const imagesWithPresignedUrls = await Promise.all(
                images.map(async (image) => {
                    const presignedUrl = await getSignedUrl(
                        s3,
                        new GetObjectCommand({
                            Bucket: "cpen321-photomap-images",
                            Key: `images/${image.fileName}`,
                        }),
                        { expiresIn: 604800 }
                    );
    
                    return {
                        ...image,
                        presignedUrl, // Include temporary URL for frontend display
                        location: image.location, // Include location data
                    };
                })
            );
    
            res.status(200).send({ images: imagesWithPresignedUrls });
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

    async getAllImages(req: Request, res: Response, next: NextFunction) {
        try {
            const db = clinet.db("images");
            const images = await db.collection("metadata").find().toArray(); // Fetch all images
    
            // Generate presigned URLs for each image
            const imagesWithPresignedUrls = await Promise.all(
                images.map(async (image) => {
                    const presignedUrl = await getSignedUrl(
                        s3,
                        new GetObjectCommand({
                            Bucket: "cpen321-photomap-images",
                            Key: `images/${image.fileName}`,
                        }),
                        { expiresIn: 604800 } 
                    );
    
                    return {
                        ...image, 
                        presignedUrl,
                        location: image.location, 
                    };
                })
            );
    
            res.status(200).send({ images: imagesWithPresignedUrls });
        } catch (error) {
            next(error);
        }
    }
    
    
}

const allowedMimeTypes: Record<string, string> = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
};


async function processImage(file: Express.Multer.File) {
    let fileExtension = file.originalname.split(".").pop()?.toLowerCase() || "jpg"; // Default to jpg
    let mimeType = allowedMimeTypes[fileExtension] || "image/jpeg"; // Default to jpg

    // Convert any image to JPG/PNG (force JPG by default)
    const convertedImage = await sharp(file.buffer)
        .toFormat(fileExtension === "png" ? "png" : "jpeg") // Convert based on original type
        .toBuffer();

    return {
        buffer: convertedImage,
        mimeType: fileExtension === "png" ? "image/png" : "image/jpeg", // Ensure correct MIME type
        fileExtension: fileExtension === "png" ? "png" : "jpg", // Correct extension
    };
}

async function analyzeImageLabels(s3Bucket: string, imageKey: string) {
    try {
        const labelCommand = new DetectLabelsCommand({
            Image: { S3Object: { Bucket: s3Bucket, Name: imageKey } },
            MaxLabels: 10, // Limit the number of labels returned
            MinConfidence: 75, // Only return labels with >75% confidence
        });

        const labelResponse = await rekognition.send(labelCommand);
        console.log("🔹 Rekognition Labels Response:", JSON.stringify(labelResponse, null, 2));

        const labels = labelResponse.Labels?.map(label => label.Name) || [];

        return labels;
    } catch (error) {
        console.error("Rekognition Label Detection Error:", error);
        return [];
    }
}

async function analyzeImageModeration(s3Bucket: string, imageKey: string) {
    try {
        const moderationCommand = new DetectModerationLabelsCommand({
            Image: { S3Object: { Bucket: s3Bucket, Name: imageKey } },
            MinConfidence: 75, // Only return moderation labels with >75% confidence
        });

        const moderationResponse = await rekognition.send(moderationCommand);
        const moderationLabels = moderationResponse.ModerationLabels?.map(label => label.Name) || [];

        return moderationLabels;
    } catch (error) {
        console.error("Rekognition Moderation Detection Error:", error);
        return [];
    }
}
