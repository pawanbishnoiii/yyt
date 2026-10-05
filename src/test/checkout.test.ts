import { describe, expect, it } from "vitest";
import { computeBill } from "@/lib/checkout";

describe("GST bill math", () => {
  it("applies default 6% CGST + 6% SGST", () => {
    const b = computeBill({ rate: 1000, nights: 2, extras: 0, discountPct: 0, cgstRate: 6, sgstRate: 6 });
    expect(b.cgst).toBe(120);
    expect(b.sgst).toBe(120);
    expect(b.total).toBe(2240);
  });
  it("taxes extras and applies discount on room charges before GST", () => {
    const b = computeBill({ rate: 1000, nights: 1, extras: 200, discountPct: 10, cgstRate: 6, sgstRate: 6 });
    expect(b.discount).toBe(100);
    expect(b.taxable).toBe(1100);
    expect(b.total).toBe(1232);
  });
});
