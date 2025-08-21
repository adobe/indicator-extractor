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

import { BMFF, JPEG, PNG } from '@trustnxt/c2pa-ts/asset';
import { ManifestStore } from '@trustnxt/c2pa-ts/manifest';
import { SuperBox } from '@trustnxt/c2pa-ts/jumbf';
import { generateIndicatorSet } from './indicatorSet.js';


/**
 * Process C2PA manifests from a file
 * @param {Buffer} fileBuffer - File buffer
 * @returns {Promise<Object>} C2PA information object
 */
async function processManifestStore(fileBuffer, asIndicatorSet) {
  const c2paInfo = {
    hasManifestStore: false,
    manifestCount: 0,
    validationStatus: 'not_applicable',
    manifests: [],
    error: null,
    fileFormat: 'unknown',
    indicatorSet: null,
  };

  try {
    // Create asset based on file format
    let asset;
    if (JPEG.canRead(fileBuffer)) {
      asset = new JPEG(fileBuffer);
      c2paInfo.fileFormat = 'JPEG';
    } else if (PNG.canRead(fileBuffer)) {
      asset = new PNG(fileBuffer);
      c2paInfo.fileFormat = 'PNG';
    } else if (BMFF.canRead(fileBuffer)) {
      asset = new BMFF(fileBuffer);
      c2paInfo.fileFormat = 'BMFF';
    } else {
      c2paInfo.error = 'Unsupported file format for C2PA processing';
      return c2paInfo;
    }

    // Try to extract manifest store
    const jumbfData = asset.getManifestJUMBF();
    if (jumbfData && jumbfData.length > 0) {
      c2paInfo.hasManifestStore = true;
      c2paInfo.manifestCount = 1; // Assuming one manifest for simplicity

      let validationResult;

      try {
        // Deserialize the JUMBF box structure
        const superBox = SuperBox.fromBuffer(jumbfData);

        // Read the manifest store from the JUMBF container
        const manStore = ManifestStore.read(superBox);
        c2paInfo.manifestCount = manStore.manifests.length;

        // Validate the active manifest
        // do this up front, since we will want the results in the indicator set
        validationResult = await manStore.validate(asset);

        if (asIndicatorSet) {
          c2paInfo.indicatorSet = generateIndicatorSet(manStore, validationResult, fileBuffer);
        } else {
          for (const manifest of manStore.manifests) {
            c2paInfo.manifests.push({
              // index: manifest.index,
              label: manifest.label || null,
              assertionCount: manifest.assertionCount || 0,
              assertions: manifest.assertions.assertions ? manifest.assertions.assertions.map(assertion => ({
                label: assertion.label || null,
              })) : [],
              claim: {
                version: manifest.claim?.version || null,
                title: manifest.claim?.title || null,
                instanceID: manifest.claim?.instanceID || null,
                claimGenerator: manifest.claim?.claimGeneratorInfo
                  ? manifest.claim.claimGeneratorInfo
                  : manifest.claim?.claimGeneratorName || null,
                defaultAlgorithm: manifest.claim?.defaultAlgorithm || null,
                signatureRef: manifest.claim?.signatureRef || null,
              },
              signature: {
                algorithm: manifest.signature.signatureData?.algorithm || null,
                certificate: {
                  issuer: manifest.signature.signatureData?.certificate?.issuer || null,
                  subject: manifest.signature.signatureData?.certificate?.subject || null,
                  serialNumber: manifest.signature.signatureData?.certificate?.serialNumber || null,
                  notBefore: manifest.signature.signatureData?.certificate?.notBefore || null,
                  notAfter: manifest.signature.signatureData?.certificate?.notAfter || null,
                },
              },
            });
          }
        }


        // Extract safe validation info
        c2paInfo.validationStatus = {
          isValid: validationResult.isValid || false,
          error: validationResult.error || null,
          validationErrors: Array.isArray(validationResult.validationErrors)
            ? validationResult.validationErrors.map(err => err.toString())
            : [],
        };
      } catch (e) {
        // Gracefully handle any exceptions to make sure we get a well-formed validation result
        c2paInfo.validationStatus = {
          isValid: false,
          error: `${e.name}`,
          code: e.code || null,
          explanation: e.explanation || null,
          uri: e.uri.uri || null,
        };

        if (asIndicatorSet) {
          c2paInfo.indicatorSet = generateIndicatorSet(null, null, fileBuffer);
          c2paInfo.indicatorSet.validation_status = c2paInfo.validationStatus;
        }
      }
    }
  } catch (error) {
    // File might not have C2PA data, or there might be another issue
    if (error.message.includes('No manifest found') || error.message.includes('not found')) {
      c2paInfo.validationStatus = 'no_manifest';
    } else {
      c2paInfo.error = error.message;
      c2paInfo.validationStatus = 'error';
    }
  }

  return c2paInfo;
}

export { processManifestStore };

