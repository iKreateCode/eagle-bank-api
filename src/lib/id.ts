import crypto from "crypto";

export function createUserId() {
  return `usr-${crypto.randomBytes(8).toString("hex")}`;
}