const TestHelpers = require('./test-helpers');

describe('Content Analysis', () => {
  const testHelpers = new TestHelpers('content-analysis');

  beforeEach(async() => {
    await testHelpers.setupTestDir();
  });

  afterEach(async() => {
    await testHelpers.cleanupTestDir();
  });

  test('should correctly count lines, words, and characters', async() => {
    // Create a test file with known content
    const knownContent = 'Hello world!\nThis is line two.\nLine three here.';
    const knownTestFile = await testHelpers.createTestFile('known.txt', knownContent);

    // Verify the file exists before running CLI
    const fs = require('fs-extra');
    expect(await fs.pathExists(knownTestFile)).toBe(true);

    // Run the CLI command
    testHelpers.runCLI(knownTestFile);

    // Read and parse the output
    const outputData = await testHelpers.readOutputJSON('known.json');

    // Verify structure using helpers
    testHelpers.assertBasicStructure(outputData);
    testHelpers.assertTextContent(outputData);

    // Verify counts
    expect(outputData.content.lineCount).toBe(3);
    expect(outputData.content.characterCount).toBe(knownContent.length);
    expect(outputData.content.wordCount).toBe(9); // "Hello", "world!", "This", "is", "line", "two.", "Line", "three", "here."
    expect(outputData.content.rawContent).toBe(knownContent);
  });

  test('should handle empty files', async() => {
    // Create an empty test file
    const emptyTestFile = await testHelpers.createTestFile('empty.txt', '');

    // Run the CLI command
    testHelpers.runCLI(emptyTestFile);

    // Read and parse the output
    const outputData = await testHelpers.readOutputJSON('empty.json');

    // Verify structure using helpers
    testHelpers.assertBasicStructure(outputData);
    testHelpers.assertTextContent(outputData);

    // Verify counts for empty file
    expect(outputData.content.lineCount).toBe(1); // Empty file still has 1 line
    expect(outputData.content.characterCount).toBe(0);
    expect(outputData.content.wordCount).toBe(0);
    expect(outputData.content.rawContent).toBe('');
  });
});
