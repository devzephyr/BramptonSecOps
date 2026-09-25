import { randomBytes } from "node:crypto";

export function randomToken(prefix?: string) {
  const token = randomBytes(24).toString("base64url");
  return prefix ? `${prefix}_${token}` : token;
}
