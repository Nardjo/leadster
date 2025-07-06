import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function getDirs() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	return {
		resultsDir: path.join(__dirname, "../results"),
		archivedItemsFile: path.join(__dirname, "../data/archived_items.json"),
	};
}

export function ensureDir() {
	const { resultsDir } = getDirs();
	if (!fs.existsSync(resultsDir)) {
		fs.mkdirSync(resultsDir, { recursive: true });
	}
	return resultsDir;
}

export function latestFile() {
	const dir = ensureDir();
	const files = fs.readdirSync(dir).filter((e) => e.endsWith(".json"));
	if (!files.length) return null;
	files.sort((a, b) => {
		const mtimeA = fs.statSync(path.join(dir, a)).mtime.getTime();
		const mtimeB = fs.statSync(path.join(dir, b)).mtime.getTime();
		return mtimeB - mtimeA;
	});
	return path.join(dir, files[0]);
}

type ShopData = {
	Nom: string;
	URL_Site?: string;
	Ville: string;
	Type_Commerce: string;
	Email?: string;
	handle?: string;
	type?: string;
};

export function load(f: string): ShopData[] {
	if (!f || !fs.existsSync(f)) return [];
	return JSON.parse(fs.readFileSync(f, "utf8"));
}

export function timeFile() {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}.json`;
}
