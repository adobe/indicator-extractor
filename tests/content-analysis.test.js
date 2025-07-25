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

    await testHelpers.createFileAndProcess(
      'known.txt',
      knownContent,
      'known.json',
      {
        expectedExtension: '.txt',
        hasTextContent: true,
        customAssertions: (outputData) => {
          // Verify counts
          expect(outputData.content.lineCount).toBe(3);
          expect(outputData.content.characterCount).toBe(knownContent.length);
          expect(outputData.content.wordCount).toBe(9); // "Hello", "world!", "This", "is", "line", "two.", "Line", "three", "here."
          expect(outputData.content.rawContent).toBe(knownContent);
        },
      },
    );
  });

  test('should handle empty files', async() => {
    await testHelpers.createFileAndProcess(
      'empty.txt',
      '',
      'empty.json',
      {
        expectedExtension: '.txt',
        hasTextContent: true,
        allowEmptyFile: true,
        customAssertions: (outputData) => {
          // Verify counts for empty file
          expect(outputData.content.lineCount).toBe(1); // Empty file still has 1 line
          expect(outputData.content.characterCount).toBe(0);
          expect(outputData.content.wordCount).toBe(0);
          expect(outputData.content.rawContent).toBe('');
        },
      },
    );
  });
});
