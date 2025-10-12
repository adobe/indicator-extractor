/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

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

  test('should process multiple files with wildcards', async() => {
    // Create multiple test files
    const testFile1 = await testHelpers.createTestFile('file1.txt', 'Content of file 1');
    const testFile2 = await testHelpers.createTestFile('file2.txt', 'Content of file 2');
    const testFile3 = await testHelpers.createTestFile('file3.txt', 'Content of file 3');

    // Run CLI with multiple files
    const result = testHelpers.runCLI([testFile1, testFile2, testFile3], testHelpers.testDir, ['--pretty']);

    // Check that all output files were created
    const outputFile1 = path.join(testHelpers.testDir, 'file1.json');
    const outputFile2 = path.join(testHelpers.testDir, 'file2.json');
    const outputFile3 = path.join(testHelpers.testDir, 'file3.json');

    expect(await fs.pathExists(outputFile1)).toBe(true);
    expect(await fs.pathExists(outputFile2)).toBe(true);
    expect(await fs.pathExists(outputFile3)).toBe(true);

    // Check CLI output contains summary
    expect(result).toContain('Summary:');
    expect(result).toContain('Total files: 3');
    expect(result).toContain('Successful: 3');

    // Verify content of one file
    const output1Data = JSON.parse(await fs.readFile(outputFile1, 'utf8'));
    expect(output1Data.content.rawContent).toBe('Content of file 1');
  });

  test('should handle errors gracefully when processing multiple files', async() => {
    // Create one valid test file and reference one non-existent file
    const validFile = await testHelpers.createTestFile('valid.txt', 'Valid content');
    const invalidFile = path.join(testHelpers.testDir, 'nonexistent.txt');

    // Run CLI with mixed valid/invalid files
    const result = testHelpers.runCLI([validFile, invalidFile], testHelpers.testDir, ['--pretty']);

    // Check that valid file was processed
    const validOutputFile = path.join(testHelpers.testDir, 'valid.json');
    expect(await fs.pathExists(validOutputFile)).toBe(true);

    // Check CLI output contains summary
    expect(result).toContain('Summary:');
    expect(result).toContain('Total files: 2');
    expect(result).toContain('Successful: 1');
    expect(result).toContain('Failed: 1');

    // Verify the valid file's content
    const validOutputData = JSON.parse(await fs.readFile(validOutputFile, 'utf8'));
    expect(validOutputData.content.rawContent).toBe('Valid content');
  });
});
