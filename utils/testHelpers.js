/**
 * Test helpers for Leadster
 * 
 * This file extracts and exports functions from search.js and airtable.js
 * to make them testable with Vitest.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract Instagram handle from a URL
 * @param {string} url - Instagram URL
 * @returns {string|null} - Instagram handle or null if not found
 */
export function extractInstagramHandle(url) {
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

/**
 * Generate a timestamp-based filename in the format YYYY-MM-DD_HH-mm.json
 * @returns {string} - Formatted filename
 */
export function generateTimestampFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}.json`;
}

/**
 * Check if a shop already exists in previous results
 * @param {Object} shop - Shop object with Instagram handle
 * @param {Array} previousResults - Array of previous shop objects
 * @returns {boolean} - True if shop already exists, false otherwise
 */
export function isShopDuplicate(shop, previousResults) {
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
export function isWebsiteAlreadyProcessed(shop, previousResults) {
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
export function filterDuplicates(newResults, previousResults) {
  if (!previousResults.length) {
    return newResults;
  }

  return newResults.filter(shop => !isShopDuplicate(shop, previousResults));
}

/**
 * Ensure the results directory exists
 * @returns {string} - Path to the results directory
 */
export function ensureResultsDirectoryExists() {
  const resultsDir = path.join(dirname(__dirname), 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  return resultsDir;
}

/**
 * Find the most recent results file in the results directory
 * @returns {string|null} - Path to the most recent results file or null if none exists
 */
export function findMostRecentResultsFile() {
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
export function loadDataFromFile(filePath) {
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