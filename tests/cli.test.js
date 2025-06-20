const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

describe('CLI Tool', () => {
  const testDir = path.join(__dirname, 'temp');
  const testInputFile = path.join(__dirname, 'test.txt');
  const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');

  beforeEach(async() => {
    // Clean up test directory
    await fs.remove(testDir);
    await fs.ensureDir(testDir);
  });

  afterEach(async() => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('Basic functionality', () => {
    test('should process a file and create JSON output', async() => {
      const outputFile = path.join(testDir, 'test.json');

      // Run the CLI command
      const command = `node "${cliPath}" "${testInputFile}" "${testDir}"`;
      const result = execSync(command, { encoding: 'utf8' });

      // Check that output file was created
      expect(await fs.pathExists(outputFile)).toBe(true);

      // Read and parse the output
      const outputContent = await fs.readFile(outputFile, 'utf8');
      const outputData = JSON.parse(outputContent);

      // Verify structure
      expect(outputData).toHaveProperty('metadata');
      expect(outputData).toHaveProperty('content');
      expect(outputData).toHaveProperty('processing');

      // Verify metadata
      expect(outputData.metadata).toHaveProperty('inputFile');
      expect(outputData.metadata).toHaveProperty('fileName');
      expect(outputData.metadata).toHaveProperty('fileSize');
      expect(outputData.metadata).toHaveProperty('processedAt');
      expect(outputData.metadata).toHaveProperty('fileExtension');
      expect(outputData.metadata.fileExtension).toBe('.txt');

      // Verify content
      expect(outputData.content).toHaveProperty('rawContent');
      expect(outputData.content).toHaveProperty('lineCount');
      expect(outputData.content).toHaveProperty('characterCount');
      expect(outputData.content).toHaveProperty('wordCount');
      expect(outputData.content.lineCount).toBeGreaterThan(0);
      expect(outputData.content.wordCount).toBeGreaterThan(0);

      // Verify processing info
      expect(outputData.processing).toHaveProperty('status');
      expect(outputData.processing).toHaveProperty('version');
      expect(outputData.processing.status).toBe('completed');

      // Check CLI output message
      expect(result).toContain('File processed successfully!');
    });

    test('should create pretty printed JSON when --pretty flag is used', async() => {
      const outputFile = path.join(testDir, 'test.json');

      // Run the CLI command with --pretty flag
      const command = `node "${cliPath}" "${testInputFile}" "${testDir}" --pretty`;
      execSync(command, { encoding: 'utf8' });

      // Read the output
      const outputContent = await fs.readFile(outputFile, 'utf8');

      // Check that it's pretty printed (contains newlines and indentation)
      expect(outputContent).toMatch(/\n/);
      expect(outputContent).toMatch(/ {2}/);
    });

    test('should create minified JSON by default', async() => {
      const outputFile = path.join(testDir, 'test.json');

      // Run the CLI command without --pretty flag
      const command = `node "${cliPath}" "${testInputFile}" "${testDir}"`;
      execSync(command, { encoding: 'utf8' });

      // Read the output
      const outputContent = await fs.readFile(outputFile, 'utf8');

      // Check that it's minified (no unnecessary whitespace)
      expect(outputContent).not.toMatch(/\n {2}/);
    });
  });

  describe('Error handling', () => {
    test('should fail gracefully when input file does not exist', () => {
      const nonExistentFile = path.join(__dirname, 'nonexistent.txt');
      const command = `node "${cliPath}" "${nonExistentFile}" "${testDir}"`;

      expect(() => {
        execSync(command, { encoding: 'utf8' });
      }).toThrow();
    });

    test('should create output directory if it does not exist', async() => {
      const deepOutputDir = path.join(testDir, 'deep', 'nested', 'dir');
      const outputFile = path.join(deepOutputDir, 'test.json');

      // Run the CLI command
      const command = `node "${cliPath}" "${testInputFile}" "${deepOutputDir}"`;
      execSync(command, { encoding: 'utf8' });

      // Check that output directory and file were created
      expect(await fs.pathExists(deepOutputDir)).toBe(true);
      expect(await fs.pathExists(outputFile)).toBe(true);
    });
  });

  describe('Content analysis', () => {
    test('should correctly count lines, words, and characters', async() => {
      // Create a test file with known content
      const knownContent = 'Hello world!\nThis is line two.\nLine three here.';
      const knownTestFile = path.join(testDir, 'known.txt');
      await fs.writeFile(knownTestFile, knownContent, 'utf8');

      const outputFile = path.join(testDir, 'known.json');

      // Run the CLI command
      const command = `node "${cliPath}" "${knownTestFile}" "${testDir}"`;
      execSync(command, { encoding: 'utf8' });

      // Read and parse the output
      const outputContent = await fs.readFile(outputFile, 'utf8');
      const outputData = JSON.parse(outputContent);

      // Verify counts
      expect(outputData.content.lineCount).toBe(3);
      expect(outputData.content.characterCount).toBe(knownContent.length);
      expect(outputData.content.wordCount).toBe(9); // "Hello", "world!", "This", "is", "line", "two.", "Line", "three", "here."
      expect(outputData.content.rawContent).toBe(knownContent);
    });

    test('should handle empty files', async() => {
      // Create an empty test file
      const emptyTestFile = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyTestFile, '', 'utf8');

      const outputFile = path.join(testDir, 'empty.json');

      // Run the CLI command
      const command = `node "${cliPath}" "${emptyTestFile}" "${testDir}"`;
      execSync(command, { encoding: 'utf8' });

      // Read and parse the output
      const outputContent = await fs.readFile(outputFile, 'utf8');
      const outputData = JSON.parse(outputContent);

      // Verify counts for empty file
      expect(outputData.content.lineCount).toBe(1); // Empty file still has 1 line
      expect(outputData.content.characterCount).toBe(0);
      expect(outputData.content.wordCount).toBe(0);
      expect(outputData.content.rawContent).toBe('');
    });
  });
});
