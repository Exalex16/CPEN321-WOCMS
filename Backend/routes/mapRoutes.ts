import { body, param } from "express-validator"
import { mapController } from "../controllers/mapController"

const controller = new mapController()

export const mapRoutes = [
    {
        method: "get",
        route: "/map/popular-locations/:userEmail",
        action: controller.popularLocationNotify,
        validation: [],
    }
]