import { describe, expect, it } from "vitest";
import EXCLUDED_BRANDS from "../utils/brandsExcluded.js";

describe("EXCLUDED_BRANDS", () => {
	it("should be an array", () => {
		expect(Array.isArray(EXCLUDED_BRANDS)).toBe(true);
	});
	it("should contain some known brands", () => {
		expect(EXCLUDED_BRANDS).toContain("Zara");
		expect(EXCLUDED_BRANDS).toContain("Nike");
	});
});
