import { param } from "express-validator"
import { userController } from "../controllers/userController"
import { Request, Response } from 'express';

const controller = new userController()

export const userRoutes = [
    {
        method: "post",
        route: "/user",
        action: (req: Request, res: Response) => controller.postUser(req, res),
        validation: [],
    },
    {
        method: "get",
        route: "/user/:googleEmail",
        action: (req: Request, res: Response) => controller.getProfileInfo(req, res),
        validation: [param("googleEmail").isString()],
    },
    {
        method: "put",
        route: "/user/:googleEmail",
        action: (req: Request, res: Response) => controller.updateProfile(req, res),
        validation: [
            param("googleEmail").isString(),
        ],
    },
    {
        method: "get",
        route: "/users",
        action: (req: Request, res: Response) => controller.getUserList(req, res),
        validation: [],
    },
    {
        method: "delete",
        route: "/user/:googleEmail",
        action: (req: Request, res: Response) => controller.deleteUser(req, res),
        validation: [param("googleEmail").isString()],
    },
    {
        method: "post",
        route: "/user/:googleEmail/location",
        action: (req: Request, res: Response) => controller.removeLocation(req, res),
        validation: [
            param("googleEmail").isString(),
        ],
    },
    {
        method: "post",
        route: "/user/add-friend",
        action: (req: Request, res: Response) => controller.addFriend(req, res),
        validation: [
        ],
    },
    {
        method: "post",
        route: "/user/delete-friend",
        action: (req: Request, res: Response) => controller.deleteFriend(req, res),
        validation: [
        ],
    },
    {
        method: "get",
        route: "/user/:googleEmail/friends",
        action: (req: Request, res: Response) => controller.getFriends(req, res),
        validation: [param("googleEmail").isString()],
    },
]