/**
 * Leadster - Airtable Upload Script
 *
 * This script uploads shop data from results files to Airtable.
 * It can either upload the most recent results file or a specific file.
 * It uses the Airtable helper functions from utils/airtableHelpers.js.
 */

import * as dotenv from "dotenv";
import fs from "node:fs";
import path, { dirname } from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { insertLeads } from "../utils/postgresHelpers.js";

// Load environment variables from .env file
dotenv.config();

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===== HELPER FUNCTIONS =====

/**
 * Ensure the results directory exists
 * @returns {string} - Path to the results directory
 */
function ensureResultsDirectoryExists() {
	const resultsDir = path.join(__dirname, "../results");
	if (!fs.existsSync(resultsDir)) {
		fs.mkdirSync(resultsDir, { recursive: true });
	}
	return resultsDir;
}

/**
 * Find the most recent results file in the results directory
 * @returns {string|null} - Path to the most recent results file or null if none exists
 */
function findMostRecentResultsFile() {
	try {
		const resultsDir = ensureResultsDirectoryExists();
		const files = fs
			.readdirSync(resultsDir)
			.filter((file) => file.endsWith(".json"));

		if (files.length === 0) {
			return null;
		}

		// Sort files by creation date (newest first)
		files.sort((a, b) => {
			const aTime = fs.statSync(path.join(resultsDir, a)).mtime.getTime();
			const bTime = fs.statSync(path.join(resultsDir, b)).mtime.getTime();
			return bTime - aTime;
		});

		return path.join(resultsDir, files[0]);
	} catch (error) {
		if (error instanceof Error) {
  console.error("Error finding most recent results file:", error.message);
} else {
  console.error("Error finding most recent results file:", error);
}
		return null;
	}
}

/**
 * Load data from a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Array} - Array of objects from the JSON file or empty array if file doesn't exist
 */
function loadDataFromFile(filePath: string): any[] {
	try {
		if (!filePath || !fs.existsSync(filePath)) {
			return [];
		}

		const data = fs.readFileSync(filePath, "utf8");
		return JSON.parse(data);
	} catch (error) {
		if (error instanceof Error) {
  console.error(`Error loading data from ${filePath}:`, error.message);
} else {
  console.error(`Error loading data from ${filePath}:`, error);
}
		return [];
	}
}

/**
 * List all results files in the results directory
 * @returns {Array} - Array of file names
 */
function listResultsFiles() {
	try {
		const resultsDir = ensureResultsDirectoryExists();
		const files = fs
			.readdirSync(resultsDir)
			.filter((file) => file.endsWith(".json"));

		return files.sort((a, b) => {
			const aTime = fs.statSync(path.join(resultsDir, a)).mtime.getTime();
			const bTime = fs.statSync(path.join(resultsDir, b)).mtime.getTime();
			return bTime - aTime; // Sort by newest first
		});
	} catch (error) {
		if (error instanceof Error) {
  console.error("Error listing results files:", error.message);
} else {
  console.error("Error listing results files:", error);
}
		return [];
	}
}

/**
 * Create a readline interface for user input
 * @returns {readline.Interface} - Readline interface
 */
function createReadlineInterface() {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
}

/**
 * Ask a question and get user input
 * @param {readline.Interface} rl - Readline interface
 * @param {string} question - Question to ask
 * @returns {Promise<string>} - User's answer
 */
function askQuestion(rl: import('readline').Interface, question: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(question, (answer: string) => {
			resolve(answer);
		});
	});
}

// ===== MAIN EXECUTION =====

async function main() {
	try {
		// const rl = createReadlineInterface();

		console.log("Leadster - Export vers la db");
		console.log("--------------------------------");

		// Utiliser toujours le fichier le plus récent
		const filePath = findMostRecentResultsFile();
		if (!filePath) {
			console.error(
				"No results files found. Please run the main script first to generate results.",
			);
			return;
		}
		console.log(`Using most recent file: ${path.basename(filePath)}`);

		// Load data from the selected file
		const data = loadDataFromFile(filePath);

		if (data.length === 0) {
			console.error(
				`No data found in ${path.basename(filePath)}. The file may be empty or invalid.`,
			);
			return;
		}

		console.log(`Loaded ${data.length} shops from ${path.basename(filePath)}.`);

		// Adapter les champs au snake_case pour la table Leads
		const mapped = data.map((shop: any) => ({
			nom: shop.Nom,
			site_web: shop.URL_Site,
			ville: shop.Ville,
			type_de_commerce: shop.Type_Commerce,
			statut: "Non contacté",
			dernier_contact: null,
			email: shop.Email || null,
			notes: null,
		}));
		await insertLeads(mapped);
	} catch (error) {
		if (error instanceof Error) {
  console.error("An error occurred:", error.message);
} else {
  console.error("An error occurred:", error);
}
	}
}

// Run the main function
main();
