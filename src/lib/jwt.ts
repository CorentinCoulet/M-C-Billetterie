import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export function signToken(payload: object): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken<T>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
