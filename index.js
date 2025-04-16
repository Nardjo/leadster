/**
 * Leadster - Script to find shops in France with Instagram presence
 * 
 * This script:
 * 1. Queries Overpass API to find shops in a specified region of France
 * 2. Extracts website URLs, city, and shop type for shops that have a website
 * 3. Scrapes each website to find Instagram links
 * 4. Saves only shops with Instagram presence to a JSON file with a timestamp
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===== CONFIGURATION =====

// Geographic area to search (can be modified)
const SEARCH_AREA = "Paris";

// Delay between website scraping requests (in milliseconds)
const SCRAPING_DELAY = 1000;

// Shop types to search for with their French labels
const SHOP_TYPES = [
  { tag: "shop=clothes", label: "Vêtements" },
  { tag: "shop=bags", label: "Maroquinerie" },
  { tag: "shop=shoes", label: "Chaussures" },
  { tag: "shop=jewelry", label: "Bijoux" },
  { tag: "craft=jeweller", label: "Bijoux" },
  { tag: "shop=delicatessen", label: "Épicerie Fine" },
  { tag: "shop=books", label: "Librairie" }
];

// ===== HELPER FUNCTIONS =====

/**
 * Sleep function to add delay between requests
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after the specified time
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a timestamp-based filename in the format YYYY-MM-DD_HH-mm.json
 * @returns {string} - Formatted filename
 */
function generateTimestampFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}.json`;
}

/**
 * Ensure the results directory exists
 */
function ensureResultsDirectoryExists() {
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  return resultsDir;
}

/**
 * Extract Instagram handle from a URL
 * @param {string} url - Instagram URL
 * @returns {string|null} - Instagram handle or null if not found
 */
function extractInstagramHandle(url) {
  try {
    // Remove trailing slash if present
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    // Extract username from different possible Instagram URL formats
    const patterns = [
      /instagram\.com\/([^\/\?]+)/,
      /instagram\.com\/p\/[^\/]+\/([^\/\?]+)/,
      /instagram\.com\/explore\/tags\/([^\/\?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Exclude common non-username paths
        const excludedPaths = ['p', 'explore', 'about', 'legal', 'reel'];
        if (!excludedPaths.includes(match[1])) {
          return match[1];
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error extracting Instagram handle from ${url}:`, error.message);
    return null;
  }
}

// ===== MAIN FUNCTIONS =====

/**
 * Query Overpass API to find shops in the specified area
 * @returns {Promise<Array>} - Array of shops with website, city, and type
 */
async function queryOverpassAPI() {
  try {
    console.log(`Searching for shops in ${SEARCH_AREA}...`);

    // Build the Overpass query for each shop type
    const shopQueries = SHOP_TYPES.map(({ tag }) => {
      const [key, value] = tag.split('=');
      return `node["${key}"="${value}"]["website"]["addr:city"](area.searchArea);
way["${key}"="${value}"]["website"]["addr:city"](area.searchArea);
relation["${key}"="${value}"]["website"]["addr:city"](area.searchArea);`;
    }).join('\n');

    const query = `
      [out:json];
      area["name"="${SEARCH_AREA}"]["admin_level"~"[2-8]"]->.searchArea;
      (
        ${shopQueries}
      );
      out body;
      >;
      out skel qt;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.data || !response.data.elements) {
      console.error('Invalid response from Overpass API');
      return [];
    }

    // Process and filter the results
    const shops = [];

    for (const element of response.data.elements) {
      // Skip elements without tags or website
      if (!element.tags || !element.tags.website) continue;

      // Find the shop type
      let shopType = null;
      for (const { tag, label } of SHOP_TYPES) {
        const [key, value] = tag.split('=');
        if (element.tags[key] === value) {
          shopType = label;
          break;
        }
      }

      // Skip if shop type not found or no city
      if (!shopType || !element.tags['addr:city']) continue;

      // Normalize website URL
      let website = element.tags.website;
      if (!website.startsWith('http://') && !website.startsWith('https://')) {
        website = 'https://' + website;
      }

      shops.push({
        website: website,
        city: element.tags['addr:city'],
        type: shopType
      });
    }

    console.log(`Found ${shops.length} shops with websites.`);
    return shops;
  } catch (error) {
    console.error('Error querying Overpass API:', error.message);
    return [];
  }
}

/**
 * Scrape a website to find Instagram links
 * @param {Object} shop - Shop object with website, city, and type
 * @returns {Object|null} - Shop object with Instagram handle or null if not found
 */
async function scrapeWebsiteForInstagram(shop) {
  try {
    console.log(`Scraping website: ${shop.website}`);

    const response = await axios.get(shop.website, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    let instagramHandle = null;

    // Find all links on the page
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      // Check if the link is an Instagram link
      if (href.includes('instagram.com')) {
        const handle = extractInstagramHandle(href);
        if (handle) {
          instagramHandle = handle;
          return false; // Break the loop
        }
      }
    });

    if (instagramHandle) {
      return {
        Nom: instagramHandle,
        URL_Site: shop.website,
        Ville: shop.city,
        Type_Commerce: shop.type
      };
    }

    return null;
  } catch (error) {
    console.error(`Error scraping ${shop.website}:`, error.message);
    return null;
  }
}

/**
 * Save results to a JSON file
 * @param {Array} results - Array of shop objects with Instagram handles
 */
function saveResultsToFile(results) {
  try {
    const resultsDir = ensureResultsDirectoryExists();
    const filename = generateTimestampFilename();
    const filePath = path.join(resultsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');

    console.log(`Results saved to ./results/${filename}`);
  } catch (error) {
    console.error('Error saving results to file:', error.message);
  }
}

// ===== MAIN EXECUTION =====

async function main() {
  try {
    // Step 1: Query Overpass API
    const shops = await queryOverpassAPI();

    if (shops.length === 0) {
      console.log('No shops found. Exiting.');
      return;
    }

    // Step 2: Scrape websites for Instagram links
    const results = [];

    for (const shop of shops) {
      const result = await scrapeWebsiteForInstagram(shop);

      if (result) {
        results.push(result);
        console.log(`Found Instagram: ${result.Nom} for ${shop.website}`);
      }

      // Add delay between requests
      await sleep(SCRAPING_DELAY);
    }

    console.log(`Found ${results.length} shops with Instagram presence.`);

    // Step 3: Save results to file
    if (results.length > 0) {
      saveResultsToFile(results);
    } else {
      console.log('No shops with Instagram presence found. No file created.');
    }

  } catch (error) {
    console.error('Error in main execution:', error.message);
  }
}

// Run the script
main();
