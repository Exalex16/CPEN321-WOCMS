import { body, param } from "express-validator"
import { imageController} from "../controllers/imageController";
// import { uploadMiddleware } from "../services";

const controller = new imageController()

export const imageRoutes = [
    {
        method: "post",
        route: "/upload",
        action: controller.uploadImage,
        validation: [],
    },
    {
        method: "delete",
        route: "/image/:key",
        action: controller.deleteImage,
        validation: [param("key").isString()],
    },
    {
        method: "get",
        route: "/metadata/:key",
        action: controller.getImage,
        validation: [param("key").isString()],
    },
    {
        method: "get",
        route: "/images/uploader/:uploaderEmail",
        action: controller.getImagesByUploader,
        validation: [],
    },
    {
        method: "post",
        route: "/share",
        action: controller.shareImage,
        validation: [
            body("imageKey").isString(),
        ],
    },
    {
        method: "get",
        route: "/images",
        action: controller.getAllImages,
        validation: [], 
    },
]