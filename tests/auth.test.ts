import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/app";
import { cleanDb, createTestUser } from "./helpers/db";

beforeEach(async () => {
  await cleanDb();
});

describe("POST /v1/auth/login", () => {
  it("returns 200 with a JWT token for valid credentials", async () => {
    await createTestUser({ email: "login@example.com" });

    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "login@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".")).toHaveLength(3);
  });

  it("returns 401 when the password is wrong", async () => {
    await createTestUser({ email: "login@example.com" });

    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "login@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("returns 401 when the email is not registered", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "login@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "password" })])
    );
  });
});
