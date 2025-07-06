/* ===== CONSTANTES EXEMPLE =====
 * Copiez ce fichier en utils/constants.js et adaptez selon votre projet.
 * Ajoutez utils/constants.js à votre .gitignore pour garder vos presets privés.
 */

export const SEARCH_AREAS = ["Angers", "Métropole de Angers"];
export const SCRAPING_DELAY = 1000;
export const CONCURRENCY = 5;
export const RETRY_COUNT = 3;
export const RETRY_DELAY_MS = 1000;

export const SHOP_TYPES = [
	{ tag: "shop=clothes", label: "Vêtements" },
	{ tag: "shop=bags", label: "Maroquinerie" },
	{ tag: "shop=shoes", label: "Chaussures" },
	{ tag: "shop=jewelry", label: "Bijoux" },
	{ tag: "shop=car_parts", label: "Équipement Auto" },
	{ tag: "shop=electronics", label: "Électronique / LED" },
	{ tag: "shop=furniture", label: "Meubles" },
	{ tag: "craft", label: "Artisan" },
	{ tag: "office=consultant", label: "Coach / Consultant" },
	{ tag: "office", label: "Agence / Bureau" },
	{ tag: "amenity=restaurant", label: "Restaurant" },
	{ tag: "amenity=cafe", label: "Café" },
	{ tag: "shop=estate_agent", label: "Agence immobilière" },
];
