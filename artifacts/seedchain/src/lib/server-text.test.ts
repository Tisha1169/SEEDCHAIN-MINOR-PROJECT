import { beforeAll, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { serverText, sourceLabel } from "./server-text";
import { cropName, enumLabel, qty, timeAgo } from "./format";

describe("server text and enum translation", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("hi");
  });
  it("translates known server sentences, exact and patterned", () => {
    expect(serverText("Customer order placed; stock reserved")).toBe("ग्राहक ने ऑर्डर दिया; स्टॉक आरक्षित");
    expect(serverText("Quality grade C")).toBe("गुणवत्ता ग्रेड C");
    expect(serverText("Recorded loss 12.5% of harvest (≥ 10%)")).toContain("12.5%");
    expect(serverText("Clear sky")).toBe("साफ़ आसमान");
  });
  it("leaves text it does not recognise untouched (user-entered notes)", () => {
    expect(serverText("Hand-sorted by my family")).toBe("Hand-sorted by my family");
  });
  it("translates statuses, crops, units and relative time", () => {
    expect(enumLabel("orderStatus", "DELIVERED")).toBe("पहुँचाया गया");
    expect(enumLabel("lotStatus", "SOME_NEW_STATUS")).toBe("Some New Status"); // unknown values stay readable
    expect(cropName("Potato")).toBe("आलू");
    expect(cropName("Dragonfruit")).toBe("Dragonfruit");
    expect(qty(5, "kg")).toContain("किग्रा");
    expect(timeAgo(new Date().toISOString())).toBe("अभी-अभी");
    expect(sourceLabel("pau_potato_punjab", "x")).toContain("आलू");
  });
  it("switches language live and back", async () => {
    await i18n.changeLanguage("pa");
    expect(cropName("Potato")).toBe("ਆਲੂ");
    await i18n.changeLanguage("en");
    expect(cropName("Potato")).toBe("Potato");
    expect(serverText("Fog")).toBe("Fog");
  });
});
