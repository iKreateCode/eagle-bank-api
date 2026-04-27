import bcrypt from "bcrypt";
import { prisma } from "../../src/lib/prisma";
import { createUserId } from "../../src/lib/id";
import { generateToken } from "./auth";

export async function cleanDb() {
  await prisma.transaction.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(overrides: { email?: string; name?: string } = {}) {
  const id = createUserId();
  const email = overrides.email ?? "test@example.com";
  const name = overrides.name ?? "Test User";

  const user = await prisma.user.create({
    data: {
      id,
      name,
      email,
      phoneNumber: "+447911123456",
      address: {
        line1: "123 Test Street",
        town: "London",
        county: "Greater London",
        postcode: "EC1A 1BB",
      },
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });

  const token = generateToken(user.id, user.email);
  return { user, token };
}
