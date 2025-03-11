import { imageController } from "../../controllers/imageController";
import { Request, Response } from "express";
import { s3, clinet } from "../../services";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import "../../controllers/imageController";
import "../../routes/imageRoutes";

jest.mock("../../services", () => ({
    s3: {
        send: jest.fn(),
    },
    clinet: {
        db: jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
                findOne: jest.fn(),
                insertOne: jest.fn(),
                deleteOne: jest.fn(),
                updateOne: jest.fn(),
            }),
        }),
    },
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn().mockResolvedValue("https://presigned-url.com"),
}));

describe("Mocked Controller Tests - imageController", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;
    const controller = new imageController();

    beforeEach(() => {
        req = {
            params: { key: "test-image.jpg" },
            body: { uploadedBy: "exalex16@gmail.com", description: "Test Image" },
            file: {
                fieldname: "photo",
                originalname: "test1.png",
                encoding: "7bit",
                mimetype: "image/png",
                buffer: Buffer.from("fake image data"), // ✅ Mocked image data
                size: 1024,
                stream: null as any,
                destination: "",
                filename: "test1.png",
                path: "",
            } as Express.Multer.File, // ✅ Explicitly cast to `Express.Multer.File`
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    // test("✅ Upload Image", async () => {
    //     await controller.uploadImage(req as Request, res as Response, next);
    //     expect(res.status).toHaveBeenCalledWith(200);
    //     expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
    //         message: "Upload successful",
    //         presignedUrl: "https://presigned-url.com",
    //     }));
    // });

    // test("✅ Get Image Metadata", async () => {
    //     (clinet.db as jest.Mock).mockReturnValue({
    //         collection: jest.fn().mockReturnValue({
    //             findOne: jest.fn().mockResolvedValue({ fileName: "test-image.jpg" }),
    //         }),
    //     });

    //     await controller.getImage(req as Request, res as Response, next);
    //     expect(res.status).toHaveBeenCalledWith(200);
    //     expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
    //         fileName: "test-image.jpg",
    //     }));
    // });

    test("❌ Get Non-Existing Image Metadata", async () => {
        (clinet.db as jest.Mock).mockReturnValue({
            collection: jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue(null),
            }),
        });

        await controller.getImage(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test("✅ Delete Image", async () => {
        (clinet.db as jest.Mock).mockReturnValue({
            collection: jest.fn().mockReturnValue({
                deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            }),
        });

        await controller.deleteImage(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ message: "Image deleted successfully" });
    });

    test("❌ Delete Non-Existing Image", async () => {
        (clinet.db as jest.Mock).mockReturnValue({
            collection: jest.fn().mockReturnValue({
                deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            }),
        });

        await controller.deleteImage(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
