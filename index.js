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
 * @returns {string} - Path to the results directory
 */
function ensureResultsDirectoryExists() {
  const resultsDir = path.join(__dirname, 'results');
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
    const files = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));

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
    console.error('Error finding most recent results file:', error.message);
    return null;
  }
}

/**
 * Load data from a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Array} - Array of objects from the JSON file or empty array if file doesn't exist
 */
function loadDataFromFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error.message);
    return [];
  }
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
 * Check if a shop already exists in previous results
 * @param {Object} shop - Shop object with Instagram handle
 * @param {Array} previousResults - Array of previous shop objects
 * @returns {boolean} - True if shop already exists, false otherwise
 */
function isShopDuplicate(shop, previousResults) {
  return previousResults.some(prevShop => 
    // Check if Instagram handle matches
    prevShop.Nom === shop.Nom ||
    // Or if URL and type match (same shop with different Instagram handle)
    (prevShop.URL_Site === shop.URL_Site && prevShop.Type_Commerce === shop.Type_Commerce)
  );
}

/**
 * Check if a shop's website is already in previous results
 * @param {Object} shop - Shop object with website, city, and type
 * @param {Array} previousResults - Array of previous shop objects
 * @returns {boolean} - True if shop's website is already in previous results, false otherwise
 */
function isWebsiteAlreadyProcessed(shop, previousResults) {
  return previousResults.some(prevShop => 
    prevShop.URL_Site === shop.website && prevShop.Type_Commerce === shop.type
  );
}

/**
 * Filter out duplicate shops from new results
 * @param {Array} newResults - Array of new shop objects
 * @param {Array} previousResults - Array of previous shop objects
 * @returns {Array} - Array of unique shop objects
 */
function filterDuplicates(newResults, previousResults) {
  if (!previousResults.length) {
    return newResults;
  }

  return newResults.filter(shop => !isShopDuplicate(shop, previousResults));
}

/**
 * Save results to a JSON file, avoiding duplicates from previous results
 * @param {Array} newResults - Array of new shop objects with Instagram handles
 */
function saveResultsToFile(newResults) {
  try {
    // Find most recent results file and load previous data
    const mostRecentFile = findMostRecentResultsFile();
    const previousResults = loadDataFromFile(mostRecentFile);

    // Filter out duplicates
    const uniqueResults = filterDuplicates(newResults, previousResults);

    // Combine previous and new unique results
    const combinedResults = [...previousResults, ...uniqueResults];

    // Save combined results to a new file
    const resultsDir = ensureResultsDirectoryExists();
    const filename = generateTimestampFilename();
    const filePath = path.join(resultsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(combinedResults, null, 2), 'utf8');

    console.log(`Found ${uniqueResults.length} new unique shops (filtered out ${newResults.length - uniqueResults.length} duplicates).`);
    console.log(`Total of ${combinedResults.length} shops saved to ./results/${filename}`);
  } catch (error) {
    console.error('Error saving results to file:', error.message);
  }
}

// ===== MAIN EXECUTION =====

async function main() {
  try {
    // Load previous results to avoid scraping already processed websites
    const mostRecentFile = findMostRecentResultsFile();
    const previousResults = loadDataFromFile(mostRecentFile);
    console.log(`Loaded ${previousResults.length} shops from previous results.`);

    // Step 1: Query Overpass API
    const shops = await queryOverpassAPI();

    if (shops.length === 0) {
      console.log('No shops found. Exiting.');
      return;
    }

    // Step 2: Scrape websites for Instagram links
    const results = [];
    let skippedCount = 0;

    for (const shop of shops) {
      // Check if this website is already in previous results
      if (isWebsiteAlreadyProcessed(shop, previousResults)) {
        // Find all previous results for this website
        const existingResults = previousResults.filter(prevShop => 
          prevShop.URL_Site === shop.website && prevShop.Type_Commerce === shop.type
        );

        // Add existing results to new results
        if (existingResults.length > 0) {
          results.push(...existingResults);
          console.log(`Skipping scraping for ${shop.website} (already processed)`);
          skippedCount++;
          continue; // Skip to next shop
        }
      }

      // If not already processed, scrape the website
      const result = await scrapeWebsiteForInstagram(shop);

      if (result) {
        results.push(result);
        console.log(`Found Instagram: ${result.Nom} for ${shop.website}`);
      }

      // Add delay between requests
      await sleep(SCRAPING_DELAY);
    }

    console.log(`Skipped scraping ${skippedCount} websites (already processed in previous runs).`);
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
