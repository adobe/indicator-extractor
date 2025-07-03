const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Test utilities and shared configurations
 */
class TestHelpers {
  constructor(suiteName = 'default') {
    this.testDir = path.join(__dirname, 'temp', suiteName);
    this.testFilesDir = path.join(__dirname, '..', 'testfiles');
    this.cliPath = path.join(__dirname, '..', 'bin', 'cli.js');

    // Common test files
    this.testInputFile = path.join(this.testFilesDir, 'test.txt');

    // Image test files
    this.imageFiles = {
      chatgptImage: path.join(this.testFilesDir, 'ChatGPT_Image.png'),
      multipleManifests: path.join(this.testFilesDir, 'Multiple_Manifests.jpg'),
      simplePhoto: path.join(this.testFilesDir, 'SimplePhoto.jpeg'),
      standardManifest: path.join(this.testFilesDir, 'scenario_1_v2.jpeg'),
      cawgMetadata: path.join(this.testFilesDir, 'scenario_4_CAWGM.jpeg'),
      rightsAssertion: path.join(this.testFilesDir, 'scenario_5_Rights.jpeg'),
      protectedAssertion: path.join(this.testFilesDir, 'scenario_9_ProtectedAssertion.jpeg'),
      protectedManifest: path.join(this.testFilesDir, 'scenario_10_ProtectedManifest.jpeg'),
      trustDeclaration: path.join(this.testFilesDir, 's11-trust-declaration.jpeg'),
    };
  }

