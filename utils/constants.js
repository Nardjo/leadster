/* ===== CONSTANTES ===== */
const SEARCH_AREAS = [
  'Marseille',
  'Métropole de Marseille',
  'Paris', 'Métropole de Paris',
  'Lyon',
  'Métropole de Lyon',
  'Monpellier',
  'Métropole de Monpellier']
const SCRAPING_DELAY   = 1_000;
const CONCURRENCY      = 10;
const RETRY_COUNT      = 2;
const RETRY_DELAY_MS   = 1_000;

const SHOP_TYPES = [
  { tag: 'shop=clothes',      label: 'Vêtements'          },
  { tag: 'shop=bags',         label: 'Maroquinerie'       },
  { tag: 'shop=shoes',        label: 'Chaussures'         },
  { tag: 'shop=jewelry',      label: 'Bijoux'             },
  { tag: 'shop=car_parts',    label: 'Équipement Auto'    },
  { tag: 'shop=electronics',  label: 'Électronique / LED' },
  { tag: 'shop=furniture',    label: 'Meubles'            },
  // Ajouts pour sites refaisables
  { tag: 'site=vitrine',      label: 'Site vitrine'       },
  { tag: 'site=artisan',      label: 'Artisan'            },
  { tag: 'site=coach',        label: 'Coach / Consultant' },
  { tag: 'site=portfolio',    label: 'Portfolio'          },
  { tag: 'site=restaurant',   label: 'Restaurant / Café'  },
  { tag: 'site=agence',       label: 'Agence'             },
  { tag: 'site=service',      label: 'Service local'      },
  { tag: 'site=blog',         label: 'Blog'               }
];

export {
  CONCURRENCY,
  RETRY_COUNT,
  RETRY_DELAY_MS, SCRAPING_DELAY, SEARCH_AREAS, SHOP_TYPES
}
