console.log("🚀 Jest is starting..."); // ✅ Debug log at the start

import request from "supertest";
import { app } from "../index";  
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import https from "https";

jest.setTimeout(10000);

// console.log("✅ Jest loaded the dependencies..."); // ✅ Check if Jest even reaches here

describe("API Route Testing (No Direct MongoDB Connection)", () => {
    let uploadedFileName = "";
    const baseURL = "https://wocmpphotomap.com";

    // test("✅ Should upload an image via API", async () => {
    //     console.log("🔹 Sending request to /upload...");

    //     const response = await request(app)
    //         .post("/upload")
    //         .field("uploadedBy", "exalex16@gmail.com")
    //         .field("description", "Test upload")
    //         .field("location", JSON.stringify({
    //             position: { lat: 49.2827, lng: -123.1207 },
    //             title: "Vancouver",
    //             location: "Canada",
    //             icon: "Red"
    //         }));

    //     console.log("✅ Response received:", response.status, response.body);

    //     expect(response.status).toBe(200);
    //     expect(response.body).toHaveProperty("fileName");
    //     expect(response.body).toHaveProperty("imageUrl");

    //     uploadedFileName = response.body.fileName;
    // });

    test("✅ Should get uploaded image metadata from live API", async () => {
        console.log("🔹 Fetching image metadata from API...");
    
        let response: AxiosResponse;
        try {
            const config: AxiosRequestConfig = {
                timeout: 5000, // ✅ Fail fast if stuck
                responseType: "json",
                httpsAgent: new https.Agent({ keepAlive: false }) // ✅ Force close connection
            };
    
            response = await axios.get(`${baseURL}/metadata/exalex16@gmail.com-2025-03-07T03-30-05.309Z.jpg`, config);
    
            // console.log("✅ Metadata response:", response.status, response.data);
            expect(response.status).toBe(200);
            expect(response.data.fileName).toBe("exalex16@gmail.com-2025-03-07T03-30-05.309Z.jpg");
        } catch (error) {
            console.error("❌ API Request Failed:", error);
            throw error;
        }
    });
});



// ✅ Define the expected response structure
interface ImageMetadata {
    fileName: string;
    imageUrl: string;
    description: string;
    uploadedBy: string[];
    timestamp: string;
    tags: string[];
    moderationLabels: string[];
    location: {
        position: {
            lat: number;
            lng: number;
        };
        title: string;
        location: string;
        icon: string;
    };
}