  /**
   * Setup test directory - call in beforeEach
   */
  async setupTestDir() {
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);
  }

  /**
   * Cleanup test directory - call in afterEach
   */
  async cleanupTestDir() {
    await fs.remove(this.testDir);
  }

  /**
   * Cleanup all test directories - call in global teardown if needed
   */
  static async cleanupAllTestDirs() {
    const tempBaseDir = path.join(__dirname, 'temp');
    await fs.remove(tempBaseDir);
  }

  /**
   * Run CLI command and return result
   * @param {string} inputFile - Path to input file
   * @param {string} outputDir - Path to output directory
   * @param {string[]} flags - Additional CLI flags
   * @returns {string} Command output
   */
  runCLI(inputFile, outputDir = this.testDir, flags = []) {
    const flagsStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';
    const command = `node "${this.cliPath}" "${inputFile}" "${outputDir}"${flagsStr}`;
    return execSync(command, {
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_OPTIONS: '', // Clear NODE_OPTIONS to disable debugging
        VSCODE_INSPECTOR_OPTIONS: '', // Clear VS Code inspector options
      },
    });
  }

  /**
   * Run CLI command with custom buffer size
   * @param {string} inputFile - Path to input file
   * @param {string} outputDir - Path to output directory
   * @param {string[]} flags - Additional CLI flags
   * @param {number} maxBuffer - Maximum buffer size for output
   * @returns {string} Command output
   */
  runCLIWithBuffer(inputFile, outputDir = this.testDir, flags = [], maxBuffer = 1024 * 1024) {
    const flagsStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';
    const command = `node "${this.cliPath}" "${inputFile}" "${outputDir}"${flagsStr}`;
    return execSync(command, {
      encoding: 'utf8',
      maxBuffer,
      env: {
        ...process.env,
        NODE_OPTIONS: '', // Clear NODE_OPTIONS to disable debugging
        VSCODE_INSPECTOR_OPTIONS: '', // Clear VS Code inspector options
      },
    });
  }

  /**
   * Create a test file with specific content
   * @param {string} filename - Name of the file
   * @param {string} content - File content
   * @returns {string} Full path to created file
   */
  async createTestFile(filename, content) {
    const filePath = path.join(this.testDir, filename);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Read and parse JSON output file
   * @param {string} filename - Name of the JSON file (without path)
   * @returns {Object} Parsed JSON data
   */
  async readOutputJSON(filename) {
    const outputFile = path.join(this.testDir, filename);
    const content = await fs.readFile(outputFile, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Common assertions for basic output structure
   * @param {Object} outputData - Parsed JSON output
   */
  assertBasicStructure(outputData) {
    expect(outputData).toHaveProperty('metadata');
    expect(outputData).toHaveProperty('content');
    expect(outputData).toHaveProperty('processing');

    // Metadata assertions
    expect(outputData.metadata).toHaveProperty('inputFile');
    expect(outputData.metadata).toHaveProperty('fileName');
    expect(outputData.metadata).toHaveProperty('fileSize');
    expect(outputData.metadata).toHaveProperty('processedAt');
    expect(outputData.metadata).toHaveProperty('fileExtension');

    // Processing assertions
    expect(outputData.processing).toHaveProperty('status');
    expect(outputData.processing).toHaveProperty('version');
    expect(outputData.processing.status).toBe('completed');
  }

  /**
   * Common assertions for text content analysis
   * @param {Object} outputData - Parsed JSON output
   */
  assertTextContent(outputData) {
    expect(outputData.content).toHaveProperty('rawContent');
    expect(outputData.content).toHaveProperty('lineCount');
    expect(outputData.content).toHaveProperty('characterCount');
    expect(outputData.content).toHaveProperty('wordCount');
  }

  /**
   * Common assertions for C2PA data
   * @param {Object} outputData - Parsed JSON output
   */
  assertC2PAStructure(outputData) {
    expect(outputData).toHaveProperty('c2pa');
    expect(outputData.c2pa).toHaveProperty('fileFormat');
    expect(outputData.c2pa).toHaveProperty('hasManifestStore');
    expect(outputData.c2pa).toHaveProperty('manifestCount');
  }

  /**
   * Common test workflow for file processing
   * @param {string} inputFile - Path to input file
   * @param {string} expectedOutputFilename - Expected output filename (e.g., 'test.json')
   * @param {Object} options - Test options
   * @param {string[]} options.cliFlags - CLI flags to pass
   * @param {string} options.expectedExtension - Expected file extension in metadata
   * @param {string} options.expectedFileName - Expected file name in metadata
   * @param {string} options.expectedFormat - Expected C2PA format (if applicable)
   * @param {boolean} options.expectedC2PA - Whether to assert C2PA structure
   * @param {boolean} options.hasTextContent - Whether to assert text content structure
   * @param {Function} options.customAssertions - Custom assertion function(outputData, result)
   * @param {boolean} options.useBuffer - Whether to use runCLIWithBuffer instead of runCLI
   * @param {boolean} options.allowEmptyFile - Whether to allow file size of 0 (default: false)
   * @param {boolean} options.skipManifestCountCheck - Skip the manifestCount > 0 check for hasManifestStore
   * @returns {Object} Object containing outputData and CLI result
   */
  async processFileAndValidate(inputFile, expectedOutputFilename, options = {}) {
    const {
      cliFlags = [],
      expectedExtension,
      expectedFileName,
      expectedFormat,
      expectedC2PA: hasC2PA = false,
      hasTextContent = false,
      customAssertions,
      useBuffer = false,
      allowEmptyFile = false,
      skipManifestCountCheck = false,
    } = options;

    const outputFile = path.join(this.testDir, expectedOutputFilename);

    // Run the CLI command
    const result = useBuffer
      ? this.runCLIWithBuffer(inputFile, this.testDir, cliFlags)
      : this.runCLI(inputFile, this.testDir, cliFlags);

    // Check that output file was created
    expect(await fs.pathExists(outputFile)).toBe(true);

    // Read and parse the output
    const outputData = await this.readOutputJSON(expectedOutputFilename);

    // Verify basic structure
    this.assertBasicStructure(outputData);

    // Verify specific structures
    if (hasC2PA) {
      this.assertC2PAStructure(outputData);
    }
    if (hasTextContent) {
      this.assertTextContent(outputData);
    }

    // Verify metadata if specified
    if (expectedExtension) {
      expect(outputData.metadata.fileExtension).toBe(expectedExtension);
    }
    if (expectedFileName) {
      expect(outputData.metadata.fileName).toBe(expectedFileName);
    }
    if (allowEmptyFile) {
      expect(outputData.metadata.fileSize).toBeGreaterThanOrEqual(0);
    } else {
      expect(outputData.metadata.fileSize).toBeGreaterThan(0);
    }

    // Verify C2PA format if specified
    if (expectedFormat && hasC2PA) {
      expect(outputData.c2pa.fileFormat).toBe(expectedFormat);

      if (outputData.c2pa.hasManifestStore && !skipManifestCountCheck) {
        expect(outputData.c2pa.manifestCount).toBeGreaterThan(0);

        // Validation status should be an object with validation details
        expect(outputData.c2pa.validationStatus).toBeDefined();
        if (typeof outputData.c2pa.validationStatus === 'object') {
          expect(outputData.c2pa.validationStatus).toHaveProperty('isValid');
        }
      }

      // Check CLI output mentions C2PA
      expect(result).toContain('C2PA:');
    }

    // Run custom assertions if provided
    if (customAssertions && typeof customAssertions === 'function') {
      customAssertions(outputData, result);
    }

    return { outputData, result };
  }

  /**
   * Create a test file and process it with validation
   * @param {string} filename - Name of the test file to create
   * @param {string} content - Content for the test file
   * @param {string} expectedOutputFilename - Expected output filename
   * @param {Object} options - Test options (same as processFileAndValidate)
   * @returns {Object} Object containing outputData and CLI result
   */
  async createFileAndProcess(filename, content, expectedOutputFilename, options = {}) {
    const testFile = await this.createTestFile(filename, content);
    return await this.processFileAndValidate(testFile, expectedOutputFilename, options);
  }

  async assertIndicatorSetStructure(indicatorSetFile, outputData) {
    const indicatorSetData = await this.readOutputJSON(indicatorSetFile);

    // Verify indicator set structure
    // check for the required properties
    expect(indicatorSetData).toHaveProperty('@context');
    expect(typeof indicatorSetData['@context']).toBe('object');
    expect(indicatorSetData).toHaveProperty('manifests');
    expect(Array.isArray(indicatorSetData.manifests)).toBe(true);
    expect(indicatorSetData).toHaveProperty('content');
    expect(typeof indicatorSetData.content).toBe('object');

    // If the image has C2PA manifests, verify indicator set content
    if (outputData.c2pa.hasManifestStore && outputData.c2pa.manifestCount > 0) {
      expect(indicatorSetData.manifests.length).toBeGreaterThan(0);

      // Verify each manifest in the indicator set has expected structure
      indicatorSetData.manifests.forEach(manifest => {
        expect(manifest).toHaveProperty('label');
        expect(manifest).toHaveProperty('assertions');
        expect(manifest).toHaveProperty(['claim.v2']);
        expect(manifest).toHaveProperty('claim_signature');
        expect(manifest).toHaveProperty('status');

        // Verify claim structure
        const claim = manifest['claim.v2'];
        expect(claim).toHaveProperty('dc:title');
        expect(claim).toHaveProperty('instanceID');
        expect(claim).toHaveProperty('claim_generator');
        expect(claim).toHaveProperty('alg');
        expect(claim).toHaveProperty('signature');
        expect(claim).toHaveProperty('created_assertions');
        expect(claim).toHaveProperty('gathered_assertions');
        expect(claim).toHaveProperty('redacted_assertions');

        // Verify signature structure
        const signature = manifest.claim_signature;
        expect(signature).toHaveProperty('algorithm');
        expect(signature).toHaveProperty('certificate');
        expect(signature.certificate).toHaveProperty('issuer');
        expect(signature.certificate).toHaveProperty('subject');
        expect(signature.certificate).toHaveProperty('serial_number');
        expect(signature.certificate).toHaveProperty('validity');
        expect(signature.certificate.validity).toHaveProperty('not_before');
        expect(signature.certificate.validity).toHaveProperty('not_after');

      //   // Verify assertions structure
      //   expect(Array.isArray(manifest.assertions)).toBe(true);
      //   manifest.assertions.forEach(assertion => {
      //     expect(assertion).toHaveProperty('label');
      //   });
      });
    }
  }

  /**
   * Processes a file using the CLI with the `--set` flag, validates the output file and indicator set file,
   * and asserts their structures and contents.
   *
   * @async
   * @param {string} outputFileName - The name of the output file to validate.
   * @param {string} indicatorFileName - The name of the indicator set file to validate.
   * @param {Object} [options={}] - Optional parameters for processing.
   * @returns {Promise<void>} Resolves when validation is complete.
   */
  // eslint-disable-next-line no-unused-vars
  async processFileAndValidateWithIndicatorSet(inputImage, outputFileName, indicatorFileName, options = {}) {
    const outputFile = path.join(this.testDir, outputFileName);
    const indicatorSetFile = path.join(this.testDir, indicatorFileName);

    // Run the CLI command with --set flag
    const result = this.runCLI(inputImage, this.testDir, ['--set']);

    // Check that both output files were created
    expect(await fs.pathExists(outputFile)).toBe(true);
    expect(await fs.pathExists(indicatorSetFile)).toBe(true);

    // Read and parse the main output
    const outputData = await this.readOutputJSON(outputFileName);

    // Verify basic structure
    this.assertBasicStructure(outputData);
    this.assertC2PAStructure(outputData);

    // Read and parse the indicator set output
    this.assertIndicatorSetStructure(indicatorFileName, outputData);

    // Check CLI output mentions Trust Indicator Set
    expect(result).toContain('Trust Indicator Set:');
    expect(result).toContain(indicatorFileName);
  }

}

module.exports = TestHelpers;
