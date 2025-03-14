import { mapController } from "../controllers/mapController"

const controller = new mapController()

export const mapRoutes = [
    {
        method: "get",
        route: "/map/popular-locations/:userEmail",
        action: controller.getRecommendation,
        validation: [],
    }
]