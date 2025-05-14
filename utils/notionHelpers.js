/**
 * Leadster - Notion Helper Functions
 * 
 * This file contains helper functions for interacting with Notion.
 * It provides functions to upload data to a Notion database.
 */

import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// ===== CONFIGURATION =====

// Notion configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN || 'YOUR_NOTION_TOKEN';
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || 'YOUR_NOTION_DATABASE_ID';

/**
 * Upload data to Notion
 * @param {Array} data - Array of shop objects to upload
 * @returns {Promise<number>} - Number of records created
 */
export async function uploadToNotion(data) {
  try {
    // Initialize Notion client
    const notion = new Client({
      auth: NOTION_TOKEN,
    });

    console.log(`Uploading ${data.length} records to Notion...`);

    // Upload records one by one
    let createdCount = 0;

    for (let i = 0; i < data.length; i++) {
      try {
        const shop = data[i];

        // Create a new page in the database
        await notion.pages.create({
          parent: {
            database_id: NOTION_DATABASE_ID,
          },
          properties: {
            'Name': {
              title: [
                {
                  text: {
                    content: shop.name || shop.Nom || '',
                  },
                },
              ],
            },
            'Email': {
              email: shop.email || null,
            },
            'Instagram': {
              url: shop.instagram || null,
            },
            'Website': {
              url: shop.website || shop.URL_Site || null,
            },
            'City': {
              rich_text: [
                {
                  text: {
                    content: shop.city || shop.Ville || '',
                  },
                },
              ],
            },
            'Type': {
              rich_text: [
                {
                  text: {
                    content: shop.type || shop.Type_Commerce || '',
                  },
                },
              ],
            },
            'Last contact': {
              date: {
                start: new Date().toISOString().split('T')[0],
              },
            },
            'Day last contact': {
              rich_text: [
                {
                  text: {
                    content: '',
                  },
                },
              ],
            },
            'Status': {
              select: {
                name: 'Non contacter',
              },
            },
          },
        });

        createdCount++;

        if (createdCount % 10 === 0 || createdCount === data.length) {
          console.log(`Uploaded ${createdCount}/${data.length} records...`);
        }

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (recordError) {
        console.error(`Error uploading record ${i + 1}:`, recordError.message);

        // Try to continue with the next record instead of failing completely
        console.log('Continuing with next record...');
      }
    }

    console.log(`Successfully uploaded ${createdCount} records to Notion!`);
    return createdCount;
  } catch (error) {
    console.error('Error uploading to Notion:', error.message);

    // Handle different types of errors
    if (error.status === 401) {
      console.error('Authentication error: Please check your Notion token');
    } else if (error.status === 404) {
      console.error('Not found error: Please check your Notion Database ID');
    } else if (error.status === 429) {
      console.error('Rate limit exceeded: Try again later or reduce the frequency of requests');
    } else if (error.status >= 500) {
      console.error('Notion server error: Please try again later');
    }

    // Log additional error details if available
    if (error.body) {
      console.error('Notion error details:', error.body);
    }

    return 0;
  }
}
