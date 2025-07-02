#!/usr/bin/env node

/*
Copyright 2022 Adobe. All rights reserved.
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
  .argument('<input-file>', 'input file to process')
  .argument('<output-dir>', 'output directory for the JSON file')
  .option('-p, --pretty', 'pretty print JSON output', false)
  .option('-s, --set', 'output JPEG Trust Indicator Set grammar', false)
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
    if (fileBuffer) {
      c2paInfo = await processManifestStore(fileBuffer, options.set);
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

  // Write JSON output
  const jsonContent = options.pretty
    ? JSON.stringify(outputData, null, 2)
    : JSON.stringify(outputData);
  await fs.writeFile(outputPath, jsonContent, 'utf8');

  // now log some information about the processed file
  console.log('✅ File processed successfully!');
  console.log(`📁 Input: ${inputPath}`);
  console.log(`📄 Output: ${outputPath}`);

  if (isTextFile) {
    console.log(`📊 Stats: ${outputData.content.lineCount} lines, ${outputData.content.wordCount} words, ${outputData.content.characterCount} characters`);
  } else {
    console.log(`📊 Stats: Binary file, ${outputData.content.size} bytes`);
  }

  // inline function to output the indicator set if requested
  function outputIndicatorSet(indicatorSet, indicatorSetPath, prettyPrint) {
    const indicatorSetContent = prettyPrint
      ? JSON.stringify(indicatorSet, null, 2)
      : JSON.stringify(indicatorSet);
    return fs.writeFile(indicatorSetPath, indicatorSetContent, 'utf8')
      .then(() => {
        console.log(`🤝 Trust Indicator Set: ${indicatorSetPath}`);
      })
      .catch(err => {
        console.error(`Error writing indicator set: ${err.message}`);
      });
  }

  if (c2paInfo && c2paInfo.hasManifestStore) {
    console.log(`🔐 C2PA: Found ${c2paInfo.manifestCount} manifest(s), Valid: ${c2paInfo.validationStatus.isValid}`);

    // if the --set option is used, output the indicator set
    if (options.set && c2paInfo.indicatorSet) {
      await outputIndicatorSet(c2paInfo.indicatorSet, indicatorSetPath, options.pretty);
    }
  } else if (c2paInfo && c2paInfo.manifestCount === 0) {
    console.log('🔐 C2PA: No manifests found in file');
  } else if (c2paInfo && c2paInfo.error) {
    console.log(`🔐 C2PA: Error - ${c2paInfo.error}`);
  } else if (options.set) {
    const indicatorSet = {
      '@context': ['https://jpeg.org/jpegtrust'],
      manifests: [],
      content: {},
      metadata: {},
    };
    await outputIndicatorSet(indicatorSet, indicatorSetPath, options.pretty);
  }
}

program.parse();
