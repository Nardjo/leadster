# Leadster - Shop Instagram Finder

Ce script permet d'identifier des boutiques spécifiques en France via OpenStreetMap (OSM), de récupérer leur site web, puis de visiter ce site pour trouver leur compte Instagram, afin de collecter des informations pour de la prospection commerciale.

## Fonctionnalités

1. **Interrogation de l'API Overpass d'OSM** :
   - Recherche de commerces dans une zone géographique spécifiée (par défaut : "Paris")
   - Types de commerces ciblés : vêtements, maroquinerie, chaussures, bijoux, épicerie fine, librairie
   - Filtre pour ne retenir que les commerces avec un site web et une ville

2. **Scraping des sites web** :
   - Vérification préalable des résultats précédents pour éviter de scraper à nouveau les sites déjà traités
   - Visite de chaque nouveau site web trouvé
   - Recherche de liens vers Instagram
   - Extraction du nom d'utilisateur Instagram

3. **Sauvegarde des résultats** :
   - Génération d'un fichier JSON avec horodatage
   - Sauvegarde uniquement des commerces avec présence Instagram
   - Format structuré avec nom d'utilisateur, URL du site, ville et type de commerce
   - Détection et prévention des doublons entre les exécutions successives
   - Combinaison des résultats précédents avec les nouveaux résultats uniques

## Prérequis

- Node.js (version 14 ou supérieure)
- pnpm
- Un compte Airtable (pour le script d'upload)

## Installation

1. Clonez ce dépôt :
   ```bash
   git clone [URL_DU_REPO]
   cd leadster
   ```

2. Installez les dépendances avec pnpm :
   ```bash
   pnpm install
   ```

## Utilisation

### Script principal de recherche

Exécutez le script principal avec la commande :

```bash
pnpm start
```

Les résultats seront sauvegardés dans le dossier `./results` avec un nom de fichier au format `YYYY-MM-DD_HH-mm.json`.

### Script d'upload vers Airtable

Un script complémentaire permet d'envoyer les données collectées vers Airtable :

```bash
pnpm airtable-upload
```

Ce script vous propose deux options :
1. Uploader le fichier de résultats le plus récent
2. Choisir un fichier spécifique parmi les fichiers disponibles

#### Configuration Airtable

Avant d'utiliser le script d'upload, vous devez configurer vos identifiants Airtable :

1. Créez une base Airtable avec une table contenant les colonnes suivantes :
   - `Nom Instagram`
   - `URL Site`
   - `Ville`
   - `Type de Commerce`
   - `Date d'ajout`
   - `Dernier contact` (sera vide lors de l'upload initial)

2. Copiez le fichier `.env.example` en `.env` et configurez vos identifiants Airtable :
   ```bash
   cp .env.example .env
   ```

3. Modifiez le fichier `.env` avec vos informations :
   - `AIRTABLE_API_KEY` : Votre clé API Airtable (créez un token sur https://airtable.com/create/tokens)
   - `AIRTABLE_BASE_ID` : L'ID de votre base Airtable (trouvé dans l'URL de votre base)
   - `AIRTABLE_TABLE_NAME` : Le nom de votre table (par défaut : "Shops")

   > **Note**: Bien que la documentation officielle d'Airtable.js ne mentionne que les options de configuration `apiKey`, `endpointUrl` et `requestTimeout`, les paramètres `AIRTABLE_BASE_ID` et `AIRTABLE_TABLE_NAME` sont nécessaires pour spécifier quelle base et quelle table utiliser. Le `AIRTABLE_BASE_ID` est utilisé avec `Airtable.base()` et `AIRTABLE_TABLE_NAME` est utilisé pour sélectionner la table dans cette base.

4. Options de configuration avancées (facultatives) :
   - `AIRTABLE_ENDPOINT_URL` : URL de l'API personnalisée (pour le débogage ou l'utilisation d'un proxy)
   - `AIRTABLE_REQUEST_TIMEOUT` : Délai d'expiration des requêtes en millisecondes (par défaut : 300000, soit 5 minutes)

## Configuration

Vous pouvez modifier les paramètres suivants dans le fichier `index.js` :

- `SEARCH_AREA` : Zone géographique à rechercher (par défaut : "Pays de la Loire")
- `SCRAPING_DELAY` : Délai entre les requêtes de scraping (en millisecondes)
- `SHOP_TYPES` : Types de commerces à rechercher avec leurs labels français

## Structure du code

### Script principal (index.js)

- **Configuration** : Paramètres facilement modifiables
- **Fonctions auxiliaires** : Fonctions utilitaires (génération de nom de fichier, extraction de handle Instagram, etc.)
- **Fonctions principales** : 
  - `queryOverpassAPI()` : Interrogation de l'API Overpass
  - `scrapeWebsiteForInstagram()` : Scraping des sites web
  - `findMostRecentResultsFile()` : Recherche du fichier de résultats le plus récent
  - `loadDataFromFile()` : Chargement des données d'un fichier JSON
  - `isShopDuplicate()` : Vérification si un commerce est un doublon
  - `filterDuplicates()` : Filtrage des doublons dans les nouveaux résultats
  - `saveResultsToFile()` : Sauvegarde des résultats uniques combinés avec les résultats précédents
- **Exécution principale** : Fonction `main()` qui orchestre le processus

### Script d'upload Airtable (airtable.js)

- **Configuration** : Paramètres pour l'API Airtable (clé API, ID de base, nom de table)
- **Fonctions auxiliaires** : 
  - `ensureResultsDirectoryExists()` : Vérification/création du dossier de résultats
  - `findMostRecentResultsFile()` : Recherche du fichier de résultats le plus récent
  - `loadDataFromFile()` : Chargement des données d'un fichier JSON
  - `listResultsFiles()` : Liste tous les fichiers de résultats disponibles
  - `createReadlineInterface()` et `askQuestion()` : Gestion de l'interface utilisateur en ligne de commande
- **Fonctions principales** :
  - `uploadToAirtable()` : Upload des données vers Airtable par lots
- **Exécution principale** : Fonction `main()` qui gère l'interaction utilisateur et l'upload

## Gestion des erreurs

### Script principal

Le script principal inclut une gestion des erreurs pour :
- Les requêtes à l'API Overpass
- Le scraping des sites web
- La sauvegarde des résultats

### Script d'upload Airtable

Le script d'upload Airtable inclut une gestion des erreurs pour :
- Le chargement des fichiers de résultats
- La validation des entrées utilisateur
- Les requêtes à l'API Airtable
- L'upload des données par lots

## Licence

Ce projet est sous licence MIT.
