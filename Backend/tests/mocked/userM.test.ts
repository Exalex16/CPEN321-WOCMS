import {clinet} from "../../services";
import "../../controllers/userController";
import "../../routes/userRoutes";
import request from "supertest";
import { app, server, closeServer } from "../../index";

jest.mock("../../services", () => {
    const actualServices = jest.requireActual("../../services");
    return {
        ...actualServices,
        clinet: {
            db: jest.fn(() => ({
                collection: jest.fn(() => ({
                    findOne: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")), // Default to failure
                    updateOne: jest.fn().mockRejectedValue(new Error("MongoDB Update Error")),
                    insertOne: jest.fn().mockResolvedValue({ insertedId: "mockedId" }),
                    find: jest.fn().mockReturnValue({
                        toArray: jest.fn().mockRejectedValue(new Error("MongoDB Read Error")),
                    }),
                    deleteOne: jest.fn().mockRejectedValue(new Error("MongoDB Delete Error")),
                })),
            })),
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        },
    };
});

const TEST_USER = "exalex16@gmail.com";
const TEST_USER_NAME = "Alex Example";

afterAll(async () => {
    await closeServer(); // ✅ Ensure server and DB are closed
});

describe("Mocked API Tests - post /user", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Read Failure", async () => {
        const res = await request(app)
            .post("/user")
            .send({ googleEmail: TEST_USER, googleName: TEST_USER_NAME });

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("error", "Internet Error");
    });
});

describe("Mocked API Tests - get /user/:googleEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on getProfileInfo", async () => {
        const res = await request(app).get(`/user/${TEST_USER}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("Mocked API Tests - put /user/:googleEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on updateProfile", async () => {
        const res = await request(app)
            .put(`/user/${TEST_USER}`)
            .send({ googleName: "Updated Name" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("Mocked API Tests - get /users", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on getUserList", async () => {
        const res = await request(app).get("/users");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("Mocked API Tests - delete /user/:googleEmail", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on deleteUser", async () => {
        const res = await request(app).delete("/user/testuser@example.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("Mocked API Tests - post /user/:googleEmail/location", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on removeLocation", async () => {
        const res = await request(app)
            .post("/user/testuser@example.com/location")
            .send({ location: JSON.stringify({ position: { lat: 49.195, lng: -122.699 }, title: "Test" }) });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("Mocked API Tests - post /user/add-friend", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on addFriend", async () => {
        const res = await request(app)
            .post("/user/add-friend")
            .send({ googleEmail: "testuser@example.com", friendEmail: "friend@example.com" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("Mocked API Tests - get /user/:googleEmail/friends", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on getFriends", async () => {
        const res = await request(app).get("/user/testuser@example.com/friends");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});

describe("Mocked API Tests - post /user/delete-friend", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("❌ 500 - MongoDB Failure on deleteFriend", async () => {
        const res = await request(app)
            .post("/user/delete-friend")
            .send({ googleEmail: "testuser@example.com", friendEmail: "friend@example.com" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internet Error");
    });
});