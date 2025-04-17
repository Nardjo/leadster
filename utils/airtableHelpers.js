/**
 * Leadster - Airtable Helper Functions
 * 
 * This file contains helper functions for interacting with Airtable.
 * It provides functions to fetch records, check for duplicates, and upload data.
 */

import Airtable from 'airtable';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// ===== CONFIGURATION =====

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'YOUR_AIRTABLE_API_KEY';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'YOUR_AIRTABLE_BASE_ID';
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Shops';

// Optional Airtable configuration
const AIRTABLE_ENDPOINT_URL = process.env.AIRTABLE_ENDPOINT_URL; // Default: undefined (uses Airtable's default endpoint)
const AIRTABLE_REQUEST_TIMEOUT = process.env.AIRTABLE_REQUEST_TIMEOUT ? parseInt(process.env.AIRTABLE_REQUEST_TIMEOUT) : 300000; // Default: 5 minutes

/**
 * Upload data to Airtable
 * @param {Array} data - Array of shop objects to upload
 * @returns {Promise<number>} - Number of records created
 */
export async function uploadToAirtable(data) {
  try {
    // Configure Airtable
    const config = {
      apiKey: AIRTABLE_API_KEY
    };

    // Add optional configuration parameters if they exist
    if (AIRTABLE_ENDPOINT_URL) {
      config.endpointUrl = AIRTABLE_ENDPOINT_URL;
    }

    if (AIRTABLE_REQUEST_TIMEOUT) {
      config.requestTimeout = AIRTABLE_REQUEST_TIMEOUT;
    }

    Airtable.configure(config);

    const base = Airtable.base(AIRTABLE_BASE_ID);
    const table = base(AIRTABLE_TABLE_NAME);

    console.log(`Uploading ${data.length} records to Airtable...`);

    // Prepare records for batch creation
    const records = data.map(shop => ({
      fields: {
        'Nom': shop.Nom,
        'Site web': shop.URL_Site,
        'Ville': shop.Ville,
        'Type de Commerce': shop.Type_Commerce,
        'Dernier contact': null,
        'Statut': 'Non contacter',
      }
    }));

    // Upload in batches of 10 (Airtable's limit)
    let createdCount = 0;
    const batchSize = 10;

    for (let i = 0; i < records.length; i += batchSize) {
      try {
        const batch = records.slice(i, i + batchSize);
        const createdRecords = await table.create(batch);

        createdCount += createdRecords.length;
        console.log(`Uploaded ${createdCount}/${records.length} records...`);

        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < records.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (batchError) {
        console.error(`Error uploading batch ${i/batchSize + 1}:`, batchError.message);

        // Try to continue with the next batch instead of failing completely
        console.log('Continuing with next batch...');
      }
    }

    console.log(`Successfully uploaded ${createdCount} records to Airtable!`);
    return createdCount;
  } catch (error) {
    console.error('Error uploading to Airtable:', error.message);

    // Handle different types of errors
    if (error.statusCode === 401 || error.error === 'AUTHENTICATION_REQUIRED') {
      console.error('Authentication error: Please check your Airtable API key');
    } else if (error.statusCode === 404 || error.error === 'NOT_FOUND') {
      console.error('Not found error: Please check your Airtable Base ID and Table name');
    } else if (error.statusCode === 413 || error.error === 'REQUEST_TOO_LARGE') {
      console.error('Request too large: Try reducing the batch size');
    } else if (error.statusCode === 429 || error.error === 'TOO_MANY_REQUESTS') {
      console.error('Rate limit exceeded: Try again later or reduce the frequency of requests');
    } else if (error.statusCode >= 500) {
      console.error('Airtable server error: Please try again later');
    }

    // Log additional error details if available
    if (error.response && error.response.data) {
      console.error('Airtable error details:', error.response.data);
    }

    return 0;
  }
}

/**
 * Fetch all records from Airtable
 * @returns {Promise<Array>} - Array of Airtable records
 */
export async function fetchAirtableRecords() {
  try {
    // Configure Airtable
    const config = {
      apiKey: AIRTABLE_API_KEY
    };

    // Add optional configuration parameters if they exist
    if (AIRTABLE_ENDPOINT_URL) {
      config.endpointUrl = AIRTABLE_ENDPOINT_URL;
    }

    if (AIRTABLE_REQUEST_TIMEOUT) {
      config.requestTimeout = AIRTABLE_REQUEST_TIMEOUT;
    }

    Airtable.configure(config);

    const base = Airtable.base(AIRTABLE_BASE_ID);
    const table = base(AIRTABLE_TABLE_NAME);

    console.log('Fetching records from Airtable...');

    // Fetch all records from Airtable
    const records = await table.select().all();

    console.log(`Fetched ${records.length} records from Airtable.`);

    // Convert to a simpler format
    return records.map(record => ({
      id: record.id,
      Nom: record.get('Nom'),
      URL_Site: record.get('Site web'),
      Ville: record.get('Ville'),
      Type_Commerce: record.get('Type de Commerce')
    }));
  } catch (error) {
    console.error('Error fetching records from Airtable:', error.message);

    // Handle different types of errors
    if (error.statusCode === 401 || error.error === 'AUTHENTICATION_REQUIRED') {
      console.error('Authentication error: Please check your Airtable API key');
    } else if (error.statusCode === 404 || error.error === 'NOT_FOUND') {
      console.error('Not found error: Please check your Airtable Base ID and Table name');
    } else if (error.statusCode === 429 || error.error === 'TOO_MANY_REQUESTS') {
      console.error('Rate limit exceeded: Try again later or reduce the frequency of requests');
    } else if (error.statusCode >= 500) {
      console.error('Airtable server error: Please try again later');
    }

    return [];
  }
}

/**
 * Normalize URL for comparison
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return '';

  // Convert to lowercase
  let normalized = url.toLowerCase();

  // Remove protocol (http://, https://)
  normalized = normalized.replace(/^https?:\/\//, '');

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');

  return normalized;
}

/**
 * Check if a shop already exists in Airtable
 * @param {Object} shop - Shop object with Instagram handle, URL, and type
 * @param {Array} airtableRecords - Array of Airtable records
 * @returns {boolean} - True if shop already exists in Airtable, false otherwise
 */
export function isShopInAirtable(shop, airtableRecords) {
  if (!airtableRecords || airtableRecords.length === 0) {
    return false;
  }

  // Normalize the shop URL
  const normalizedShopUrl = normalizeUrl(shop.URL_Site);

  return airtableRecords.some(record => {
    // Check if Instagram handle matches (if both have Nom property)
    if (shop.Nom && record.Nom && record.Nom === shop.Nom) {
      return true;
    }

    // If URLs are different, they're not the same shop
    const normalizedRecordUrl = normalizeUrl(record.URL_Site);
    if (normalizedRecordUrl !== normalizedShopUrl) {
      return false;
    }

    // If URLs match but types are different, they're not the same shop
    if (record.Type_Commerce !== shop.Type_Commerce) {
      return false;
    }

    // If we get here, both URL and type match
    return true;
  });
}
