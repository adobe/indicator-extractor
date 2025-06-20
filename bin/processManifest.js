import { BMFF, JPEG, PNG } from '@trustnxt/c2pa-ts/asset';
import { ManifestStore } from '@trustnxt/c2pa-ts/manifest';
import { SuperBox } from '@trustnxt/c2pa-ts/jumbf';
import { ValidationResult } from '@trustnxt/c2pa-ts/manifest';

/**
 * Process C2PA manifests from a file
 * @param {Buffer} fileBuffer - File buffer
 * @returns {Promise<Object>} C2PA information object
 */
async function processManifestStore(fileBuffer) {
  const c2paInfo = {
    hasManifest: false,
    manifestCount: 0,
    validationStatus: 'not_applicable',
    manifests: [],
    error: null,
    fileFormat: 'unknown',
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
        console.log('JUMBF structure:');
        console.log(superBox.toString());

        // Read the manifest store from the JUMBF container
        const manifests = ManifestStore.read(superBox);

        // Validate the active manifest
        validationResult = await manifests.validate(asset);
      } catch (e) {
        // Gracefully handle any exceptions to make sure we get a well-formed validation result
        validationResult = ValidationResult.fromError(e);
      }

      c2paInfo.validationStatus = validationResult;
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

