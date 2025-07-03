# Leadster - Shop Instagram Finder

Ce projet permet d'identifier des boutiques et sites à potentiel en France via OpenStreetMap (OSM), de récupérer leur site web, puis de visiter ce site pour trouver leur compte Instagram, afin de collecter des informations pour de la prospection commerciale. Les résultats sont ensuite envoyés dans une base Airtable.

## Fonctionnalités

1. **Recherche OSM** :
   - Recherche de commerces ou sites dans une zone géographique spécifiée
   - Types ciblés : boutiques, artisans, coachs, portfolios, agences, etc. (configurable)
   - Filtre pour ne retenir que les sites avec un site web

2. **Scraping des sites web** :
   - Recherche de liens Instagram sur chaque site
   - Extraction du nom d'utilisateur Instagram

3. **Détection des doublons** :
   - Vérification automatique des doublons avec les résultats précédents et avec la base Airtable

4. **Sauvegarde et export** :
   - Génération d'un fichier JSON horodaté dans `./results`
   - Script d'envoi des résultats vers Airtable (avec gestion des colonnes, dont "Ecommerce ?")

## Prérequis

- Node.js (version 16 ou supérieure recommandée)
- pnpm
- Un compte Airtable et une base Airtable configurée

## Installation

1. Clonez ce dépôt :

   ```bash
   git clone [URL_DU_REPO]
   cd leadster
   ```

2. Installez les dépendances :

   ```bash
   pnpm install
   ```

3. Copiez le fichier d'exemple de configuration :

   ```bash
   cp utils/constants.example.js utils/constants.js
   ```

   > Modifiez `utils/constants.js` selon vos besoins locaux (types de commerces, zones, etc). Ce fichier est ignoré par git.

## Configuration

1. **Créez une base Airtable** avec les colonnes suivantes :
   - `Nom` (nom Instagram, type Single line text)
   - `Site web` (URL du site, type URL)
   - `Ville` (Single line text)
   - `Type de Commerce` (Single line text)
   - `Statut` (Single select, ex : "Non contacté")
   - `Ecommerce ?` (Checkbox)
2. **Créez une clé API Airtable** (<https://airtable.com/developers/web/api/introduction>).
3. **Récupérez l'ID de la base** et le nom de la table.
4. **Configurez le fichier `.env`** :

   ```env
   AIRTABLE_API_KEY=your_airtable_api_key
   AIRTABLE_BASE_ID=your_base_id
   AIRTABLE_TABLE_NAME=Shops
   ```

## Utilisation

### 1. Recherche et génération des résultats

Lancez la recherche avec :

```bash
node scripts/search.js
```

Un fichier de résultats sera généré dans le dossier `results/`.

### 2. Envoi des résultats vers Airtable

Lancez le script d'upload :

```bash
node scripts/airtable.js
```

Le script va automatiquement envoyer le fichier de résultats le plus récent dans Airtable. Les doublons sont gérés automatiquement (pas d'envoi si déjà présent dans la base).

### 3. Structure des résultats

Chaque entrée contient :

- Nom (Instagram)
- Site web
- Ville
- Type de Commerce
- Statut (par défaut : Non contacté)
- Ecommerce ? (détecté automatiquement selon le type de commerce)

Ces champs correspondent aux colonnes de votre base Airtable.

## Personnalisation

- Modifiez les types de commerces/sites ciblés dans `utils/constants.js` (`SHOP_TYPES`).
- Adaptez la logique de détection e-commerce dans `scripts/airtable.js` ou `utils/airtableHelpers.js` si besoin.
- Changez la zone de recherche dans `SEARCH_AREAS`.

## Tests

Des tests unitaires sont présents avec [Vitest](https://vitest.dev/). Pour les lancer :

```bash
pnpm test
```
