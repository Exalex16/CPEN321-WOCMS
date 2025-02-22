import { body, param } from "express-validator"
import { imageController} from "../controllers/imageController";
// import { uploadMiddleware } from "../services";

const controller = new imageController()

export const imageRoutes = [
    {
        method: "post",
        route: "/upload",
        action: controller.uploadImage,
        validation: []
    },
    {
        method: "delete",
        route: "/:key",
        action: controller.deleteImage,
        validation: [param("key").isString()]
    },
    {
        method: "get",
        route: "/metadata/:key",
        action: controller.getImageMetadata,
        validation: [param("key").isString()]
    },
    {
        method: "get",
        route: "/images/uploader/:uploader",
        action: controller.getImagesByUploader,
        validation: [param("uploader").isString()]
    }
]