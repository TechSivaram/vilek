import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const raw = process.env.VILEK_BANK_DATA_ENCRYPTION_KEY;
  if (!raw)
    throw new Error(
      "VILEK_BANK_DATA_ENCRYPTION_KEY must be configured before storing bank details.",
    );
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32)
    throw new Error("VILEK_BANK_DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return value;
}
export function encryptBankValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}
export function decryptBankValue(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported encrypted bank-data format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskBankValue(value: string) {
  const clean = value.replace(/\s+/g, "");
  return clean.length <= 4
    ? clean
    : `${"*".repeat(Math.min(8, clean.length - 4))}${clean.slice(-4)}`;
}
