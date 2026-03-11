import { describe, it, expect } from "vitest";
import {
  mulawToPcm,
  pcmToMulaw,
  upsample8to16,
  downsample16to8,
} from "../src/utils/audio.js";

describe("audio conversion", () => {
  it("mulawToPcm converts all 256 mulaw values without error", () => {
    const mulaw = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) mulaw[i] = i;

    const pcm = mulawToPcm(mulaw);
    expect(pcm.length).toBe(256);
    expect(pcm instanceof Int16Array).toBe(true);
  });

  it("pcmToMulaw encodes silence correctly", () => {
    const silence = new Int16Array([0, 0, 0, 0]);
    const encoded = pcmToMulaw(silence);
    expect(encoded.length).toBe(4);
    // Silence in mulaw should be a consistent value
    expect(encoded[0]).toBe(encoded[1]);
    expect(encoded[1]).toBe(encoded[2]);
  });

  it("round-trip mulaw->pcm->mulaw preserves audio within tolerance", () => {
    const original = Buffer.alloc(100);
    for (let i = 0; i < 100; i++) original[i] = i * 2;

    const pcm = mulawToPcm(original);
    const roundTrip = pcmToMulaw(pcm);

    let maxDiff = 0;
    for (let i = 0; i < original.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(original[i]! - roundTrip[i]!));
    }
    // Mulaw is lossy; a diff of 1 step is acceptable
    expect(maxDiff).toBeLessThanOrEqual(1);
  });

  it("upsample8to16 doubles the sample count", () => {
    const pcm8k = new Int16Array([100, 200, 300, 400]);
    const pcm16k = upsample8to16(pcm8k);
    expect(pcm16k.length).toBe(8);
    // Original samples at even positions
    expect(pcm16k[0]).toBe(100);
    expect(pcm16k[2]).toBe(200);
    expect(pcm16k[4]).toBe(300);
    expect(pcm16k[6]).toBe(400);
    // Interpolated values between
    expect(pcm16k[1]).toBe(150); // avg(100, 200)
  });

  it("downsample16to8 halves the sample count", () => {
    const pcm16k = new Int16Array([100, 150, 200, 250, 300, 350]);
    const pcm8k = downsample16to8(pcm16k);
    expect(pcm8k.length).toBe(3);
    expect(pcm8k[0]).toBe(100);
    expect(pcm8k[1]).toBe(200);
    expect(pcm8k[2]).toBe(300);
  });

  it("upsample then downsample recovers original samples", () => {
    const original = new Int16Array([1000, -1000, 500, -500, 0]);
    const up = upsample8to16(original);
    const down = downsample16to8(up);
    expect(down.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(down[i]).toBe(original[i]);
    }
  });
});
