# Leadster - Shop Instagram Finder

Ce projet permet d'identifier des boutiques et sites à potentiel en France via OpenStreetMap (OSM), de récupérer leur site web, puis de trouver leur compte Instagram pour enrichir une base de prospection commerciale. Les résultats sont désormais exportés dans une base de données Postgres.

## Fonctionnalités

1. **Recherche OSM** :
   - Recherche de commerces ou sites dans une zone géographique spécifiée
   - Types ciblés : boutiques, artisans, coachs, portfolios, agences, etc. (configurable)
   - Filtre pour ne retenir que les sites avec un site web

2. **Scraping des sites web** :
   - Recherche de liens Instagram sur chaque site
   - Extraction du nom d'utilisateur Instagram

3. **Détection des doublons** :
   - Vérification automatique des doublons avec les résultats précédents **et** avec la base Postgres

4. **Sauvegarde et export** :
   - Génération d'un fichier JSON horodaté dans `./results`
   - Script d'envoi des résultats vers la db Postgres (append-only, pas d'upsert)

## Prérequis

- Node.js (version 16 ou supérieure recommandée)
- pnpm
- Une base de données Postgres

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

1. **Créez une table `Leads` dans votre db Postgres** avec les colonnes suivantes (snake_case) :
   - `nom` (le handle Instagram, type text)
   - `site_web` (URL du site, type text)
   - `ville` (text)
   - `type_de_commerce` (text)
   - `statut` (text, ex : "Non contacté")
   - `dernier_contact` (timestamp ou text)
   - `email` (text, optionnel)
   - `notes` (text, optionnel)

2. **Configurez le fichier `.env`** avec la connexion à votre db Postgres :

   ```env
   POSTGRES_URL=postgresql://<user>:<password>@<host>:<port>/<db>?sslmode=require
   ```

## Utilisation

### 1. Recherche et génération des résultats

Lancez la recherche avec :

```bash
node scripts/search.js
```

Un fichier de résultats sera généré dans le dossier `results/`.

### 2. Export des résultats vers Postgres

Lancez le script d'export :

```bash
node scripts/export.js
```

Le script va automatiquement envoyer le fichier de résultats le plus récent dans la base Postgres. Les doublons sont gérés automatiquement (pas d'insertion si déjà présent dans la base).

### 3. Structure des résultats

Chaque entrée contient :

- Nom (Instagram, c'est le handle IG)
- Site web
- Ville
- Type de Commerce
- Statut (par défaut : Non contacté)
- Email (si disponible)
- Notes (optionnel)

**Important :**
- Le champ `nom` contient le handle Instagram (pas l'URL complète). Pour reconstituer le lien IG :
  `https://instagram.com/<nom>`
- Il n'y a plus de colonne `instagram` dans la base.

## Personnalisation

- Modifiez les types de commerces/sites ciblés dans `utils/constants.js` (`SHOP_TYPES`).
- Changez la zone de recherche dans `SEARCH_AREAS`.
- Les scripts principaux sont :
  - `scripts/search.js` (scraping & génération JSON)
  - `scripts/export.js` (export Postgres)

## Tests

Des tests unitaires sont présents avec [Vitest](https://vitest.dev/). Pour les lancer :

```bash
pnpm test
```
