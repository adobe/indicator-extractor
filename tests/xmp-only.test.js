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

const path = require('path');
const TestHelpers = require('./test-helpers');

describe('XMP-only Processing', () => {
  const testHelpers = new TestHelpers('xmp-only');

  beforeEach(async () => {
    await testHelpers.setupTestDir();
  });

  afterEach(async () => {
    await testHelpers.cleanupTestDir();
  });

  test('should process XMP-only-example1.jpg and extract XMP metadata without C2PA manifests', async () => {
    const xmpOnlyFile = path.join(testHelpers.testFilesDir, 'XMP-only-example1.jpg');

    await testHelpers.processFileAndValidate(
      xmpOnlyFile,
      'XMP-only-example1.json',
      {
        expectedExtension: '.jpg',
        expectedFileName: 'XMP-only-example1.jpg',
        expectedFormat: 'JPEG',
        expectedC2PA: true,
        customAssertions: (outputData, result) => {
          // This file should NOT have C2PA manifests
          expect(outputData.c2pa.hasManifestStore).toBe(false);
          expect(outputData.c2pa.manifestCount).toBe(0);
          expect(outputData.c2pa.manifests).toEqual([]);
          expect(outputData.c2pa.validationStatus).toBe('not_applicable');

          // Should have XMP metadata in the indicator set structure
          expect(outputData.c2pa).toHaveProperty('indicatorSet');
          expect(outputData.c2pa.indicatorSet).toHaveProperty('metadata');

          const metadata = outputData.c2pa.indicatorSet.metadata;

          // Verify XMP MM metadata
          expect(metadata).toHaveProperty('xmpMM');
          expect(metadata.xmpMM).toHaveProperty('OriginalDocumentID');
          expect(metadata.xmpMM).toHaveProperty('DocumentID');
          expect(metadata.xmpMM).toHaveProperty('InstanceID');
          expect(metadata.xmpMM.OriginalDocumentID).toBe('xmp.did:129191f5-5fa5-4ee3-abc5-47b606f3bce8');
          expect(metadata.xmpMM.DocumentID).toBe('xmp.did:554486fa-db03-4f9b-a7b1-232f7fb710f4');
          expect(metadata.xmpMM.InstanceID).toBe('xmp.iid:554486fa-db03-4f9b-a7b1-232f7fb710f4');

          // Verify XMP metadata
          expect(metadata).toHaveProperty('xmp');
          expect(metadata.xmp).toHaveProperty('MetadataDate');
          expect(metadata.xmp.MetadataDate).toBe('2025-09-30T12:30:06-04:00');

          // Verify PLUS metadata
          expect(metadata).toHaveProperty('plus');
          expect(metadata.plus).toHaveProperty('ImageSupplierImageID');
          expect(metadata.plus).toHaveProperty('ImageSupplier');
          expect(metadata.plus.ImageSupplierImageID).toBe('d3136ee3-0fe8-4283-926a-7f644e58f461');
          expect(metadata.plus.ImageSupplier.ImageSupplierName).toBe('Adobe');

          // Verify IPTC4XMP Extension metadata
          expect(metadata).toHaveProperty('iptc4xmpExt');
          expect(metadata.iptc4xmpExt).toHaveProperty('AODateCreated');
          expect(metadata.iptc4xmpExt).toHaveProperty('DigitalSourceType');
          expect(metadata.iptc4xmpExt).toHaveProperty('Contributor');
          expect(metadata.iptc4xmpExt.AODateCreated).toBe('2025-09-09T16:00:49.035Z');
          expect(metadata.iptc4xmpExt.DigitalSourceType).toBe('http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia');
          expect(metadata.iptc4xmpExt.Contributor.Name.value).toBe('Adobe Firefly 3.1');

          // Verify EXIF metadata
          expect(metadata).toHaveProperty('ifd0');
          expect(metadata.ifd0).toHaveProperty('XResolution');
          expect(metadata.ifd0).toHaveProperty('YResolution');
          expect(metadata.ifd0).toHaveProperty('ResolutionUnit');
          expect(metadata.ifd0.XResolution).toBe(300);
          expect(metadata.ifd0.YResolution).toBe(300);
          expect(metadata.ifd0.ResolutionUnit).toBe('inches');

          expect(metadata).toHaveProperty('exif');
          expect(metadata.exif).toHaveProperty('ExifVersion');
          expect(metadata.exif).toHaveProperty('ColorSpace');
          expect(metadata.exif.ExifVersion).toBe('2.3.1');
          expect(metadata.exif.ColorSpace).toBe(1);

          // Check CLI output indicates no C2PA manifests
          expect(result).toContain('C2PA: No manifests found');
        },
      },
    );
  });

  test('should process XMP-only-example1.jpg and generate indicator set file by default', async () => {
    const xmpOnlyFile = path.join(testHelpers.testFilesDir, 'XMP-only-example1.jpg');
    const outputFileName = 'XMP-only-example1.json';
    const indicatorFileName = 'XMP-only-example1-indicators.json';

    const outputFile = path.join(testHelpers.testDir, outputFileName);
    const indicatorSetFile = path.join(testHelpers.testDir, indicatorFileName);

    // Run the CLI command (indicator set generated by default)
    const result = testHelpers.runCLI(xmpOnlyFile, testHelpers.testDir, []);

    // Check that both output files were created
    expect(await require('fs-extra').pathExists(outputFile)).toBe(true);
    expect(await require('fs-extra').pathExists(indicatorSetFile)).toBe(true);

    // Read and parse the main output
    const outputData = await testHelpers.readOutputJSON(outputFileName);

    // Verify basic structure
    testHelpers.assertBasicStructure(outputData);
    testHelpers.assertC2PAStructure(outputData);

    // Read and parse the indicator set output
    const indicatorSetData = await testHelpers.readOutputJSON(indicatorFileName);

    // Verify indicator set structure for XMP-only file
    expect(indicatorSetData).toHaveProperty('@context');
    expect(Array.isArray(indicatorSetData['@context'])).toBe(true);
    expect(indicatorSetData['@context']).toContain('https://jpeg.org/jpegtrust');

    // Should have no manifests since it's XMP-only
    expect(indicatorSetData).toHaveProperty('manifests');
    expect(Array.isArray(indicatorSetData.manifests)).toBe(true);
    expect(indicatorSetData.manifests).toEqual([]);

    // Should have content (empty for this file)
    expect(indicatorSetData).toHaveProperty('content');
    expect(typeof indicatorSetData.content).toBe('object');

    // Should have metadata from XMP
    expect(indicatorSetData).toHaveProperty('metadata');
    expect(typeof indicatorSetData.metadata).toBe('object');

    // Verify XMP metadata is present in the indicator set
    const metadata = indicatorSetData.metadata;
    expect(metadata).toHaveProperty('xmpMM');
    expect(metadata).toHaveProperty('xmp');
    expect(metadata).toHaveProperty('plus');
    expect(metadata).toHaveProperty('iptc4xmpExt');
    expect(metadata).toHaveProperty('ifd0');
    expect(metadata).toHaveProperty('exif');

    // Check CLI output mentions Trust Indicator Set
    expect(result).toContain('Trust Indicator Set:');
    expect(result).toContain(indicatorFileName);
  });
});
