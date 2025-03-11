import { Request, Response, NextFunction } from "express";
import { s3, clinet, uploadMiddleware } from "../services"; 
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from "mongodb";
import sharp from "sharp";
import { RekognitionClient, DetectLabelsCommand, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({ region: "us-west-2" });

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
                        location = JSON.parse(req.body.location); 

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
                    Body: processedImage.buffer, 
                    ContentType: processedImage.mimeType, 
                    Metadata: { "x-amz-meta-uploaded-by": uploadedBy, 
                                "x-amz-meta-timestamp": timestamp,
                            },
                };
    
                await s3.send(new PutObjectCommand(s3Params));

                // Send image to AWS Rekognition
                const labels = await analyzeImageLabels("cpen321-photomap-images", `images/${rawFileName}`);
                const moderationLabels = await analyzeImageModeration("cpen321-photomap-images", `images/${rawFileName}`);

                // Generate a presigned URL valid for 1 hour
                const presignedUrl = await getSignedUrl(
                    s3,
                    new GetObjectCommand({
                        Bucket: "cpen321-photomap-images",
                        Key: `images/${rawFileName}`,
                    }),
                    { expiresIn: 604800 }
                );
    
                // Store metadata in MongoDB 
                const db = clinet.db("images");
                await db.collection("metadata").insertOne({
                    fileName: rawFileName,
                    imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
                    description: req.body.description || "No description provided",
                    uploadedBy: [uploadedBy],
                    timestamp,
                    tags: labels,
                    moderationLabels,
                    location, 
                    sharedTo: [],  
                    shared: false, 
                    sharedBy: null 
                });
    
                // Update user database with location history
                const userDb = clinet.db("User");
                if (location) {
                    await userDb.collection("users").updateOne(
                        { googleEmail: uploadedBy },
                        { $addToSet: { locations: location } } 
                    );
                }
    
                res.status(200).send({
                    message: "Upload successful",
                    fileName: rawFileName,
                    presignedUrl,
                    imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/images/${rawFileName}`,
                    metadata: { uploadedBy, timestamp,tags: labels, moderationLabels, location, sharedTo: [], shared: false,
                        sharedBy: null},
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
            : null; 
    
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
                ...image, 
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
        
            const db = clinet.db("images");
            const userDb = clinet.db("User");

            const userExists = await userDb.collection("users").findOne({ googleEmail: uploaderEmail });
            if (!userExists) {
                return res.status(404).send({ error: "User not found" });
            }
    
            // Fetch images that were either uploaded by the user OR shared with them
            const userImages = await db.collection("metadata").find({
                $or: [
                    { uploadedBy: uploaderEmail },  // Images the user uploaded
                    { sharedTo: uploaderEmail }     // Images shared with the user
                ]
            }).toArray();
    
            // Generate pre-signed URLs for each image
            const imagesWithPresignedUrls = await Promise.all(
                userImages.map(async (image) => {
                    const presignedUrl = await getSignedUrl(
                        s3,
                        new GetObjectCommand({
                            Bucket: "cpen321-photomap-images",
                            Key: `images/${image.fileName}`,
                        }),
                        { expiresIn: 604800 } // 7-day expiration
                    );
    
                    return {
                        ...image,
                        presignedUrl, // Include presigned URL
                        location: image.location, // Ensure location is included
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

    async updateImageDescription(req: Request, res: Response, next: NextFunction) {
        try {
            const { fileName, newDescription } = req.body;
    
            if (!fileName || !newDescription) {
                return res.status(400).send({ error: "Both fileName and newDescription are required." });
            }
    
            const db = clinet.db("images");
    
            // Find the image
            const image = await db.collection("metadata").findOne({ fileName });
            if (!image) {
                return res.status(404).send({ error: "Image not found" });
            }
    
            // Update the description field
            const updateResult = await db.collection("metadata").updateOne(
                { fileName },
                { $set: { description: newDescription } }
            );
    
            if (updateResult.modifiedCount === 0) {
                return res.status(500).send({ error: "Failed to update image description." });
            }
    
            res.status(200).send({ message: "Image description updated successfully", fileName, newDescription });
        } catch (error) {
            next(error);
        }
    }
    
    async deleteAllImagesByUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { userEmail } = req.params;
            if (!userEmail) {
                return res.status(400).send({ error: "User email is required." });
            }
    
            const db = clinet.db("images");
    
            // Find all images uploaded by the user
            const images = await db.collection("metadata").find({ uploadedBy: userEmail }).toArray();
    
            if (images.length === 0) {
                return res.status(404).send({ error: "No images found for this user." });
            }
    
            // Delete images from S3
            for (const image of images) {
                const fileKey = `images/${image.fileName}`;
                await s3.send(new DeleteObjectCommand({ Bucket: "cpen321-photomap-images", Key: fileKey }));
            }
    
            // Remove image metadata from MongoDB
            const deleteResult = await db.collection("metadata").deleteMany({ uploadedBy: userEmail });
    
            res.status(200).send({
                message: `Successfully deleted ${deleteResult.deletedCount} images for user ${userEmail}.`,
            });
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
    
            // Find the image
            const image = await db.collection("metadata").findOne({ fileName: imageKey });
            if (!image) {
                return res.status(404).send({ error: "Image not found" });
            }
    
            // Ensure the sender is the owner of the image
            if (!image.uploadedBy.includes(senderEmail)) {
                return res.status(403).send({ error: "Only the owner can share this image" });
            }
    
            // Check if the recipient already has the image
            if (image.sharedTo && image.sharedTo.includes(recipientEmail)) {
                return res.status(400).send({ error: "Recipient already has access to this image" });
            }
    
            // Update the image metadata
            const updateResult = await db.collection("metadata").updateOne(
                { fileName: imageKey },
                {
                    $addToSet: { sharedTo: recipientEmail }, // Add recipient to shared list
                    $set: { shared: true, sharedBy: senderEmail }
                }
            );
    
            if (updateResult.matchedCount === 0) {
                return res.status(500).send({ error: "Failed to share image" });
            }
    
            // Check if the recipient already has the location
            const userDb = clinet.db("User");
            const recipient = await userDb.collection("users").findOne({ googleEmail: recipientEmail });
    
            let locationAdded = false;
            if (image.location) {
                const alreadyHasLocation = recipient?.locations?.some(
                    (loc: any) => loc.position.lat === image.location.position.lat && loc.position.lng === image.location.position.lng
                );
    
                if (!alreadyHasLocation) {
                    await userDb.collection("users").updateOne(
                        { googleEmail: recipientEmail },
                        { $addToSet: { locations: image.location } }
                    );
                    locationAdded = true;
                }
            }
    
            res.status(200).send({ 
                message: "Image shared successfully", 
                sharedTo: recipientEmail, 
                locationAdded
            });
        } catch (error) {
            next(error);
        }
    }

    async getSharedImages(req: Request, res: Response, next: NextFunction) {
        try {
            const { userEmail } = req.params;
            if (!userEmail) {
                return res.status(400).send({ error: "User email is required." });
            }
    
            const db = clinet.db("images");
    
            // Fetch images that the user shared OR received as a shared image
            const sharedImages = await db.collection("metadata").find({
                $or: [
                    { sharedBy: userEmail }, // Images the user shared
                    { sharedTo: userEmail }  // Images shared to the user
                ]
            }).toArray();
    
            // Generate pre-signed URLs for each shared image
            const sharedImagesWithPresignedUrls = await Promise.all(
                sharedImages.map(async (image) => {
                    const presignedUrl = await getSignedUrl(
                        s3,
                        new GetObjectCommand({
                            Bucket: "cpen321-photomap-images",
                            Key: `images/${image.fileName}`,
                        }),
                        { expiresIn: 604800 } // 7-day expiration
                    );
    
                    return {
                        ...image,
                        presignedUrl, // Include presigned URL
                        location: image.location, // Ensure location is included
                    };
                })
            );
    
            res.status(200).send({ sharedImages: sharedImagesWithPresignedUrls });
        } catch (error) {
            next(error);
        }
    }

    async cancelShare(req: Request, res: Response, next: NextFunction) {
        try {
            const { imageKey, senderEmail } = req.body;
            if (!imageKey || !senderEmail) {
                return res.status(400).send({ error: "Image key and sender email are required" });
            }
    
            const db = clinet.db("images");
    
            // Find the image
            const image = await db.collection("metadata").findOne({ fileName: imageKey });
            if (!image) {
                return res.status(404).send({ error: "Image not found" });
            }
    
            // Ensure only the original sharer can cancel sharing
            if (image.sharedBy !== senderEmail) {
                return res.status(403).send({ error: "Only the original sharer can cancel sharing" });
            }
    
            // Store sharedTo users for location cleanup
            const sharedUsers = image.sharedTo || [];
    
            // Reset the shared attributes
            const updateResult = await db.collection("metadata").updateOne(
                { fileName: imageKey },
                { $set: { shared: false, sharedBy: null, sharedTo: [] } }
            );
    
            if (updateResult.modifiedCount === 0) {
                return res.status(500).send({ error: "Failed to cancel sharing" });
            }
    
            // Remove shared location from users if they have no other shared images at that location
            const userDb = clinet.db("User");
            for (const userEmail of sharedUsers) {
                const userImages = await db.collection("metadata").find({
                    sharedTo: userEmail,
                    "location.position": image.location.position
                }).toArray();
    
                if (userImages.length === 0) {
                    await userDb.collection("users").updateOne(
                        { googleEmail: userEmail },
                        { $pull: { locations: image.location } }
                    );
                }
            }
    
            res.status(200).send({ message: "Sharing canceled successfully", imageKey });
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
    let fileExtension = file.originalname.split(".").pop()?.toLowerCase() || "jpg"; 
    let mimeType = allowedMimeTypes[fileExtension] || "image/jpeg"; 

    // Convert any image to JPG/PNG (force JPG by default)
    const convertedImage = await sharp(file.buffer)
        .toFormat(fileExtension === "png" ? "png" : "jpeg") 
        .toBuffer();

    return {
        buffer: convertedImage,
        mimeType: fileExtension === "png" ? "image/png" : "image/jpeg", // Ensure correct MIME type
        fileExtension: fileExtension === "png" ? "png" : "jpg", 
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
