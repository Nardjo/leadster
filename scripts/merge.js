/**
 * Leadster - Merge Script
 * 
 * This script merges all files from the same date in the results directory,
 * creating two merged files: one for shops with email and one for shops without email.
 * 
 * Usage:
 *   node scripts/merge.js <date>
 * 
 * Example:
 *   node scripts/merge.js 2023-05-15
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';

/**
 * Merge all files from the same date into two files: one with email and one without
 * @param {string} date - Date in format YYYY-MM-DD to merge files for
 * @returns {Object} - Object containing paths to merged files
 */
export function mergeFilesByDate(date) {
    try {
        const dir = './results';
        if (!existsSync(dir)) {
            console.log('Results directory does not exist. Nothing to merge.');
            return { withEmail: null, withoutEmail: null };
        }

        console.log(`Merging files for date ${date}...`);

        // Get all files for the specified date
        // Files may have format like "2023-05-15_12-34-56_chunk1_with_email.csv"
        // or "2023-05-15_with_email.csv", so we check if the file contains the date
        // We need to handle potential date mismatches due to system clock issues
        const allFiles = readdirSync(dir).filter(file => {
            // Check if file ends with .csv
            if (!file.endsWith('.csv')) return false;

            // Extract the date part from the filename (first 10 characters if it matches YYYY-MM-DD format)
            const fileDate = file.substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(fileDate)) {
                // If we're looking for files from today, include all files from today
                const today = new Date().toISOString().split('T')[0];
                if (date === today) {
                    return true;
                }
                // Otherwise, match the specific date
                return fileDate === date;
            }

            // Fallback to the original check
            return file.includes(date);
        });

        if (allFiles.length === 0) {
            console.log(`No files found for date ${date}.`);
            return { withEmail: null, withoutEmail: null };
        }

        console.log(`Found ${allFiles.length} files for date ${date}.`);

        // Separate files with and without email
        const withEmailFiles = allFiles.filter(file => file.includes('with_email'));
        const withoutEmailFiles = allFiles.filter(file => file.includes('without_email'));

        console.log(`Found ${withEmailFiles.length} files with email and ${withoutEmailFiles.length} files without email.`);

        // Merge files with email
        const allWithEmail = [];
        const seenWithEmail = new Set();

        for (const file of withEmailFiles) {
            try {
                const filePath = join(dir, file);
                const data = readFileSync(filePath, 'utf8');
                const result = Papa.parse(data, {
                    header: true,
                    skipEmptyLines: true
                });

                if (result.data && result.data.length > 0) {
                    // Add unique shops to the merged data
                    for (const shop of result.data) {
                        if (shop.name && shop.website) {
                            const key = `${shop.name}|${shop.website}`.toLowerCase();
                            if (!seenWithEmail.has(key)) {
                                seenWithEmail.add(key);
                                allWithEmail.push(shop);
                            }
                        } else {
                            // If shop doesn't have name or website, add it anyway
                            allWithEmail.push(shop);
                        }
                    }
                    console.log(`Added ${result.data.length} shops from ${file}`);
                }
            } catch (fileError) {
                console.error(`Error loading data from ${file}:`, fileError.message);
                // Continue with next file
            }
        }

        // Merge files without email
        const allWithoutEmail = [];
        const seenWithoutEmail = new Set();

        for (const file of withoutEmailFiles) {
            try {
                const filePath = join(dir, file);
                const data = readFileSync(filePath, 'utf8');
                const result = Papa.parse(data, {
                    header: true,
                    skipEmptyLines: true
                });

                if (result.data && result.data.length > 0) {
                    // Add unique shops to the merged data
                    for (const shop of result.data) {
                        if (shop.name && shop.website) {
                            const key = `${shop.name}|${shop.website}`.toLowerCase();
                            if (!seenWithoutEmail.has(key)) {
                                seenWithoutEmail.add(key);
                                allWithoutEmail.push(shop);
                            }
                        } else {
                            // If shop doesn't have name or website, add it anyway
                            allWithoutEmail.push(shop);
                        }
                    }
                    console.log(`Added ${result.data.length} shops from ${file}`);
                }
            } catch (fileError) {
                console.error(`Error loading data from ${file}:`, fileError.message);
                // Continue with next file
            }
        }

        // Save merged files
        const withEmailPath = join(dir, `${date}_merged_with_email.csv`);
        const withoutEmailPath = join(dir, `${date}_merged_without_email.csv`);

        writeFileSync(withEmailPath, Papa.unparse(allWithEmail));
        writeFileSync(withoutEmailPath, Papa.unparse(allWithoutEmail));

        console.log(`Merged ${allWithEmail.length} shops with email into ${withEmailPath}`);
        console.log(`Merged ${allWithoutEmail.length} shops without email into ${withoutEmailPath}`);

        return { 
            withEmail: withEmailPath, 
            withoutEmail: withoutEmailPath 
        };
    } catch (error) {
        console.error('Error merging files by date:', error.message);
        return { withEmail: null, withoutEmail: null };
    }
}

// Main function
function main() {
    // Get date from command line arguments
    const date = process.argv[2];

    // Validate date format
    if (!date) {
        console.error('Error: No date provided.');
        console.log('Usage: node scripts/merge.js <date>');
        console.log('Example: node scripts/merge.js 2023-05-15');
        process.exit(1);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('Error: Invalid date format. Please use YYYY-MM-DD format.');
        console.log('Example: node scripts/merge.js 2023-05-15');
        process.exit(1);
    }

    // Merge files for the specified date
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
}

// Run the main function only if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
