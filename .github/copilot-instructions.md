<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Indicator Extractor CLI Project

This is a Node.js CLI application that processes files and outputs JSON results.

## Project Guidelines

- Use modern JavaScript with async/await for asynchronous operations
- Follow Node.js best practices for CLI applications
- Use commander.js for command-line argument parsing
- Use fs-extra for enhanced file system operations
- Ensure proper error handling and user feedback
- Output should be well-structured JSON with metadata and processing information
- Support both pretty-printed and minified JSON output
- Validate input files and create output directories as needed

## Architecture

- Main CLI script: `bin/cli.js`
- Uses commander.js for CLI interface
- Processes text files and extracts basic statistics
- Outputs structured JSON with file metadata and content analysis
