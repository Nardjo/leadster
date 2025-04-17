import { describe, it, expect } from 'vitest';
import { isShopInAirtable } from '../utils/airtableHelpers.js';

describe('isShopInAirtable', () => {
  it('should return false if airtableRecords is empty', () => {
    const shop = { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' };
    expect(isShopInAirtable(shop, [])).toBe(false);
  });

  it('should return false if airtableRecords is null', () => {
    const shop = { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' };
    expect(isShopInAirtable(shop, null)).toBe(false);
  });

  it('should return true if Instagram handle matches', () => {
    const shop = { Nom: 'shopname', URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { Nom: 'shopname', URL_Site: 'https://different.com', Type_Commerce: 'Chaussures' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(true);
  });

  it('should return true if URL and type match exactly', () => {
    const shop = { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(true);
  });

  it('should return true if URLs match after normalization (protocol difference)', () => {
    const shop = { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { URL_Site: 'http://www.example.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(true);
  });

  it('should return true if URLs match after normalization (trailing slash)', () => {
    const shop = { URL_Site: 'https://www.example.com/', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(true);
  });

  it('should return true if URLs match after normalization (case difference)', () => {
    const shop = { URL_Site: 'https://www.EXAMPLE.com', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(true);
  });

  it('should return true if URLs match after normalization (protocol, case, and trailing slash)', () => {
    const shop = { URL_Site: 'https://www.EXAMPLE.com/', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { URL_Site: 'http://www.example.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(true);
  });

  it('should return false if URLs are different after normalization', () => {
    const shop = { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { URL_Site: 'https://www.different.com', Type_Commerce: 'Vêtements' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(false);
  });

  it('should return false if URLs match but types are different', () => {
    const shop = { URL_Site: 'https://www.example.com', Type_Commerce: 'Vêtements' };
    const airtableRecords = [
      { URL_Site: 'https://www.example.com', Type_Commerce: 'Chaussures' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(false);
  });

  // Test specific to the issue described
  it('should correctly identify histoiredor.com URL as a match', () => {
    const shop = { URL_Site: 'https://www.histoiredor.com/fr_FR/details/magasin/?storeID=433', Type_Commerce: 'Bijoux' };
    const airtableRecords = [
      { URL_Site: 'https://www.histoiredor.com/fr_FR/details/magasin/?storeID=433/', Type_Commerce: 'Bijoux' }
    ];
    expect(isShopInAirtable(shop, airtableRecords)).toBe(true);
  });
});