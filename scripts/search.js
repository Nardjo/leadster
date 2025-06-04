/**
 * Leadster - Script to find shops in France with Instagram presence
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import { dirname } from 'path';
import { fetchAirtableRecords, isShopInAirtable } from '../utils/airtableHelpers.js';
import * as dotenv from 'dotenv';
import EXCLUDED_BRANDS from '../utils/brandsExcluded.js';
import pLimit from 'p-limit';
import axiosRetry from 'axios-retry';
import { SEARCH_AREAS, SCRAPING_DELAY, CONCURRENCY, RETRY_COUNT, RETRY_DELAY_MS, SHOP_TYPES } from '../utils/constants.js';

dotenv.config();

/* ===== FICHIERS & PATH ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ARCHIVED_ITEMS_FILE = path.join(__dirname, '../data/archived_items.json');

/* ===== AXIOS RETRY GLOBAL ===== */
axiosRetry(axios, {
  retries: RETRY_COUNT,
  retryDelay: (_err, n) => RETRY_DELAY_MS * 2 ** (n - 1),
  retryCondition: err =>
      axiosRetry.isNetworkOrIdempotentRequestError(err) || err.code === 'ECONNABORTED'
});

/* ===== UTILS ===== */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function isExcludedBrand(tags) {
  const fields = ['name', 'brand', 'operator', 'shop_name'];
  for (const field of fields) {
    if (!tags[field]) continue;
    const lower = tags[field].toLowerCase();
    if (EXCLUDED_BRANDS.some(b => lower.includes(b.toLowerCase()))) return true;
  }
  return false;
}

function timeFile() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}.json`;
}

const ensureDir = () => { const dir = path.join(__dirname, '../results'); if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); return dir; };
const latestFile = () => { const d=ensureDir(); const f=fs.readdirSync(d).filter(e=>e.endsWith('.json')); if(!f.length) return null; f.sort((a,b)=>fs.statSync(path.join(d,b)).mtime-fs.statSync(path.join(d,a)).mtime); return path.join(d,f[0]); };
const load = f => (!f||!fs.existsSync(f))?[]:JSON.parse(fs.readFileSync(f,'utf8'));

/**
 * Load archived items from the archived_items.json file
 * @returns {Array} - Array of archived items or empty array if file doesn't exist
 */
function loadArchivedItems() {
  try {
    if (fs.existsSync(ARCHIVED_ITEMS_FILE)) {
      const fileContent = fs.readFileSync(ARCHIVED_ITEMS_FILE, 'utf8');
      if (!fileContent || fileContent.trim() === '') {
        console.log('Archived items file is empty.');
        return [];
      }
      const archivedItems = JSON.parse(fileContent);
      console.log(`Loaded ${archivedItems.length} archived items from ${ARCHIVED_ITEMS_FILE}`);
      return archivedItems;
    } else {
      console.log('No archived items file found.');
      return [];
    }
  } catch (error) {
    console.error(`Error loading archived items: ${error.message}`);
    return [];
  }
}

function extractInstagramHandle(url){
  if(url.endsWith('/')) url=url.slice(0,-1);
  const m=url.match(/instagram\.com\/([A-Za-z0-9_.-]+)/);
  return m && !['p','explore','about','legal','reel'].includes(m[1]) ? m[1] : null;
}

/* ===== OSM QUERY ===== */
async function queryOverpassAPI(){
  console.log('Querying OSM…');
  // ===== AREAS =====
  const areaParts = SEARCH_AREAS.map((name, i) =>
      `area["name"="${name}"]["admin_level"~"[2-9]"]->.a${i};`
  );
  // Fusionne .a0;.a1; … en .searchArea
  const joinAreas = `(${SEARCH_AREAS.map((_, i) => `.a${i}`).join(';')};)->.searchArea;`;
  const areaDefs = `${areaParts.join('\n  ')}\n  ${joinAreas}`;

  // ===== SHOP QUERIES =====
  const websiteTags = ['website', 'contact:website', 'url', 'contact:instagram'];
  const shopQueries = SHOP_TYPES.flatMap(({ tag }) => {
    const [k, v] = tag.split('=');
    return websiteTags.flatMap(tg => [
      `node["${k}"="${v}"]["${tg}"](area.searchArea);`,
      `way ["${k}"="${v}"]["${tg}"](area.searchArea);`,
      `relation["${k}"="${v}"]["${tg}"](area.searchArea);`
    ]);
  }).join('\n  ');

  const query = `[out:json];
