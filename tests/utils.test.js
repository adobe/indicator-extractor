const path = require('path');

// Mock utility functions that could be extracted from the main CLI
describe('Utility Functions', () => {
  describe('File processing utilities', () => {
    test('should calculate correct word count', () => {
      const calculateWordCount = (text) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
      };

      expect(calculateWordCount('Hello world')).toBe(2);
      expect(calculateWordCount('  Hello   world  ')).toBe(2);
      expect(calculateWordCount('')).toBe(0);
      expect(calculateWordCount('   ')).toBe(0);
      expect(calculateWordCount('Single')).toBe(1);
      expect(calculateWordCount('One\nTwo\nThree')).toBe(3);
    });

    test('should calculate correct line count', () => {
      const calculateLineCount = (text) => {
        return text.split('\n').length;
      };

      expect(calculateLineCount('Hello world')).toBe(1);
      expect(calculateLineCount('Hello\nworld')).toBe(2);
      expect(calculateLineCount('Line1\nLine2\nLine3')).toBe(3);
      expect(calculateLineCount('')).toBe(1);
      expect(calculateLineCount('\n')).toBe(2);
    });

    test('should create proper output structure', () => {
      const createOutputData = (inputPath, fileStats, fileContent) => {
        return {
          metadata: {
            inputFile: inputPath,
            fileName: path.basename(inputPath),
            fileSize: fileStats.size,
            processedAt: new Date().toISOString(),
            fileExtension: path.extname(inputPath),
          },
          content: {
            rawContent: fileContent,
            lineCount: fileContent.split('\n').length,
            characterCount: fileContent.length,
            wordCount: fileContent.trim().split(/\s+/).filter(word => word.length > 0).length,
          },
          processing: {
            status: 'completed',
            version: '1.0.0',
          },
        };
      };

      const mockFileStats = { size: 100 };
      const mockContent = 'Hello world\nThis is a test';
      const mockPath = '/path/to/test.txt';

      const result = createOutputData(mockPath, mockFileStats, mockContent);

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('processing');

      expect(result.metadata.fileName).toBe('test.txt');
      expect(result.metadata.fileExtension).toBe('.txt');
      expect(result.metadata.fileSize).toBe(100);

      expect(result.content.rawContent).toBe(mockContent);
      expect(result.content.lineCount).toBe(2);
      expect(result.content.wordCount).toBe(6);
      expect(result.content.characterCount).toBe(mockContent.length);

      expect(result.processing.status).toBe('completed');
      expect(result.processing.version).toBe('1.0.0');
    });
  });

  describe('JSON formatting utilities', () => {
    test('should format JSON correctly based on pretty flag', () => {
      const formatJson = (data, pretty) => {
        return pretty
          ? JSON.stringify(data, null, 2)
          : JSON.stringify(data);
      };

      const testData = { test: 'value', nested: { key: 'data' } };

      const prettyJson = formatJson(testData, true);
      const minifiedJson = formatJson(testData, false);

      expect(prettyJson).toContain('\n');
      expect(prettyJson).toContain('  ');
      expect(minifiedJson).not.toContain('\n');
      expect(minifiedJson).not.toContain('  ');
    });
  });
});
