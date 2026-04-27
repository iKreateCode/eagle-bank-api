import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { cleanDb, createTestUser, createTestAccount } from "./helpers/db";

beforeEach(async () => {
  await cleanDb();
});

describe("POST /v1/accounts", () => {
  it("returns 201 with the created account", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post("/v1/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "My Account", accountType: "personal" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "My Account",
      accountType: "personal",
      balance: 0,
      currency: "GBP",
    });
    expect(res.body.accountNumber).toMatch(/^01\d{6}$/);
    expect(res.body.sortCode).toBeDefined();
    expect(res.body.createdTimestamp).toBeDefined();
    expect(res.body.updatedTimestamp).toBeDefined();
  });

  it("returns 400 when name is missing", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post("/v1/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({ accountType: "personal" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "name" })])
    );
  });

  it("returns 400 when accountType is not personal", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post("/v1/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "My Account", accountType: "business" });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "accountType" })])
    );
  });

  it("returns 401 when no token is provided", async () => {
    const res = await request(app)
      .post("/v1/accounts")
      .send({ name: "My Account", accountType: "personal" });

    expect(res.status).toBe(401);
  });
});

describe("GET /v1/accounts", () => {
  it("returns 200 with the user's accounts", async () => {
    const { user, token } = await createTestUser();
    await createTestAccount(user.id, { name: "Account A" });
    await createTestAccount(user.id, { name: "Account B" });

    const res = await request(app)
      .get("/v1/accounts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(2);
    expect(res.body.accounts.map((a: { name: string }) => a.name)).toEqual(
      expect.arrayContaining(["Account A", "Account B"])
    );
  });

  it("returns an empty array when the user has no accounts", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .get("/v1/accounts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.accounts).toEqual([]);
  });

  it("does not return accounts belonging to other users", async () => {
    const { token } = await createTestUser();
    const { user: otherUser } = await createTestUser({ email: "other@example.com" });
    await createTestAccount(otherUser.id, { name: "Other Account" });

    const res = await request(app)
      .get("/v1/accounts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.accounts).toEqual([]);
  });

  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/v1/accounts");

    expect(res.status).toBe(401);
  });
});

describe("GET /v1/accounts/:accountNumber", () => {
  it("returns 200 with the account details", async () => {
    const { user, token } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app)
      .get(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accountNumber: account.accountNumber,
      name: account.name,
      accountType: "personal",
      balance: 0,
      currency: "GBP",
    });
  });

  it("returns 401 when no token is provided", async () => {
    const { user } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app).get(`/v1/accounts/${account.accountNumber}`);

    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as a different user", async () => {
    const { user } = await createTestUser();
    const { account } = await createTestAccount(user.id);
    const { token: otherToken } = await createTestUser({ email: "other@example.com" });

    const res = await request(app)
      .get(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 when the account does not exist", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .get("/v1/accounts/01000000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /v1/accounts/:accountNumber", () => {
  it("returns 200 and updates the account name", async () => {
    const { user, token } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app)
      .patch(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed Account" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed Account");
  });

  it("returns 200 and updates the accountType", async () => {
    const { user, token } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app)
      .patch(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ accountType: "personal" });

    expect(res.status).toBe(200);
    expect(res.body.accountType).toBe("personal");
  });

  it("returns 400 when accountType is invalid", async () => {
    const { user, token } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app)
      .patch(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ accountType: "business" });

    expect(res.status).toBe(400);
  });

  it("returns 401 when no token is provided", async () => {
    const { user } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app)
      .patch(`/v1/accounts/${account.accountNumber}`)
      .send({ name: "Renamed" });

    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as a different user", async () => {
    const { user } = await createTestUser();
    const { account } = await createTestAccount(user.id);
    const { token: otherToken } = await createTestUser({ email: "other@example.com" });

    const res = await request(app)
      .patch(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when the account does not exist", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .patch("/v1/accounts/01000000")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /v1/accounts/:accountNumber", () => {
  it("returns 204 and removes the account from the database", async () => {
    const { user, token } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app)
      .delete(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const deleted = await prisma.bankAccount.findUnique({
      where: { accountNumber: account.accountNumber },
    });
    expect(deleted).toBeNull();
  });

  it("returns 401 when no token is provided", async () => {
    const { user } = await createTestUser();
    const { account } = await createTestAccount(user.id);

    const res = await request(app).delete(`/v1/accounts/${account.accountNumber}`);

    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as a different user", async () => {
    const { user } = await createTestUser();
    const { account } = await createTestAccount(user.id);
    const { token: otherToken } = await createTestUser({ email: "other@example.com" });

    const res = await request(app)
      .delete(`/v1/accounts/${account.accountNumber}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 when the account does not exist", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .delete("/v1/accounts/01000000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
