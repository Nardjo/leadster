/**
 * Leadster - Script to manage archived items
 *
 * This script fetches all items with "Statut" = "Archivé" from Airtable
 * and saves them to a local JSON file for reference by the search script.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { fetchRecordsByStatus } from '../utils/airtableHelpers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const DATA_DIR = path.join(__dirname, '../data');
const ARCHIVED_ITEMS_FILE = path.join(DATA_DIR, 'archived_items.json');
const STATUS_FIELD_NAME = 'Statut';
const STATUS_VALUE = 'Archivé';

/**
 * Ensure the data directory exists
 * @returns {string} - Path to the data directory
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }
  return DATA_DIR;
}

/**
 * Read existing archived items from JSON file
 * @returns {Array} - Array of existing archived items or empty array if file doesn't exist
 */
function readExistingArchivedItems() {
  try {
    if (fs.existsSync(ARCHIVED_ITEMS_FILE)) {
      const fileContent = fs.readFileSync(ARCHIVED_ITEMS_FILE, 'utf8');
      if (!fileContent || fileContent.trim() === '') {
        console.log('Existing archived items file is empty.');
        return [];
      }
      const existingItems = JSON.parse(fileContent);
      console.log(`Read ${existingItems.length} existing archived items from ${ARCHIVED_ITEMS_FILE}`);
      return existingItems;
    } else {
      console.log('No existing archived items file found.');
      return [];
    }
  } catch (error) {
    console.error(`Error reading existing archived items: ${error.message}`);
    console.log('Starting with an empty list of archived items.');
    return [];
  }
}

/**
 * Merge existing and new archived items, avoiding duplicates based on id
 * @param {Array} existingItems - Array of existing archived items
 * @param {Array} newItems - Array of new archived items from Airtable
 * @returns {Array} - Merged array of archived items without duplicates
 */
function mergeArchivedItems(existingItems, newItems) {
  // Create a map of existing items by id for quick lookup
  const existingItemsMap = new Map();
  existingItems.forEach(item => {
    if (item.id) {
      existingItemsMap.set(item.id, item);
    }
  });

  // Add new items that don't already exist
  let addedCount = 0;
  newItems.forEach(newItem => {
    if (newItem.id && !existingItemsMap.has(newItem.id)) {
      existingItemsMap.set(newItem.id, newItem);
      addedCount++;
    }
  });

  console.log(`Added ${addedCount} new archived items to the existing list.`);

  // Convert map back to array
  return Array.from(existingItemsMap.values());
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting archived items management...');

    // Ensure the data directory exists
    ensureDataDir();

    // Read existing archived items
    const existingArchivedItems = readExistingArchivedItems();

    // Fetch archived items from Airtable
    const newArchivedItems = await fetchRecordsByStatus(STATUS_FIELD_NAME, STATUS_VALUE);

    if (newArchivedItems.length === 0) {
      console.log('No archived items found in Airtable.');
    } else {
      console.log(`Found ${newArchivedItems.length} archived items in Airtable.`);
    }

    // Merge existing and new archived items
    const mergedArchivedItems = mergeArchivedItems(existingArchivedItems, newArchivedItems);

    // Save merged archived items to JSON file
    fs.writeFileSync(ARCHIVED_ITEMS_FILE, JSON.stringify(mergedArchivedItems, null, 2));
    console.log(`Saved ${mergedArchivedItems.length} archived items to ${ARCHIVED_ITEMS_FILE}`);

    console.log('Archived items management completed successfully.');
  } catch (error) {
    console.error('Error managing archived items:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
