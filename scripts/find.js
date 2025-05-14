import {existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync} from 'fs';
import {join} from 'path';
import Papa from 'papaparse';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import emailExistence from 'email-existence';
import EXCLUDED_BRANDS from '../utils/brandsExcluded.js';
import {
    CONCURRENCY,
    RETRY_COUNT,
    RETRY_DELAY_MS,
    SCRAPING_DELAY,
    SEARCH_AREAS,
    SHOP_TYPES
} from '../utils/constants.js';
import { mergeFilesByDate } from './merge.js';

// Validation basique de format d'email
function isValidEmail(email) {
    if (!email) return false;
    const basicFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!basicFormatValid) return false;
    if (email.length < 5 || email.length > 254) return false;
    const parts = email.split('.');
    if (parts.length < 2 || parts[parts.length - 1].length < 2) return false;
    if (email.includes('..') || email.includes('@.') || email.includes('.@')) return false;
    const localPart = email.split('@')[0];
    if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) return false;
    return true;
}

// Extraction d'email brut depuis un texte
function extractEmail(text) {
    const matches = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
    return matches?.find(isValidEmail) || null;
}

// Vérification SMTP basique via email-existence
async function verifyEmailWithExistence(email) {
    return new Promise(resolve => {
        emailExistence.check(email, (err, exists) => {
            if (err) return resolve(false);
            resolve(exists);
        });
    });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
    console.log(`Fetching ${url} with timeout ${timeout}ms...`);

    // Create a promise that rejects after the specified timeout
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            console.log(`Request to ${url} timed out after ${timeout}ms`);
            reject(new Error(`Request to ${url} timed out after ${timeout}ms`));
        }, timeout);
    });

    // Race the fetch request against the timeout
    try {
        const response = await Promise.race([
            fetch(url, options),
            timeoutPromise
        ]);
        console.log(`Received response from ${url} with status ${response.status}`);
        return response;
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error.message);
        throw error;
    }
}

async function withRetry(fn, retries = RETRY_COUNT) {
    let lastErr;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            await sleep(RETRY_DELAY_MS);
        }
    }
    throw lastErr;
}

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://z.overpass-api.de/api/interpreter'
];

function getOverpassEndpoint(index = 0) {
    return OVERPASS_ENDPOINTS[index % OVERPASS_ENDPOINTS.length];
}

