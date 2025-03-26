import { param } from "express-validator"
import { imageController} from "../controllers/imageController";
import { Request, Response } from 'express';

const controller = new imageController()

export const imageRoutes = [
    {
        method: "post",
        route: "/upload",
        action: (req: Request, res: Response) => controller.uploadImage(req, res),
        validation: [],
    },
    {
        method: "delete",
        route: "/image/:key",
        action: (req: Request, res: Response) => controller.deleteImage(req, res),
        validation: [param("key").isString()],
    },
    {
        method: "get",
        route: "/metadata/:key",
        action: (req: Request, res: Response) => controller.getImage(req, res),
        validation: [param("key").isString()],
    },
    {
        method: "get",
        route: "/images/uploader/:uploaderEmail",
        action: (req: Request, res: Response) => controller.getImagesByUploader(req, res),
        validation: [],
    },
    {
        method: "get",
        route: "/images",
        action: (req: Request, res: Response) => controller.getAllImages(req, res),
        validation: [], 
    },
    {
        method: "put",
        route: "/image/update-description",
        action: (req: Request, res: Response) => controller.updateImageDescription(req, res),
        validation: [],
    },
    {
        method: "delete",
        route: "/image/delete-all/:userEmail",
        action: (req: Request, res: Response) => controller.deleteAllImagesByUser(req, res),
        validation: [],
    },
    {
        method: "post",
        route: "/image/share",
        action: (req: Request, res: Response) => controller.shareImage(req, res),
        validation: [],
    },
    {
        method: "get",
        route: "/image/shared/:userEmail",
        action: (req: Request, res: Response) => controller.getSharedImages(req, res),
        validation: [],
    },
    {
        method: "post",
        route: "/image/cancel-share",
        action: (req: Request, res: Response) => controller.cancelShare(req, res),
        validation: [],
    },
    {
        method: "post",
        route: "/image/cancel-share-individual",
        action: (req: Request, res: Response) => controller.cancelShareForUser(req, res),
        validation: [],
    },
]
