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

describe('Error Handling', () => {
  const testHelpers = new TestHelpers('error-handling');

  beforeEach(async() => {
    await testHelpers.setupTestDir();
  });

  afterEach(async() => {
    await testHelpers.cleanupTestDir();
  });

  test('should fail gracefully when input file does not exist', () => {
    const nonExistentFile = path.join(__dirname, 'nonexistent.txt');

    expect(() => {
      testHelpers.runCLI(nonExistentFile);
    }).toThrow();
  });

  test('should create output directory if it does not exist', async() => {
    const deepOutputDir = path.join(testHelpers.testDir, 'deep', 'nested', 'dir');
    const outputFile = path.join(deepOutputDir, 'test.json');

    // Run the CLI command
    testHelpers.runCLI(testHelpers.testInputFile, deepOutputDir);

    // Check that output directory and file were created
    expect(await fs.pathExists(deepOutputDir)).toBe(true);
    expect(await fs.pathExists(outputFile)).toBe(true);
  });
});
