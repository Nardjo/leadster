/**
 * Leadster - Script to find shops in France with Instagram presence
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import { Client } from '@notionhq/client'
import axiosRetry from 'axios-retry'
import * as dotenv from 'dotenv'
import console from 'node:console'
import pLimit from 'p-limit'
import { dirname } from 'path'
import EXCLUDED_BRANDS from '../utils/brandsExcluded.js'
import { CONCURRENCY, RETRY_COUNT, RETRY_DELAY_MS, SCRAPING_DELAY, SEARCH_AREAS, SHOP_TYPES } from '../utils/constants.js'

dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const notion = new Client({ auth: NOTION_API_KEY });

/* ===== FICHIERS & PATH ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

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
const latestFile = () => {
  const d = ensureDir();
  const f = fs.readdirSync(d).filter(e => e.endsWith('.json'));
  if (!f.length) return null;
  f.sort((a, b) => {
    const aTime = fs.statSync(path.join(d, a)).mtime.getTime();
    const bTime = fs.statSync(path.join(d, b)).mtime.getTime();
    return bTime - aTime;
  });
  return path.join(d, f[0]);
};
const load = f => (!f||!fs.existsSync(f))?[]:JSON.parse(fs.readFileSync(f,'utf8'));

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
    const {data}=await axios.get(website,{timeout:4000,headers:{'User-Agent':'Mozilla/5.0'}});
    const $=cheerio.load(data);
    // cherche d'abord les liens <a>
    let handle=null;
    $('a').each((_,el)=>{const h=$(el).attr('href'); if(h&&h.includes('instagram.com')){handle=extractInstagramHandle(h); if(handle) return false;}});
    // si toujours rien, regex sur tout le HTML
    if(!handle){const m=$.html().match(/instagram\.com\/[A-Za-z0-9_.-]+/); if(m) handle=extractInstagramHandle(m[0]);}
    if(handle) return {Nom:handle,URL_Site:website,Ville:city||postcode,Type_Commerce:type};
  }catch(e){
    if(e.code==='ECONNABORTED'||e.message.includes('timeout')){
      console.warn(`Timeout (${website})`);
    }else{
      console.warn(`Scrape ${website} -> ${e.message}`);
    }
  } return null;
}

// Récupère tous les shops existants dans la base Notion
async function fetchNotionRecords() {
  let results = [];
  let cursor = undefined;
  do {
    const params = {
      database_id: NOTION_DATABASE_ID || '',
    };
    if (cursor) params.start_cursor = cursor;
    const response = await notion.databases.query(params);
    results = results.concat(response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  // On retourne un format simple pour la comparaison
  return results.map(page => ({
    Nom: page.properties['Nom']?.title?.[0]?.plain_text || '',
    URL_Site: page.properties['Site web']?.url || '',
    Ville: page.properties['Ville']?.rich_text?.[0]?.plain_text || '',
    Type_Commerce: page.properties['Type de Commerce']?.rich_text?.[0]?.plain_text || '',
  }));
}

function isShopInNotion(shop, notionRecords) {
  if (!notionRecords || notionRecords.length === 0) {
    return false;
  }
  const normalizeUrl = url => {
    if (!url) return '';
    let normalized = url.toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  };
  const normalizedShopUrl = normalizeUrl(shop.URL_Site);
  return notionRecords.some(record => {
    if (shop.Nom && record.Nom && record.Nom === shop.Nom) {
      return true;
    }
    const normalizedRecordUrl = normalizeUrl(record.URL_Site);
    if (normalizedRecordUrl !== normalizedShopUrl) {
      return false;
    }
    if (record.Type_Commerce !== shop.Type_Commerce) {
      return false;
    }
    return true;
  });
}

/* ===== MAIN ===== */
async function main(){
  const prev = load(latestFile());
  const notionRecords = await fetchNotionRecords();
  const seen = new Set(prev.map(s => `${s.URL_Site}|${s.Type_Commerce}`));
  const shops = await queryOverpassAPI();
  const limit = pLimit(CONCURRENCY);
  const tasks = shops.map(shop => limit(async () => {
    if (seen.has(`${shop.website}|${shop.type}`) || isShopInNotion({ URL_Site: shop.website, Type_Commerce: shop.type, Nom: shop.igTag }, notionRecords)) return null;
    if (shop.igTag) {
      return { Nom: shop.igTag, URL_Site: shop.website, Ville: shop.city || shop.postcode, Type_Commerce: shop.type };
    }
    const r = await scrapeWebsiteForInstagram(shop);
    await sleep(SCRAPING_DELAY);
    return r;
  }));

  const settled = await Promise.allSettled(tasks);
  const results = settled
    .filter((s) => s.status === 'fulfilled' && s.value)
    .map((s) => (s.status === 'fulfilled' ? s.value : null))
    .filter(Boolean);
  console.log(`New IG shops: ${results.length}`);
  if (!results.length) return;
  const unique = results.filter(r =>
    r &&
    // Not in previous results
    !prev.some(p => p.Nom === r.Nom || (p.URL_Site === r.URL_Site && p.Type_Commerce === r.Type_Commerce)) &&
    // Not in Notion
    !isShopInNotion(r, notionRecords)
  );
  const file = path.join(ensureDir(), timeFile());
  fs.writeFileSync(file, JSON.stringify(unique, null, 2));
  console.log(`Saved ${unique.length} -> ${file}`);
}

main();
