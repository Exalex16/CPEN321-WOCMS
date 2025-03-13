import "../../controllers/userController";
import "../../routes/userRoutes";
import {app, server, closeServer} from "../../index"
import request from "supertest";

const TEST_USER = "exalex167@gmail.com"; 
const TEST_USER_NAME = "Alex Example";
const TEST_RECIPIENT = "token1";
const NON_EXISTENT_USER = "nonexistent@example.com";

const TEST_LOCATION = JSON.stringify({
    position: {
        lat: 49.1957796162,
        lng: -122.69934184
    },
    title: "g",
    location: "Surrey",
    icon: "Green"
});

const TEST_LOCATION2 = JSON.stringify({
    position: {
        lat: 49.1957796162123,
        lng: -122.69934184123
    },
    title: "g",
    location: "Surrey",
    icon: "Green"
});

afterAll(async () => {
    await closeServer(); // ✅ Ensure server and DB are closed
});

describe("Unmocked API Tests - post /user", () => {
    test("✅ 201 - Create New User", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_USER,
                googleName: TEST_USER_NAME,
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("message", "User created");
        expect(res.body).toHaveProperty("userId");
    });

    test("✅ 200 - Update Existing User", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_USER,
                googleName: "Updated Alex",
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "User profile updated");
        expect(res.body).toHaveProperty("googleEmail", TEST_USER);
    });

    test("❌ 400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_USER, 
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Missing required fields: googleEmail, googleName");
    });
});

describe("Unmocked API Tests - get /user/:googleEmail", () => {
    test("✅ 200 - Retrieve Existing User Profile", async () => {
        const res = await request(app).get(`/user/${TEST_USER}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("googleEmail", TEST_USER);
        expect(res.body).toHaveProperty("googleName", "Updated Alex");
    });

    test("❌ 404 - User Not Found", async () => {
        const res = await request(app).get(`/user/${NON_EXISTENT_USER}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });
});

describe("Unmocked API Tests - put /user/:googleEmail", () => {
    test("✅ 200 - Successfully Update User Profile", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "Updated Name")
            .field("location", TEST_LOCATION);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body.updatedFields).toHaveProperty("googleName", "Updated Name");
        expect(res.body).toHaveProperty("addedLocation");
    });

    test("✅ 200 - Successfully Update User Profile with no location", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "Updated Name")

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body.updatedFields).toHaveProperty("googleName", "Updated Name");
        expect(res.body).toHaveProperty("addedLocation");
    });

    test("❌ 400 - Invalid Location Format", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "Updated Name")
            .field("location", "invalid_json"); // ❌ Invalid JSON format

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid location format. Ensure it's valid JSON.");
    });

    test("❌ 404 - User Not Found", async () => {
        const res = await request(app)
            .put(`/user/${NON_EXISTENT_USER}`)
            .field("googleName", "Updated Name");

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });

    test("❌ 400 - Invalid Form Data (File Upload Attempt)", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .attach("invalidFile", Buffer.from("fake file content"), "test.txt"); // ❌ Invalid for `multer().none()`
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid form data");
    });
});

describe("Unmocked API Tests - get /users", () => {
    test("✅ 200 - Retrieve User List", async () => {
        const res = await request(app).get("/users");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true); // ✅ Should return an array
        expect(res.body.length).toBeGreaterThan(0); // ✅ Ensure at least one user exists
        expect(res.body.some((user: { googleEmail: string }) => user.googleEmail === TEST_USER)).toBe(true);
    });
});

describe("Unmocked API Tests - post /user/:googleEmail/location", () => {
    test("✅ 200 - Successfully Remove Location", async () => {   
        // Remove one location
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .field("location", TEST_LOCATION);
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Location removed successfully.");
        expect(res.body.removedLocation).toEqual(JSON.parse(TEST_LOCATION));
    });
    
    test("❌ 400 - Invalid Form Data", async () => {
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .attach("invalidFile", Buffer.from("fake content"), "test.txt"); // ❌ Invalid for `multer().none()`
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid form data");
    });
    
    test("❌ 400 - Invalid Location Format", async () => {
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .field("location", "invalid_json"); // ❌ Invalid JSON
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid location format. Ensure it's valid JSON.");
    });
    
    test("❌ 404 - User Not Found", async () => {
        const res = await request(app)
            .post(`/user/${NON_EXISTENT_USER}/location`)
            .field("location", TEST_LOCATION);
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found.");
    });
    
    test("❌ 404 - Location Not Found in User Data", async () => {
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .field("location", JSON.stringify({
                position: { lat: 0, lng: 0 }, // ❌ Location that does not exist
                title: "Nowhere",
                location: "Unknown",
                icon: "Red"
            }));
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Location not found in user's data.");
    });    
});

