import { Request, Response, NextFunction } from "express";
import { s3 } from "../services"; // Import S3Client from services.ts
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

// Multer Configuration for Handling File Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

export class imageController {
    // async uploadImage(req: Request, res: Response, nextFunction: NextFunction) {
    //     try {
    //         if (!req.file) {
    //             return res.status(400).send({ error: "No file uploaded" });
    //         }

    //         const file = req.file;
    //         const fileName = `images/${Date.now()}-${file.originalname}`;
            
    //         const params = {
    //             Bucket: "cpen321-photomap-images",
    //             Key: fileName,
    //             Body: file.buffer,
    //             ContentType: file.mimetype,
    //         };

    //         await s3.send(new PutObjectCommand(params));

    //         res.status(200).send({
    //             message: "Upload successful",
    //             imageUrl: `https://cpen321-photomap-images.s3.us-west-2.amazonaws.com/${fileName}`
    //         });
    //     } catch (error) {
    //         nextFunction(error);
    //     }
    // }

    // async deleteImage(req: Request, res: Response, nextFunction: NextFunction) {
    //     try {
    //         const { key } = req.params;
    //         if (!key) {
    //             return res.status(400).send({ error: "Image key is required" });
    //         }

    //         const params = {
    //             Bucket: "cpen321-photomap-images",
    //             Key: key,
    //         };

    //         await s3.send(new DeleteObjectCommand(params));

    //         res.status(200).send({ message: "Image deleted successfully" });
    //     } catch (error) {
    //         nextFunction(error);
    //     }
    // }
}

// Export multer for use in routes
// export const uploadMiddleware = upload.single("image");