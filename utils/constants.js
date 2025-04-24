/* ===== CONSTANTES ===== */
const SEARCH_AREAS     = ['Lyon', 'Métropole de Lyon']; // plusieurs relations
const SCRAPING_DELAY   = 1_000;
const CONCURRENCY      = 5;
const RETRY_COUNT      = 3;
const RETRY_DELAY_MS   = 1_000;

const SHOP_TYPES = [
  { tag: 'shop=clothes',      label: 'Vêtements'          },
  { tag: 'shop=bags',         label: 'Maroquinerie'       },
  { tag: 'shop=shoes',        label: 'Chaussures'         },
  { tag: 'shop=jewelry',      label: 'Bijoux'             },
  { tag: 'shop=car_parts',    label: 'Équipement Auto'    },
  { tag: 'shop=electronics',  label: 'Électronique / LED' },
  { tag: 'shop=doityourself', label: 'Bricolage'          },
  { tag: 'shop=furniture',    label: 'Meubles'            }
];

export {
  SEARCH_AREAS,
  SCRAPING_DELAY,
  CONCURRENCY,
  RETRY_COUNT,
  RETRY_DELAY_MS,
  SHOP_TYPES
};