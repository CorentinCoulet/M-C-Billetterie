import jwt, { SignOptions } from "jsonwebtoken";
import { CONFIG } from "../core/config";

const JWT_SECRET = CONFIG.AUTH.JWT_SECRET;
const JWT_EXPIRES_IN = CONFIG.AUTH.JWT_EXPIRES_IN as SignOptions["expiresIn"];

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in configuration");
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
