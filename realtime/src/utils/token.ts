import crypto from "node:crypto";
import { config } from "../config.js";

interface TokenPayload {
  cid: string;
  uid: string;
  exp: number;
}

export class InvalidTokenError extends Error {
  constructor(reason: string) {
    super(`Invalid session token: ${reason}`);
    this.name = "InvalidTokenError";
  }
}

export function verifySessionToken(token: string): { callId: string; userId: string } {
  const secret = process.env.INTERNAL_EVENT_SECRET || config.internalEventSecret || "fallback";
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) throw new InvalidTokenError("malformed");

  const payloadJson = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadJson)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(providedSig))) {
    throw new InvalidTokenError("invalid signature");
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    throw new InvalidTokenError("invalid payload");
  }

  if (payload.exp < Date.now() / 1000) {
    throw new InvalidTokenError("expired");
  }

  return { callId: payload.cid, userId: payload.uid };
}
