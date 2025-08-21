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

import ExifReader from 'exifreader';
import { createHash } from 'crypto';

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

    convertHashFields(rest);

    assertionsObj[assertion.label || 'unknown'] = rest;
  }

  return assertionsObj;
}

/**
 * Produces a JSON object for a HashedURI.
 *
 * A HashedURI typically contains a URI, a hash (Uint8Array or Buffer), and the algorithm
 * This function returns a JSON-serializable object with the URI and the hash as a base64 string.
 *
 * @param {Object} hashedURI - The HashedURI object with 'uri' and 'hash' fields
 * @returns {Object} JSON object with 'uri' and 'hash' (base64)
 */
function hashedURIToJSON(hashedURI) {
  if (!hashedURI || typeof hashedURI !== 'object') return {};
  const { uri, hash, alg } = hashedURI;
  let hashBase64 = null;
  if (hash instanceof Uint8Array || Buffer.isBuffer(hash)) {
    hashBase64 = Buffer.from(hash).toString('base64');
  } else if (Array.isArray(hash) && hash.every(n => typeof n === 'number')) {
    hashBase64 = Buffer.from(hash).toString('base64');
  }
  const result = {
    url: uri || null,
    hash: hashBase64,
  };
  if (alg !== null) result.alg = alg;

  return result;
}

function processHashedURIs(hashedURIs) {
  if (!hashedURIs || !Array.isArray(hashedURIs)) return [];
  return hashedURIs.map(hashedURI => hashedURIToJSON(hashedURI));
}

function getSignatureAlgoName(algorithm) {
  switch (algorithm.coseIdentifier) {
  case -7:
    return 'ES256';
  case -35:
    return 'ES384';
  case -36:
    return 'ES512';
  case -37:
    return 'PS256';
  case -38:
    return 'PS384';
  case -39:
    return 'PS512';
  case -8:
    return 'Ed25519';
  default:
    return 'Unknown';
  }
}

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
 */
function generateIndicatorSet(manifestStore, validationResult, fileBuffer) {
  const indicatorSet = {
    '@context': {
      '@vocab': 'https://jpeg.org/jpegtrust',
      'extras': 'https://jpeg.org/jpegtrust/extras',
    },
    asset_info:{},
    manifests: [],
    content: {},
    metadata: {},
  };

  // If fileBuffer is provided, extract file information
  if (fileBuffer) {
    const fHash = createHash('sha256').update(fileBuffer).digest('base64');
    indicatorSet.asset_info = {
      alg: 'sha256', // Default algorithm, can be overridden if needed
      hash: fHash,
      // url: null, // we don't add this due to privacy concerns
    };
  }

  // Extract metadata using ExifReader if fileBuffer is provided
  indicatorSet.metadata = extractMetadata(fileBuffer);

  // Move specific metadata keys to the content object if present
  moveMetadataKeysToContent(indicatorSet);

  // make sure we have a valid manifest store
  // we might get called when there was error parsing the manifest
  // in which case manifestStore will be null
  if ( manifestStore ) {
    const valStatusCodes = validationResult.toRepresentation();

    // Process each manifest in the store
    for (const manifest of manifestStore.manifests) {
      indicatorSet.manifests.push({
        label: manifest.label || null,
        assertions: processAssertions(manifest.assertions),
        [manifest.claim?.version === 1 ? 'claim.v2' : 'claim']: {
          'dc:title': manifest.claim?.title || null,
          instanceID: manifest.claim?.instanceID || null,
          claim_generator: manifest.claim?.claimGeneratorInfo
            ? manifest.claim.claimGeneratorInfo
            : manifest.claim?.claimGeneratorName || null,
          alg: manifest.claim?.defaultAlgorithm || null,
          signature: manifest.claim?.signatureRef || null,
          created_assertions: processHashedURIs(manifest.claim?.assertions),
          gathered_assertions: processHashedURIs(manifest.claim?.gatheredAssertions),
          redacted_assertions: processHashedURIs(manifest.claim?.redactedAssertions),
        },
        claim_signature: {
          algorithm: getSignatureAlgoName(manifest.signature.signatureData?.algorithm) || null,
          serial_number: manifest.signature.signatureData?.certificate?.serialNumber || null,
          issuer: parseDistinguishedName(manifest.signature.signatureData?.certificate?.issuer),
          subject: parseDistinguishedName(manifest.signature.signatureData?.certificate?.subject),
          validity: {
            not_before: manifest.signature.signatureData?.certificate?.notBefore || null,
            not_after: manifest.signature.signatureData?.certificate?.notAfter || null,
          },
        },
        // Validation status fields - these indicate the trustworthiness of different aspects
        status: {
          signature: getResultCodeValue(valStatusCodes, 'claimSignature.') || 'unknown',
          assertion: getAssertionStatus(valStatusCodes) || 'unknown',
          content: getResultCodeValue(valStatusCodes, 'assertion.dataHash') || getResultCodeValue(valStatusCodes, 'assertion.hash.bmff') || 'unknown',
          trust: getResultCodeValue(valStatusCodes, 'signingCredential') || '',
        },
      });
    }
  }

  // add the validation status to the indicator set (if validationResult is provided)
  if ( validationResult ) {
    indicatorSet['extras:validation_status'] = {
      isValid: validationResult.isValid || false,
      error: validationResult.error || null,
      validationErrors: Array.isArray(validationResult.validationErrors)
        ? validationResult.validationErrors.map(err => err.toString())
        : [],
      entries: validationResult.statusEntries.map(entry => ({
        code: entry.code,
        message: entry.message,
        url: entry.url || null,
        severity: entry.severity || 'info',
      })),
    };
  }

  return indicatorSet;
}

export { generateIndicatorSet };
