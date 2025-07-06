import axios from "axios";
import * as cheerio from "cheerio";

export function extractInstagramHandle(url: string): string | null {
	let cleanUrl = url;
	if (cleanUrl.endsWith("/")) cleanUrl = cleanUrl.slice(0, -1);
	const m = cleanUrl.match(/instagram\.com\/([A-Za-z0-9_.-]+)/);
	return m && !["p", "explore", "about", "legal", "reel"].includes(m[1])
		? m[1]
		: null;
}

export async function scrapeWebsiteForInstagram({
	website,
	city,
	postcode,
	type,
}: { website: string; city?: string; postcode?: string; type?: string }): Promise<any> {
	try {
		const { data } = await axios.get(website, {
			timeout: 10_000,
			headers: { "User-Agent": "Mozilla/5.0" },
		});
		const $ = cheerio.load(data);
		let handle = null;
		$("a").each((_, el) => {
			const h = $(el).attr("href");
			if (h?.includes("instagram.com")) {
				handle = extractInstagramHandle(h);
				if (handle) return false;
			}
		});
		if (!handle) {
			const m = $.html().match(/instagram\.com\/[A-Za-z0-9_.-]+/);
			if (m) handle = extractInstagramHandle(m[0]);
		}
		if (handle)
			return {
				Nom: handle,
				URL_Site: website,
				Ville: city || postcode,
				Type_Commerce: type,
			};
	} catch (e) {
		if (e instanceof Error) {
		console.warn(`Scrape ${website} -> ${e.message}`);
	} else {
		console.warn(`Scrape ${website} ->`, e);
	}
	}
	return null;
}
