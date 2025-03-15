import { Request, Response } from "express";
import { s3, clinet, uploadMiddleware } from "../services"; 
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { RekognitionClient, DetectLabelsCommand, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";

export const rekognition = new RekognitionClient({ region: "us-west-2" });

export class imageController {
    
    uploadImage = async (req: Request, res: Response) => {
        await new Promise<void>((resolve, reject) => {
            uploadMiddleware(req, res, (err) => {
                if (!req.file) {
                    res.status(400).send({ error: "No file uploaded" });
                    return;
                }
                if (err) {
                    return res.status(400).send({ error: "Invalid form data" });
                }
                resolve();
            });
        });

        const file = req.file as Express.Multer.File;

        // Extract metadata fields
        const uploadedBy = req.body.uploadedBy || "anonymous@example.com";
        const timestamp = new Date().toISOString();

        // Convert image to JPG or PNG
        const processedImage = await processImage(file);

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
            Metadata: { "x-amz-meta-uploaded-by": uploadedBy, "x-amz-meta-timestamp": timestamp },
        };
        await s3.send(new PutObjectCommand(s3Params));

        // Send image to AWS Rekognition
        let labels;
        let moderationLabels;
        labels = await analyzeImageLabels("cpen321-photomap-images", `images/${rawFileName}`);
        moderationLabels = await analyzeImageModeration("cpen321-photomap-images", `images/${rawFileName}`);

        // Generate a presigned URL valid for 1 hour
        let presignedUrl;
        presignedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: "cpen321-photomap-images", Key: `images/${rawFileName}` }),
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
    }
    

    /**
     * Get image metadata and full-size image URL.
     */
    getImage = async (req: Request, res: Response) => {
        const { key } = req.params;
        
        let image;
        const db = clinet.db("images");
        image = await db.collection("metadata").findOne({ fileName: key });

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
        let presignedUrl;
        presignedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: "cpen321-photomap-images", Key: `images/${key}` }),
            { expiresIn: 604800 }
        );
        
        res.status(200).send({
            ...image, 
            presignedUrl, 
            location: formattedLocation, 
        });
    }
    
    /**
     * Get all images uploaded by a user.
     */
    getImagesByUploader = async (req: Request, res: Response) => {
        const { uploaderEmail } = req.params;

        let userExists;
        const userDb = clinet.db("User");
        userExists = await userDb.collection("users").findOne({ googleEmail: uploaderEmail });
        if (!userExists) {
            return res.status(404).send({ error: "User not found" });
        }

        // Fetch images that were either uploaded by the user OR shared with them
        let userImages;
        const db = clinet.db("images");
        userImages = await db.collection("metadata").find({
            $or: [{ uploadedBy: uploaderEmail }, { sharedTo: uploaderEmail }]
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
                    { expiresIn: 604800 }
                );

                return {
                    ...image,
                    presignedUrl, // Include presigned URL
                    location: image.location, // Ensure location is included
                };
            })
        );

        res.status(200).send({ images: imagesWithPresignedUrls });
    }

    /**
     * Delete image from S3 and remove metadata from MongoDB.
     */
    deleteImage = async (req: Request, res: Response) => {
        const { key } = req.params;

        const fileKey = `images/${key}`;

        // Delete from S3
        await s3.send(new DeleteObjectCommand({ Bucket: "cpen321-photomap-images", Key: fileKey }));

        // Delete metadata from MongoDB
        const db = clinet.db("images");
        const deleteResult = await db.collection("metadata").deleteOne({ fileName: key });

        if (deleteResult.deletedCount === 0) {
            return res.status(404).send({ error: "Metadata not found in MongoDB" });
        }

        res.status(200).send({ message: "Image deleted successfully" });
    }

    getAllImages = async (req: Request, res: Response) => {
        let images;
        const db = clinet.db("images");
        images = await db.collection("metadata").find().toArray();


        // Generate presigned URLs for each image
        const imagesWithPresignedUrls = await Promise.all(
            images.map(async (image) => {
                const presignedUrl = await getSignedUrl(
                    s3,
                    new GetObjectCommand({ 
                        Bucket: "cpen321-photomap-images", 
                        Key: `images/${image.fileName}` 
                    }),
                    { expiresIn: 604800 }
                );

                return {
                    ...image,
                    presignedUrl,
                    location: image.location,  // Ensure location is included
                };
            })
        );

        res.status(200).send({ images: imagesWithPresignedUrls });
    }

    updateImageDescription = async (req: Request, res: Response) => {
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

        res.status(200).send({ message: "Image description updated successfully", fileName, newDescription });
    }
    
    deleteAllImagesByUser = async (req: Request, res: Response) => {
        const { userEmail } = req.params;

        let images;
        const db = clinet.db("images");
        images = await db.collection("metadata").find({ uploadedBy: userEmail }).toArray();


        // Delete images from S3
        for (const image of images) {
            const fileKey = `images/${image.fileName}`;
            await s3.send(new DeleteObjectCommand({ Bucket: "cpen321-photomap-images", Key: fileKey }));
        }

        // Remove image metadata from MongoDB
        await db.collection("metadata").deleteMany({ uploadedBy: userEmail });

        res.status(200).send({
            message: `Successfully deleted ${images.length} images for user ${userEmail}.`,
        });
    }

    /**
     * Share an image by sending an email with the image link.
     */
    shareImage = async (req: Request, res: Response) => {
        const { recipientEmail, imageKey, senderEmail } = req.body;
        if (!recipientEmail || !imageKey || !senderEmail) {
            return res.status(400).send({ error: "Recipient email, image key, and sender email are required" });
        }

        let image;
        const db = clinet.db("images");
        image = await db.collection("metadata").findOne({ fileName: imageKey });


        if (!image) {
            return res.status(404).send({ error: "Image not found" });
        }

        // Check if the recipient exists
        const userDb = clinet.db("User");
        const recipient = await userDb.collection("users").findOne({ googleEmail: recipientEmail });
        if (!recipient) {
            return res.status(404).send({ error: "Recipient user not found" });
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
        await db.collection("metadata").updateOne(
            { fileName: imageKey },
            {
                $addToSet: { sharedTo: recipientEmail },
                $set: { shared: true, sharedBy: senderEmail }
            }
        );


        // Check if the recipient already has the location
        let locationAdded = false;
        if (image.location) {
            const recipient = await userDb.collection("users").findOne({ googleEmail: recipientEmail });

            if (!recipient?.locations?.some((loc: any) => 
                loc.position.lat === image.location.position.lat && 
                loc.position.lng === image.location.position.lng
            )) {
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
            locationAdded,
            location: image.location,
        });

    }

    getSharedImages = async (req: Request, res: Response) => {
        const { userEmail } = req.params;

        let sharedImages;
        const db = clinet.db("images");
        sharedImages = await db.collection("metadata").find({
            $or: [{ sharedBy: userEmail }, { sharedTo: userEmail }]
        }).toArray();


        // Generate pre-signed URLs for each shared image
        const sharedImagesWithPresignedUrls = await Promise.all(
            sharedImages.map(async (image) => {
                const presignedUrl = await getSignedUrl(
                    s3,
                    new GetObjectCommand({ 
                        Bucket: "cpen321-photomap-images", 
                        Key: `images/${image.fileName}` 
                    }),
                    { expiresIn: 604800 }
                );

                return {
                    ...image,
                    presignedUrl,
                    location: image.location,  // Ensure location is included
                };
            })
        );

        res.status(200).send({ sharedImages: sharedImagesWithPresignedUrls });
    }

    cancelShare = async (req: Request, res: Response) => {
        const { imageKey, senderEmail } = req.body;
        if (!imageKey || !senderEmail) {
            return res.status(400).send({ error: "Image key and sender email are required" });
        }

        let image;
        const db = clinet.db("images");
        image = await db.collection("metadata").findOne({ fileName: imageKey });


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
        await db.collection("metadata").updateOne(
            { fileName: imageKey },
            { $set: { shared: false, sharedBy: null, sharedTo: [] } }
        );


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
    }
    
}

