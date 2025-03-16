import {app, closeServer} from "../../index"
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

afterAll(async () => {
    await closeServer(); 
});

// Interface: POST /user
describe("Unmocked API Tests - post /user", () => {
    // Input: Valid email and name
    // Expected status code: 201
    // Expected behavior: User is created successfully
    // Expected output: { message: "User created", userId: <UUID> }
    test("201 - Create New User", async () => {
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

    // Input: Existing user, different name
    // Expected status code: 200
    // Expected behavior: User profile is updated instead of creating a new user
    // Expected output: { message: "User profile updated", googleEmail: TEST_USER }
    test("200 - Update Existing User", async () => {
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

    // Input: Missing required fields
    // Expected status code: 400
    // Expected behavior: Server returns an error due to missing required fields
    // Expected output: { error: "Missing required fields: googleEmail, googleName" }
    test("400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/user")
            .send({
                googleEmail: TEST_USER, 
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Missing required fields: googleEmail, googleName");
    });
});

// Interface: GET /user/:googleEmail
describe("Unmocked API Tests - get /user/:googleEmail", () => {
    // Input: Valid existing user email
    // Expected status code: 200
    // Expected behavior: Returns user profile
    // Expected output: { googleEmail: TEST_USER, googleName: "Updated Alex" }
    test("200 - Retrieve Existing User Profile", async () => {
        const res = await request(app).get(`/user/${TEST_USER}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("googleEmail", TEST_USER);
        expect(res.body).toHaveProperty("googleName", "Updated Alex");
    });

    // Input: Non-existent user email
    // Expected status code: 404
    // Expected behavior: Returns user not found error
    // Expected output: { error: "User not found" }
    test("404 - User Not Found", async () => {
        const res = await request(app).get(`/user/${NON_EXISTENT_USER}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });
});

// Interface: PUT /user/:googleEmail
describe("Unmocked API Tests - put /user/:googleEmail", () => {
    // Input: Valid email and new name, valid JSON location
    // Expected status code: 200
    // Expected behavior: User profile is updated successfully
    // Expected output: message: "User profile updated", with addedLocation property
    test("200 - Successfully Update User Profile", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "Updated Name")
            .field("location", TEST_LOCATION);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body.updatedFields).toHaveProperty("googleName", "Updated Name");
        expect(res.body).toHaveProperty("addedLocation");
    });

    // Input: Valid email, no location
    // Expected status code: 200
    // Expected behavior: User profile is updated successfully
    // Expected output: message: "User profile updated", with addedLocation property
    test("200 - Successfully Update User Profile with no location", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "Updated Name")

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User profile updated");
        expect(res.body.updatedFields).toHaveProperty("googleName", "Updated Name");
        expect(res.body).toHaveProperty("addedLocation");
    });

    // Input: Valid email, invalid JSON location
    // Expected status code: 400
    // Expected behavior: Server returns an error due to invalid location format
    // Expected output: { error: "Invalid location format. Ensure it's valid JSON." }
    test("400 - Invalid Location Format", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .field("googleName", "Updated Name")
            .field("location", "invalid_json"); 

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid location format. Ensure it's valid JSON.");
    });

    // Input: Non-existent user email
    // Expected status code: 404
    // Expected behavior: Returns user not found error
    // Expected output: { error: "User not found" }
    test("404 - User Not Found", async () => {
        const res = await request(app)
            .put(`/user/${NON_EXISTENT_USER}`)
            .field("googleName", "Updated Name");

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });

    // Input: Valid email, but invalid form data (file attachment)
    // Expected status code: 400
    // Expected behavior: Returns an error due to invalid form data
    // Expected output: { error: "Invalid form data" }
    test("400 - Invalid Form Data (File Upload Attempt)", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .attach("invalidFile", Buffer.from("fake file content"), "test.txt"); 
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid form data");
    });
});

// Interface: GET /users
describe("Unmocked API Tests - get /users", () => {
    // Input: None
    // Expected status code: 200
    // Expected behavior: Returns list of all users
    // Expected output: Array of user objects
    test("200 - Retrieve User List", async () => {
        const res = await request(app).get("/users");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true); 
        expect(res.body.length).toBeGreaterThan(0); 
        expect(res.body.some((user: { googleEmail: string }) => user.googleEmail === TEST_USER)).toBe(true);
    });
});

// Interface: POST /user/:googleEmail/location
describe("Unmocked API Tests - post /user/:googleEmail/location", () => {
    // Input: Valid email, valid JSON location
    // Expected status code: 200
    // Expected behavior: Location is removed successfully
    // Expected output: { message: "Location removed successfully."}, and removedLocation
    test("200 - Successfully Remove Location", async () => {   
        // Remove one location
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .field("location", TEST_LOCATION);
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Location removed successfully.");
        expect(res.body.removedLocation).toEqual(JSON.parse(TEST_LOCATION));
    });
    
    // Input: Valid email, but invalid form data (file attachment)
    // Expected status code: 400
    // Expected behavior: Returns an error due to invalid form data
    // Expected output: { error: "Invalid form data" }
    test("400 - Invalid Form Data", async () => {
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .attach("invalidFile", Buffer.from("fake content"), "test.txt"); 
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid form data");
    });
    
    // Input: Valid email, but invalid JSON location
    // Expected status code: 400
    // Expected behavior: Returns an error due to invalid location format
    // Expected output: { error: "Invalid location format. Ensure it's valid JSON." }
    test("400 - Invalid Location Format", async () => {
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .field("location", "invalid_json"); 
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid location format. Ensure it's valid JSON.");
    });
    
    // Input: Non-existent user email, valid location
    // Expected status code: 404
    // Expected behavior: Returns user not found error
    // Expected output: { error: "User not found." }
    test("404 - User Not Found", async () => {
        const res = await request(app)
            .post(`/user/${NON_EXISTENT_USER}/location`)
            .field("location", TEST_LOCATION);
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found.");
    });
    
    // Input: Valid user, but location does not exist in user data
    // Expected status code: 404
    // Expected behavior: Returns location not found error
    // Expected output: { error: "Location not found in user's data." }
    test("404 - Location Not Found in User Data", async () => {
        const res = await request(app)
            .post(`/user/${TEST_USER}/location`)
            .field("location", JSON.stringify({
                position: { lat: 0, lng: 0 }, 
                title: "Nowhere",
                location: "Unknown",
                icon: "Red"
            }));
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Location not found in user's data.");
    });    
});

