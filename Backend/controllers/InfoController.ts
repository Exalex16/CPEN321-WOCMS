import { Request, Response, NextFunction } from "express";
import os from "os";
import axios from "axios";

export class InfoController {
    // API to get server IP address
    async getServerIP(req: Request, res: Response, next: NextFunction) {
        try {
            // Step 1: Get a session token
            const tokenResponse = await axios.put(
                "http://169.254.169.254/latest/api/token",
                null, // No body is required for this request
                {
                    headers: { "X-aws-ec2-metadata-token-ttl-seconds": "21600" },
                }
            );

            const token = tokenResponse.data;

            // Step 2: Use the token to fetch the public IP
            const metadataResponse = await axios.get(
                "http://169.254.169.254/latest/meta-data/public-ipv4",
                {
                    headers: { "X-aws-ec2-metadata-token": token },
                }
            );

            const serverIP = metadataResponse.data || "No public IP assigned";
            res.status(200).send({ serverIP });
        } catch (err) {
            console.error("Failed to fetch server IP:", err);
            res.status(500).send({ error: "Could not fetch server IP. Ensure IMDSv2 is configured properly." });
        }
    }

    // API to get server local time
    async getServerTime(req: Request, res: Response, next: NextFunction) {
        try {
            const serverTime = new Date().toISOString();
            const offsetMinutes = -new Date().getTimezoneOffset();
            const offsetHours = Math.floor(offsetMinutes / 60);
            const minutes = offsetMinutes % 60;

            const offsetSign = offsetHours >= 0 ? "+" : "-";
            const formattedOffset = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

            const formattedTime = `${serverTime.split("T")[1].split(".")[0]} GMT${formattedOffset}`;

            res.status(200).send({ serverTime: formattedTime });
        } catch (err) {
            next(err);
        }
    }

    // API to get your first and last name
    async getName(req: Request, res: Response, next: NextFunction) {
        try {
            const firstName = "Alex"; 
            const lastName = "Cheng";   

            res.status(200).send({ firstName, lastName });
        } catch (err) {
            next(err);
        }
    }
}
