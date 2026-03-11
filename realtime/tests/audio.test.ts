import { describe, it, expect } from 'vitest';
import {
  mulawEncode,
  mulawDecode,
  mulawToPcm16,
  pcm16ToMulaw,
  upsample8kTo16k,
  downsample16kTo8k,
  twilioToElevenLabs,
  elevenLabsToTwilio,
} from '../src/utils/audio.js';

describe('audio utilities', () => {
  describe('mulaw encode/decode roundtrip', () => {
    it('should roundtrip silence (0) approximately', () => {
      const encoded = mulawEncode(0);
      const decoded = mulawDecode(encoded);
      expect(Math.abs(decoded)).toBeLessThan(200);
    });

    it('should roundtrip positive samples', () => {
      const original = 8000;
      const encoded = mulawEncode(original);
      const decoded = mulawDecode(encoded);
      expect(Math.abs(decoded - original)).toBeLessThan(500);
    });

    it('should roundtrip negative samples', () => {
      const original = -8000;
      const encoded = mulawEncode(original);
      const decoded = mulawDecode(encoded);
      expect(Math.abs(decoded - original)).toBeLessThan(500);
    });

    it('should clamp values beyond max', () => {
      const encoded = mulawEncode(40000);
      const decoded = mulawDecode(encoded);
      expect(decoded).toBeLessThanOrEqual(32767);
    });
  });

  describe('mulawToPcm16 / pcm16ToMulaw', () => {
    it('should produce a PCM buffer twice the length of mulaw', () => {
      const mulaw = Buffer.from([0xff, 0x7f, 0x00, 0x80]);
      const pcm = mulawToPcm16(mulaw);
      expect(pcm.length).toBe(mulaw.length * 2);
    });

    it('should produce a mulaw buffer half the length of PCM', () => {
      const pcm = Buffer.alloc(8);
      pcm.writeInt16LE(0, 0);
      pcm.writeInt16LE(1000, 2);
      pcm.writeInt16LE(-1000, 4);
      pcm.writeInt16LE(0, 6);
      const mulaw = pcm16ToMulaw(pcm);
      expect(mulaw.length).toBe(pcm.length / 2);
    });

    it('should roundtrip approximately', () => {
      const pcm = Buffer.alloc(4);
      pcm.writeInt16LE(5000, 0);
      pcm.writeInt16LE(-5000, 2);

      const mulaw = pcm16ToMulaw(pcm);
      const back = mulawToPcm16(mulaw);

      const s0 = back.readInt16LE(0);
      const s1 = back.readInt16LE(2);
      expect(Math.abs(s0 - 5000)).toBeLessThan(600);
      expect(Math.abs(s1 - (-5000))).toBeLessThan(600);
    });
  });

  describe('upsample / downsample', () => {
    it('upsample8kTo16k should double the buffer size', () => {
      const pcm8k = Buffer.alloc(8);
      const pcm16k = upsample8kTo16k(pcm8k);
      expect(pcm16k.length).toBe(pcm8k.length * 2);
    });

    it('downsample16kTo8k should halve the buffer size', () => {
      const pcm16k = Buffer.alloc(16);
      const pcm8k = downsample16kTo8k(pcm16k);
      expect(pcm8k.length).toBe(pcm16k.length / 2);
    });
  });

  describe('full pipeline roundtrip', () => {
    it('twilioToElevenLabs produces a valid base64 string', () => {
      const mulaw = Buffer.from([0xff, 0x7f, 0x80, 0x00]);
      const mulawBase64 = mulaw.toString('base64');
      const result = twilioToElevenLabs(mulawBase64);
      expect(() => Buffer.from(result, 'base64')).not.toThrow();
      // Input: 4 mulaw bytes -> 8 pcm bytes (8kHz) -> 16 pcm bytes (16kHz) -> base64
      const decoded = Buffer.from(result, 'base64');
      expect(decoded.length).toBe(16);
    });

    it('elevenLabsToTwilio produces a valid base64 string', () => {
      const pcm16k = Buffer.alloc(16);
      pcm16k.writeInt16LE(3000, 0);
      pcm16k.writeInt16LE(3000, 2);
      pcm16k.writeInt16LE(-3000, 4);
      pcm16k.writeInt16LE(-3000, 6);
      pcm16k.writeInt16LE(0, 8);
      pcm16k.writeInt16LE(0, 10);
      pcm16k.writeInt16LE(1000, 12);
      pcm16k.writeInt16LE(1000, 14);

      const result = elevenLabsToTwilio(pcm16k.toString('base64'));
      expect(() => Buffer.from(result, 'base64')).not.toThrow();
      // 16 bytes PCM 16kHz -> 8 bytes PCM 8kHz -> 4 bytes mulaw
      const decoded = Buffer.from(result, 'base64');
      expect(decoded.length).toBe(4);
    });
  });
});
