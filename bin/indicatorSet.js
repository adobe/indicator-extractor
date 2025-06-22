/**
 * @fileoverview Indicator Set Generator for C2PA Manifests
 *
 * This module provides functionality to generate JPEG Trust indicator sets
 * from C2PA manifest stores. An indicator set is a structured representation
 * of C2PA manifest data that includes validation status, assertions, and
 * certificate information in a format suitable for trust evaluation.
 *
 * @author Indicator Extractor CLI
 * @version 1.0.0
 */

import ExifReader from 'exifreader';

/**
 * Generates an indicator set from a C2PA manifest store and validation result.
 *
 * An indicator set provides a structured view of C2PA manifest data including:
 * - Manifest metadata and claims
 * - Assertion processing results
 * - Certificate information with parsed distinguished names
 * - Validation status codes for signatures, assertions, and content
 * - Trust status information
 * - File metadata extracted using ExifReader
 *
 * @param {ManifestStore} manifestStore - The C2PA manifest store containing one or more manifests
 * @param {ValidationResult} validationResult - Result of manifest validation containing status codes
 * @param {Buffer} fileBuffer - The file buffer to extract metadata from
 * @returns {Object} Indicator set object with JPEG Trust context and processed manifest data
 *
 * @example
 * ```javascript
 * import { getIndicatorSet } from './indicatorSet.js';
 *
 * const indicatorSet = getIndicatorSet(manifestStore, validationResult, fileBuffer);
 * console.log(indicatorSet.manifests[0].claim.signature_status);
 * console.log(indicatorSet.metadata);
 * ```
 */
