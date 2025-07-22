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
});
