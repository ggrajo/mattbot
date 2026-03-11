/**
 * Audio format conversion between Twilio mulaw (8kHz, 8-bit) and PCM (16-bit LE).
 *
 * Twilio Media Streams deliver audio as base64-encoded G.711 μ-law at 8 kHz.
 * ElevenLabs Conversational AI expects and returns linear PCM 16-bit LE at 16 kHz.
 */

const MULAW_BIAS = 0x84;
const MULAW_MAX = 0x7fff;
const MULAW_CLIP = 32635;

const MULAW_ENCODE_TABLE = [0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3,
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7];

const MULAW_DECODE_TABLE = new Int16Array(256);
(function buildDecodeTable() {
  for (let i = 0; i < 256; i++) {
    const complement = ~i;
    const sign = complement & 0x80;
    const exponent = (complement >> 4) & 0x07;
    const mantissa = complement & 0x0f;
    let magnitude = ((mantissa << 1) + 33) << (exponent + 2);
    magnitude -= MULAW_BIAS;
    MULAW_DECODE_TABLE[i] = sign ? -magnitude : magnitude;
  }
})();

/** Decode a single μ-law byte to a 16-bit PCM sample. */
export function mulawDecode(mulawByte: number): number {
  return MULAW_DECODE_TABLE[mulawByte & 0xff]!;
}

/** Encode a single 16-bit PCM sample to a μ-law byte. */
export function mulawEncode(sample: number): number {
  let sign = 0;
  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  }
  if (sample > MULAW_CLIP) sample = MULAW_CLIP;
  sample += MULAW_BIAS;
  const exponent = MULAW_ENCODE_TABLE[(sample >> 7) & 0xff]!;
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

/**
 * Convert a Buffer of μ-law bytes to 16-bit PCM LE Buffer.
 * Each μ-law byte expands to 2 bytes of PCM.
 */
export function mulawToPcm16(mulawBuf: Buffer): Buffer {
  const pcm = Buffer.alloc(mulawBuf.length * 2);
  for (let i = 0; i < mulawBuf.length; i++) {
    const sample = mulawDecode(mulawBuf[i]!);
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

/**
 * Convert a 16-bit PCM LE Buffer to μ-law bytes.
 * Every 2 bytes of PCM become 1 byte of μ-law.
 */
export function pcm16ToMulaw(pcmBuf: Buffer): Buffer {
  const mulaw = Buffer.alloc(pcmBuf.length / 2);
  for (let i = 0; i < mulaw.length; i++) {
    const sample = pcmBuf.readInt16LE(i * 2);
    mulaw[i] = mulawEncode(sample);
  }
  return mulaw;
}

/**
 * Simple linear up-sample from 8 kHz to 16 kHz by linear interpolation.
 * Input: 16-bit PCM LE at 8 kHz. Output: 16-bit PCM LE at 16 kHz.
 */
export function upsample8kTo16k(pcm8k: Buffer): Buffer {
  const sampleCount = pcm8k.length / 2;
  const out = Buffer.alloc(sampleCount * 4);
  for (let i = 0; i < sampleCount; i++) {
    const current = pcm8k.readInt16LE(i * 2);
    const next = i + 1 < sampleCount ? pcm8k.readInt16LE((i + 1) * 2) : current;
    const mid = Math.round((current + next) / 2);
    out.writeInt16LE(current, i * 4);
    out.writeInt16LE(mid, i * 4 + 2);
  }
  return out;
}

/**
 * Simple linear down-sample from 16 kHz to 8 kHz by dropping every other sample.
 * Input: 16-bit PCM LE at 16 kHz. Output: 16-bit PCM LE at 8 kHz.
 */
export function downsample16kTo8k(pcm16k: Buffer): Buffer {
  const sampleCount = pcm16k.length / 2;
  const outCount = Math.floor(sampleCount / 2);
  const out = Buffer.alloc(outCount * 2);
  for (let i = 0; i < outCount; i++) {
    const sample = pcm16k.readInt16LE(i * 4);
    out.writeInt16LE(sample, i * 2);
  }
  return out;
}

/**
 * Full pipeline: Twilio mulaw base64 -> PCM 16-bit LE 16 kHz base64
 * (ready for ElevenLabs)
 */
export function twilioToElevenLabs(mulawBase64: string): string {
  const mulawBuf = Buffer.from(mulawBase64, 'base64');
  const pcm8k = mulawToPcm16(mulawBuf);
  const pcm16k = upsample8kTo16k(pcm8k);
  return pcm16k.toString('base64');
}

/**
 * Full pipeline: ElevenLabs PCM 16-bit LE 16 kHz base64 -> Twilio mulaw base64
 */
export function elevenLabsToTwilio(pcmBase64: string): string {
  const pcm16k = Buffer.from(pcmBase64, 'base64');
  const pcm8k = downsample16kTo8k(pcm16k);
  const mulaw = pcm16ToMulaw(pcm8k);
  return mulaw.toString('base64');
}
