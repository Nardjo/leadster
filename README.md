# Leadster

Leadster est un outil Node.js pour identifier des business disposant d'une présence en ligne (Instagram, site web), à partir de données OpenStreetMap. Il permet de filtrer, d'exclure les grandes chaînes, de scraper les sites web pour trouver les comptes Instagram, et d'exporter les résultats dans Airtable.

## Fonctionnalités principales

- **Recherche OSM** : Interroge l'API Overpass pour récupérer les commerces d'une zone géographique (par défaut : Montpellier et sa métropole).
- **Filtrage intelligent** : Exclusion automatique des grandes marques et franchises (voir `utils/brandsExcluded.js`).
- **Scraping web** : Visite chaque site pour détecter la présence d'un compte Instagram.
- **Détection de doublons** : Combine les nouveaux résultats avec les précédents, évite les doublons et tient compte des shops déjà présents dans Airtable.
- **Export Airtable** : Upload automatisé des résultats dans une base Airtable pour la prospection.

## Prérequis

- Node.js >= 14
- pnpm
- Un compte Airtable (pour l'export)

## Installation

```bash
git clone [URL_DU_REPO]
cd leadster
pnpm install
```

## Configuration

1. Copiez le fichier d'exemple d'environnement :

   ```bash
   cp .env.example .env
   ```

2. Modifiez `.env` avec vos identifiants Airtable :
   - `AIRTABLE_API_KEY` : Clé API Airtable
   - `AIRTABLE_BASE_ID` : ID de la base Airtable
   - `AIRTABLE_TABLE_NAME` : Nom de la table (par défaut : Shops)

## Utilisation

### 1. Recherche et scraping des shops

Lancez la détection et le scraping :

```bash
pnpm start
```

- Les résultats sont sauvegardés dans `results/` au format `YYYY-MM-DD_HH-mm.json`.
- Les doublons par rapport aux anciens résultats et à Airtable sont automatiquement filtrés.

### 2. Upload vers Airtable

Pour exporter les résultats vers Airtable :

```bash
pnpm airtable
```

Le script prend automatiquement le fichier de résultats le plus récent.

### 3. Tests unitaires

Lancez les tests (Vitest) :

```bash
pnpm test
```

## Structure du projet

- `scripts/search.js` : Script principal de détection, scraping et sauvegarde.
- `scripts/airtable.js` : Script d'upload vers Airtable.
- `utils/airtableHelpers.js` : Fonctions d'intégration Airtable (upload, fetch, détection de doublons).
- `utils/brandsExcluded.js` : Liste des marques à exclure.
- `utils/constants.js` : Paramètres globaux (zones de recherche, types de commerces, etc).
- `results/` : Fichiers JSON générés.

## Modèle de données Airtable

Votre table doit contenir les colonnes suivantes :

- `Nom` (handle Instagram)
- `Site web`
- `Ville`
- `Type de Commerce`
- `Dernier contact` (date, initialement vide)
- `Statut` ("Non contacté" à l'import)

## Personnalisation

- Pour modifier la zone géographique, éditez `SEARCH_AREAS` dans `utils/constants.js`.
- Pour changer les types de commerces ciblés, modifiez `SHOP_TYPES` dans le même fichier.
- Pour ajuster le délai entre les requêtes ou la concurrence, modifiez `SCRAPING_DELAY`, `CONCURRENCY`, etc.

## Dépendances principales

- `axios`, `axios-retry` : Requêtes HTTP et gestion des erreurs réseau
- `cheerio` : Scraping HTML
- `dotenv` : Gestion de la configuration
- `airtable` : API Airtable
- `p-limit` : Contrôle de la concurrence

### Configuration Airtable

Avant d'utiliser le script d'upload, vous devez configurer vos identifiants Airtable :

1. Créez une base Airtable avec une table contenant les colonnes suivantes :
   - `Nom`
   - `URL Site`
   - `Ville`
   - `Instagram`
   - `Instagram` (colonne de type Button, avec une formule pour générer le lien Instagram : `"https://www.instagram.com/" & ENCODE_URL_COMPONENT(Nom)`)
   - `Type de Commerce`
   - `Date d'ajout`
   - `Dernier contact` (sera défini comme null lors de l'upload initial, ce champ doit être configuré comme un champ de type Date dans Airtable)
   - `Statut` (sera défini comme "Non contacter" lors de l'upload initial)

2. Copiez le fichier `.env.example` en `.env` et configurez vos identifiants Airtable :

   ```bash
   cp .env.example .env
   ```

3. Modifiez le fichier `.env` avec vos informations :
   - `AIRTABLE_API_KEY` : Votre clé API Airtable (créez un token sur <https://airtable.com/create/tokens>)
   - `AIRTABLE_BASE_ID` : L'ID de votre base Airtable (trouvé dans l'URL de votre base)
   - `AIRTABLE_TABLE_NAME` : Le nom de votre table (par défaut : "Shops")

   > **Note**: Bien que la documentation officielle d'Airtable.js ne mentionne que les options de configuration `apiKey`, `endpointUrl` et `requestTimeout`, les paramètres `AIRTABLE_BASE_ID` et `AIRTABLE_TABLE_NAME` sont nécessaires pour spécifier quelle base et quelle table utiliser. Le `AIRTABLE_BASE_ID` est utilisé avec `Airtable.base()` et `AIRTABLE_TABLE_NAME` est utilisé pour sélectionner la table dans cette base.

4. Options de configuration avancées (facultatives) :
   - `AIRTABLE_ENDPOINT_URL` : URL de l'API personnalisée (pour le débogage ou l'utilisation d'un proxy)
   - `AIRTABLE_REQUEST_TIMEOUT` : Délai d'expiration des requêtes en millisecondes (par défaut : 300000, soit 5 minutes)

## Configuration

Vous pouvez modifier les paramètres suivants dans le fichier `search.js` :

- `SEARCH_AREA` : Zone géographique à rechercher (par défaut : "Pays de la Loire")
- `SCRAPING_DELAY` : Délai entre les requêtes de scraping (en millisecondes)
- `SHOP_TYPES` : Types de commerces à rechercher avec leurs labels français

## Structure du code

### Script principal (search.js)

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

## Tests unitaires

Le projet inclut des tests unitaires utilisant [Vitest](https://vitest.dev/), un framework de test rapide et léger pour JavaScript.

### Exécution des tests

Pour exécuter les tests, utilisez les commandes suivantes :

```bash
# Exécuter tous les tests une fois
pnpm test

# Exécuter les tests en mode watch (relance automatiquement lors des modifications)
pnpm test:watch
```

### Structure des tests

Les tests sont organisés par module :

- `tests/index.test.js` : Tests pour les fonctionnalités principales dans `search.js`
- `tests/airtable.test.js` : Tests pour l'intégration Airtable dans `airtable.js`

### Fonctions testées

Les tests couvrent les fonctions critiques du projet, notamment :

- Extraction des handles Instagram à partir des URLs
- Génération de noms de fichiers horodatés
- Détection et filtrage des doublons
- Gestion des fichiers de résultats
- Chargement et analyse des données JSON

Pour plus d'informations sur les tests, consultez le fichier `tests/README.md`.
