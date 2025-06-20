#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { processManifestStore } from './processManifest.js';

const program = new Command();

program
  .name('indicator-extractor')
  .description('CLI tool to process files and output JSON results')
  .version('1.0.0');

program
  .argument('<input-file>', 'input file to process')
  .argument('<output-dir>', 'output directory for the JSON file')
  .option('-p, --pretty', 'pretty print JSON output', false)
  .action(async(inputFile, outputDir, options) => {
    try {
      await processFile(inputFile, outputDir, options);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

async function processFile(inputFile, outputDir, options) {
  // Validate input file exists
  if (!await fs.pathExists(inputFile)) {
    throw new Error(`Input file does not exist: ${inputFile}`);
  }

  // Ensure output directory exists
  await fs.ensureDir(outputDir);

  // Read input file
  const inputPath = path.resolve(inputFile);
  const fileStats = await fs.stat(inputPath);

  // Determine if we should process as text or binary based on file extension
  const isTextFile = ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts'].includes(path.extname(inputPath).toLowerCase());

  let fileContent = '';
  let fileBuffer = null;

  if (isTextFile) {
    fileContent = await fs.readFile(inputPath, 'utf8');
  } else {
    // Read as buffer for binary files (including images with potential C2PA data)
    fileBuffer = await fs.readFile(inputPath);
  }

  // Process C2PA manifests if we have a binary file
  let c2paInfo = null;
  if (fileBuffer) {
    c2paInfo = await processManifestStore(fileBuffer);
  }

  // Process the file and create output data
  const outputData = {
    metadata: {
      inputFile: inputPath,
      fileName: path.basename(inputPath),
      fileSize: fileStats.size,
      processedAt: new Date().toISOString(),
      fileExtension: path.extname(inputPath),
    },
    content: isTextFile ? {
      rawContent: fileContent,
      lineCount: fileContent.split('\n').length,
      characterCount: fileContent.length,
      wordCount: fileContent.trim().split(/\s+/).filter(word => word.length > 0).length,
    } : {
      type: 'binary',
      size: fileStats.size,
      note: 'Binary file content not displayed',
    },
    c2pa: c2paInfo,
    processing: {
      status: 'completed',
      version: '1.0.0',
    },
  };

  // Create output file path using input file name with .json extension
  const inputBaseName = path.parse(inputPath).name; // Gets filename without extension
  const outputFileName = `${inputBaseName}.json`;
  const outputPath = path.join(outputDir, outputFileName);

  // Write JSON output
  const jsonContent = options.pretty
    ? JSON.stringify(outputData, null, 2)
    : JSON.stringify(outputData);

  await fs.writeFile(outputPath, jsonContent, 'utf8');

  console.log('✅ File processed successfully!');
  console.log(`📁 Input: ${inputPath}`);
  console.log(`📄 Output: ${outputPath}`);

  if (isTextFile) {
    console.log(`📊 Stats: ${outputData.content.lineCount} lines, ${outputData.content.wordCount} words, ${outputData.content.characterCount} characters`);
  } else {
    console.log(`📊 Stats: Binary file, ${outputData.content.size} bytes`);
  }

  if (c2paInfo && c2paInfo.hasManifest) {
    console.log(`🔐 C2PA: Found ${c2paInfo.manifestCount} manifest(s), validation: ${c2paInfo.validationStatus}`);
  } else if (c2paInfo && c2paInfo.validationStatus === 'no_manifest') {
    console.log('🔐 C2PA: No manifests found in file');
  } else if (c2paInfo && c2paInfo.error) {
    console.log(`🔐 C2PA: Error - ${c2paInfo.error}`);
  }
}

program.parse();
