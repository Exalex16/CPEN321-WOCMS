import { body, param } from "express-validator"
import { imageController } from "../controllers/imageController"

const controller = new imageController()

export const imageRoutes = [
    // {
    //     method: "post",
    //     route: "/upload",
    //     action: controller.uploadImage,
    //     validation: []
    // },
    // {
    //     method: "delete",
    //     route: "/:key",
    //     action: controller.deleteImage,
    //     validation: [param("key").isString()]
    // }
]