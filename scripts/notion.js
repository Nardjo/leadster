/**
 * Leadster - Script d'envoi vers Notion
 *
 * Ce script envoie les données des boutiques depuis les fichiers de résultats vers une base Notion.
 * Il peut envoyer le fichier le plus récent ou un fichier spécifique.
 * Les noms de colonnes sont identiques à ceux utilisés pour Airtable.
 */

import { Client } from '@notionhq/client'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path, { dirname } from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===== CONFIGURATION NOTION =====
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

const notion = new Client({ auth: NOTION_API_KEY });

function ensureResultsDirectoryExists() {
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  return resultsDir;
}

function findMostRecentResultsFile() {
  try {
    const resultsDir = ensureResultsDirectoryExists();
    const files = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));
    if (files.length === 0) {
      return null;
    }
    files.sort((a, b) => {
      const aTime = fs.statSync(path.join(resultsDir, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(resultsDir, b)).mtime.getTime();
      return bTime - aTime;
    });
    return path.join(resultsDir, files[0]);
  } catch (error) {
    console.error('Erreur lors de la recherche du fichier de résultats le plus récent :', error.message);
    return null;
  }
}

function loadDataFromFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Erreur lors du chargement des données depuis ${filePath} :`, error.message);
    return [];
  }
}

function listResultsFiles() {
  try {
    const resultsDir = ensureResultsDirectoryExists();
    const files = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));
    return files.sort((a, b) => {
      const aTime = fs.statSync(path.join(resultsDir, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(resultsDir, b)).mtime.getTime();
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Erreur lors de la liste des fichiers de résultats :', error.message);
    return [];
  }
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

function isEcommerce(shop) {
  // Types considérés comme e-commerce
  const ecommerceTypes = [
    'Vêtements',
    'Maroquinerie',
    'Chaussures',
    'Bijoux',
    'Équipement Auto',
    'Électronique / LED',
    'Meubles'
  ];
  return ecommerceTypes.includes(shop.Type_Commerce);
}

// Fonction pour envoyer les données dans Notion
async function uploadToNotion(data) {
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    console.error('Erreur : Veuillez définir NOTION_API_KEY et NOTION_DATABASE_ID dans le fichier .env.');
    return 0;
  }
  let createdCount = 0;
  for (const shop of data) {
    try {
      await notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          'Nom': { title: [{ text: { content: shop.Nom || '' } }] },
          'Site web': { url: shop.URL_Site || '' },
          'Ville': { rich_text: [{ text: { content: shop.Ville || '' } }] },
          'Type de Commerce': { rich_text: [{ text: { content: shop.Type_Commerce || '' } }] },
          'Dernier contact': { date: null },
          'Statut': { select: { name: 'Non contacté' } },
          'Ecommerce ?': { checkbox: typeof shop['Ecommerce ?'] !== 'undefined' ? shop['Ecommerce ?'] === true || shop['Ecommerce ?'] === 'true' : isEcommerce(shop) }
        }
      });
      createdCount++;
      console.log(`Ajouté : ${shop.Nom}`);
    } catch (error) {
      console.error(`Erreur lors de l'ajout de ${shop.Nom} :`, error.message);
    }
  }
  console.log(`Ajout de ${createdCount} fiches dans Notion terminé.`);
  return createdCount;
}

// ===== MAIN =====

async function main() {
  try {
    const rl = createReadlineInterface();
    console.log('Leadster - Script d\'envoi vers Notion');
    console.log('--------------------------------------');
    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
      console.error('Erreur : Veuillez définir NOTION_API_KEY et NOTION_DATABASE_ID dans le fichier .env.');
      rl.close();
      return;
    }
    // Prendre automatiquement le fichier le plus récent
    const filePath = findMostRecentResultsFile();
    if (!filePath) {
      console.error('Aucun fichier de résultats trouvé.');
      rl.close();
      return;
    }
    console.log(`Fichier utilisé : ${path.basename(filePath)}`);
    const data = loadDataFromFile(filePath);
    if (data.length === 0) {
      console.error(`Aucune donnée trouvée dans ${path.basename(filePath)}.`);
      rl.close();
      return;
    }
    console.log(`${data.length} boutiques chargées depuis ${path.basename(filePath)}.`);
    // Demander confirmation
    const confirm = await askQuestion(rl, `\nVoulez-vous envoyer ${data.length} boutiques vers Notion ? (o/n) : `);
    if (confirm.toLowerCase() === 'o') {
      await uploadToNotion(data);
    } else {
      console.log('Envoi annulé.');
    }
    rl.close();
  } catch (error) {
    console.error('Une erreur est survenue :', error.message);
  }
}

main(); 