async function fetchShops(city) {
    const areaQuery = `area[name="${city}"][admin_level~"[2-9]"]->.a;`;
    const shopQueries = SHOP_TYPES.flatMap(({tag}) => {
        const [key, value] = tag.split('=');
        return [
            `node["${key}"="${value}"](area.a);`,
            `way["${key}"="${value}"](area.a);`,
            `relation["${key}"="${value}"](area.a);`
        ];
    });
    const query = `
        [out:json][timeout:50];
        ${areaQuery}
        (
          ${shopQueries.join('\n          ')}
        );
        out body tags;
    `;

    let lastError;
    for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
        try {
            const endpoint = getOverpassEndpoint(i);
            // Use the up function directly
            let elements = [];

            try {
                const response = await withRetry(() =>
                    fetchWithTimeout(endpoint, {
                        method: 'POST',
                        body: query,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                    }, 10000) // 10 seconds timeout
                );

                console.log('Response status:', response.status);

                try {
                    const jsonData = await response.json();
                    console.log('JSON data available:', !!jsonData);
                    elements = jsonData.elements || [];
                } catch (jsonError) {
                    console.error('Error getting JSON data:', jsonError.message);
                }

                console.log('Elements found:', elements.length);
            } catch (error) {
                console.error('Error with fetch:', error.message);
            }

            return elements.map(el => ({
                name: el.tags?.name,
                city,
                type: el.tags?.shop,
                website: el.tags?.website || el.tags?.url,
                instagram: el.tags?.contact_instagram,
                email: isValidEmail(el.tags?.email) ? el.tags.email : null
            })).filter(shop => shop.name);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('All Overpass endpoints failed');
}

async function scrapeWebsite(url) {
    if (!url || /^(tel|javascript):/i.test(url)) return {
        email: null,
        instagram: null
    };
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const fetchPage = async u => {
        try {
            const res = await withRetry(() => fetchWithTimeout(u, {headers: {'User-Agent': 'Mozilla/5.0'}}, 10000));
            return await res.text();
        } catch (error) {
            console.error(`Error fetching page ${u}:`, error.message);
            return '';
        }
    };

    try {
        const html = await fetchPage(url);
        if (!html) {
            console.log(`No HTML content returned for ${url}`);
            return { email: null, instagram: null };
        }

        const $ = cheerio.load(html);

        // 1) mailto:
        const mailto = $('a[href^="mailto:"]').map((i, el) =>
            $(el).attr('href').replace(/^mailto:/, '').split('?')[0]
        ).get().find(isValidEmail);
        if (mailto) return {
            email: mailto,
            instagram: $('a[href*="instagram.com"]').attr('href') || null
        };

        // 2) JSON-LD
        const ld = $('script[type="application/ld+json"]').map((i, el) => $(el).html()).get();
        for (const block of ld) {
            try {
                const obj = JSON.parse(block);
                const email = obj.email || (obj.contactPoint && obj.contactPoint.email);
                if (isValidEmail(email)) return {
                    email,
                    instagram: $('a[href*="instagram.com"]').attr('href') || null
                };
            } catch (jsonError) {
                // Silently continue if JSON parsing fails
            }
        }

        // 3) fallback regex + page Contact
        let email = extractEmail($('body').text());
        if (!email) {
            try {
                const link = $('a[href*="contact"]').first().attr('href');
                if (link && !/^(tel|javascript):/i.test(link)) {
                    try {
                        const contactUrl = new URL(link, url).href;
                        const contactHtml = await fetchPage(contactUrl);
                        if (contactHtml) {
                            email = extractEmail(cheerio.load(contactHtml)('body').text());
                        }
                    } catch (urlError) {
                        console.error(`Error constructing contact URL for ${url} with link ${link}:`, urlError.message);
                    }
                }
            } catch (linkError) {
                console.error(`Error processing contact link for ${url}:`, linkError.message);
            }
        }

        const instagram = $('a[href*="instagram.com"]').attr('href') || null;

        // Safely verify email
        let verifiedEmail = null;
        if (email) {
            try {
                const isValid = await verifyEmailWithExistence(email);
                verifiedEmail = isValid ? email : null;
            } catch (verifyError) {
                console.error(`Error verifying email ${email}:`, verifyError.message);
            }
        }

        return {
            email: verifiedEmail,
            instagram
        };
    } catch (error) {
        console.error(`Error scraping website ${url}:`, error.message);
        return {email: null, instagram: null};
    }
}

async function processBatch(shops, batchIndex) {
    const results = [];
    for (let i = 0; i < shops.length; i++) {
        try {
            const shop = shops[i];
            console.log(`Processing shop ${i + 1}/${shops.length} in batch ${batchIndex}: ${shop.name}`);

            if (shop.website) {
                try {
                    const {email, instagram} = await scrapeWebsite(shop.website);
                    if (email && !shop.email) shop.email = email;
                    if (instagram && !shop.instagram) shop.instagram = instagram;
                } catch (scrapeError) {
                    console.error(`Error scraping website for shop ${shop.name}:`, scrapeError.message);
                    // Continue with the shop without website data
                }
            }

            results.push(shop);
        } catch (shopError) {
            console.error(`Error processing shop at index ${i} in batch ${batchIndex}:`, shopError.message);
            // If we have shop data despite the error, still add it to results
            if (shops[i]) {
                results.push(shops[i]);
            }
        }

        try {
            await sleep(SCRAPING_DELAY);
        } catch (sleepError) {
            console.error(`Error during sleep:`, sleepError.message);
            // Continue without delay if sleep fails
        }
    }

    console.log(`Completed processing ${results.length}/${shops.length} shops in batch ${batchIndex}`);
    return results;
}


/**
 * Load all existing shops from previous result files
 * @returns {Array} - Array of objects containing all previously processed shops
 */
function loadExistingShops() {
    try {
        const dir = './results';
        if (!existsSync(dir)) {
            return [];
        }

        console.log('Loading existing shops from previous result files...');
        const files = readdirSync(dir).filter(file => file.endsWith('.csv'));

        if (files.length === 0) {
            console.log('No existing result files found.');
            return [];
        }

        console.log(`Found ${files.length} existing result files.`);

        // Load data from all CSV files
        const allExistingShops = [];
        for (const file of files) {
            try {
                const filePath = join(dir, file);
                const data = readFileSync(filePath, 'utf8');
                const result = Papa.parse(data, {
                    header: true,
                    skipEmptyLines: true
                });

                if (result.data && result.data.length > 0) {
                    console.log(`Loaded ${result.data.length} shops from ${file}`);
                    allExistingShops.push(...result.data);
                }
            } catch (fileError) {
                console.error(`Error loading data from ${file}:`, fileError.message);
                // Continue with next file
            }
        }

        // Remove duplicates based on name and website
        const uniqueShops = [];
        const seen = new Set();

        for (const shop of allExistingShops) {
            const key = `${shop.name}|${shop.website}`.toLowerCase();
            if (!seen.has(key) && shop.name && shop.website) {
                seen.add(key);
                uniqueShops.push(shop);
            }
        }

        console.log(`Loaded ${uniqueShops.length} unique shops from existing result files.`);
        return uniqueShops;
    } catch (error) {
        console.error('Error loading existing shops:', error.message);
        return [];
    }
}

async function main() {
    try {
        console.log('Starting shop search...');
        console.log('Using node-fetch for HTTP requests');
        const allShops = [];
        for (const city of SEARCH_AREAS) {
            try {
                console.log(`Fetching shops for ${city}...`);
                const shops = await fetchShops(city);
                console.log(`Found ${shops.length} shops in ${city}`);
                allShops.push(...shops);
            } catch (error) {
                console.error(`Error fetching shops for ${city}:`, error.message);
            }
            await sleep(SCRAPING_DELAY);
        }
        console.log(`Total shops found: ${allShops.length}`);

        let filtered = allShops.filter(s => s.website && !EXCLUDED_BRANDS.some(b => s.name.toLowerCase() === b.toLowerCase()));
        console.log(`Filtered shops with website and not excluded: ${filtered.length}`);

        // Load existing shops to avoid processing them again
        const existingShops = loadExistingShops();

        if (existingShops.length > 0) {
            // Create a set of unique identifiers for existing shops
            const existingShopKeys = new Set();
            for (const shop of existingShops) {
                if (shop.name && shop.website) {
                    const key = `${shop.name}|${shop.website}`.toLowerCase();
                    existingShopKeys.add(key);
                }
            }

            // Filter out shops that have already been processed
            const originalCount = filtered.length;
            filtered = filtered.filter(shop => {
                if (!shop.name || !shop.website) return true; // Keep shops without name or website
                const key = `${shop.name}|${shop.website}`.toLowerCase();
                return !existingShopKeys.has(key);
            });

            console.log(`Removed ${originalCount - filtered.length} shops that were already processed in previous runs.`);
        }

        // Process all shops in chunks to avoid memory issues
        const CHUNK_SIZE = 100; // Process 100 shops at a time
        const totalChunks = Math.ceil(filtered.length / CHUNK_SIZE);
        console.log(`Processing all ${filtered.length} shops in ${totalChunks} chunks of ${CHUNK_SIZE}...`);

        // Create directory for results
        const dir = './results';
        if (!existsSync(dir)) mkdirSync(dir, {recursive: true});

        // Generate timestamp for filenames
        const now = new Date();
        const dt = now.toISOString().split('T')[0] + '_' + now.toTimeString().split(' ')[0].replace(/:/g, '-');

        // Arrays to store all processed shops
        let allProcessed = [];
        let allWithEmail = [];
        let allWithoutEmail = [];

        try {
            // Process shops in chunks
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, filtered.length);
                const currentChunk = filtered.slice(start, end);

                console.log(`\n--- Processing chunk ${chunkIndex + 1}/${totalChunks} (shops ${start + 1} to ${end}) ---`);

                try {
                    // Divide the chunk into batches for concurrent processing
                    const batchSize = Math.ceil(currentChunk.length / CONCURRENCY);
                    const batches = [];
                    for (let i = 0; i < currentChunk.length; i += batchSize) {
                        batches.push(currentChunk.slice(i, i + batchSize));
                    }
                    console.log(`Processing ${batches.length} batches in chunk ${chunkIndex + 1}...`);

                    // Process batches concurrently with error handling
                    const batchResults = await Promise.all(
                        batches.map((b, idx) => {
                            console.log(`Starting batch ${idx + 1}/${batches.length} in chunk ${chunkIndex + 1}...`);
                            return processBatch(b, idx + 1)
                                .catch(batchError => {
                                    console.error(`Error in batch ${idx + 1} of chunk ${chunkIndex + 1}:`, batchError.message);
                                    // Return an empty array if a batch fails completely
                                    return [];
                                });
                        })
                    );

                    // Flatten the results, filtering out any undefined or null values
                    const processed = batchResults
                        .flat()
                        .filter(shop => shop !== undefined && shop !== null);

                    console.log(`Processed ${processed.length} shops in chunk ${chunkIndex + 1}`);

                    // Filter shops with and without email
                    const withEmail = processed.filter(s => s.email && isValidEmail(s.email));
                    const withoutEmail = processed.filter(s => !s.email || !isValidEmail(s.email));

                    console.log(`Shops with valid email in chunk ${chunkIndex + 1}: ${withEmail.length}`);
                    console.log(`Shops without valid email in chunk ${chunkIndex + 1}: ${withoutEmail.length}`);

                    // Add to the total processed shops
                    allProcessed = [...allProcessed, ...processed];
                    allWithEmail = [...allWithEmail, ...withEmail];
                    allWithoutEmail = [...allWithoutEmail, ...withoutEmail];

                    // Save intermediate results after each chunk
                    console.log(`Saving intermediate results for chunk ${chunkIndex + 1}...`);
                    writeFileSync(join(dir, `${dt}_chunk${chunkIndex + 1}_with_email.csv`), Papa.unparse(withEmail));
                    writeFileSync(join(dir, `${dt}_chunk${chunkIndex + 1}_without_email.csv`), Papa.unparse(withoutEmail));

                    console.log(`Progress: ${allProcessed.length}/${filtered.length} shops processed (${Math.round(allProcessed.length / filtered.length * 100)}%)`);
                } catch (chunkError) {
                    console.error(`Error processing chunk ${chunkIndex + 1}:`, chunkError.message);
                    // Continue with the next chunk even if this one fails
                }

                // Add a delay between chunks to allow system to recover
                if (chunkIndex < totalChunks - 1) {
                    console.log(`Waiting 5 seconds before processing next chunk...`);
                    await sleep(5000);
                }
            }

            // Save final results
            console.log(`\n--- Saving final results for all ${allProcessed.length} processed shops ---`);
            writeFileSync(join(dir, `${dt}_with_email.csv`), Papa.unparse(allWithEmail));
            writeFileSync(join(dir, `${dt}_without_email.csv`), Papa.unparse(allWithoutEmail));
            writeFileSync('./shops.csv', Papa.unparse(allProcessed));
            writeFileSync(join(dir, `${dt}_with_email.json`), JSON.stringify(allWithEmail, null, 2));
            writeFileSync(join(dir, `${dt}_without_email.json`), JSON.stringify(allWithoutEmail, null, 2));

            console.log(`\nFinal results:`);
            console.log(`Total shops processed: ${allProcessed.length}/${filtered.length}`);
            console.log(`Shops with valid email: ${allWithEmail.length}`);
            console.log(`Shops without valid email: ${allWithoutEmail.length}`);
            console.log('All results saved successfully!');

            // Merge all files from the same date
            const date = now.toISOString().split('T')[0]; // Get just the date part (YYYY-MM-DD)
            console.log(`\n--- Merging all files from date ${date} ---`);
            const mergedFiles = mergeFilesByDate(date);

            if (mergedFiles.withEmail && mergedFiles.withoutEmail) {
                console.log(`Successfully merged files from date ${date}!`);
            } else {
                console.log(`No files were merged for date ${date}.`);
            }
        } catch (batchError) {
            console.error('Error processing batches:', batchError.message);

            // Save partial results if we have any
            if (allProcessed.length > 0) {
                console.log(`Saving partial results for ${allProcessed.length} processed shops...`);
                writeFileSync(join(dir, `${dt}_partial_with_email.csv`), Papa.unparse(allWithEmail));
                writeFileSync(join(dir, `${dt}_partial_without_email.csv`), Papa.unparse(allWithoutEmail));
                writeFileSync('./shops_partial.csv', Papa.unparse(allProcessed));
                console.log('Partial results saved successfully!');

                // Try to merge files even in case of error
                try {
                    const date = now.toISOString().split('T')[0]; // Get just the date part (YYYY-MM-DD)
                    console.log(`\n--- Attempting to merge files from date ${date} after error ---`);
                    const mergedFiles = mergeFilesByDate(date);

                    if (mergedFiles.withEmail && mergedFiles.withoutEmail) {
                        console.log(`Successfully merged files from date ${date} after error!`);
                    } else {
                        console.log(`No files were merged for date ${date} after error.`);
                    }
                } catch (mergeError) {
                    console.error('Error merging files after batch error:', mergeError.message);
                }
            }
        }
    } catch (err) {
        console.error('Erreur principale:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

// Check if a specific date was provided as a command line argument
// This allows running the script with a date parameter to merge files from that date
// Example: node scripts/find.js --merge-date=2023-05-15
if (process.argv.includes('--help')) {
    console.log(`
Leadster - Find Script

Usage:
  node scripts/find.js                     Run the normal shop search and processing
  node scripts/find.js --merge-date=DATE   Merge files from a specific date (format: YYYY-MM-DD)
  node scripts/find.js --help              Show this help message

Examples:
  node scripts/find.js --merge-date=2023-05-15   Merge all files from May 15, 2023
`);
} else {
    const mergeDateArg = process.argv.find(arg => arg.startsWith('--merge-date='));

    if (mergeDateArg) {
        const date = mergeDateArg.split('=')[1];
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            console.log(`Running in merge-only mode for date: ${date}`);
            const mergedFiles = mergeFilesByDate(date);

            if (mergedFiles.withEmail && mergedFiles.withoutEmail) {
                console.log(`Successfully merged files from date ${date}!`);
            } else {
                console.log(`No files were merged for date ${date}.`);
            }
        } else {
            console.error('Invalid date format. Please use YYYY-MM-DD format.');
            console.log('Example: node scripts/find.js --merge-date=2023-05-15');
        }
    } else {
        // Run the normal script
        main();
    }
}
