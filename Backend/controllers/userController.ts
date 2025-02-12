import { Request, Response, NextFunction } from "express";
import { clinet } from "../services";
import { ObjectId } from "mongodb";

export class userController {
    async getuserTest(req: Request, res: Response, nextFunction: NextFunction) {
            const todos = await clinet.db("User").collection("test").find().toArray();
            res.status(200).send(todos);
    }

}