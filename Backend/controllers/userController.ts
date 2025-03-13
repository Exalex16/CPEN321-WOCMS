import { Request, Response, NextFunction } from "express";
import { clinet, formDataMiddleware } from "../services";
import { ObjectId } from "mongodb";

export class userController {
    /**
     * Create a new user info, (or update name if it is exist).
     */
    async postUser(req: Request, res: Response, next: NextFunction) {
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
                friends: [],
                createdAt: new Date(),
            };
            const result = await db.collection("users").insertOne(newUser);
            return res.status(201).send({ message: "User created", userId: result.insertedId });
        }
    }

    /**
     * Retrieve user profile info.
     */
    async getProfileInfo(req: Request, res: Response, next: NextFunction) {
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
    }

    /**
     * Update user profile info.
     */
    async updateProfile(req: Request, res: Response, next: NextFunction) {
        await new Promise<void>((resolve, reject) => {
            formDataMiddleware(req, res, (err) => {
                const { googleEmail } = req.params;

                if (!googleEmail) {
                    return res.status(400).send({ error: "Google ID is required" });
                }
                resolve();
            });
        });
         
        const { googleEmail } = req.params;
        let { googleName, location } = req.body; 

        // if (!googleEmail) {
        //     return res.status(400).send({ error: "Google ID is required" });
        // }

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
  
    }
    
    /**
     * Get list of all users (for admin).
     */
    async getUserList(req: Request, res: Response, next: NextFunction) {
        const db = clinet.db("User");
        const users = await db.collection("users").find().toArray();
        res.status(200).send(users);
    }


    /**
     * Delete a user by Google ID.
     */
    async deleteUser(req: Request, res: Response, next: NextFunction) {
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
    }

    /**
     * Delete user from a location.
     */
    async removeLocation(req: Request, res: Response, next: NextFunction) {
        await new Promise<void>((resolve, reject) => {
            formDataMiddleware(req, res, (err) => {
                const { googleEmail } = req.params;

                if (!googleEmail) {
                    return res.status(400).send({ error: "Google ID is required." });
                }
                resolve();
            });
        });

        const { googleEmail } = req.params;
        let { location } = req.body; 

        const db = clinet.db("User");

        // ✅ Parse `location` if it's a string (handling form-data issue)
        if (typeof location === "string") {
            try {
                location = JSON.parse(location);
                location.position.lat = parseFloat(location.position.lat);
                location.position.lng = parseFloat(location.position.lng);
            } catch (e) {
                return res.status(400).send({ error: "Invalid location format. Ensure it's valid JSON." });
            }
        }

        // ✅ Perform the location removal from the user's document
        const updateResult = await db.collection("users").updateOne(
            { googleEmail },
            { $pull: { locations: location } } // Removes the matching location
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).send({ error: "User not found." });
        }

        if (updateResult.modifiedCount === 0) {
            return res.status(404).send({ error: "Location not found in user's data." });
        }

        res.status(200).send({
            message: "Location removed successfully.",
            removedLocation: location
        });
    }

    async addFriend(req: Request, res: Response, next: NextFunction) {
        const { googleEmail, friendEmail } = req.body;
        if (!googleEmail || !friendEmail) {
            return res.status(400).send({ error: "Both user email and friend email are required" });
        }

        const db = clinet.db("User");

        // Check if the user and friend exist
        const user = await db.collection("users").findOne({ googleEmail });
        const friend = await db.collection("users").findOne({ googleEmail: friendEmail });

        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        if (!friend) {
            return res.status(404).send({ error: "Friend not found" });
        }

        // Add friendEmail to user's friends list (if not already added)
        await db.collection("users").updateOne(
            { googleEmail },
            { $addToSet: { friends: friendEmail } }  // ✅ Ensures no duplicates
        );

        res.status(200).send({ message: "Friend added successfully", friendEmail });
    }

    async deleteFriend(req: Request, res: Response, next: NextFunction) {
        const { googleEmail, friendEmail } = req.body;
        if (!googleEmail || !friendEmail) {
            return res.status(400).send({ error: "Both user email and friend email are required" });
        }

        const db = clinet.db("User");

        // Remove friendEmail from user's friends list
        const result = await db.collection("users").updateOne(
            { googleEmail },
            { $pull: { friends: friendEmail } }  // ✅ Removes friend from list
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send({ error: "Friend not found in user's list" });
        }

        res.status(200).send({ message: "Friend removed successfully", friendEmail });
    }

    async getFriends(req: Request, res: Response, next: NextFunction) {
        const { googleEmail } = req.params;
        if (!googleEmail) {
            return res.status(400).send({ error: "User email is required" });
        }

        const db = clinet.db("User");
        const user = await db.collection("users").findOne({ googleEmail }, { projection: { friends: 1 } });

        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        res.status(200).send({ friends: user.friends || [] });
    }
    
}