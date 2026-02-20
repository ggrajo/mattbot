import { validateField, emailSchema, passwordSchema, totpCodeSchema, recoveryCodeSchema } from '../../utils/validation';

describe('validation', () => {
  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      expect(validateField(emailSchema, 'user@example.com')).toBeUndefined();
      expect(validateField(emailSchema, 'a.b+c@d.co')).toBeUndefined();
    });

    it('rejects empty email', () => {
      expect(validateField(emailSchema, '')).toBe('Email is required');
    });

    it('rejects invalid email', () => {
      expect(validateField(emailSchema, 'not-an-email')).toBeDefined();
    });
  });

  describe('passwordSchema', () => {
    it('accepts passwords between 12 and 128 chars', () => {
      expect(validateField(passwordSchema, 'a'.repeat(12))).toBeUndefined();
      expect(validateField(passwordSchema, 'a'.repeat(128))).toBeUndefined();
    });

    it('rejects passwords under 12 chars', () => {
      expect(validateField(passwordSchema, 'short')).toBeDefined();
    });

    it('rejects passwords over 128 chars', () => {
      expect(validateField(passwordSchema, 'a'.repeat(129))).toBeDefined();
    });
  });

  describe('totpCodeSchema', () => {
    it('accepts valid 6-digit codes', () => {
      expect(validateField(totpCodeSchema, '123456')).toBeUndefined();
      expect(validateField(totpCodeSchema, '000000')).toBeUndefined();
    });

    it('rejects non-6-digit codes', () => {
      expect(validateField(totpCodeSchema, '12345')).toBeDefined();
      expect(validateField(totpCodeSchema, '1234567')).toBeDefined();
      expect(validateField(totpCodeSchema, 'abcdef')).toBeDefined();
    });
  });

  describe('recoveryCodeSchema', () => {
    it('accepts valid XXXX-XXXX format', () => {
      expect(validateField(recoveryCodeSchema, 'ABCD-1234')).toBeUndefined();
      expect(validateField(recoveryCodeSchema, 'a1b2-c3d4')).toBeUndefined();
    });

    it('rejects invalid formats', () => {
      expect(validateField(recoveryCodeSchema, '')).toBeDefined();
      expect(validateField(recoveryCodeSchema, 'ABCD1234')).toBeDefined();
      expect(validateField(recoveryCodeSchema, 'AB-CD')).toBeDefined();
    });
  });
});
