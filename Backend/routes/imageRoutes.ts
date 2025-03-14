import { param } from "express-validator"
import { imageController} from "../controllers/imageController";

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
        method: "get",
        route: "/images",
        action: controller.getAllImages,
        validation: [], 
    },
    {
        method: "put",
        route: "/image/update-description",
        action: controller.updateImageDescription,
        validation: [],
    },
    {
        method: "delete",
        route: "/image/delete-all/:userEmail",
        action: controller.deleteAllImagesByUser,
        validation: [],
    },
    {
        method: "post",
        route: "/image/share",
        action: controller.shareImage,
        validation: [],
    },
    {
        method: "get",
        route: "/image/shared/:userEmail",
        action: controller.getSharedImages,
        validation: [],
    },
    {
        method: "post",
        route: "/image/cancel-share",
        action: controller.cancelShare,
        validation: [],
    },
]
