# Leadster - Shop Instagram Finder

Ce projet permet d'identifier des boutiques et sites à potentiel en France via OpenStreetMap (OSM), de récupérer leur site web, puis de visiter ce site pour trouver leur compte Instagram, afin de collecter des informations pour de la prospection commerciale. Les résultats sont ensuite envoyés dans une base Notion.

## Fonctionnalités

1. **Recherche OSM** :
   - Recherche de commerces ou sites dans une zone géographique spécifiée
   - Types ciblés : boutiques, artisans, coachs, portfolios, agences, etc. (configurable)
   - Filtre pour ne retenir que les sites avec un site web

2. **Scraping des sites web** :
   - Recherche de liens Instagram sur chaque site
   - Extraction du nom d'utilisateur Instagram

3. **Détection des doublons** :
   - Vérification automatique des doublons avec les résultats précédents et avec la base Notion

4. **Sauvegarde et export** :
   - Génération d'un fichier JSON horodaté dans `./results`
   - Script d'envoi des résultats vers Notion (avec gestion des colonnes, dont "Ecommerce ?")

## Prérequis

- Node.js (version 16 ou supérieure recommandée)
- pnpm
- Un compte Notion et une base de données Notion configurée

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

## Configuration

1. **Créez une intégration Notion** et récupérez votre clé API (commence par `secret_...`).
2. **Créez une base de données Notion** (table) avec les colonnes suivantes :
   - `Nom` (title)
   - `Site web` (url)
   - `Ville` (rich_text)
   - `Type de Commerce` (rich_text)
   - `Dernier contact` (date)
   - `Statut` (select, ex : "Non contacté")
   - `Ecommerce ?` (checkbox)
3. **Partagez la base avec l'intégration** (invitez l'intégration à la base via le menu "Partager").
4. **Récupérez l'ID de la base** dans l'URL Notion (32 caractères après le dernier slash ou dans l'URL partagée).
5. **Configurez le fichier `.env`** :

   ```env
   NOTION_API_KEY=secret_...
   NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Utilisation

### 1. Recherche et génération des résultats

Lancez la recherche avec :

```bash
node scripts/search.js
```

Un fichier de résultats sera généré dans le dossier `results/`.

### 2. Envoi des résultats vers Notion

Lancez le script d'upload :

```bash
node scripts/notion.js
```

Vous pourrez choisir d'envoyer le fichier le plus récent ou un fichier spécifique. Le script gère les doublons avec la base Notion.

### 3. Structure des résultats

Chaque entrée contient :

- Nom (Instagram)
- Site web
- Ville
- Type de Commerce
- Statut (par défaut : Non contacté)
- Ecommerce ? (détecté automatiquement selon le type de commerce)

## Personnalisation

- Modifiez les types de commerces/sites ciblés dans `utils/constants.js` (`SHOP_TYPES`).
- Adaptez la logique de détection e-commerce dans `scripts/notion.js` si besoin.
- Changez la zone de recherche dans `SEARCH_AREAS`.

## Tests

Des tests unitaires sont présents avec [Vitest](https://vitest.dev/). Pour les lancer :

```bash
pnpm test
```

## Licence

Ce projet est sous licence MIT.