${areaDefs}
(${shopQueries});
out body;>;out skel qt;`;
  try{
    const {data}=await axios.post('https://overpass-api.de/api/interpreter',query,{headers:{'Content-Type':'application/x-www-form-urlencoded'}});
    if(!data?.elements) return [];
    const shops=[];
    for(const e of data.elements){
      if(!e.tags || isExcludedBrand(e.tags)) continue;
      let typeLbl;
      for(const {tag,label} of SHOP_TYPES){const [k,v]=tag.split('='); if(e.tags[k]===v){typeLbl=label;break;}}
      if(!typeLbl) continue;
      const website=e.tags.website||e.tags['contact:website']||e.tags.url||null;
      const igTag=e.tags['contact:instagram']||null;
      const city=e.tags['addr:city']||'';
      const postcode=e.tags['addr:postcode']||'';
      shops.push({website,city,postcode,type:typeLbl,igTag});
    }
    console.log(`OSM returned ${shops.length}`);
    return shops;
  }catch(err){console.error('Overpass fail',err.message);return[];}
}

/* ===== SCRAPING ===== */
async function scrapeWebsiteForInstagram({website,city,postcode,type}){
  try{
    const {data}=await axios.get(website,{timeout:10_000,headers:{'User-Agent':'Mozilla/5.0'}});
    const $=cheerio.load(data);
    // cherche d'abord les liens <a>
    let handle=null;
    $('a').each((_,el)=>{const h=$(el).attr('href'); if(h&&h.includes('instagram.com')){handle=extractInstagramHandle(h); if(handle) return false;}});
    // si toujours rien, regex sur tout le HTML
    if(!handle){const m=$.html().match(/instagram\.com\/[A-Za-z0-9_.-]+/); if(m) handle=extractInstagramHandle(m[0]);}
    if(handle) return {Nom:handle,URL_Site:website,Ville:city||postcode,Type_Commerce:type};
  }catch(e){console.warn(`Scrape ${website} -> ${e.message}`);} return null;
}

/* ===== MAIN ===== */
async function main(){
  const prev=load(latestFile());
  const airtable=await fetchAirtableRecords();
  const archivedItems = loadArchivedItems();
  const seen=new Set(prev.map(s=>`${s.URL_Site}|${s.Type_Commerce}`));
  const shops=await queryOverpassAPI();
  const limit=pLimit(CONCURRENCY);
  const tasks=shops.map(shop=>limit(async()=>{
    if(seen.has(`${shop.website}|${shop.type}`)||isShopInAirtable({URL_Site:shop.website,Type_Commerce:shop.type},airtable)) return null;
    if(shop.igTag){ // IG tag présent dans OSM
      return {Nom:shop.igTag,URL_Site:shop.website,Ville:shop.city||shop.postcode,Type_Commerce:shop.type};
    }
    const r=await scrapeWebsiteForInstagram(shop);
    await sleep(SCRAPING_DELAY);
    return r;
  }));

  const settled=await Promise.allSettled(tasks);
  const results=settled.filter(s=>s.status==='fulfilled'&&s.value).map(s=>s.value);
  console.log(`New IG shops: ${results.length}`);
  if(!results.length) return;
  const unique=results.filter(r=>
    // Not in previous results
    !prev.some(p=>p.Nom===r.Nom||(p.URL_Site===r.URL_Site&&p.Type_Commerce===r.Type_Commerce)) && 
    // Not in Airtable
    !isShopInAirtable(r,airtable) && 
    // Not in archived items
    !archivedItems.some(a=>a.Nom===r.Nom||(a.URL_Site===r.URL_Site&&a.Type_Commerce===r.Type_Commerce))
  );
  const file=path.join(ensureDir(),timeFile());
  fs.writeFileSync(file,JSON.stringify(unique,null,2));
  console.log(`Saved ${unique.length} -> ${file}`);
}

main();
