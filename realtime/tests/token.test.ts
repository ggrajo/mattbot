import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";

// Set up env before importing config
process.env.INTERNAL_EVENT_SECRET = "test-secret-for-tokens-only";

import { verifySessionToken, InvalidTokenError } from "../src/utils/token.js";

function createTestToken(
  callId: string,
  userId: string,
  expiresIn: number = 300
): string {
  const secret = process.env.INTERNAL_EVENT_SECRET!;
  const payload = JSON.stringify(
    { cid: callId, uid: userId, exp: Math.floor(Date.now() / 1000) + expiresIn },
    null,
    undefined
  );
  // Match the Python-side formatting: separators=(",", ":"), sort_keys=True
  const sorted = JSON.stringify(
    JSON.parse(payload),
    Object.keys(JSON.parse(payload)).sort()
  );
  // Actually we need to match exact format: {"cid":"...", "exp":..., "uid":"..."}
  const obj = { cid: callId, exp: Math.floor(Date.now() / 1000) + expiresIn, uid: userId };
  const payloadJson = JSON.stringify(obj, Object.keys(obj).sort()).replace(/\s/g, "");
  // Actually, json.dumps with separators=(",", ":") and sort_keys=True
  const compactSorted = Object.entries(obj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `"${k}":${typeof v === "string" ? `"${v}"` : v}`)
    .join(",");
  const finalPayload = `{${compactSorted}}`;

  const sig = crypto
    .createHmac("sha256", secret)
    .update(finalPayload)
    .digest("hex");

  return `${finalPayload}.${sig}`;
}

describe("session token verification", () => {
  it("accepts a valid token", () => {
    const callId = "550e8400-e29b-41d4-a716-446655440000";
    const userId = "660e8400-e29b-41d4-a716-446655440000";
    const token = createTestToken(callId, userId);

    const result = verifySessionToken(token);
    expect(result.callId).toBe(callId);
    expect(result.userId).toBe(userId);
  });

  it("rejects an expired token", () => {
    const callId = "550e8400-e29b-41d4-a716-446655440000";
    const userId = "660e8400-e29b-41d4-a716-446655440000";
    const token = createTestToken(callId, userId, -60);

    expect(() => verifySessionToken(token)).toThrow(InvalidTokenError);
    expect(() => verifySessionToken(token)).toThrow("expired");
  });

  it("rejects a token with invalid signature", () => {
    const callId = "550e8400-e29b-41d4-a716-446655440000";
    const userId = "660e8400-e29b-41d4-a716-446655440000";
    const token = createTestToken(callId, userId);
    const tampered = token.slice(0, -5) + "xxxxx";

    expect(() => verifySessionToken(tampered)).toThrow(InvalidTokenError);
  });

  it("rejects a malformed token", () => {
    expect(() => verifySessionToken("not-a-token")).toThrow(InvalidTokenError);
  });

  it("rejects a token with no dot separator", () => {
    expect(() => verifySessionToken("abcdef1234567890")).toThrow(InvalidTokenError);
  });
});
