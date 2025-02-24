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
    // {
    //     method: "post",
    //     route: "/user",
    //     action: controller.postuser,
    //     validation: [
    //         body("userName").isString(),
    //     ]
    // }
    {
        method: "post",
        route: "/user",
        action: controller.postuser,
        validation: [
            body("googleId").isString(),
            body("googleName").isString(),
        ],
    },
    {
        method: "get",
        route: "/user/:googleId",
        action: controller.getProfileInfo,
        validation: [param("googleId").isString()],
    },
    {
        method: "put",
        route: "/user/:googleId",
        action: controller.updateProfile,
        validation: [
            param("googleId").isString(),
            body("googleName").optional().isString(),
            body("tags").optional().isArray()
        ],
    },
    {
        method: "get",
        route: "/users",
        action: controller.getUserList,
        validation: [],
    },
    {
        method: "post",
        route: "/supervise",
        action: controller.superviseAction,
        validation: [
            body("googleId").isString(),
            body("action").isIn(["ban", "unban"]),
        ],
    },
    {
        method: "delete",
        route: "/user/:googleId",
        action: controller.deleteUser,
        validation: [param("googleId").isString()],
    },
]