import { InfoController } from "../controllers/InfoController";

const controller = new InfoController();

export const InfoRoutes = [
    {
        method: "get",
        route: "/info/server-ip",
        action: controller.getServerIP,
        validation: [],
    },
    {
        method: "get",
        route: "/info/server-time",
        action: controller.getServerTime,
        validation: [],
    },
    {
        method: "get",
        route: "/info/name",
        action: controller.getName,
        validation: [],
    },
];


