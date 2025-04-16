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

Exécutez le script avec la commande :

```bash
pnpm start
```

Les résultats seront sauvegardés dans le dossier `./results` avec un nom de fichier au format `YYYY-MM-DD_HH-mm.json`.

## Configuration

Vous pouvez modifier les paramètres suivants dans le fichier `index.js` :

- `SEARCH_AREA` : Zone géographique à rechercher (par défaut : "Pays de la Loire")
- `SCRAPING_DELAY` : Délai entre les requêtes de scraping (en millisecondes)
- `SHOP_TYPES` : Types de commerces à rechercher avec leurs labels français

## Structure du code

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

## Gestion des erreurs

Le script inclut une gestion des erreurs pour :
- Les requêtes à l'API Overpass
- Le scraping des sites web
- La sauvegarde des résultats

## Licence

Ce projet est sous licence MIT.
