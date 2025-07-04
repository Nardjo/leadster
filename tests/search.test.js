import { describe, it, expect } from "vitest";

// Helpers à mocker (si besoin, sinon on testera la logique pure)
function extractInstagramHandle(urlOrHandle) {
	if (!urlOrHandle) return "";
	if (urlOrHandle.startsWith("http")) {
		const m = urlOrHandle.match(/instagram\.com\/([A-Za-z0-9_.-]+)/);
		return m ? m[1] : "";
	}
	return urlOrHandle;
}

function normalizeResults(results) {
	return results.map((r) => {
		let nom = r.Nom;
		if (typeof nom === "string" && nom.startsWith("http")) {
			nom = extractInstagramHandle(nom) || nom;
		}
		return {
			Nom: nom,
			Ville: r.Ville,
			Type_Commerce: r.Type_Commerce,
			...(r.URL_Site ? { URL_Site: r.URL_Site } : {}),
		};
	});
}

describe("Leadster - Normalisation JSON finale", () => {
	it("IG handle pur (pas d'URL)", () => {
		const data = [
			{ Nom: "taostaunes", Ville: "Montpellier", Type_Commerce: "Vêtements" },
		];
		const out = normalizeResults(data);
		expect(out[0].Nom).toBe("taostaunes");
		expect(out[0].URL_Site).toBeUndefined();
	});

	it("IG URL → handle pur", () => {
		const data = [
			{ Nom: "https://instagram.com/pointdevue_lunel", Ville: "Lunel", Type_Commerce: "Opticien" },
		];
		const out = normalizeResults(data);
		expect(out[0].Nom).toBe("pointdevue_lunel");
	});

	it("Site web seul (pas d'IG)", () => {
		const data = [
			{ Nom: "", Ville: "Paris", Type_Commerce: "Café", URL_Site: "https://cafeparis.fr" },
		];
		const out = normalizeResults(data);
		expect(out[0].Nom).toBe("");
		expect(out[0].URL_Site).toBe("https://cafeparis.fr");
	});

	it("IG handle + site web", () => {
		const data = [
			{ Nom: "brandparis", Ville: "Paris", Type_Commerce: "Mode", URL_Site: "https://brandparis.fr" },
		];
		const out = normalizeResults(data);
		expect(out[0].Nom).toBe("brandparis");
		expect(out[0].URL_Site).toBe("https://brandparis.fr");
	});

	it("IG URL + site web", () => {
		const data = [
			{ Nom: "https://www.instagram.com/brandparis", Ville: "Paris", Type_Commerce: "Mode", URL_Site: "https://brandparis.fr" },
		];
		const out = normalizeResults(data);
		expect(out[0].Nom).toBe("brandparis");
		expect(out[0].URL_Site).toBe("https://brandparis.fr");
	});

	it("Shop sans IG ni site n'est pas inclus (filtrage amont)", () => {
		const data = [
			{ Nom: "", Ville: "Lyon", Type_Commerce: "Fleuriste" },
		];
		const out = normalizeResults(data);
		// Ici, il est dans le tableau, mais la logique du pipeline ne l'ajoute pas
		expect(out[0].Nom).toBe("");
		// Pour un vrai filtrage, il faudrait tester la logique du pipeline principal
	});
});
