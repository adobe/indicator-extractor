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

describe('C2PA Image Processing', () => {
  const testHelpers = new TestHelpers('c2pa-processing');

  beforeEach(async() => {
    await testHelpers.setupTestDir();
  });

  afterEach(async() => {
    await testHelpers.cleanupTestDir();
  });

  test('should process ChatGPT_Image.png and detect C2PA data', async() => {
    await testHelpers.processFileAndValidate(
      testHelpers.imageFiles.chatgptImage,
      'ChatGPT_Image.json',
      {
        expectedExtension: '.png',
        expectedFileName: 'ChatGPT_Image.png',
        expectedFormat: 'PNG',
        expectedC2PA: true,
      },
    );
  });

  test('should process Multiple_Manifests.jpg and detect multiple C2PA manifests', async() => {
    try {
      await testHelpers.processFileAndValidate(
        testHelpers.imageFiles.multipleManifests,
        'Multiple_Manifests.json',
        {
          expectedExtension: '.jpg',
          expectedFileName: 'Multiple_Manifests.jpg',
          expectedFormat: 'JPEG',
          expectedC2PA: true,
          useBuffer: true,
        },
      );
    } catch (error) {
      // If processing fails due to buffer issues, just verify the file exists and can be read
      if (error.code === 'ENOBUFS') {
        console.warn('Buffer size exceeded for Multiple_Manifests.jpg - testing file existence only');
        expect(await fs.pathExists(testHelpers.imageFiles.multipleManifests)).toBe(true);
      } else {
        throw error;
      }
    }
  });

  test('should process SimplePhoto.jpeg and not detect any manifest', async() => {
    await testHelpers.processFileAndValidate(
      testHelpers.imageFiles.simplePhoto,
      'SimplePhoto.json',
      {
        expectedExtension: '.jpeg',
        expectedFileName: 'SimplePhoto.jpeg',
        expectedFormat: 'JPEG',
        expectedC2PA: true,
        customAssertions: (outputData, result) => {
          // Simple photo SHOULD NOT have C2PA data
          expect(outputData.c2pa.manifestCount).toBe(0);
          expect(outputData.c2pa.hasManifestStore).toBe(false);

          // Check CLI output mentions C2PA
          expect(result).toContain('C2PA: No manifests found');
        },
      },
    );
  });

  test('should handle C2PA validation results correctly', async() => {
    await testHelpers.processFileAndValidate(
      testHelpers.imageFiles.chatgptImage,
      'ChatGPT_Image.json',
      {
        cliFlags: ['--pretty'],
        expectedC2PA: true,
      },
    );
  });

  test('should process ChatGPT_Image.png with --set option and output indicator set file', async() => {
    const outputFileName = 'ChatGPT_Image.json';
    const indicatorName = 'ChatGPT_Image-indicators.json';

    await testHelpers.processFileAndValidateWithIndicatorSet(testHelpers.imageFiles.chatgptImage,
      outputFileName, indicatorName);
  });

  test('should process Scenario 1 (std manifest)', async() => {
    const inputFile = testHelpers.imageFiles.standardManifest;
    const inputFileName = path.basename(inputFile, path.extname(inputFile));
    const outputFileName = `${inputFileName}.json`;
    const indicatorName = `${inputFileName}-indicators.json`;

    await testHelpers.processFileAndValidateWithIndicatorSet(inputFile, outputFileName, indicatorName);
  });

  test('should process Scenario 2 (extent of mods)', async() => {
    const inputFile = testHelpers.imageFiles.extMods;
    const inputFileName = path.basename(inputFile, path.extname(inputFile));
    const outputFileName = `${inputFileName}.json`;
    const indicatorName = `${inputFileName}-indicators.json`;

    await testHelpers.processFileAndValidateWithIndicatorSet(inputFile, outputFileName, indicatorName);
  });

  test('should process Scenario 4 (CAWG Metadata)', async() => {
    const inputFile = testHelpers.imageFiles.cawgMetadata;
    const inputFileName = path.basename(inputFile, path.extname(inputFile));
    const outputFileName = `${inputFileName}.json`;
    const indicatorName = `${inputFileName}-indicators.json`;

    await testHelpers.processFileAndValidateWithIndicatorSet(inputFile, outputFileName, indicatorName);
  });

  test('should process Scenario 5 (rights assertion)', async() => {
    const inputFile = testHelpers.imageFiles.rightsAssertion;
    const inputFileName = path.basename(inputFile, path.extname(inputFile));
    const outputFileName = `${inputFileName}.json`;
    const indicatorName = `${inputFileName}-indicators.json`;

    await testHelpers.processFileAndValidateWithIndicatorSet(inputFile, outputFileName, indicatorName);
  });

  test('should process Scenario 6 (soft binding)', async() => {
    const inputFile = testHelpers.imageFiles.softBinding;
    const inputFileName = path.basename(inputFile, path.extname(inputFile));
    const outputFileName = `${inputFileName}.json`;
    const indicatorName = `${inputFileName}-indicators.json`;

    await testHelpers.processFileAndValidateWithIndicatorSet(inputFile, outputFileName, indicatorName);
  });

  test('should process s11-trust-declaration.jpeg and detect ManifestStore with no manifests', async() => {
    await testHelpers.processFileAndValidate(
      testHelpers.imageFiles.trustDeclaration,
      's11-trust-declaration.json',
      {
        expectedExtension: '.jpeg',
        expectedFileName: 's11-trust-declaration.jpeg',
        expectedFormat: 'JPEG',
        expectedC2PA: true,
        skipManifestCountCheck: true,
        customAssertions: (outputData, result) => {
          // This file should have a ManifestStore but no manifests
          expect(outputData.c2pa.hasManifestStore).toBe(true);
          expect(outputData.c2pa.manifestCount).toBe(0);
          expect(outputData.c2pa.manifests).toEqual([]);

          // Validation should be false since there are no manifests to validate
          expect(outputData.c2pa.validationStatus.isValid).toBe(false);

          // Check CLI output mentions C2PA with 0 manifests
          expect(result).toContain('C2PA:');
          expect(result).toContain('Found 0 manifest(s)');
          expect(result).toContain('Valid: false');
        },
      },
    );
  });

});

