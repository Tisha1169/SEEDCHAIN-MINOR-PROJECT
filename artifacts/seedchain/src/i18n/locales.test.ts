import { describe, expect, it } from "vitest";
import en from "./locales/en";
import hi from "./locales/hi";
import pa from "./locales/pa";

function keys(o: Record<string, unknown>, p = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
}

describe("locales", () => {
  const base = keys(en).sort();
  it.each([["hi", hi], ["pa", pa]] as const)("%s has exactly the English keys", (_n, loc) => {
    expect(keys(loc as unknown as Record<string, unknown>).sort()).toEqual(base);
  });
  it("hi and pa are written in their own scripts, not English", () => {
    expect(hi.nav.scan).toMatch(/[ऀ-ॿ]/);
    expect(pa.nav.scan).toMatch(/[਀-੿]/);
    expect(keys(hi as unknown as Record<string, unknown>).length).toBeGreaterThan(30);
  });
});
