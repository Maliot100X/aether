/**
 * Zero-database JWT auth for Vercel serverless.
 * 
 * Sign-up: embeds user data + password hash into a signed JWT.
 * Sign-in: verifies password by re-hashing and comparing inside the JWT.
 * Session: just verify the JWT signature + expiry.
 * 
 * No database needed at all. Users are stateless.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.NEXTAUTH_SECRET || process.env.BETTER_AUTH_SECRET || "aether-jwt-fallback-2026";

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

function hashPw(salt: string, password: string): string {
  return sign(salt + ":" + password);
}

export type AetherUser = {
  id: string;
  name: string;
  email: string;
  pwHash: string;
  salt: string;
  createdAt: string;
};

function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function unb64<T = unknown>(s: string): T {
  return JSON.parse(Buffer.from(s, "base64url").toString()) as T;
}

export function createToken(user: AetherUser): string {
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64(user);
  const sig = sign(`${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token: string): AetherUser | null {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const expected = sign(`${h}.${p}`);
    try {
      if (!timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
    } catch {
      return null;
    }
    return unb64<AetherUser>(p);
  } catch {
    return null;
  }
}

export function verifyPassword(token: string, password: string): boolean {
  const user = verifyToken(token);
  if (!user) return false;
  const computed = hashPw(user.salt, password);
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(user.pwHash));
  } catch {
    return false;
  }
}

export function issueToken(name: string, email: string, password: string): { token: string; user: AetherUser } {
  const salt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const id = `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const pwHash = hashPw(salt, password);
  const user: AetherUser = {
    id,
    name,
    email: email.toLowerCase(),
    pwHash,
    salt,
    createdAt: new Date().toISOString(),
  };
  return { token: createToken(user), user };
}
