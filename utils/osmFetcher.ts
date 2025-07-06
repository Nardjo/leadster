import axios from "axios";
import axiosRetry from "axios-retry";
import { RETRY_COUNT, RETRY_DELAY_MS, SHOP_TYPES } from "./constants.js";
import { extractInstagramHandle } from "./instaResolver.js";

axiosRetry(axios, {
	retries: RETRY_COUNT,
	retryDelay: (_err, n) => Number(RETRY_DELAY_MS) * 2 ** (Number(n) - 1),
	retryCondition: (err) =>
		axiosRetry.isNetworkOrIdempotentRequestError(err) ||
		err.code === "ECONNABORTED",
});

export interface Shop {
	handle: string | null;
	website: string | null;
	ville: string;
	type: string;
}

export async function fetchWithWebsites(
	areaNames: string[],
	types: string[],
): Promise<Shop[]> {
	const areaParts = areaNames.map(
		(name, i) => `area["name"="${name}"]["admin_level"~"[2-9]"]->.a${i};`,
	);
	const joinAreas = `(${areaNames.map((_, i) => `.a${i}`).join(";")};)->.searchArea;`;
	const areaDefs = `${areaParts.join("\n  ")}\n  ${joinAreas}`;

	const shopQueries = types
		.flatMap((typeLabel) => {
			const shopType = SHOP_TYPES.find((t) => t.label === typeLabel);
			if (!shopType) return [];
			const [k, v] = shopType.tag.split("=");
			return [
				`node["${k}"="${v}"](area.searchArea);`,
				`way ["${k}"="${v}"](area.searchArea);`,
				`relation["${k}"="${v}"](area.searchArea);`,
			];
		})
		.join("\n  ");

	const query = `[out:json];\n${areaDefs}\n(${shopQueries});\nout body;>;out skel qt;`;

	try {
		const { data } = await axios.post(
			"https://overpass-api.de/api/interpreter",
			query,
			{ headers: { "Content-Type": "application/x-www-form-urlencoded" } },
		);
		if (!data?.elements) return [];
		const results: Shop[] = [];
		for (const e of data.elements) {
			if (!e.tags) continue;
			let typeLbl: string | undefined;
			for (const { tag, label } of SHOP_TYPES) {
				const [k, v] = tag.split("=");
				if (e.tags[k] === v) {
					typeLbl = label;
					break;
				}
			}
			if (!typeLbl) continue;
			const igHandle =
				e.tags["contact:instagram"] || e.tags["social:instagram"];
			// biome-ignore lint/complexity/useLiteralKeys: <explanation>
			const website = e.tags["website"] || e.tags["contact:website"] || null;
			const city = e.tags["addr:city"] || e.tags["addr:postcode"] || "";
			results.push({
				handle: igHandle as string | null,
				website,
				ville: city,
				type: typeLbl as string,
			});
		}
		return results;
	} catch (err) {
		if (err instanceof Error) {
			console.error("Overpass fail", err.message);
		} else {
			console.error("Overpass fail", err);
		}
		return [];
	}
}

export async function fetchIGOnly(
	areaNames: string[],
	types: string[],
): Promise<Shop[]> {
	// areaNames: array of area names
	// types: array of shop type labels
	const areaParts = areaNames.map(
		(name, i) => `area["name"="${name}"]["admin_level"~"[2-9]"]->.a${i};`,
	);
	const joinAreas = `(${areaNames.map((_, i) => `.a${i}`).join(";")};)->.searchArea;`;
	const areaDefs = `${areaParts.join("\n  ")}\n  ${joinAreas}`;

	// Only fetch OSM elements with contact:instagram or social:instagram
	const igTags = ["contact:instagram", "social:instagram"];
	const shopQueries = types
		.flatMap((typeLabel) => {
			const shopType = SHOP_TYPES.find((t) => t.label === typeLabel);
			if (!shopType) return [];
			const [k, v] = shopType.tag.split("=");
			return igTags.flatMap((tg) => [
				`node["${k}"="${v}"]["${tg}"](area.searchArea);`,
				`way ["${k}"="${v}"]["${tg}"](area.searchArea);`,
				`relation["${k}"="${v}"]["${tg}"](area.searchArea);`,
			]);
		})
		.join("\n  ");

	const query = `[out:json];\n${areaDefs}\n(${shopQueries});\nout body;>;out skel qt;`;

	try {
		const { data } = await axios.post(
			"https://overpass-api.de/api/interpreter",
			query,
			{ headers: { "Content-Type": "application/x-www-form-urlencoded" } },
		);
		if (!data?.elements) return [];
		const results: Shop[] = [];
		for (const e of data.elements) {
			if (!e.tags) continue;
			let typeLbl: string | undefined;
			for (const { tag, label } of SHOP_TYPES) {
				const [k, v] = tag.split("=");
				if (e.tags[k] === v) {
					typeLbl = label;
					break;
				}
			}
			if (!typeLbl) continue;
			let igHandle = e.tags["contact:instagram"] || e.tags["social:instagram"];
			if (igHandle) {
				// Si c’est une URL, on extrait le handle
				if (igHandle.startsWith("http")) {
					igHandle = extractInstagramHandle(igHandle) || igHandle;
				}
			}
			const city = e.tags["addr:city"] || e.tags["addr:postcode"] || "";
			if (igHandle) {
				results.push({
					handle: igHandle as string,
					ville: city,
					type: typeLbl as string,
					website: null,
				});
			}
		}
		return results;
	} catch (err) {
		if (err instanceof Error) {
			console.error("Overpass fail", err.message);
		} else {
			console.error("Overpass fail", err);
		}
		return [];
	}
}