function generateIndicatorSet(manifestStore, validationResult, fileBuffer) {
  const indicatorSet = {
    '@context': ['https://jpeg.org/jpegtrust'],
    manifests: [],
    content: {},
    metadata: {},
  };

  /**
   * Extracts and processes metadata from a file buffer using ExifReader.
   *
   * @param {Buffer} fileBuffer - The file buffer to extract metadata from
   * @returns {Object} Processed metadata object or error information
   *
   * @private
   */
  function extractMetadata(fileBuffer) {
    if (!fileBuffer) return {};
    try {
      const tags = ExifReader.load(fileBuffer);

      // Process and structure the metadata
      const processedMetadata = {};

      for (const key of Object.keys(tags)) {
        if (
          tags[key] &&
          typeof tags[key] === 'object' &&
          'value' in tags[key] &&
          tags[key].value !== ''
        ) {
          // Combine multi-word keys into camelCase (e.g., "image description" -> "imageDescription")
          const camelCaseKey = key
            .replace(/[_\s]+([a-zA-Z])/g, (_, c) => c.toUpperCase())
            .replace(/^([A-Z])/, m => m.toLowerCase());
          let sanitizedKey = camelCaseKey.replace(/\//g, '');
          // If key starts with 'iCC', uppercase the starting 'i'
          if (sanitizedKey.startsWith('iCC')) {
            sanitizedKey = sanitizedKey.replace(/^iCC/, 'ICC');
          }
          if (sanitizedKey.startsWith('jFIF')) {
            sanitizedKey = sanitizedKey.replace(/^jFIF/, 'JFIF');
          }
          processedMetadata[sanitizedKey] = tags[key].value;
        }
      }

      return processedMetadata;
    } catch (error) {
      // If metadata extraction fails, return error information
      return {
        extractedAt: new Date().toISOString(),
        source: 'exifreader',
        error: `Failed to extract metadata: ${error.message}`,
      };
    }
  }

  /**
   * Moves specific metadata keys to the content object if present.
   *
   * @param {Object} indicatorSet - The indicator set object containing metadata and content
   */
  function moveMetadataKeysToContent(indicatorSet) {
    const keysToMove = [
      'imageWidth',
      'imageHeight',
      'bitDepth',
      'colorType',
      'compression',
      'filter',
      'interlace',
      'fileType',
    ];

    for (const key of keysToMove) {
      if (Object.prototype.hasOwnProperty.call(indicatorSet.metadata, key)) {
        indicatorSet.content[key] = indicatorSet.metadata[key];
        delete indicatorSet.metadata[key];
      }
    }
  }

  // Extract metadata using ExifReader if fileBuffer is provided
  indicatorSet.metadata = extractMetadata(fileBuffer);

  // Move specific metadata keys to the content object if present
  moveMetadataKeysToContent(indicatorSet);


  const valStatusCodes = validationResult.toRepresentation();

  /**
   * Extracts a specific result code value from validation status codes.
   *
   * @param {Array} statusCodes - Array of status code objects from validation result
   * @param {string} whichCode - Code identifier to search for (partial match)
   * @returns {string|null} The matching code value or null if not found
   *
   * @private
   */
  function getResultCodeValue(statusCodes, whichCode) {
    const found = statusCodes.find(oneCode => oneCode.code.includes(whichCode));
    if (!found) return null;

    return found.code;
  }

  /**
   * Extracts assertion status codes and organizes them by assertion type.
   *
   * @param {Array} statusCodes - Array of status code objects from validation result
   * @returns {Object} Object mapping assertion types to their status codes
   *
   * @private
   */
  function getAssertionStatus(statusCodes) {
    const codes = {};
    for (const oneCode of statusCodes) {
      if (oneCode.code.includes('assertion')) {
        const urlParts = oneCode.url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        codes[lastPart] = oneCode.code;
      }
    }

    return codes;
  }

  /**
   * Parses a Distinguished Name (DN) string into a key-value object.
   *
   * Distinguished Names are used in X.509 certificates to identify entities.
   * This function converts DN strings like "CN=Example,O=Organization,C=US"
   * into structured objects for easier access.
   *
   * @param {string} dnString - The Distinguished Name string to parse
   * @returns {Object} Object with DN components as key-value pairs
   *
   * @example
   * ```javascript
   * const dn = parseDistinguishedName("CN=John Doe,O=Example Corp,C=US");
   * // Returns: { CN: "John Doe", O: "Example Corp", C: "US" }
   * ```
   *
   * @private
   */
  function parseDistinguishedName(dnString) {
    if (typeof dnString !== 'string') return {};
    return dnString.split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .reduce((acc, pair) => {
        const [key, ...rest] = pair.split('=');
        if (key && rest.length > 0) {
          acc[key.trim()] = rest.join('=').trim();
        }
        return acc;
      }, {});
  }

  /**
   * Processes C2PA assertions and converts them to a structured format.
   *
   * This function:
   * - Strips internal metadata (uuid, sourceBox, etc.)
   * - Converts binary hash fields to base64 strings
   * - Organizes assertions by label for easy access
   *
   * @param {Object} assertions - Raw assertions object from C2PA manifest
   * @returns {Object} Processed assertions organized by label
   *
   * @private
   */
  function processAssertions(assertions) {
    const assertionsObj = {};
    if (!assertions || !assertions.assertions) return assertionsObj;

    for (const assertion of assertions.assertions) {
      // Strip out internal metadata properties
      // eslint-disable-next-line no-unused-vars
      const { uuid, sourceBox, componentType, label, content, ...rest } = assertion;

      /**
       * Recursively converts Uint8Array hash fields to base64 strings.
       * This makes the data JSON-serializable and human-readable.
       *
       * @param {Object} obj - Object to process for hash field conversion
       *
       * @private
       */
      function convertHashFields(obj) {
        if (obj && typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            if (key === 'hash') {
              if (obj[key] instanceof Uint8Array) {
                obj[key] = Buffer.from(obj[key]).toString('base64');
              } else if (Array.isArray(obj[key]) && obj[key].every(n => typeof n === 'number')) {
                obj[key] = Buffer.from(obj[key]).toString('base64');
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                convertHashFields(obj[key]);
              }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              convertHashFields(obj[key]);
            }
          }
        }
      }
      convertHashFields(rest);

      assertionsObj[assertion.label || 'unknown'] = rest;
    }

    return assertionsObj;
  }

  // Process each manifest in the store
  for (const manifest of manifestStore.manifests) {
    indicatorSet.manifests.push({
      label: manifest.label || null,
      assertions: processAssertions(manifest.assertions),
      claim: {
        version: manifest.claim?.version || null,
        title: manifest.claim?.title || null,
        instanceID: manifest.claim?.instanceID || null,
        claimGenerator: manifest.claim?.claimGeneratorInfo
          ? manifest.claim.claimGeneratorInfo
          : manifest.claim?.claimGeneratorName || null,
        defaultAlgorithm: manifest.claim?.defaultAlgorithm || null,
        signatureRef: manifest.claim?.signatureRef || null,

        // Validation status fields - these indicate the trustworthiness of different aspects
        signature_status: getResultCodeValue(valStatusCodes, 'claimSignature.') || 'unknown',
        assertion_status: getAssertionStatus(valStatusCodes) || 'unknown',
        content_status: getResultCodeValue(valStatusCodes, 'assertion.dataHash') || 'unknown',
        trust_status: getResultCodeValue(valStatusCodes, 'signingCredential') || 'unknown',
      },
      claimSignature: {
        algorithm: manifest.signature.signatureData?.algorithm || null,
        certificate: {
          serialNumber: manifest.signature.signatureData?.certificate?.serialNumber || null,
          issuer: parseDistinguishedName(manifest.signature.signatureData?.certificate?.issuer),
          subject: parseDistinguishedName(manifest.signature.signatureData?.certificate?.subject),
          validity: {
            notBefore: manifest.signature.signatureData?.certificate?.notBefore || null,
            notAfter: manifest.signature.signatureData?.certificate?.notAfter || null,
          },
        },
      },
    });
  }

  return indicatorSet;
}

export { generateIndicatorSet };
