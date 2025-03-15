import express, {NextFunction, Request, Response} from "express";
import { clinet } from "./services";
import { imageRoutes } from "./routes/imageRoutes";
import { userRoutes } from "./routes/userRoutes";
import { mapRoutes } from "./routes/mapRoutes";
import { validationResult } from "express-validator";
import morgan from "morgan"


export const app = express();

app.use(express.json()) 
app.use(morgan('tiny'))
const Routes = [ ...imageRoutes, ...userRoutes, ...mapRoutes];

app.get("/", (_: Request, res: Response) => {
    res.send("CPEN321 2024W2 PhotoMap Placeholder");
})

Routes.forEach((route) => {
    (app as any)[route.method](
        route.route,
        route.validation,
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log("Validation Error Detected")
                return res.status(400).send({ errors: errors.array() });
            }
            try {
                await (route.action as (req: Request, res: Response) => Promise<void>)(req, res);
            } catch (err) {
                // console.log("Error catched!");
                return res.status(500).send({error: "Internet Error"});
            }
        },
    );
});

let server: any;

clinet.connect().then(() => {
    console.log("MongoDB Client Connected: " + process.env.DB_URI);

    server = app.listen(process.env.PORT, () => {
        console.log("Listening on port " + process.env.PORT);
    });
}).catch(err => {
    console.error(err);
    clinet.close();
});

export const closeServer = async () => {
    if (server) {
        await server.close(); // Delay closing server
    }
    if (clinet) {
        await clinet.close();
    }
};
export { server };

