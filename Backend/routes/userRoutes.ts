import { body, param } from "express-validator"
import { userController } from "../controllers/userController"

const controller = new userController()

export const userRoutes = [
    {
        method: "get",
        route: "/user",
        action: controller.getuserTest,
        validation: [],
    },
    {
        method: "post",
        route: "/user",
        action: controller.postuser,
        validation: [
            body("userName").isString(),
        ]
    }
]