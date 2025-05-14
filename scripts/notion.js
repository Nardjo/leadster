/**
 * Leadster - Notion Upload Script
 * 
 * This script uploads shop data from results files to Notion.
 * It can either upload the most recent results file or a specific file.
 * It uses the Notion helper functions from utils/notionHelpers.js.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';
import * as dotenv from 'dotenv';
import Papa from 'papaparse';
import { uploadToNotion } from '../utils/notionHelpers.js';
import { mergeFilesByDate } from '../scripts/merge.js';

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
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  return resultsDir;
}

/**
 * Find the most recent results file in the results directory
 * @param {string} fileType - Type of file to find ('with_email' or 'without_email')
 * @returns {string|null} - Path to the most recent results file or null if none exists
 */
function findMostRecentResultsFile(fileType = 'with_email') {
  try {
    const resultsDir = ensureResultsDirectoryExists();
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.csv') && file.includes(fileType));

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
 * Load data from a file (CSV or JSON)
 * @param {string} filePath - Path to the file
 * @returns {Array} - Array of objects from the file or empty array if file doesn't exist
 */
function loadDataFromFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }

    const data = fs.readFileSync(filePath, 'utf8');

    if (filePath.endsWith('.csv')) {
      // Parse CSV data
      const result = Papa.parse(data, {
        header: true,
        skipEmptyLines: true
      });
      return result.data;
    } else if (filePath.endsWith('.json')) {
      // Parse JSON data
      return JSON.parse(data);
    } else {
      console.error(`Unsupported file format: ${filePath}`);
      return [];
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error.message);
    return [];
  }
}

/**
 * List all results files in the results directory
 * @param {string} fileType - Type of file to list ('with_email', 'without_email', or null for all)
 * @returns {Array} - Array of file names
 */
function listResultsFiles(fileType = null) {
  try {
    const resultsDir = ensureResultsDirectoryExists();
    let files = fs.readdirSync(resultsDir).filter(file => file.endsWith('.csv'));

    // Filter by file type if specified
    if (fileType) {
      files = files.filter(file => file.includes(fileType));
    }

    return files.sort((a, b) => {
      const aTime = fs.statSync(path.join(resultsDir, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(resultsDir, b)).mtime.getTime();
      return bTime - aTime; // Sort by newest first
    });
  } catch (error) {
    console.error('Error listing results files:', error.message);
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
    output: process.stdout
  });
}

/**
 * Ask a question and get user input
 * @param {readline.Interface} rl - Readline interface
 * @param {string} question - Question to ask
 * @returns {Promise<string>} - User's answer
 */
function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// ===== MAIN EXECUTION =====

async function main() {
  try {
    const rl = createReadlineInterface();

    console.log('Leadster - Notion Upload Script');
    console.log('--------------------------------');

    // Check if Notion token and database ID are set
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      console.error('Error: Please set your Notion token and database ID in the .env file.');
      rl.close();
      return;
    }

    // Ask user what action they want to perform
    const actionOption = await askQuestion(rl, 
      'What would you like to do?\n' +
      '1. Upload shops to Notion\n' +
      '2. Merge files from a specific date\n' +
      'Enter option (1 or 2): '
    );

    if (actionOption === '2') {
      // Option 2: Merge files from a specific date
      const date = await askQuestion(rl, 'Enter date to merge files (YYYY-MM-DD): ');

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('Invalid date format. Please use YYYY-MM-DD format.');
        rl.close();
        return;
      }

      console.log(`Merging files for date: ${date}`);
      const mergedFiles = mergeFilesByDate(date);

      if (mergedFiles.withEmail && mergedFiles.withoutEmail) {
        console.log(`\nSuccessfully merged files from date ${date}!`);
        console.log(`Files created:`);
        console.log(`- ${mergedFiles.withEmail}`);
        console.log(`- ${mergedFiles.withoutEmail}`);
      } else {
        console.log(`\nNo files were merged for date ${date}.`);
      }

      rl.close();
      return;
    }

    // If we're here, the user chose option 1: Upload shops to Notion
    // Ask user if they want to import shops with or without email
    const emailOption = await askQuestion(rl, 
      'Do you want to import shops with or without email?\n' +
      '1. With email\n' +
      '2. Without email\n' +
      'Enter option (1 or 2): '
    );

    let fileType;
    if (emailOption === '1') {
      fileType = 'with_email';
      console.log('You chose to import shops with email.');
    } else if (emailOption === '2') {
      fileType = 'without_email';
      console.log('You chose to import shops without email.');
    } else {
      console.error('Invalid option. Please run the script again and select option 1 or 2.');
      rl.close();
      return;
    }

    // Ask user which option they want to use
    const option = await askQuestion(rl, 
      '\nChoose an option:\n' +
      '1. Upload the most recent results file\n' +
      '2. Choose a specific results file\n' +
      'Enter option (1 or 2): '
    );

    let filePath;

    if (option === '1') {
      // Option 1: Use the most recent file
      filePath = findMostRecentResultsFile(fileType);
      if (!filePath) {
        console.error(`No ${fileType} results files found. Please run the find script first to generate results.`);
        rl.close();
        return;
      }
      console.log(`Using most recent file: ${path.basename(filePath)}`);
    } else if (option === '2') {
      // Option 2: Choose a specific file
      const files = listResultsFiles(fileType);

      if (files.length === 0) {
        console.error(`No ${fileType} results files found. Please run the find script first to generate results.`);
        rl.close();
        return;
      }

      console.log('\nAvailable results files:');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });

      const fileIndex = await askQuestion(rl, `\nEnter file number (1-${files.length}): `);
      const selectedIndex = parseInt(fileIndex) - 1;

      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= files.length) {
        console.error('Invalid selection. Please run the script again and select a valid file number.');
        rl.close();
        return;
      }

      filePath = path.join(ensureResultsDirectoryExists(), files[selectedIndex]);
      console.log(`Selected file: ${files[selectedIndex]}`);
    } else {
      console.error('Invalid option. Please run the script again and select option 1 or 2.');
      rl.close();
      return;
    }

    // Load data from the selected file
    const data = loadDataFromFile(filePath);

    if (data.length === 0) {
      console.error(`No data found in ${path.basename(filePath)}. The file may be empty or invalid.`);
      rl.close();
      return;
    }

    console.log(`Loaded ${data.length} shops from ${path.basename(filePath)}.`);

    // Confirm upload
    const confirm = await askQuestion(rl, `\nDo you want to upload ${data.length} shops to Notion? (y/n): `);

    if (confirm.toLowerCase() === 'y') {
      // Upload to Notion
      await uploadToNotion(data);
    } else {
      console.log('Upload cancelled.');
    }

    rl.close();
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

// Run the main function
main();
