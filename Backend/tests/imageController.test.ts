console.log("🚀 Jest is starting..."); // ✅ Debug log at the start

import request from "supertest";
import { app } from "../index";  
import { clinet } from "../services"; // ✅ Use existing MongoDB client

jest.setTimeout(10000);

console.log("✅ Jest loaded the dependencies..."); // ✅ Check if Jest even reaches here

describe("Debug MongoDB Connection", () => {
    test("Should connect to MongoDB and list databases", async () => {
        console.log("🔹 Using MongoDB URI:", process.env.DB_URI); // ✅ See if this prints

        try {
            await clinet.db().admin().ping(); // ✅ Just ping the DB instead of reconnecting
            console.log("✅ Successfully connected to MongoDB");

            const databases = await clinet.db().admin().listDatabases();
            console.log("📂 Available Databases:", databases);

            expect(databases.databases.length).toBeGreaterThan(0);
        } catch (error) {
            console.error("❌ MongoDB Connection Error:", error);
            throw error;
        }
    });
});
