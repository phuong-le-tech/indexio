import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "indexio_session";
const SESSION_DURATION = "30d";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is required");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken() {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.authenticated === true;
  } catch {
    return false;
  }
}

export function checkPassword(password: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error("APP_PASSWORD env var is required");
  }
  // Fixed-size digests let timingSafeEqual compare passwords of any byte length.
  return timingSafeEqual(
    createHash("sha256").update(password).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 60_000;
let failures = 0;
let windowStart = 0;

export function attemptLogin(password: string): "allowed" | "invalid" | "throttled" {
  const now = Date.now();
  if (now - windowStart >= LOGIN_WINDOW_MS) {
    failures = 0;
    windowStart = now;
  }
  if (failures >= MAX_LOGIN_FAILURES) return "throttled";
  if (checkPassword(password)) return "allowed";
  if (failures === 0) windowStart = now;
  failures++;
  return "invalid";
}

export { COOKIE_NAME };
