import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config.js', () => ({
  config: {
    JWT_SIGNING_KEY: 'test-secret-key-minimum-length-32chars!!',
    LOG_LEVEL: 'silent',
  },
}));

import { validateSessionToken, createSessionToken } from '../src/utils/token.js';

describe('token utilities', () => {
  describe('createSessionToken', () => {
    it('should create a valid JWT', () => {
      const token = createSessionToken('user-123', 'call-456', 'CA_abc');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should embed correct claims', () => {
      const token = createSessionToken('user-123', 'call-456', 'CA_abc');
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.callId).toBe('call-456');
      expect(decoded.callSid).toBe('CA_abc');
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('validateSessionToken', () => {
    it('should validate a correctly signed token', () => {
      const token = createSessionToken('user-123', 'call-456', 'CA_abc');
      const result = validateSessionToken(token);
      expect(result).not.toBeNull();
      expect(result!.sub).toBe('user-123');
      expect(result!.callId).toBe('call-456');
    });

    it('should return null for an expired token', () => {
      const token = createSessionToken('user-123', 'call-456', 'CA_abc', -10);
      const result = validateSessionToken(token);
      expect(result).toBeNull();
    });

    it('should return null for a token signed with a different key', () => {
      const token = jwt.sign(
        { sub: 'user-123', callId: 'call-456', callSid: 'CA_abc' },
        'wrong-secret-key',
        { algorithm: 'HS256', expiresIn: 300 },
      );
      const result = validateSessionToken(token);
      expect(result).toBeNull();
    });

    it('should return null for a token missing required claims', () => {
      const token = jwt.sign(
        { foo: 'bar' },
        'test-secret-key-minimum-length-32chars!!',
        { algorithm: 'HS256', expiresIn: 300 },
      );
      const result = validateSessionToken(token);
      expect(result).toBeNull();
    });

    it('should return null for garbage input', () => {
      const result = validateSessionToken('not.a.valid.jwt');
      expect(result).toBeNull();
    });
  });
});
