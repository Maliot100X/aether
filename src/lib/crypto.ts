import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyMaterial(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "aether-preview-vault";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintToken(prefix = "ath"): string {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

export function newId(prefix = "ae"): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length < 8) return "••••";
  return `${value.slice(0, 4)}…${value.slice(-3)}`;
}
