import express, {NextFunction, Request, Response} from "express";
import { MongoClient } from "mongodb";
import { clinet } from "./services";
import { TodoRoutes } from "./routes/TodoRoutes";
import { InfoRoutes } from "./routes/InfoRoutes";
import { validationResult } from "express-validator";
import morgan from "morgan"

// import dotenv from 'dotenv';
// dotenv.config();

const app = express();

app.use(express.json()) 
app.use(morgan('tiny'))
// const OtherRoutes = []
// const Routes = [...TodoRoutes, OtherRoutes]
const Routes = [...TodoRoutes, ...InfoRoutes];

app.get("/", (req: Request, res: Response, nextFunction: NextFunction) => {
    res.send("Hello World");
})

Routes.forEach((route) => {
    (app as any)[route.method](
        route.route,
        route.validation,
        async (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({ errors: errors.array() });
            }
            try {
                await route.action(req, res, next);
            } catch (err) {
                console.log(err);
                return res.sendStatus(500);
            }
        },
    );
});

// TodoRoutes.forEach((route) => {
//     (app as any)[route.method](
//         route.route,
//         route.validation,
//         async (req: Request, res: Response, next: NextFunction) => {
//             const errors = validationResult(req);
//             if (!errors.isEmpty()) {
//                 /* If there are validation errors, send a response with the error messages */
//                 return res.status(400).send({ errors: errors.array() });
//             }
//             try {
//                 await route.action(
//                     req,
//                     res,
//                     next,
//                 );
//             } catch (err) {
//                 console.log(err)
//                 return res.sendStatus(500); // Don't expose internal server workings
//             }
//         },
//     );
// });

clinet.connect().then(() => {
    console.log("MongoDB Client Connected: " + process.env.DB_URI);

    app.listen(process.env.PORT, () => {
        console.log("Listening on port " + process.env.PORT);
    });
}).catch(err => {
    console.error(err);
    clinet.close();
});


