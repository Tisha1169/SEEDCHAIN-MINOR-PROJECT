import { describe, expect, it } from "vitest";
import { buildResources } from "./index";

type Tree = { [k: string]: string | Tree };
function keys(o: Tree, p = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
}
function placeholders(s: string) {
  return (s.match(/{{\s*\w+\s*}}/g) ?? []).map((x) => x.replace(/\s/g, "")).sort().join(",");
}
function get(o: Tree, path: string): string {
  return path.split(".").reduce<string | Tree>((a, k) => (a as Tree)[k], o) as string;
}

describe("locales", () => {
  const r = buildResources();
  const base = keys(r.en).sort();
  it("English has translations", () => expect(base.length).toBeGreaterThan(30));
  it.each(["hi", "pa"] as const)("%s has exactly the English keys, no empty values, same placeholders", (l) => {
    expect(keys(r[l]).sort()).toEqual(base);
    for (const k of base) {
      const v = get(r[l], k);
      expect(v, `${l}.${k} empty`).not.toBe("");
      expect(placeholders(v), `${l}.${k} placeholders`).toBe(placeholders(get(r.en, k)));
    }
  });
  it("hi uses Devanagari and pa uses Gurmukhi", () => {
    expect(get(r.hi, "nav.scan")).toMatch(/[ऀ-ॿ]/);
    expect(get(r.pa, "nav.scan")).toMatch(/[਀-੿]/);
  });
});