const allowedMimeTypes: Record<string, string> = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
};


export async function processImage(file: Express.Multer.File) {
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

export async function analyzeImageLabels(s3Bucket: string, imageKey: string) {
    try {
        const labelCommand = new DetectLabelsCommand({
            Image: { S3Object: { Bucket: s3Bucket, Name: imageKey } },
            MaxLabels: 10, // Limit the number of labels returned
            MinConfidence: 75, // Only return labels with >75% confidence
        });

        const labelResponse = await rekognition.send(labelCommand);
        // console.log("🔹 Rekognition Labels Response:", JSON.stringify(labelResponse, null, 2));

        const labels = labelResponse.Labels?.map(label => label.Name) || [];

        return labels;
    } catch (error) {
        // console.error("Rekognition Label Detection Error:", error);
        throw new Error("Image analysis failed");
    }
}

export async function analyzeImageModeration(s3Bucket: string, imageKey: string) {
    try {
        const moderationCommand = new DetectModerationLabelsCommand({
            Image: { S3Object: { Bucket: s3Bucket, Name: imageKey } },
            MinConfidence: 75, // Only return moderation labels with >75% confidence
        });

        const moderationResponse = await rekognition.send(moderationCommand);
        const moderationLabels = moderationResponse.ModerationLabels?.map(label => label.Name) || [];

        return moderationLabels;
    } catch (error) {
        // console.error("Rekognition Moderation Detection Error:", error);
        throw new Error("Image analysis failed");
    }
}
