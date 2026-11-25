import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function pepper(): string {
  const value = process.env.OTP_PEPPER;
  if (!value || value.length < 32) throw new Error("OTP_PEPPER must contain at least 32 characters");
  return value;
}

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(otp: string, destination: string, challengeId: string): Buffer {
  return createHmac("sha256", pepper()).update(destination).update(":").update(challengeId).update(":").update(otp).digest();
}

export function verifyOtp(otp: string, destination: string, challengeId: string, expected: Buffer): boolean {
  const actual = hashOtp(otp, destination, challengeId);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

export function requestFingerprint(value: string | null): Buffer | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest();
}

export function validOtp(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}
