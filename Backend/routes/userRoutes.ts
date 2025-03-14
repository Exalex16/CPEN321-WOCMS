import { param } from "express-validator"
import { userController } from "../controllers/userController"

const controller = new userController()

export const userRoutes = [
    {
        method: "post",
        route: "/user",
        action: controller.postUser,
        validation: [],
    },
    {
        method: "get",
        route: "/user/:googleEmail",
        action: controller.getProfileInfo,
        validation: [param("googleEmail").isString()],
    },
    {
        method: "put",
        route: "/user/:googleEmail",
        action: controller.updateProfile,
        validation: [
            param("googleEmail").isString(),
        ],
    },
    {
        method: "get",
        route: "/users",
        action: controller.getUserList,
        validation: [],
    },
    {
        method: "delete",
        route: "/user/:googleEmail",
        action: controller.deleteUser,
        validation: [param("googleEmail").isString()],
    },
    {
        method: "post",
        route: "/user/:googleEmail/location",
        action: controller.removeLocation,
        validation: [
            param("googleEmail").isString(),
        ],
    },
    {
        method: "post",
        route: "/user/add-friend",
        action: controller.addFriend,
        validation: [
        ],
    },
    {
        method: "post",
        route: "/user/delete-friend",
        action: controller.deleteFriend,
        validation: [
        ],
    },
    {
        method: "get",
        route: "/user/:googleEmail/friends",
        action: controller.getFriends,
        validation: [param("googleEmail").isString()],
    },
]