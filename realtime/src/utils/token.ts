import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('token');

export interface TokenPayload {
  sub: string;        // user ID
  callId: string;
  callSid: string;
  iat: number;
  exp: number;
}

/**
 * Validate a JWT session token used to authenticate WebSocket upgrade requests.
 * Returns the decoded payload or null if invalid/expired.
 */
export function validateSessionToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SIGNING_KEY, {
      algorithms: ['HS256'],
    }) as TokenPayload;

    if (!decoded.sub || !decoded.callId) {
      log.warn('Token missing required claims');
      return null;
    }

    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      log.warn('Session token expired');
    } else if (err instanceof jwt.JsonWebTokenError) {
      log.warn({ err }, 'Invalid session token');
    } else {
      log.error({ err }, 'Unexpected token validation error');
    }
    return null;
  }
}

/**
 * Create a signed session token (used by backend to grant WS access).
 */
export function createSessionToken(
  userId: string,
  callId: string,
  callSid: string,
  ttlSeconds = 300,
): string {
  return jwt.sign(
    { sub: userId, callId, callSid },
    config.JWT_SIGNING_KEY,
    { algorithm: 'HS256', expiresIn: ttlSeconds },
  );
}
