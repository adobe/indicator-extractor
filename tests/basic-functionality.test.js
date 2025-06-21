const fs = require('fs-extra');
const path = require('path');
const TestHelpers = require('./test-helpers');

describe('Basic CLI Functionality', () => {
  const testHelpers = new TestHelpers('basic-functionality');

  beforeEach(async() => {
    await testHelpers.setupTestDir();
  });

  afterEach(async() => {
    await testHelpers.cleanupTestDir();
  });

  test('should process a file and create JSON output', async() => {
    await testHelpers.processFileAndValidate(
      testHelpers.testInputFile,
      'test.json',
      {
        expectedExtension: '.txt',
        hasTextContent: true,
        customAssertions: (outputData, result) => {
          expect(outputData.content.lineCount).toBeGreaterThan(0);
          expect(outputData.content.wordCount).toBeGreaterThan(0);

          // Check CLI output message
          expect(result).toContain('File processed successfully!');
        },
      },
    );
  });

  test('should create pretty printed JSON when --pretty flag is used', async() => {
    const outputFile = path.join(testHelpers.testDir, 'test.json');

    // Run the CLI command with --pretty flag
    testHelpers.runCLI(testHelpers.testInputFile, testHelpers.testDir, ['--pretty']);

    // Read the output
    const outputContent = await fs.readFile(outputFile, 'utf8');

    // Check that it's pretty printed (contains newlines and indentation)
    expect(outputContent).toMatch(/\n/);
    expect(outputContent).toMatch(/ {2}/);
  });

  test('should create minified JSON by default', async() => {
    const outputFile = path.join(testHelpers.testDir, 'test.json');

    // Run the CLI command without --pretty flag
    testHelpers.runCLI(testHelpers.testInputFile);

    // Read the output
    const outputContent = await fs.readFile(outputFile, 'utf8');

    // Check that it's minified (no unnecessary whitespace)
    expect(outputContent).not.toMatch(/\n {2}/);
  });
});
