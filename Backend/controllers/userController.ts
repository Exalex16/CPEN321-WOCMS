import { Request, Response, NextFunction } from "express";
import { clinet } from "../services";
import { ObjectId } from "mongodb";

export class userController {
    async getuserTest(req: Request, res: Response, nextFunction: NextFunction) {
            const todos = await clinet.db("User").collection("test").find().toArray();
            res.status(200).send(todos);
    }

    async postuser(req: Request, res: Response, nextFunction: NextFunction) {
        // const createData = await clinet.db("User").collection("test").insertOne(req.body);
        // res.status(200).send(`Created user with id: ${createData.insertedId}`);
        try {
            const { googleEmail, googleName } = req.body;
            if (!googleEmail || !googleName) {
                return res.status(400).send({ error: "Missing required fields: googleId, googleName" });
            }

            const db = clinet.db("User");
            const existingUser = await db.collection("users").findOne({ googleEmail });

            if (existingUser) {
                // Update existing user
                await db.collection("users").updateOne(
                    { googleEmail },
                    { $set: { googleName, updatedAt: new Date() } }
                );
                return res.status(200).send({ message: "User profile updated", googleEmail });
            } else {
                // Create new user
                const newUser = {
                    googleEmail,
                    googleName,
                    banStatus: "not banned",
                    banHistory: [],
                    tags: [],
                    createdAt: new Date(),
                };
                const result = await db.collection("users").insertOne(newUser);
                return res.status(201).send({ message: "User created", userId: result.insertedId });
            }
        } catch (error) {
            nextFunction(error);
        }
    }

    /**
     * Retrieve user profile info.
     */
    async getProfileInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const { googleEmail  } = req.params;
            if (!googleEmail ) {
                return res.status(400).send({ error: "Google ID is required" });
            }

            const db = clinet.db("User");
            const user = await db.collection("users").findOne({ googleEmail  });

            if (!user) {
                return res.status(404).send({ error: "User not found" });
            }

            res.status(200).send(user);
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const { googleEmail } = req.params;
            const { googleName, tags } = req.body;
    
            if (!googleEmail) {
                return res.status(400).send({ error: "Google ID is required" });
            }
    
            const db = clinet.db("User");
    
            // Build dynamic update object
            const updateFields: any = { updatedAt: new Date() }; // Always update timestamp
            if (googleName) updateFields.googleName = googleName;
            if (tags) updateFields.tags = tags; // Allow updating tags separately
    
            // Ensure there are fields to update
            if (Object.keys(updateFields).length === 1) {
                return res.status(400).send({ error: "No valid fields provided for update" });
            }
    
            const updateResult = await db.collection("users").updateOne(
                { googleEmail },
                { $set: updateFields }
            );
    
            if (updateResult.matchedCount === 0) {
                return res.status(404).send({ error: "User not found" });
            }
    
            res.status(200).send({ message: "User profile updated", updatedFields: updateFields });
        } catch (error) {
            next(error);
        }
    }
    /**
     * Get list of all users (for admin).
     */
    async getUserList(req: Request, res: Response, next: NextFunction) {
        try {
            const db = clinet.db("User");
            const users = await db.collection("users").find().toArray();
            res.status(200).send(users);
        } catch (error) {
            next(error);
        }
    }

     /**
     * Perform admin action: ban or warn a user.
     */
     async superviseAction(req: Request, res: Response, next: NextFunction) {
        try {
            const { googleEmail, action } = req.body;
            if (!googleEmail || !action) {
                return res.status(400).send({ error: "Missing required fields: googleId, action" });
            }

            const db = clinet.db("User");
            const update = action === "ban" ? { banStatus: "banned", banHistory: new Date() } : { banStatus: "not banned" };

            const result = await db.collection("users").updateOne({ googleEmail }, { $set: update });

            if (result.matchedCount === 0) {
                return res.status(404).send({ error: "User not found" });
            }

            res.status(200).send({ message: `User ${action}ed successfully` });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a user by Google ID.
     */
    async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { googleEmail } = req.params;
            if (!googleEmail) {
                return res.status(400).send({ error: "Google ID is required" });
            }

            const db = clinet.db("User");
            const result = await db.collection("users").deleteOne({ googleEmail });

            if (result.deletedCount === 0) {
                return res.status(404).send({ error: "User not found" });
            }

            res.status(200).send({ message: "User deleted successfully" });
        } catch (error) {
            next(error);
        }
    }


}