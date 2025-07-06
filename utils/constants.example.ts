/* ===== CONSTANTES EXEMPLE =====
 * Copiez ce fichier en utils/constants.js et adaptez selon votre projet.
 * Ajoutez utils/constants.js à votre .gitignore pour garder vos presets privés.
 */

const SEARCH_AREAS = ["Paris", "Métropole de Paris"];
const SCRAPING_DELAY = 1000;
const CONCURRENCY = 5;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

const SHOP_TYPES = [
	{ tag: "shop=clothes", label: "Vêtements" },
	{ tag: "shop=shoes", label: "Chaussures" },
	{ tag: "craft", label: "Artisan" },
	{ tag: "office=consultant", label: "Coach / Consultant" },
	{ tag: "office", label: "Agence / Bureau" },
	{ tag: "amenity=restaurant", label: "Restaurant" },
	{ tag: "amenity=cafe", label: "Café" },
	{ tag: "shop=estate_agent", label: "Agence immobilière" },
];

module.exports = {
	CONCURRENCY,
	RETRY_COUNT,
	RETRY_DELAY_MS,
	SCRAPING_DELAY,
	SEARCH_AREAS,
	SHOP_TYPES,
};
