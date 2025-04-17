# Unit Tests for Leadster

This directory contains unit tests for the Leadster application using [Vitest](https://vitest.dev/), a fast and lightweight testing framework for JavaScript.

## Test Structure

The tests are organized by module:

- `index.test.js`: Tests for the main functionality in `search.js`
- `airtable.test.js`: Tests for the Airtable integration in `airtable.js`

## Running Tests

To run the tests, you can use the following npm scripts:

```bash
# Run all tests once
npm test

# Run tests in watch mode (automatically re-run when files change)
npm run test:watch
```

## Test Helpers

The functions from `search.js` and `airtable.js` are not directly exported, so we've created a `utils/testHelpers.js` file that exports these functions for testing purposes. This approach allows us to test the functions without modifying the original source code.

## What's Being Tested

### From search.js:

1. **extractInstagramHandle**: Tests the extraction of Instagram handles from various URL formats
2. **generateTimestampFilename**: Tests the generation of timestamp-based filenames
3. **isShopDuplicate**: Tests the detection of duplicate shops
4. **isWebsiteAlreadyProcessed**: Tests the detection of already processed websites
5. **filterDuplicates**: Tests the filtering of duplicate shops from results

### From airtable.js:

1. **ensureResultsDirectoryExists**: Tests the creation of the results directory
2. **findMostRecentResultsFile**: Tests finding the most recent results file
3. **loadDataFromFile**: Tests loading and parsing JSON data from files

## Adding More Tests

To add more tests:

1. Identify the function you want to test
2. Add the function to `utils/testHelpers.js` if it's not already there
3. Create a new test file or add to an existing one
4. Write test cases covering different scenarios and edge cases

## Best Practices

- Use descriptive test names that explain what's being tested
- Test both normal operation and edge cases
- Mock external dependencies (like the file system) to isolate tests
- Keep tests independent of each other