import { Request, Response, NextFunction } from "express";
import { clinet, formDataMiddleware } from "../services";
import { ObjectId } from "mongodb";

export class userController {
    async getuserTest(req: Request, res: Response, nextFunction: NextFunction) {
            const todos = await clinet.db("User").collection("test").find().toArray();
            res.status(200).send(todos);
    }

    /**
     * Create a new user info, (or update name if it is exist).
     */
    async postUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { googleEmail, googleName } = req.body;
            if (!googleEmail || !googleName) {
                return res.status(400).send({ error: "Missing required fields: googleEmail, googleName" });
            }
    
            const db = clinet.db("User");
            const existingUser = await db.collection("users").findOne({ googleEmail });
    
            // Check if user exist
            if (existingUser) {
                await db.collection("users").updateOne(
                    { googleEmail },
                    { $set: { googleName, updatedAt: new Date() } }
                );
                return res.status(200).send({ message: "User profile updated", googleEmail });
            } else {
                const newUser = {
                    googleEmail,
                    googleName,
                    banStatus: "not banned",
                    banHistory: [],
                    tags: [],
                    locations: [], 
                    createdAt: new Date(),
                };
                const result = await db.collection("users").insertOne(newUser);
                return res.status(201).send({ message: "User created", userId: result.insertedId });
            }
        } catch (error) {
            next(error);
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

    /**
     * Update user profile info.
     */
    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            formDataMiddleware(req, res, async (err) => { 
                if (err) {
                    return res.status(400).send({ error: "Multer Error: " + err.message });
                }
    
                const { googleEmail } = req.params;
                let { googleName, location } = req.body; 
    
                if (!googleEmail) {
                    return res.status(400).send({ error: "Google ID is required" });
                }
    
                const db = clinet.db("User");
    
                // Parse `location` 
                if (typeof location === "string") {
                    try {
                        location = JSON.parse(location); // Convert JSON string to object
                        location.position.lat = parseFloat(location.position.lat);
                        location.position.lng = parseFloat(location.position.lng);
                    } catch (e) {
                        return res.status(400).send({ error: "Invalid location format. Ensure it's valid JSON." });
                    }
                }
    
                // Build update object dynamically
                const updateFields: any = { updatedAt: new Date() };
                if (googleName) updateFields.googleName = googleName;
    
                const updateQuery: any = { $set: updateFields };
                if (location) updateQuery.$addToSet = { locations: location }; // Add location
    
                // Execute update
                const updateResult = await db.collection("users").updateOne(
                    { googleEmail },
                    updateQuery
                );
    
                if (updateResult.matchedCount === 0) {
                    return res.status(404).send({ error: "User not found" });
                }
    
                res.status(200).send({
                    message: "User profile updated",
                    updatedFields: updateFields,
                    addedLocation: location || null,
                });
            });
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