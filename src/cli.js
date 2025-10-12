#!/usr/bin/env node

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
  .argument('<input-files...>', 'input file(s) to process (supports wildcards)')
  .option('-o, --output <output-dir>', 'output directory for the JSON file (defaults to input file directory)')
  .option('-p, --pretty', 'pretty print JSON output', false)
  .option('-b, --basic', 'output basic content analysis only (skip indicator set generation)', false)
  .action(async (inputFiles, options) => {
    try {
      const results = {
        total: inputFiles.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      // Process each input file
      for (const inputFile of inputFiles) {
        try {
          // If no output directory specified, use the directory of the input file
          const outputDir = options.output || path.dirname(path.resolve(inputFile));
          await processFile(inputFile, outputDir, options);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({ file: inputFile, error: error.message });
          console.error(`❌ Error processing ${inputFile}: ${error.message}`);
        }
      }

      // Print summary if multiple files were processed
      if (inputFiles.length > 1) {
        console.log('\n📊 Summary:');
        console.log(`   Total files: ${results.total}`);
        console.log(`   ✅ Successful: ${results.successful}`);
        if (results.failed > 0) {
          console.log(`   ❌ Failed: ${results.failed}`);
        }
      }

      // Exit with error code if any files failed
      if (results.failed > 0 && results.successful === 0) {
        process.exit(1);
      }
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

  // Create output file path using input file name with .json extension
  const inputBaseName = path.parse(inputPath).name; // Gets filename without extension
  const outputFileName = `${inputBaseName}.json`;
  const outputPath = path.join(outputDir, outputFileName);
  const indicatorSetFileName = `${inputBaseName}-indicators.json`;
  const indicatorSetPath = path.join(outputDir, indicatorSetFileName);

  // Initialize variables for file content and C2PA info
  let fileContent = '';
  let fileBuffer = null;
  let c2paInfo = null;

  if (isTextFile) {
    fileContent = await fs.readFile(inputPath, 'utf8');
  } else {
    // Read as buffer for binary files (including images with potential C2PA data)
    fileBuffer = await fs.readFile(inputPath);

    // Process C2PA manifests
    // Always generate indicator set unless --basic flag is used
    if (fileBuffer) {
      c2paInfo = await processManifestStore(fileBuffer, !options.basic);
    }
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
    content: c2paInfo ? {} :
      isTextFile ? {
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

  // Determine what to output based on --basic flag
  const shouldOutputIndicatorSet = !isTextFile && !options.basic;
  const shouldOutputBasicJson = options.basic || isTextFile;

  // Write basic JSON output only if --basic flag is used or it's a text file
  if (shouldOutputBasicJson) {
    const jsonContent = options.pretty
      ? JSON.stringify(outputData, null, 2)
      : JSON.stringify(outputData);
    await fs.writeFile(outputPath, jsonContent, 'utf8');
  }

  // now log some information about the processed file
  console.log('✅ File processed successfully!');
  console.log(`📁 Input: ${inputPath}`);

  if (shouldOutputBasicJson) {
    console.log(`📄 Output: ${outputPath}`);
  }

  if (isTextFile) {
    console.log(`📊 Stats: ${outputData.content.lineCount} lines, ${outputData.content.wordCount} words, ${outputData.content.characterCount} characters`);
  } else if (shouldOutputBasicJson) {
    console.log(`📊 Stats: Binary file, ${outputData.content.size} bytes`);
  }

  // inline function to output the indicator set
  function outputIndicatorSet(indicatorSet, indicatorSetPath, prettyPrint) {
    const indicatorSetContent = prettyPrint
      ? JSON.stringify(indicatorSet, null, 2)
      : JSON.stringify(indicatorSet);
    return fs.writeFile(indicatorSetPath, indicatorSetContent, 'utf8')
      .then(() => {
        console.log(`📄 Output: ${indicatorSetPath}`);
      })
      .catch(err => {
        console.error(`Error writing indicator set: ${err.message}`);
      });
  }

  /**
   * Merges metadata from c2paInfo.indicatorSet with outputData.metadata if available.
   *
   * @param {Object} c2paInfo - The C2PA information object that may contain an indicatorSet
   * @param {Object} outputData - The output data object that should have a metadata property to merge into
   */
  function mergeIndicatorSetMetadata(c2paInfo, outputData) {
    // Check if c2paInfo.indicatorSet exists and has a metadata member that is an object
    if (c2paInfo &&
      c2paInfo.indicatorSet &&
      c2paInfo.indicatorSet.metadata &&
      typeof c2paInfo.indicatorSet.metadata === 'object' &&
      c2paInfo.indicatorSet.metadata !== null) {

      // Ensure outputData.metadata exists
      if (!outputData.metadata || typeof outputData.metadata !== 'object') {
        outputData.metadata = {};
      }

      // Merge the metadata objects
      Object.assign(outputData.metadata, c2paInfo.indicatorSet.metadata);
    }
  }


  // Only generate indicator sets for binary files (images), not text files
  if (shouldOutputIndicatorSet) {
    if (c2paInfo && c2paInfo.hasManifestStore) {
      console.log(`🔐 C2PA: Found ${c2paInfo.manifestCount} manifest(s), Valid: ${c2paInfo.validationStatus.isValid}`);

      // Output indicator set
      if (c2paInfo.indicatorSet) {
        await outputIndicatorSet(c2paInfo.indicatorSet, indicatorSetPath, options.pretty);
      }
    } else if (c2paInfo && c2paInfo.manifestCount === 0) {
      console.log('🔐 C2PA: No manifests found in file');

      // Output indicator set
      const indicatorSet = {
        '@context': ['https://jpeg.org/jpegtrust'],
        manifests: [],
        content: {},
        metadata: {},
      };
      mergeIndicatorSetMetadata(c2paInfo, indicatorSet);
      await outputIndicatorSet(indicatorSet, indicatorSetPath, options.pretty);
    } else if (c2paInfo && c2paInfo.error) {
      console.log(`🔐 C2PA: Error - ${c2paInfo.error}`);

      // Output indicator set
      const indicatorSet = {
        '@context': ['https://jpeg.org/jpegtrust'],
        manifests: [],
        content: {},
        metadata: {},
      };
      mergeIndicatorSetMetadata(c2paInfo, indicatorSet);
      await outputIndicatorSet(indicatorSet, indicatorSetPath, options.pretty);
    } else {
      const indicatorSet = {
        '@context': ['https://jpeg.org/jpegtrust'],
        manifests: [],
        content: {},
        metadata: {},
      };
      await outputIndicatorSet(indicatorSet, indicatorSetPath, options.pretty);
    }
  } else if (!isTextFile && options.basic) {
    // Log C2PA info when using --basic mode
    if (c2paInfo && c2paInfo.hasManifestStore) {
      console.log(`🔐 C2PA: Found ${c2paInfo.manifestCount} manifest(s), Valid: ${c2paInfo.validationStatus.isValid}`);
    } else if (c2paInfo && c2paInfo.manifestCount === 0) {
      console.log('🔐 C2PA: No manifests found in file');
    } else if (c2paInfo && c2paInfo.error) {
      console.log(`🔐 C2PA: Error - ${c2paInfo.error}`);
    }
  }
}

program.parse();
