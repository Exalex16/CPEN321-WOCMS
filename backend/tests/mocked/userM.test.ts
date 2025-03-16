import request from "supertest";
import { app, closeServer } from "../../index";
import { MongoClient } from "mongodb";

// Define the shape of the mocked 'clinet' object
interface MockedClient extends Partial<MongoClient> {
    db: jest.Mock;
}

// jest.mock("../../services", () => {
//     const actualServices = jest.requireActual("../../services");

//     return {
//         ...actualServices,
//         clinet: {
//             db: jest.fn(() => ({
//                 collection: jest.fn(() => ({
//                     findOne: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),
//                     updateOne: jest.fn().mockRejectedValue(new Error("MongoDB Update Error")),
//                     insertOne: jest.fn().mockResolvedValue({ insertedId: "mockedId" }),
//                     find: jest.fn(() => ({
//                         toArray: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),
//                     })),
//                     deleteOne: jest.fn().mockRejectedValue(new Error("MongoDB Delete Error")),
//                 })),
//             })),
//             connect: jest.fn().mockResolvedValue(undefined),
//             close: jest.fn(),
//         },
//     };
// });

jest.mock("../../services", (): { clinet: MockedClient } => {
    const actualServices = jest.requireActual("../../services");
  
    // Create the mock implementations with explicit types
    const mockedClient: MockedClient = {
      db: jest.fn(() => ({
        collection: jest.fn(() => ({
          findOne: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),
          updateOne: jest.fn().mockRejectedValue(new Error("MongoDB Update Error")),
          insertOne: jest.fn().mockResolvedValue({ insertedId: "mockedId" }),
          find: jest.fn(() => ({
            toArray: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),
          })),
          deleteOne: jest.fn().mockRejectedValue(new Error("MongoDB Delete Error")),
        })),
      })),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    };
  
    return {
      ...actualServices,
      clinet: mockedClient,
    };
  });

const TEST_USER = "exalex16@gmail.com";
const TEST_USER_NAME = "Alex Example";

afterAll(async () => {
    await closeServer();
});

// Interface: POST /user
describe("Mocked API Tests - post /user", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB read operation fails
    // Input: Valid user email and name
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Read Failure", async () => {
        const res = await request(app)
            .post("/user")
            .send({ googleEmail: TEST_USER, googleName: TEST_USER_NAME });

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });
});

// Interface: GET /user/:googleEmail
describe("Mocked API Tests - get /user/:googleEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails to retrieve user profile info
    // Input: Valid user email
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on getProfileInfo", async () => {
        const res = await request(app).get(`/user/${TEST_USER}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: PUT /user/:googleEmail
describe("Mocked API Tests - put /user/:googleEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB update operation fails
    // Input: Valid user email, updated user name
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on updateProfile", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .send({ googleName: "Updated Name" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: GET /users
describe("Mocked API Tests - get /users", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB query fails when retrieving user list
    // Input: None
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on getUserList", async () => {
        const res = await request(app).get("/users");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: DELETE /user/:googleEmail
describe("Mocked API Tests - delete /user/:googleEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB delete operation fails
    // Input: Valid user email
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on deleteUser", async () => {
        const res = await request(app).delete("/user/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: POST /user/:googleEmail/location
describe("Mocked API Tests - post /user/:googleEmail/location", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails to remove location
    // Input: Valid user email, valid location JSON
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on removeLocation", async () => {
        const res = await request(app)
            .post("/user/testuser@example.com/location")
            .send({ location: JSON.stringify({ position: { lat: 49.195, lng: -122.699 }, title: "Test" }) });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: POST /user/add-friend
describe("Mocked API Tests - post /user/add-friend", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB query fails when adding a friend
    // Input: Valid user email and friend email
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on addFriend", async () => {
        const res = await request(app)
            .post("/user/add-friend")
            .send({ googleEmail: "testuser@example.com", friendEmail: "friend@example.com" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: GET /user/:googleEmail/friends
describe("Mocked API Tests - get /user/:googleEmail/friends", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB query fails when retrieving the friends list
    // Input: Valid user email
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on getFriends", async () => {
        const res = await request(app).get("/user/testuser@example.com/friends");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

// Interface: POST /user/delete-friend
describe("Mocked API Tests - post /user/delete-friend", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // Mocked behavior: MongoDB fails when removing a friend
    // Input: Valid user email and friend email
    // Expected status code: 500
    // Expected behavior: Returns an internal server error
    // Expected output: { error: "Internet Error" }
    test("500 - MongoDB Failure on deleteFriend", async () => {
        const res = await request(app)
            .post("/user/delete-friend")
            .send({ googleEmail: "testuser@example.com", friendEmail: "friend@example.com" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});