import { describe, expect, it } from "vite-plus/test";

import { computeDocumentTotalMinor, computeLineTotalMinor } from "#@/documents/index";

describe("computeLineTotalMinor", () => {
  it("multiplies whole quantity by rate in minor units", () => {
    expect(computeLineTotalMinor("2", "500000")).toBe(1_000_000n);
  });

  it("rounds a half minor unit up (half-up)", () => {
    expect(computeLineTotalMinor("0.5", "1")).toBe(1n);
  });

  it("rounds just below a half minor unit down", () => {
    expect(computeLineTotalMinor("0.499999", "1")).toBe(0n);
  });

  it("rounds just above a half minor unit up", () => {
    expect(computeLineTotalMinor("0.500001", "1")).toBe(1n);
  });

  it("rounds a six-decimal quantity at the sub-rupee edge", () => {
    // 0.333333 * 3.00 = 0.999999 rupees = 99.9999 paise -> 100 paise
    expect(computeLineTotalMinor("0.333333", "300")).toBe(100n);
  });
});

describe("computeDocumentTotalMinor", () => {
  it("sums rounded line totals", () => {
    expect(
      computeDocumentTotalMinor([
        { quantity: "2", rateMinor: "500000" },
        { quantity: "1", rateMinor: "150000" }
      ])
    ).toBe(1_150_000n);
  });

  it("returns zero for no lines", () => {
    expect(computeDocumentTotalMinor([])).toBe(0n);
  });

  it("rounds each line independently before summing", () => {
    // two lines that each round up from .5 -> 1 + 1 = 2, not 1 from summed 1.0
    expect(
      computeDocumentTotalMinor([
        { quantity: "0.5", rateMinor: "1" },
        { quantity: "0.5", rateMinor: "1" }
      ])
    ).toBe(2n);
  });
});
