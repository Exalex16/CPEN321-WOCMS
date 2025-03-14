import { mapController } from "../controllers/mapController"
import { Request, Response } from 'express';

const controller = new mapController()

export const mapRoutes = [
    {
        method: "get",
        route: "/map/popular-locations/:userEmail",
        action: (req: Request, res: Response) => controller.getRecommendation(req, res),
        validation: [],
    }
]