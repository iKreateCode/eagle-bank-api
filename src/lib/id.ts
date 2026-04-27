import crypto from "crypto";

export function createUserId() {
  return `usr-${crypto.randomBytes(8).toString("hex")}`;
}

export function createAccountNumber() {
  const digits = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `01${digits}`;
}