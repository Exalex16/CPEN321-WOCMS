import { clinet } from "../../services"; // ✅ Use the existing MongoDB connection

/** ✅ Clears test data instead of reconnecting the database */
export const clearDB = async () => {
    const db = clinet.db("test-db"); // ✅ Use a dedicated test database
    await db.collection("users").deleteMany({});
    await db.collection("metadata").deleteMany({});
};