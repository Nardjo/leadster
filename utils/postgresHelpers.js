import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

// Neon connection string (should be in .env)
const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
	throw new Error("POSTGRES_URL is not defined in .env");
}

const pool = new Pool({
	connectionString: POSTGRES_URL,
	ssl: { rejectUnauthorized: false },
});

/**
 * Insert new leads into the public.Leads table (append only, no upsert)
 * @param {Array} data - Array of lead objects (fields: nom, site_web, ville, type_de_commerce, etc.)
 * @returns {Promise<number>} - Number of rows inserted
 */
/**
 * Récupère tous les leads existants depuis la table public.Leads
 * @returns {Promise<Array>} - Tableau de leads existants
 */
export async function fetchExistingLeads() {
	const client = await pool.connect();
	try {
		const res = await client.query(
			`SELECT nom, site_web, ville, type_de_commerce FROM public."Leads"`,
		);
		return res.rows;
	} finally {
		client.release();
	}
}

export async function insertLeads(data) {
	if (!Array.isArray(data) || data.length === 0) return 0;

	// Only keep expected columns
	const columns = [
		"nom",
		"site_web",
		"ville",
		"type_de_commerce",
		"statut",
		"dernier_contact",
		"email",
		"notes",
	];

	// Prepare rows to insert (ignore missing columns)
	const rows = data.map((item) => columns.map((col) => item[col] ?? null));

	const valuesClause = rows
		.map(
			(row, i) =>
				`(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(", ")})`,
		)
		.join(", ");

	const flatValues = rows.flat();

	const query = `INSERT INTO public."Leads" (${columns.join(", ")}) VALUES ${valuesClause}`;

	const client = await pool.connect();
	try {
		const res = await client.query(query, flatValues);
		return res.rowCount || data.length;
	} finally {
		client.release();
	}
}

// Optionally: add a function to close the pool (for tests or scripts)
export function closePool() {
	return pool.end();
}