// Interface: POST /user/add-friend
describe("Unmocked API Tests - post /user/add-friend", () => {
    // Input: Valid user email and valid friend email
    // Expected status code: 200
    // Expected behavior: Friend is successfully added
    // Expected output: { message: "Friend added successfully", friendEmail: TEST_RECIPIENT }
    test("200 - Successfully Add Friend", async () => {
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

    // Input: Missing friend email
    // Expected status code: 400
    // Expected behavior: Returns an error due to missing required fields
    // Expected output: { error: "Both user email and friend email are required" }
    test("400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/user/add-friend")
            .send({
                googleEmail: TEST_USER, 
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Both user email and friend email are required");
    });
    
    // Input: Non-existent user email
    // Expected status code: 404
    // Expected behavior: Returns user not found error
    // Expected output: { error: "User not found" }
    test("404 - User Not Found", async () => {
        const res = await request(app)
            .post("/user/add-friend")
            .send({
                googleEmail: NON_EXISTENT_USER, 
                friendEmail: TEST_RECIPIENT
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });
    
    // Input: Valid user email, but friend does not exist
    // Expected status code: 404
    // Expected behavior: Returns friend not found error
    // Expected output: { error: "Friend not found" }
    test("404 - Friend Not Found", async () => {
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

// Interface: GET /user/:googleEmail/friends
describe("Unmocked API Tests - get /user/:googleEmail/friends", () => {
    // Input: Valid user email
    // Expected status code: 200
    // Expected behavior: Returns the list of friends for the user
    // Expected output: { friends: [TEST_RECIPIENT] }
    test("200 - Successfully Retrieve Friends List", async () => {    
        // Retrieve friends list
        const res = await request(app).get(`/user/${TEST_USER}/friends`);
    
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.friends)).toBe(true);
        expect(res.body.friends).toContain(TEST_RECIPIENT); 
    });
    
    // Input: Non-existent user email
    // Expected status code: 404
    // Expected behavior: Returns user not found error
    // Expected output: { error: "User not found" }
    test("404 - User Not Found", async () => {
        const res = await request(app).get(`/user/${NON_EXISTENT_USER}/friends`);
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });    
});

// Interface: POST /user/delete-friend
describe("Unmocked API Tests - post /user/delete-friend", () => {
    // Input: Valid user email and friend email
    // Expected status code: 200
    // Expected behavior: Friend is successfully removed
    // Expected output: { message: "Friend removed successfully", friendEmail: TEST_RECIPIENT }
    test("200 - Successfully Remove Friend", async () => {
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
    
    // Input: Missing friend email
    // Expected status code: 400
    // Expected behavior: Returns an error due to missing required fields
    // Expected output: { error: "Both user email and friend email are required" }
    test("400 - Missing Required Fields", async () => {
        const res = await request(app)
            .post("/user/delete-friend")
            .send({
                googleEmail: TEST_USER 
            });
    
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Both user email and friend email are required");
    });
    
    // Input: Valid user email, but friend is not in user's friend list
    // Expected status code: 404
    // Expected behavior: Returns friend not found in user's list error
    // Expected output: { error: "Friend not found in user's list" }
    test("404 - Friend Not Found in User's List", async () => {
        const res = await request(app)
            .post("/user/delete-friend")
            .send({
                googleEmail: TEST_USER,
                friendEmail: NON_EXISTENT_USER 
            });
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Friend not found in user's list");
    });

    // Input: Valid user email, but no friends remain in list
    // Expected status code: 200
    // Expected behavior: Returns an empty friend list
    // Expected output: { friends: [] }
    test("200 - Successfully Retrieve Empty Friends List", async () => {    
        // Retrieve friends list
        const res = await request(app).get(`/user/${TEST_USER}/friends`);
    
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.friends)).toBe(true);
        expect(res.body.friends).toHaveLength(0);
    });
});

// Interface: DELETE /user/:googleEmail
describe("Unmocked API Tests - delete /user/:googleEmail", () => {
    // Input: Existing user email
    // Expected status code: 200
    // Expected behavior: User is deleted successfully
    // Expected output: { message: "User deleted successfully" }
    test("200 - Successfully Delete User", async () => {    
        // Delete the user
        const res = await request(app).delete(`/user/${TEST_USER}`);
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User deleted successfully");
    });

     // Input: Existing user email
    // Expected status code: 200
    // Expected behavior: User is deleted successfully
    // Expected output: { message: "User deleted successfully" }
    test("200 - Successfully Delete Recipient User", async () => {    
        // Delete the user
        const res = await request(app).delete(`/user/${TEST_RECIPIENT}`);
    
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User deleted successfully");
    });
    
     // Input: Non-existent user email
    // Expected status code: 404
    // Expected behavior: Returns user not found error
    // Expected output: { error: "User not found" }
    test("404 - User Not Found", async () => {
        const res = await request(app).delete(`/user/${NON_EXISTENT_USER}`);
    
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("User not found");
    });
});
