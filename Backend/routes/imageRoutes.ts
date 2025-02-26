import { body, param } from "express-validator"
import { imageController} from "../controllers/imageController";
// import { uploadMiddleware } from "../services";

const controller = new imageController()

export const imageRoutes = [
    {
        method: "post",
        route: "/upload",
        action: controller.uploadImage,
        validation: [
            // body("description").optional().isString(),
            // body("tags").optional().isArray(),
            // body("location").optional().isObject(),
            // body("location.lat").optional().isFloat({ min: -90, max: 90 }),
            // body("location.lng").optional().isFloat({ min: -180, max: 180 }),
            // body("location.title").optional().isString(),
            // body("location.locationName").optional().isString(),
            // body("location.color").optional().isString(),
        ],
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
            // body("recipientEmail").isEmail(),
            body("imageKey").isString(),
            // body("senderEmail").isEmail(),
        ],
    },
]