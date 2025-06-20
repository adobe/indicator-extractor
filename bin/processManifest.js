import { BMFF, JPEG, PNG } from '@trustnxt/c2pa-ts/asset';
import { ManifestStore } from '@trustnxt/c2pa-ts/manifest';
import { SuperBox } from '@trustnxt/c2pa-ts/jumbf';


function getIndicatorSet(manifestStore) {
  const indicatorSet = {
    manifests: [],
  };

  for (const manifest of manifestStore.manifests) {
    indicatorSet.manifests.push({
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

  return indicatorSet;
}

/**
 * Process C2PA manifests from a file
 * @param {Buffer} fileBuffer - File buffer
 * @returns {Promise<Object>} C2PA information object
 */
async function processManifestStore(fileBuffer, asIndicatorSet) {
  const c2paInfo = {
    hasManifest: false,
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
      c2paInfo.hasManifest = true;
      c2paInfo.manifestCount = 1; // Assuming one manifest for simplicity

      let validationResult;

      try {
        // Deserialize the JUMBF box structure
        const superBox = SuperBox.fromBuffer(jumbfData);

        // Read the manifest store from the JUMBF container
        const manStore = ManifestStore.read(superBox);
        c2paInfo.manifestCount = manStore.manifests.length;

        if ( asIndicatorSet ) {
          c2paInfo.indicatorSet = getIndicatorSet(manStore);
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

          // Validate the active manifest
          validationResult = await manStore.validate(asset);

          // Extract safe validation info
          c2paInfo.validationStatus = {
            isValid: validationResult.isValid || false,
            error: validationResult.error || null,
            validationErrors: Array.isArray(validationResult.validationErrors)
              ? validationResult.validationErrors.map(err => err.toString())
              : [],
          };
        }
      } catch (e) {
        // Gracefully handle any exceptions to make sure we get a well-formed validation result
        c2paInfo.validationStatus = {
          isValid: false,
          error: e.message,
          validationErrors: [],
        };
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

