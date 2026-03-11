import { describe, it, expect } from "vitest";
import type { TwilioMessage } from "../src/types.js";

describe("Twilio message parsing", () => {
  it("parses a valid connected event", () => {
    const raw = '{"event":"connected","protocol":"Call","version":"1.0.0"}';
    const msg: TwilioMessage = JSON.parse(raw);
    expect(msg.event).toBe("connected");
  });

  it("parses a valid start event with custom parameters", () => {
    const raw = JSON.stringify({
      event: "start",
      sequenceNumber: "1",
      start: {
        streamSid: "MZ_test_001",
        accountSid: "AC_test",
        callSid: "CA_test",
        tracks: ["inbound"],
        customParameters: {
          call_id: "550e8400-e29b-41d4-a716-446655440000",
          user_id: "660e8400-e29b-41d4-a716-446655440000",
          session_token: "test.token",
          provider_call_sid: "CA_test",
        },
        mediaFormat: {
          encoding: "audio/x-mulaw",
          sampleRate: 8000,
          channels: 1,
        },
      },
      streamSid: "MZ_test_001",
    });

    const msg: TwilioMessage = JSON.parse(raw);
    expect(msg.event).toBe("start");
    if (msg.event === "start") {
      expect(msg.start.streamSid).toBe("MZ_test_001");
      expect(msg.start.customParameters.call_id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(msg.start.customParameters.session_token).toBe("test.token");
      expect(msg.start.mediaFormat.encoding).toBe("audio/x-mulaw");
      expect(msg.start.mediaFormat.sampleRate).toBe(8000);
    }
  });

  it("parses a valid media event with base64 payload", () => {
    const payload = Buffer.from([0x80, 0x81, 0x82]).toString("base64");
    const raw = JSON.stringify({
      event: "media",
      sequenceNumber: "42",
      media: {
        track: "inbound",
        chunk: "1",
        timestamp: "12345",
        payload,
      },
      streamSid: "MZ_test_001",
    });

    const msg: TwilioMessage = JSON.parse(raw);
    expect(msg.event).toBe("media");
    if (msg.event === "media") {
      expect(msg.media.payload).toBe(payload);
      const decoded = Buffer.from(msg.media.payload, "base64");
      expect(decoded.length).toBe(3);
      expect(decoded[0]).toBe(0x80);
    }
  });

  it("parses a valid stop event", () => {
    const raw = JSON.stringify({
      event: "stop",
      sequenceNumber: "100",
      stop: {
        accountSid: "AC_test",
        callSid: "CA_test",
      },
      streamSid: "MZ_test_001",
    });

    const msg: TwilioMessage = JSON.parse(raw);
    expect(msg.event).toBe("stop");
    if (msg.event === "stop") {
      expect(msg.stop.callSid).toBe("CA_test");
    }
  });

  it("rejects invalid JSON gracefully", () => {
    expect(() => JSON.parse("not json")).toThrow();
  });

  it("handles missing event field", () => {
    const msg = JSON.parse('{"foo": "bar"}') as TwilioMessage;
    expect((msg as any).event).toBeUndefined();
  });
});
