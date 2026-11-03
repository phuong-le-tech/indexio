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
  return password === expected;
}

export function attemptLogin(password: string): "allowed" | "invalid" | "throttled";
export function attemptLogin(): "allowed" | "invalid" | "throttled" {
  throw new Error("Not implemented: attemptLogin");
}

export { COOKIE_NAME };
