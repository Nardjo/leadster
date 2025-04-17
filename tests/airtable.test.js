import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import the functions to test
import {
  ensureResultsDirectoryExists,
  findMostRecentResultsFile,
  loadDataFromFile
} from '../utils/testHelpers.js';

// Mock the fs module
vi.mock('fs');

describe('ensureResultsDirectoryExists', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  it('should create the results directory if it does not exist', () => {
    // Setup: Directory doesn't exist
    fs.existsSync.mockReturnValue(false);
    
    // Call the function
    const resultsDir = ensureResultsDirectoryExists();
    
    // Verify the directory was created
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('results'), { recursive: true });
    expect(resultsDir).toContain('results');
  });

  it('should not create the directory if it already exists', () => {
    // Setup: Directory exists
    fs.existsSync.mockReturnValue(true);
    
    // Call the function
    const resultsDir = ensureResultsDirectoryExists();
    
    // Verify the directory was not created
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(resultsDir).toContain('results');
  });
});

describe('findMostRecentResultsFile', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    
    // Mock ensureResultsDirectoryExists to return a fixed path
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  it('should return null if no results files exist', () => {
    // Setup: No JSON files in directory
    fs.readdirSync.mockReturnValue([]);
    
    // Call the function
    const result = findMostRecentResultsFile();
    
    // Verify the result
    expect(result).toBeNull();
  });

  it('should return the most recent file based on modification time', () => {
    // Setup: Multiple JSON files with different modification times
    const files = ['file1.json', 'file2.json', 'file3.json'];
    fs.readdirSync.mockReturnValue(files);
    
    // Mock stat to return different modification times
    const mockStats = {
      'file1.json': { mtime: new Date('2023-01-01') },
      'file2.json': { mtime: new Date('2023-01-03') }, // Most recent
      'file3.json': { mtime: new Date('2023-01-02') }
    };
    
    fs.statSync.mockImplementation((filePath) => {
      const fileName = path.basename(filePath);
      return mockStats[fileName];
    });
    
    // Call the function
    const result = findMostRecentResultsFile();
    
    // Verify the result contains the most recent file
    expect(result).toContain('file2.json');
  });
});

describe('loadDataFromFile', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  it('should return an empty array if the file path is null', () => {
    const result = loadDataFromFile(null);
    expect(result).toEqual([]);
  });

  it('should return an empty array if the file does not exist', () => {
    // Setup: File doesn't exist
    fs.existsSync.mockReturnValue(false);
    
    const result = loadDataFromFile('nonexistent.json');
    expect(result).toEqual([]);
  });

  it('should load and parse JSON data from a file', () => {
    // Setup: File exists
    fs.existsSync.mockReturnValue(true);
    
    // Mock file content
    const mockData = [
      { Nom: 'shop1', URL_Site: 'https://shop1.com', Type_Commerce: 'Vêtements' },
      { Nom: 'shop2', URL_Site: 'https://shop2.com', Type_Commerce: 'Chaussures' }
    ];
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));
    
    // Call the function
    const result = loadDataFromFile('test.json');
    
    // Verify the result
    expect(result).toEqual(mockData);
    expect(fs.readFileSync).toHaveBeenCalledWith('test.json', 'utf8');
  });

  it('should handle JSON parsing errors', () => {
    // Setup: File exists but contains invalid JSON
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('invalid json');
    
    // Mock console.error to prevent test output pollution
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call the function
    const result = loadDataFromFile('invalid.json');
    
    // Verify the result
    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});