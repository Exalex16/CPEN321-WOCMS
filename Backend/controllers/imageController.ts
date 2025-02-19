import { Request, Response, NextFunction } from "express";
// import { s3 } from "../services";

// // Extend Request type to include file property
// interface MulterRequest extends Request {
//     file?: Express.Multer.File;
// }

export class imageController {
    // async uploadImage(req: Request, res: Response, nextFunction: NextFunction) {
    //     try {
    //         if (!req.file) {
    //             return res.status(400).send({ error: "No file uploaded" });
    //         }
    //         const file = req.file as Express.MulterS3.File;
    //         res.status(200).send({
    //             message: "Upload successful",
    //             imageUrl: file.location
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

    //         await s3.deleteObject({
    //             Bucket: process.env.AWS_S3_BUCKET_NAME!,
    //             Key: key
    //         }).promise();

    //         res.status(200).send({ message: "Image deleted successfully" });
    //     } catch (error) {
    //         nextFunction(error);
    //     }
    // }

}