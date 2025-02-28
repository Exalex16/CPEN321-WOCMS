import { Request, Response, NextFunction } from "express";
import { clinet } from "../services";
import { ObjectId } from "mongodb";

export class userController {
    async getuserTest(req: Request, res: Response, nextFunction: NextFunction) {
            const todos = await clinet.db("User").collection("test").find().toArray();
            res.status(200).send(todos);
    }

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

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const { googleEmail } = req.params;
            const { googleName, location } = req.body; // Removed `tags` since AI manages it
    
            if (!googleEmail) {
                return res.status(400).send({ error: "Google ID is required" });
            }
    
            const db = clinet.db("User");
    
            // Build update object
            const updateFields: any = { updatedAt: new Date() };
            if (googleName) updateFields.googleName = googleName; 
    
            // Ensure location is in correct format and should be added to the array
            let locationUpdate = {};
            if (location) {
                try {
                    const parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
    
                    // Validate necessary fields
                    if (!parsedLocation.position || !parsedLocation.position.lat || !parsedLocation.position.lng) {
                        return res.status(400).send({ error: "Invalid location format. Missing required fields." });
                    }
    
                    parsedLocation.position.lat = parseFloat(parsedLocation.position.lat);
                    parsedLocation.position.lng = parseFloat(parsedLocation.position.lng);
    
                    // Prepare MongoDB update query to add unique locations
                    locationUpdate = { $addToSet: { locations: parsedLocation } }; // Prevent duplicate locations
                } catch (e) {
                    return res.status(400).send({ error: "Invalid location format. Ensure it's valid JSON." });
                }
            }
    
            // Ensure at least one field is being updated
            if (Object.keys(updateFields).length === 1 && Object.keys(locationUpdate).length === 0) {
                return res.status(400).send({ error: "No valid fields provided for update" });
            }
    
            // Apply updates to the user profile
            const updateResult = await db.collection("users").updateOne(
                { googleEmail },
                { 
                    ...locationUpdate,  
                    $set: updateFields  
                }
            );
    
            if (updateResult.matchedCount === 0) {
                return res.status(404).send({ error: "User not found" });
            }
    
            res.status(200).send({ 
                message: "User profile updated", 
                updatedFields: { 
                    googleName: googleName || "Not Modified", 
                    location: location ? "Added" : "Not Provided" 
                }
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