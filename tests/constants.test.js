import { describe, expect, it } from 'vitest'
import * as constants from '../utils/constants.js'

describe('constants.js', () => {
  it('should export SEARCH_AREAS as an array', () => {
    expect(Array.isArray(constants.SEARCH_AREAS)).toBe(true);
    expect(constants.SEARCH_AREAS.length).toBeGreaterThan(0);
  });
  it('should export SHOP_TYPES as an array with tag and label', () => {
    expect(Array.isArray(constants.SHOP_TYPES)).toBe(true);
    expect(constants.SHOP_TYPES[0]).toHaveProperty('tag');
    expect(constants.SHOP_TYPES[0]).toHaveProperty('label');
  });
  it('should export numeric constants', () => {
    expect(typeof constants.CONCURRENCY).toBe('number');
    expect(typeof constants.RETRY_COUNT).toBe('number');
    expect(typeof constants.RETRY_DELAY_MS).toBe('number');
    expect(typeof constants.SCRAPING_DELAY).toBe('number');
  });
});
