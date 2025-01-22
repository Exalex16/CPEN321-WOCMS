import { MongoClient } from "mongodb";

export const clinet = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017")