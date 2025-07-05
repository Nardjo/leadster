/**
 * Leadster - Script to find shops in France with Instagram presence
 */

import * as dotenv from "dotenv";
import kleur from "kleur";
import minimist from "minimist";
import fs from "node:fs";
import pLimit from "p-limit";
import {
	CONCURRENCY,
	SCRAPING_DELAY,
	SEARCH_AREAS,
	SHOP_TYPES,
} from "../utils/constants.js";
import {
	extractInstagramHandle,
	scrapeWebsiteForInstagram,
} from "../utils/instaResolver.js";
import { fetchWithWebsites } from "../utils/osmFetcher.js";
import { fetchExistingLeads } from "../utils/postgresHelpers.js";
import { ensureDir, latestFile, load, timeFile } from "../utils/storage.js";
dotenv.config();

/* ===== UTILS ===== */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ===== MAIN ===== */
async function main() {
	console.log(
		kleur.cyan().bold("\n========== Leadster - Recherche IG =========="),
	);
	// Récupérer les leads existants dans Neon/Postgres pour la déduplication
	let existingLeads = [];
	try {
		existingLeads = await fetchExistingLeads();
		console.log(
			kleur.yellow(
				`[Déduplication] ${existingLeads.length} leads récupérés depuis la db pour filtrage.`,
			),
		);
	} catch (err) {
		console.warn(
			kleur.red("Impossible de récupérer les leads existants depuis la db :"),
			err.message,
		);
	}

	// CLI flags
	const argv = minimist(process.argv.slice(2));
	const area = argv.area
		? Array.isArray(argv.area)
			? argv.area
			: [argv.area]
		: SEARCH_AREAS;
	const types = argv.types
		? Array.isArray(argv.types)
			? argv.types
			: [argv.types]
		: SHOP_TYPES.map((t) => t.label);
	const mode = argv.mode || "ig"; // "ig" or "site+ig"
	const htmlFallback = argv["html-fallback"] || false;

	console.log(kleur.yellow(`Zones recherchées : ${area.join(", ")}`));
	console.log(kleur.yellow(`Types recherchés : ${types.join(", ")}`));

	const prev = load(latestFile());
	const seen = new Set([
		// Ajout des résultats locaux (comme avant)
		...prev.map((s) => `${s.Nom || s.handle}|${s.Type_Commerce || s.type}`),
		// Ajout des leads existants dans Neon/Postgres
		...existingLeads.map((l) => `${l.nom}|${l.type_de_commerce}`),
	]);

	// Nouvelle logique : on récupère tous les shops avec ou sans IG, mais avec site si dispo
	const shops = await fetchWithWebsites(area, types);
	console.log(kleur.yellow(`Shops trouvés (avant filtrage) : ${shops.length}`));
	const limit = pLimit(CONCURRENCY);
	const results = [];

	for (const shop of shops) {
		const hash = `${shop.handle || shop.website}|${shop.type}`;
		if (seen.has(hash)) continue;
		seen.add(hash);

		// Si IG présent
		if (shop.handle) {
			results.push({
				Nom: shop.handle,
				Ville: shop.ville,
				Type_Commerce: shop.type,
				...(shop.website ? { URL_Site: shop.website } : {}),
			});
			continue;
		}
		// Sinon, si website et mode scraping activé
		if (shop.website && (mode === "site+ig" || htmlFallback)) {
			// Scraping en concurrence limitée
			const res = await limit(async () => {
				await sleep(SCRAPING_DELAY);
				return scrapeWebsiteForInstagram({
					website: shop.website,
					city: shop.ville,
					postcode: shop.ville,
					type: shop.type,
				});
			});
			if (res?.Nom) {
				// On push le résultat du scraping
				results.push(res);
			} else {
				// Pas d'IG trouvé, mais on veut garder le site ?
				results.push({
					Nom: "",
					Ville: shop.ville,
					Type_Commerce: shop.type,
					URL_Site: shop.website,
				});
			}
		}
	}

	const file = `${ensureDir()}/${timeFile()}`;
	if (results.length > 0) {
		// Normalisation : inclure URL_Site si dispo
		const normalized = results.map((r) => {
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
		fs.writeFileSync(file, JSON.stringify(normalized, null, 2));
		console.log(
			kleur.green(
				`Nouveaux shops trouvés et sauvegardés : ${normalized.length}`,
			),
		);
		console.log(kleur.green(`Fichier résultat : ${file}`));
	} else {
		console.log(
			kleur.green(
				"Aucun nouveau shop à ajouter : tout est déjà présent dans Neon ou dans les fichiers précédents.",
			),
		);
	}
}

main();
