import { MapController } from "../controllers/mapController"
import { Request, Response } from 'express';

const controller = new MapController()

export const mapRoutes = [
    {
        method: "get",
        route: "/map/popular-locations/:userEmail",
        action: (req: Request, res: Response) => controller.getRecommendation(req, res),
        validation: [],
    }
]