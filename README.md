# Indicator Extractor CLI

A Node.js command line application that processes JPEG 1, PNG, and HEIC/HEIF files and outputs structured JSON results including Trust Indicator Sets, as defined in ISO 21617-1.

## Features

- 📁 **File Processing**: Process files and extract Trust Indicator Sets by default
- 📊 **Content Analysis**: Provides useful information about the file and its content
- 🎯 **JSON Output**: Generate structured JSON in various syntaxes
- 🎨 **Pretty Printing**: Support for both minified and pretty-printed JSON output
- 📂 **Directory Management**: Automatically creates output directories as needed
- ✅ **Error Handling**: Graceful error handling with informative messages
- 🧪 **Well Tested**: Comprehensive test suite with Jest
- 🔍 **Code Quality**: ESLint configuration for consistent code style

## Installation

```bash
# Clone the repository
git clone https://gitlab.com/your-username/indicator-extractor.git
cd indicator-extractor

# Install dependencies
npm install

# Install globally (optional)
npm install -g .
```

## Usage

### Basic Usage

```bash
# Process a file with Trust Indicator Set (output to same directory as input file)
indicator-extractor input.jpg

# Process a file with Trust Indicator Set and pretty-printed JSON output
indicator-extractor input.png --pretty

# Process a file with basic content analysis only (no indicator set)
indicator-extractor input.jpg --basic

# Specify output directory with -o flag
indicator-extractor input.jpg -o ./output

# You can also use --output instead of -o
indicator-extractor input.jpg --output ./output --pretty
```

### Using the CLI directly

```bash
# Run from the project directory (output to same directory as input file)
node src/cli.js input.jpg

# With pretty printing
node src/cli.js input.png --pretty

# With basic content analysis only (no indicator set)
node src/cli.js input.jpg --basic

# Specify output directory
node src/cli.js input.jpg -o ./output --pretty
```

### Command Line Arguments

- `<input-file>`: Path to the input file to process (required)
- `-o, --output <output-dir>`: Directory where the JSON output file will be created (optional, defaults to input file directory)
- `-p, --pretty`: Pretty print the JSON output (optional, default: false)
- `-b, --basic`: Output basic content analysis only, skip Trust Indicator Set generation (optional, default: false)

## Output Format

The CLI generates two JSON files by default:

### 1. Main Output File (`<filename>.json`)
Contains basic file information and C2PA data:

```json
{
  "metadata": {
    "inputFile": "/absolute/path/to/input.jpg",
    "fileName": "input.jpg",
    "fileSize": 123456,
    "processedAt": "2025-06-20T10:30:00.000Z",
    "fileExtension": ".jpg"
  },
  "content": {
    "type": "binary",
    "size": 123456,
    "note": "Binary file content not displayed"
  },
  "c2pa": {
    "fileFormat": "JPEG",
    "hasManifestStore": true,
    "manifestCount": 1,
    "validationStatus": {
      "isValid": true
    }
  },
  "processing": {
    "status": "completed",
    "version": "1.0.0"
  }
}
```

### 2. Trust Indicator Set File (`<filename>-indicators.json`)
Contains the Trust Indicator Set as defined in ISO 21617-1:

```json
{
  "@context": ["https://jpeg.org/jpegtrust"],
  "manifests": [
    {
      "label": "manifest_label",
      "claim.v2": { ... },
      "claim_signature": { ... },
      "assertions": [ ... ]
    }
  ],
  "content": { ... },
  "metadata": { ... },
  "asset_info": {
    "alg": "sha256",
    "hash": "..."
  }
}
```

### Basic Content Analysis Mode

When using the `--basic` flag (for when Trust Indicator Sets are not needed), only the main output file is generated with content analysis:

```json
{
  "metadata": { ... },
  "content": { ... },
  "c2pa": { ... },
  "processing": { ... }
}
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
- **C2PA Tests**: Verify processing of the Content Credentials & JPEG Trust Manifests

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
├── src/
│   └── cli.js              # Main CLI script
│   └── indicatorSet.js     # Create the Trust Indicator Set
│   └── processManifest.js  # Process any C2PA/JPEG Trust Manifests
├── testfiles/              # Test files for testing
├── tests/
│   ├── test-helpers.js     # Utility routines for tests
│   ├── basic-functionality.test.js # Tests for basic functionality
│   ├── error-handling.test.js    # Tests for error handling
│   ├── content-analysis.test.js  # Tests for content analysis
│   ├── c2pa-processing.test.js   # Tests for C2PA processing
│   ├── setup.js            # Jest setup
├── output/                 # Output directory for processed files
├── coverage/               # Coverage reports (generated)
├── .github/
│   └── copilot-instructions.md # Copilot custom instructions
├── .gitignore              # Git ignore rules
├── eslint.config.js        # ESLint configuration
├── jest.config.js          # Jest configuration
├── package.json            # Project configuration
├── README.md               # This file
└── LICENSE                 # Project license
```

## Configuration Files

### Jest Configuration (`jest.config.js`)

- **Test Environment**: Node.js
- **Coverage Collection**: Collects coverage from `src/**/*.js`
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

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.1.0
- **Breaking Change**: Trust Indicator Set generation is now the default behaviour
- Changed output directory from positional argument to optional `-o` or `--output` flag (defaults to input file directory)
- Added `--basic` flag to skip Trust Indicator Set generation (replaces old default behaviour)
- Removed `--set` flag (functionality is now default)
- Updated all tests and documentation to reflect new default behaviour

### v1.0.0
- Initial release
- Comprehensive test suite
- ESLint integration
- Jest testing framework
- Pretty printing support
- Error handling and validation
