import jwt from "jsonwebtoken";

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );
}
