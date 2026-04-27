import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { cleanDb, createTestUser } from "./helpers/db";
import { createAccountNumber } from "../src/lib/id";

const validUser = {
  name: "Jane Smith",
  email: "jane.smith@example.com",
  password: "securepass",
  phoneNumber: "+447911123456",
  address: {
    line1: "10 Downing Street",
    town: "London",
    county: "Greater London",
    postcode: "SW1A 2AA",
  },
};

beforeEach(async () => {
  await cleanDb();
});

describe("POST /v1/users", () => {
  it("creates a user and returns 201 with the correct shape", async () => {
    const res = await request(app).post("/v1/users").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: validUser.name,
      email: validUser.email,
      phoneNumber: validUser.phoneNumber,
    });
    expect(res.body.id).toMatch(/^usr-/);
    expect(res.body.createdTimestamp).toBeDefined();
    expect(res.body.updatedTimestamp).toBeDefined();
  });

  it("does not expose the password hash in the response", async () => {
    const res = await request(app).post("/v1/users").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
  });

  it("returns 400 when name is missing", async () => {
    const { name: _name, ...body } = validUser;

    const res = await request(app).post("/v1/users").send(body);

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "name" })])
    );
  });

  it("returns 400 when email is missing", async () => {
    const { email: _email, ...body } = validUser;

    const res = await request(app).post("/v1/users").send(body);

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await request(app)
      .post("/v1/users")
      .send({ ...validUser, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/v1/users")
      .send({ ...validUser, password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "password" })])
    );
  });

  it("returns 400 when phoneNumber is missing", async () => {
    const { phoneNumber: _phone, ...body } = validUser;

    const res = await request(app).post("/v1/users").send(body);

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "phoneNumber" })])
    );
  });

  it("returns 400 when phoneNumber is not E.164 format", async () => {
    const res = await request(app)
      .post("/v1/users")
      .send({ ...validUser, phoneNumber: "07911123456" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "phoneNumber" })])
    );
  });

  it("returns 400 when address is missing", async () => {
    const { address: _address, ...body } = validUser;

    const res = await request(app).post("/v1/users").send(body);

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "address" })])
    );
  });

  it("returns 400 when address.town is missing", async () => {
    const { town: _town, ...addressWithoutTown } = validUser.address;

    const res = await request(app)
      .post("/v1/users")
      .send({ ...validUser, address: addressWithoutTown });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "address.town" }),
      ])
    );
  });

  it("returns 400 when the email is already registered", async () => {
    await request(app).post("/v1/users").send(validUser);

    const res = await request(app).post("/v1/users").send(validUser);

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });
});

describe("GET /v1/users/:userId", () => {
  it("returns 200 with user data when authenticated as that user", async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .get(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const { user } = await createTestUser();

    const res = await request(app).get(`/v1/users/${user.id}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 when the token is invalid", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .get(`/v1/users/${user.id}`)
      .set("Authorization", "Bearer this.is.not.a.valid.token");

    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as a different user", async () => {
    const { user } = await createTestUser();
    const { token: otherToken } = await createTestUser({
      email: "other@example.com",
    });

    const res = await request(app)
      .get(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 when the user does not exist", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .get("/v1/users/usr-doesnotexist00")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /v1/users/:userId", () => {
  it("returns 200 and updates the name", async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .patch(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
  });

  it("returns 200 and updates the email", async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .patch(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "new.email@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("new.email@example.com");
  });

  it("returns 200 and updates the phoneNumber", async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .patch(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phoneNumber: "+12025550195" });

    expect(res.status).toBe(200);
    expect(res.body.phoneNumber).toBe("+12025550195");
  });

  it("returns 400 when the new email is already taken by another user", async () => {
    const { user, token } = await createTestUser();
    await createTestUser({ email: "taken@example.com" });

    const res = await request(app)
      .patch(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "taken@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .patch(`/v1/users/${user.id}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as a different user", async () => {
    const { user } = await createTestUser();
    const { token: otherToken } = await createTestUser({
      email: "other@example.com",
    });

    const res = await request(app)
      .patch(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Hacked Name" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when the user does not exist", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .patch("/v1/users/usr-doesnotexist00")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /v1/users/:userId", () => {
  it("returns 204 and removes the user from the database", async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .delete(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const deleted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(deleted).toBeNull();
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const { user } = await createTestUser();

    const res = await request(app).delete(`/v1/users/${user.id}`);

    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as a different user", async () => {
    const { user } = await createTestUser();
    const { token: otherToken } = await createTestUser({
      email: "other@example.com",
    });

    const res = await request(app)
      .delete(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 when the user does not exist", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .delete("/v1/users/usr-doesnotexist00")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("returns 409 when the user still has open bank accounts", async () => {
    const { user, token } = await createTestUser();

    await prisma.bankAccount.create({
      data: {
        accountNumber: createAccountNumber(),
        name: "Test Account",
        accountType: "personal",
        userId: user.id,
      },
    });

    const res = await request(app)
      .delete(`/v1/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/bank accounts/i);
  });
});
