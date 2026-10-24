import { describe, expect, it } from "vitest";
import { sdgsForOnetCode } from "./onet-sdg";

describe("explicit O*NET occupation-code SDG associations", () => {
  it("maps a specific stable code to multiple justified goals without title matching", () => {
    const links = sdgsForOnetCode("15-1252.00");
    expect(links.map((link) => link.number)).toEqual([8, 9]);
    expect(links.every((link) => link.explanation.includes("CareerLens association"))).toBe(true);
    expect(links.every((link) => /target/.test(link.explanation))).toBe(true);
  });
  it("maps nursing and education separately and does not invent unknown associations", () => {
    expect(sdgsForOnetCode("29-1141.00").map((link) => link.number)).toEqual([3]);
    expect(sdgsForOnetCode("29-1141.01").map((link) => link.number)).toEqual([3]);
    expect(sdgsForOnetCode("43-4171.00").map((link) => link.number)).toEqual([8]);
    expect(sdgsForOnetCode("51-1011.00").map((link) => link.number)).toEqual([8, 12]);
    expect(sdgsForOnetCode("25-2021.00").map((link) => link.number)).toEqual([4]);
    expect(sdgsForOnetCode("99-9999.00")).toEqual([]);
    expect(sdgsForOnetCode("15-1252")).toEqual([]);
    expect(sdgsForOnetCode(null)).toEqual([]);
  });
  it("does not allow one caller to mutate mappings for subsequent requests", () => {
    sdgsForOnetCode("15-1254.00")[0].explanation = "changed";
    expect(sdgsForOnetCode("15-1254.00")[0].explanation).not.toBe("changed");
  });
});