describe("Unmocked API Tests - post /user/add-friend", () => {
    test("✅ 200 - Successfully Add Friend", async () => {
        // Ensure test friend exists
        await request(app)
            .post("/user")
            .send({ googleEmail: TEST_RECIPIENT, googleName: "Token1 Example" });
    
        // Add friend
        const res = await request(app)
            .post("/user/add-friend")
            .send({
                googleEmail: TEST_USER,
                friendEmail: TEST_RECIPIENT
            });
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Friend added successfully");
        expect(res.body.friendEmail).toBe(TEST_RECIPIENT);
    });
    
    test("❌ 400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/user/add-friend")
            .send({
                googleEmail: TEST_USER, 
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Both user email and friend email are required");
    });
    
    test("❌ 404 - User Not Found", async () => {
        const res = await request(app)
            .post("/user/add-friend")
            .send({
                googleEmail: NON_EXISTENT_USER, 
                friendEmail: TEST_RECIPIENT
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });
    
    test("❌ 404 - Friend Not Found", async () => {
        const res = await request(app)
            .post("/user/add-friend")
            .send({
                googleEmail: TEST_USER,
                friendEmail: NON_EXISTENT_USER 
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Friend not found");
    });
});

describe("Unmocked API Tests - get /user/:googleEmail/friends", () => {
    test("✅ 200 - Successfully Retrieve Friends List", async () => {    
        // Retrieve friends list
        const res = await request(app).get(`/user/${TEST_USER}/friends`);
    
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.friends)).toBe(true);
        expect(res.body.friends).toContain(TEST_RECIPIENT); // ✅ Ensure friend is in the list
    });
    
    test("❌ 404 - User Not Found", async () => {
        const res = await request(app).get(`/user/${NON_EXISTENT_USER}/friends`);
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });    
});

describe("Unmocked API Tests - post /user/delete-friend", () => {
    test("✅ 200 - Successfully Remove Friend", async () => {
        // Remove friend
        const res = await request(app)
            .post("/user/delete-friend")
            .send({
                googleEmail: TEST_USER,
                friendEmail: TEST_RECIPIENT
            });
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Friend removed successfully");
        expect(res.body.friendEmail).toBe(TEST_RECIPIENT);
    });
    
    test("❌ 400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/user/delete-friend")
            .send({
                googleEmail: TEST_USER // ❌ Missing friendEmail
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Both user email and friend email are required");
    });
    
    test("❌ 404 - Friend Not Found in User's List", async () => {
        const res = await request(app)
            .post("/user/delete-friend")
            .send({
                googleEmail: TEST_USER,
                friendEmail: NON_EXISTENT_USER // ❌ Friend is not in user's list
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Friend not found in user's list");
    });

    test("✅ 200 - Successfully Retrieve Empty Friends List", async () => {    
        // Retrieve friends list
        const res = await request(app).get(`/user/${TEST_USER}/friends`);
    
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.friends)).toBe(true);
        expect(res.body.friends).toHaveLength(0);
    });
});

describe("Unmocked API Tests - delete /user/:googleEmail", () => {
    test("✅ 200 - Successfully Delete User", async () => {    
        // Delete the user
        const res = await request(app).delete(`/user/${TEST_USER}`);
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User deleted successfully");
    });

    test("✅ 200 - Successfully Delete Recipient User", async () => {    
        // Delete the user
        const res = await request(app).delete(`/user/${TEST_RECIPIENT}`);
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User deleted successfully");
    });
    
    test("❌ 404 - User Not Found", async () => {
        const res = await request(app).delete(`/user/${NON_EXISTENT_USER}`);
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });
});
