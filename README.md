# Indicator Extractor CLI

[![Node.js CI](https://github.com/your-username/indicator-extractor/workflows/Node.js%20CI/badge.svg)](https://github.com/your-username/indicator-extractor/actions)
[![Coverage Status](https://coveralls.io/repos/github/your-username/indicator-extractor/badge.svg?branch=main)](https://coveralls.io/github/your-username/indicator-extractor?branch=main)

A Node.js CLI application that processes files and outputs structured JSON results with file metadata and content analysis.

## Features

- 📁 **File Processing**: Process text files and extract comprehensive statistics
- 📊 **Content Analysis**: Count lines, words, and characters
- 🎯 **JSON Output**: Generate structured JSON with metadata and processing information
- 🎨 **Pretty Printing**: Support for both minified and pretty-printed JSON output
- 📂 **Directory Management**: Automatically creates output directories as needed
- ✅ **Error Handling**: Graceful error handling with informative messages
- 🧪 **Well Tested**: Comprehensive test suite with Jest
- 🔍 **Code Quality**: ESLint configuration for consistent code style

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/indicator-extractor.git
cd indicator-extractor

# Install dependencies
npm install

# Install globally (optional)
npm install -g .
```

## Usage

### Basic Usage

```bash
# Process a file with minified JSON output
indicator-extractor input.txt ./output

# Process a file with pretty-printed JSON output
indicator-extractor input.txt ./output --pretty
```

### Using the CLI directly

```bash
# Run from the project directory
node bin/cli.js input.txt ./output

# With pretty printing
node bin/cli.js input.txt ./output --pretty
```

### Command Line Arguments

- `<input-file>`: Path to the input file to process (required)
- `<output-dir>`: Directory where the JSON output file will be created (required)
- `-p, --pretty`: Pretty print the JSON output (optional)

## Output Format

The CLI generates a JSON file with the following structure:

```json
{
  "metadata": {
    "inputFile": "/absolute/path/to/input.txt",
    "fileName": "input.txt",
    "fileSize": 1234,
    "processedAt": "2025-06-20T10:30:00.000Z",
    "fileExtension": ".txt"
  },
  "content": {
    "rawContent": "file content here...",
    "lineCount": 15,
    "characterCount": 1234,
    "wordCount": 200
  },
  "processing": {
    "status": "completed",
    "version": "1.0.0"
  }
}
```

## Examples

### Example 1: Basic File Processing

```bash
# Input file: sample.txt
echo "Hello World!\nThis is a test file." > sample.txt

# Process the file
indicator-extractor sample.txt ./output

# Output: ./output/sample.json (minified)
```

### Example 2: Pretty Printed Output

```bash
# Process with pretty printing
indicator-extractor sample.txt ./output --pretty

# Output: ./output/sample.json (formatted with indentation)
```
## Development

### Scripts

```bash
# Run the CLI
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing

The project includes comprehensive tests using Jest:

- **Unit Tests**: Test individual utility functions
- **Integration Tests**: Test the complete CLI workflow
- **Error Handling Tests**: Verify graceful error handling
- **Content Analysis Tests**: Verify accurate counting of lines, words, and characters

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode for development
npm run test:watch
```

### Code Quality

The project uses ESLint for code quality and consistency:

```bash
# Check for linting issues
npm run lint

# Automatically fix linting issues
npm run lint:fix
```

### ESLint Configuration

The project uses modern ESLint configuration with the following features:

- **Modern JavaScript**: ES2020 support with async/await
- **Node.js Environment**: Configured for Node.js development
- **Strict Rules**: Enforces consistent code style and best practices
- **Jest Support**: Configured for Jest testing environment

## Project Structure

```
indicator-extractor/
├── bin/
│   └── cli.js              # Main CLI script
├── tests/
│   ├── cli.test.js         # CLI integration tests
│   ├── utils.test.js       # Utility function tests
│   ├── setup.js            # Jest setup
│   └── test.txt            # Sample test file
├── output/                 # Output directory for processed files
├── coverage/               # Coverage reports (generated)
├── eslint.config.js        # ESLint configuration
├── jest.config.js          # Jest configuration
├── package.json            # Project configuration
└── README.md               # This file
```

## Configuration Files

### Jest Configuration (`jest.config.js`)

- **Test Environment**: Node.js
- **Coverage Collection**: Collects coverage from `bin/**/*.js`
- **Test Pattern**: Matches `**/tests/**/*.test.js`
- **Coverage Reports**: Text, LCOV, and HTML formats

### ESLint Configuration (`eslint.config.js`)

- **Modern Config**: Uses the new flat config format
- **Node.js Rules**: Optimized for Node.js development
- **Jest Support**: Includes Jest globals for test files
- **Strict Standards**: Enforces code quality and consistency

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run linting (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Basic file processing functionality
- JSON output with metadata and content analysis
- Comprehensive test suite
- ESLint integration
- Jest testing framework
- Pretty printing support
- Error handling and validation
    "lineCount": 25,
    "characterCount": 1234,
    "wordCount": 200
  },
  "processing": {
    "status": "completed",
    "version": "1.0.0"
  }
}
```

## Development

### Project Structure

```
indicator-extractor/
├── bin/
│   └── cli.js          # Main CLI script
├── .github/
│   └── copilot-instructions.md
├── package.json
└── README.md
```

### Running in Development

```bash
# Run directly with Node.js
node bin/cli.js <input-file> <output-dir>

# Or use npm start
npm start <input-file> <output-dir>
```

### Testing

Create a test file and run the CLI:

```bash
echo "Hello, World!" > test.txt
node bin/cli.js test.txt ./output --pretty
```

## Requirements

- Node.js 14.0 or higher
- npm 6.0 or higher

## Dependencies

- **commander**: Command-line interface framework
- **fs-extra**: Enhanced file system operations
- **path**: Node.js path utilities

## License

ISC
