/* ===== CONSTANTES ===== */
const SEARCH_AREAS     = ['Montpellier', 'Métropole de Montpellier']; // plusieurs relations
const SCRAPING_DELAY   = 1_000;
const CONCURRENCY      = 5;
const RETRY_COUNT      = 3;
const RETRY_DELAY_MS   = 1_000;

const SHOP_TYPES = [
  // { tag: 'shop=clothes',      label: 'Vêtements'          },
  // { tag: 'shop=bags',         label: 'Maroquinerie'       },
  // { tag: 'shop=shoes',        label: 'Chaussures'         },
  // { tag: 'shop=jewelry',      label: 'Bijoux'             },
  // { tag: 'shop=car_parts',    label: 'Équipement Auto'    },
  // { tag: 'shop=electronics',  label: 'Électronique / LED' },
  // { tag: 'shop=furniture',    label: 'Meubles'            }
  { tag: 'craft',               label: 'Artisan' },
  { tag: 'office=consultant',   label: 'Coach / Consultant' },
  { tag: 'office',              label: 'Agence / Bureau' },
  { tag: 'amenity=restaurant',  label: 'Restaurant' },
  { tag: 'amenity=cafe',        label: 'Café' },
  { tag: 'shop=estate_agent',   label: 'Agence immobilière' }
];

export {
  CONCURRENCY,
  RETRY_COUNT,
  RETRY_DELAY_MS, SCRAPING_DELAY, SEARCH_AREAS, SHOP_TYPES
}
