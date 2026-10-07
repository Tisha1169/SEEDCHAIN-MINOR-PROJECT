import { describe, expect, it } from "vitest";
import { extractToken } from "./qr";

const T = "e0FEk6R-ymUugXAfOqioxFdUECTaYwm_bdMdPux-1i0";
const O = ["https://seedchain.example"];

describe("scanner payload parsing", () => {
  it("accepts a trace URL on an allowed origin, with or without trailing slash", () => {
    expect(extractToken(`https://seedchain.example/trace/${T}`, O)).toBe(T);
    expect(extractToken(`https://seedchain.example/trace/${T}/`, O)).toBe(T);
    expect(extractToken(`  https://seedchain.example/trace/${T}\n`, O)).toBe(T);
  });
  it("accepts a bare token", () => expect(extractToken(T, O)).toBe(T));
  it("rejects other origins, wrong paths, JSON payloads and junk", () => {
    expect(extractToken(`https://evil.example/trace/${T}`, O)).toBeNull();
    expect(extractToken(`http://seedchain.example/trace/${T}`, O)).toBeNull();
    expect(extractToken(`https://seedchain.example/admin/${T}`, O)).toBeNull();
    expect(extractToken(`https://seedchain.example/trace/${T}x`, O)).toBeNull();
    expect(extractToken(`https://seedchain.example/trace/${T}?next=//evil`, O)).toBe(T); // query ignored, token still validated
    expect(extractToken(JSON.stringify({ batchCode: "SC-1", variety: "Kufri" }), O)).toBeNull();
    expect(extractToken("hello world", O)).toBeNull();
    expect(extractToken("", O)).toBeNull();
  });
});
