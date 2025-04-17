import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Mock the fs module
vi.mock('fs');

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the functions to test
// Since the functions in search.js are not exported, we'll need to extract them for testing
// This is a simplified version for demonstration purposes
import {
  extractInstagramHandle,
  generateTimestampFilename,
  filterDuplicates,
  isShopDuplicate,
  isWebsiteAlreadyProcessed
} from '../utils/testHelpers.js';

describe('extractInstagramHandle', () => {
  it('should extract Instagram handle from standard URL', () => {
    const url = 'https://www.instagram.com/shopname';
    expect(extractInstagramHandle(url)).toBe('shopname');
  });

  it('should extract Instagram handle from URL with trailing slash', () => {
    const url = 'https://www.instagram.com/shopname/';
    expect(extractInstagramHandle(url)).toBe('shopname');
  });

  it('should extract Instagram handle from URL with query parameters', () => {
    const url = 'https://www.instagram.com/shopname?hl=en';
    expect(extractInstagramHandle(url)).toBe('shopname');
  });

  it('should return null for non-Instagram URL', () => {
    const url = 'https://www.facebook.com/shopname';
    expect(extractInstagramHandle(url)).toBe(null);
  });

  it('should exclude common non-username paths', () => {
    const url = 'https://www.instagram.com/p/somepost/';
    expect(extractInstagramHandle(url)).toBe(null);
  });
});

describe('generateTimestampFilename', () => {
  beforeEach(() => {
    // Mock Date to return a fixed date
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate a filename with the correct format', () => {
    expect(generateTimestampFilename()).toBe('2023-01-01_12-30.json');
  });
});

describe('isShopDuplicate', () => {
  it('should return true if shop with same Instagram handle exists', () => {
    const shop = { Nom: 'shopname', URL_Site: 'https://shop.com', Type_Commerce: 'Vêtements' };
    const previousResults = [
      { Nom: 'shopname', URL_Site: 'https://different.com', Type_Commerce: 'Chaussures' }
    ];
    expect(isShopDuplicate(shop, previousResults)).toBe(true);
  });

  it('should return true if shop with same URL and type exists', () => {
    const shop = { Nom: 'newname', URL_Site: 'https://shop.com', Type_Commerce: 'Vêtements' };
    const previousResults = [
      { Nom: 'oldname', URL_Site: 'https://shop.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isShopDuplicate(shop, previousResults)).toBe(true);
  });

  it('should return false if shop is unique', () => {
    const shop = { Nom: 'shopname', URL_Site: 'https://shop.com', Type_Commerce: 'Vêtements' };
    const previousResults = [
      { Nom: 'othername', URL_Site: 'https://other.com', Type_Commerce: 'Chaussures' }
    ];
    expect(isShopDuplicate(shop, previousResults)).toBe(false);
  });
});

describe('isWebsiteAlreadyProcessed', () => {
  it('should return true if website with same URL and type exists', () => {
    const shop = { website: 'https://shop.com', type: 'Vêtements' };
    const previousResults = [
      { URL_Site: 'https://shop.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isWebsiteAlreadyProcessed(shop, previousResults)).toBe(true);
  });

  it('should return false if website is not in previous results', () => {
    const shop = { website: 'https://shop.com', type: 'Vêtements' };
    const previousResults = [
      { URL_Site: 'https://other.com', Type_Commerce: 'Chaussures' }
    ];
    expect(isWebsiteAlreadyProcessed(shop, previousResults)).toBe(false);
  });
});

describe('filterDuplicates', () => {
  it('should return all shops if previousResults is empty', () => {
    const newResults = [
      { Nom: 'shop1', URL_Site: 'https://shop1.com', Type_Commerce: 'Vêtements' },
      { Nom: 'shop2', URL_Site: 'https://shop2.com', Type_Commerce: 'Chaussures' }
    ];
    const previousResults = [];
    expect(filterDuplicates(newResults, previousResults)).toEqual(newResults);
  });

  it('should filter out duplicate shops', () => {
    const newResults = [
      { Nom: 'shop1', URL_Site: 'https://shop1.com', Type_Commerce: 'Vêtements' },
      { Nom: 'shop2', URL_Site: 'https://shop2.com', Type_Commerce: 'Chaussures' },
      { Nom: 'shop3', URL_Site: 'https://shop3.com', Type_Commerce: 'Bijoux' }
    ];
    const previousResults = [
      { Nom: 'shop1', URL_Site: 'https://shop1.com', Type_Commerce: 'Vêtements' },
      { Nom: 'shop4', URL_Site: 'https://shop4.com', Type_Commerce: 'Librairie' }
    ];
    const expected = [
      { Nom: 'shop2', URL_Site: 'https://shop2.com', Type_Commerce: 'Chaussures' },
      { Nom: 'shop3', URL_Site: 'https://shop3.com', Type_Commerce: 'Bijoux' }
    ];
    expect(filterDuplicates(newResults, previousResults)).toEqual(expected);
  });
});