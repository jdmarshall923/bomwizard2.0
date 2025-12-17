import Papa from 'papaparse';

export interface ParseOptions {
  skipRows?: number;
  delimiter?: string;
  headerRow?: number;
}

export interface ParseResult {
  data: any[];
  headers: string[];
  errors: Papa.ParseError[];
}

/**
 * Parse a CSV file and return the data
 */
export async function parseCSV(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const {
      skipRows = 0,
      delimiter = '',
      headerRow = 0,
    } = options;

    // Auto-detect delimiter if not provided
    const config: Papa.ParseConfig = {
      header: headerRow >= 0,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
    };

    if (delimiter) {
      config.delimiter = delimiter;
    }

    // If we need to skip rows, read the file first
    if (skipRows > 0) {
      file.text().then((text) => {
        const lines = text.split('\n');
        const skippedLines = lines.slice(0, skipRows);
        const remainingText = lines.slice(skipRows).join('\n');
        
        // Parse the remaining content
        Papa.parse(remainingText, {
          ...config,
          complete: (results) => {
            resolve({
              data: results.data as any[],
              headers: results.meta.fields || [],
              errors: results.errors,
            });
          },
          error: (error) => {
            reject(error);
          },
        });
      });
    } else {
      Papa.parse(file, {
        ...config,
        complete: (results) => {
          console.log('CSV parsed successfully:', results.data.length, 'rows');
          console.log('Headers:', results.meta.fields);
          if (results.data.length > 0) {
            console.log('First row:', results.data[0]);
          }
          resolve({
            data: results.data as any[],
            headers: results.meta.fields || [],
            errors: results.errors,
          });
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          reject(error);
        },
      });
    }
  });
}

/**
 * Detect the delimiter used in a CSV file
 */
export function detectDelimiter(firstLine: string): string {
  const delimiters = [',', ';', '\t', '|'];
  let maxCount = 0;
  let detectedDelimiter = ',';

  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delimiter;
    }
  }

  return detectedDelimiter;
}

/**
 * Detect headers from the first few rows of data
 */
export function detectHeaders(data: string[], sampleSize: number = 3): string[] {
  if (data.length === 0) return [];

  // Take first few rows
  const sample = data.slice(0, Math.min(sampleSize, data.length));
  
  // Find the row with the most non-empty values (likely the header)
  let maxNonEmpty = 0;
  let headerRow = 0;

  sample.forEach((row, index) => {
    const nonEmpty = row.filter((cell: string) => cell && cell.trim()).length;
    if (nonEmpty > maxNonEmpty) {
      maxNonEmpty = nonEmpty;
      headerRow = index;
    }
  });

  return sample[headerRow] || [];
}

/**
 * Get a preview of the CSV file (first N rows)
 */
export async function previewCSV(
  file: File,
  rowCount: number = 10,
  options: ParseOptions = {}
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const {
      skipRows = 0,
      delimiter = '',
      headerRow = 0,
    } = options;

    const config: Papa.ParseConfig = {
      header: headerRow >= 0,
      skipEmptyLines: true,
      preview: rowCount + skipRows,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
    };

    if (delimiter) {
      config.delimiter = delimiter;
    }

    Papa.parse(file, {
      ...config,
      complete: (results) => {
        const data = results.data as any[];
        // Remove skipped rows from data
        const previewData = skipRows > 0 ? data.slice(skipRows) : data;
        
        resolve({
          data: previewData,
          headers: results.meta.fields || [],
          errors: results.errors,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

