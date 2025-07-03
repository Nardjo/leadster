import { describe, expect, it } from "vitest";
import { isShopInAirtable, normalizeUrl } from "../utils/airtableHelpers.js";

// Mocks for environment variables
process.env.AIRTABLE_API_KEY = "key_test";
process.env.AIRTABLE_BASE_ID = "base_test";
process.env.AIRTABLE_TABLE_NAME = "Shops";

describe("airtableHelpers", () => {
	describe("isShopInAirtable", () => {
		it("should return false if airtableRecords is empty", () => {
			const shop = { URL_Site: "https://test.com", Type_Commerce: "Vêtements" };
			expect(isShopInAirtable(shop, [])).toBe(false);
		});

		it("should return true if Nom matches", () => {
			const shop = { Nom: "testshop" };
			const records = [{ Nom: "testshop" }];
			expect(isShopInAirtable(shop, records)).toBe(true);
		});

		it("should return true if URL and type match", () => {
			const shop = { URL_Site: "https://test.com", Type_Commerce: "Vêtements" };
			const records = [
				{ URL_Site: "https://test.com", Type_Commerce: "Vêtements" },
			];
			expect(isShopInAirtable(shop, records)).toBe(true);
		});

		it("should return false if type does not match", () => {
			const shop = { URL_Site: "https://test.com", Type_Commerce: "Vêtements" };
			const records = [
				{ URL_Site: "https://test.com", Type_Commerce: "Chaussures" },
			];
			expect(isShopInAirtable(shop, records)).toBe(false);
		});
	});

	describe("normalizeUrl", () => {
		it("should normalize URLs for comparison", () => {
			const url = "https://Test.com/";
			const normalized = normalizeUrl(url);
			expect(normalized).toBe("test.com");
		});
		it("should return empty string for falsy input", () => {
			expect(normalizeUrl(null)).toBe("");
		});
	});
});
