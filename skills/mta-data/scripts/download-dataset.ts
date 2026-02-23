#!/usr/bin/env node

/**
 * Download MTA datasets from the New York State Open Data portal
 * 
 * Usage: ./download-dataset.ts <dataset-id> [options]
 * 
 * Options:
 *   --format <csv|json>     Output format (default: csv)
 *   --output <file>         Output file path (default: ./data/<dataset-id>.<format>)
 *   --output-dir <dir>      Output directory (default: ./data)
 *   --limit <number>        Maximum rows to download (default: all)
 *   --where <clause>        SoQL WHERE clause for filtering
 *   --select <columns>      Comma-separated columns to include (default: all)
 *   --order <clause>        SoQL ORDER BY clause
 *   --chunk-size <number>   Rows per API request (default: 10000)
 *   --no-confirm            Skip confirmation for large downloads
 * 
 * Examples:
 *   # Download entire dataset as CSV
 *   ./download-dataset.ts vxuj-8kew
 * 
 *   # Download as JSON with limit
 *   ./download-dataset.ts vxuj-8kew --format json --limit 1000
 * 
 *   # Filter by date range
 *   ./download-dataset.ts vxuj-8kew --where "date>'2024-01-01' AND date<'2024-12-31'"
 * 
 *   # Select specific columns
 *   ./download-dataset.ts vxuj-8kew --select "date,subways_total_estimated_ridership"
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface CliArgs {
  datasetId: string;
  format: 'csv' | 'json';
  output?: string;
  outputDir: string;
  limit?: number;
  where?: string;
  select?: string;
  order?: string;
  chunkSize: number;
  noConfirm: boolean;
}

interface DatasetMetadata {
  name: string;
  description: string;
  columns: Array<{
    fieldName: string;
    name: string;
    dataTypeName: string;
    description?: string;
  }>;
  rowCount?: number;
}

// Parse command line arguments
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('Error: Dataset ID is required');
    console.error('Usage: ./download-dataset.ts <dataset-id> [options]');
    process.exit(1);
  }

  const parsed: CliArgs = {
    datasetId: args[0],
    format: 'csv',
    outputDir: './data',
    chunkSize: 10000,
    noConfirm: false,
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--format':
        if (i + 1 >= args.length) {
          console.error('Error: --format requires a value (csv or json)');
          process.exit(1);
        }
        const format = args[++i].toLowerCase();
        if (format !== 'csv' && format !== 'json') {
          console.error('Error: --format must be csv or json');
          process.exit(1);
        }
        parsed.format = format;
        break;
      case '--output':
        if (i + 1 >= args.length) {
          console.error('Error: --output requires a file path');
          process.exit(1);
        }
        parsed.output = args[++i];
        break;
      case '--output-dir':
        if (i + 1 >= args.length) {
          console.error('Error: --output-dir requires a directory path');
          process.exit(1);
        }
        parsed.outputDir = args[++i];
        break;
      case '--limit':
        if (i + 1 >= args.length) {
          console.error('Error: --limit requires a number');
          process.exit(1);
        }
        parsed.limit = parseInt(args[++i], 10);
        break;
      case '--where':
        if (i + 1 >= args.length) {
          console.error('Error: --where requires a clause');
          process.exit(1);
        }
        parsed.where = args[++i];
        break;
      case '--select':
        if (i + 1 >= args.length) {
          console.error('Error: --select requires column names');
          process.exit(1);
        }
        parsed.select = args[++i];
        break;
      case '--order':
        if (i + 1 >= args.length) {
          console.error('Error: --order requires a clause');
          process.exit(1);
        }
        parsed.order = args[++i];
        break;
      case '--chunk-size':
        if (i + 1 >= args.length) {
          console.error('Error: --chunk-size requires a number');
          process.exit(1);
        }
        parsed.chunkSize = parseInt(args[++i], 10);
        break;
      case '--no-confirm':
        parsed.noConfirm = true;
        break;
      default:
        console.error(`Error: Unknown option ${args[i]}`);
        process.exit(1);
    }
  }

  // Set default output path if not specified
  if (!parsed.output) {
    // Ensure output directory exists
    if (!fs.existsSync(parsed.outputDir)) {
      fs.mkdirSync(parsed.outputDir, { recursive: true });
    }
    parsed.output = `${parsed.outputDir}/${parsed.datasetId}.${parsed.format}`;
  } else {
    // If output is specified, ensure its directory exists
    const outputDir = path.dirname(parsed.output);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  return parsed;
}

// Fetch dataset metadata
async function fetchMetadata(datasetId: string): Promise<DatasetMetadata> {
  return new Promise((resolve, reject) => {
    const url = `https://data.ny.gov/api/views/${datasetId}.json`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const metadata = JSON.parse(data);
          resolve({
            name: metadata.name,
            description: metadata.description || '',
            columns: (metadata.columns || []).map((col: any) => ({
              fieldName: col.fieldName,
              name: col.name,
              dataTypeName: col.dataTypeName,
              description: col.description,
            })),
            rowCount: metadata.rowsUpdatedAt ? undefined : metadata.rowCount,
          });
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${(error as Error).message}`));
        }
      });
    }).on('error', reject);
  });
}

// Fetch data chunk
async function fetchChunk(datasetId: string, format: string, params: URLSearchParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://data.ny.gov/resource/${datasetId}.${format}?${params.toString()}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Count total rows (for confirmation)
async function countRows(datasetId: string, where?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ $select: 'count(*)' });
    if (where) params.append('$where', where);
    
    const url = `https://data.ny.gov/resource/${datasetId}.json?${params.toString()}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const count = parseInt(result[0]?.count || '0', 10);
          resolve(count);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Prompt user for confirmation
async function confirmDownload(rowCount: number): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`This will download ${rowCount.toLocaleString()} rows. Continue? [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Download dataset
async function downloadDataset(args: CliArgs): Promise<void> {
  console.log(`Fetching metadata for dataset ${args.datasetId}...`);
  
  const metadata = await fetchMetadata(args.datasetId);
  console.log(`Dataset: ${metadata.name}`);
  console.log(`Columns: ${metadata.columns.length}`);
  
  // Display column information
  if (metadata.columns.length > 0) {
    console.log('\nAvailable columns:');
    metadata.columns.forEach(col => {
      console.log(`  - ${col.fieldName} (${col.dataTypeName}): ${col.name}`);
    });
    console.log('');
  }

  // Count rows for confirmation
  let totalRows: number | undefined;
  if (!args.noConfirm && !args.limit) {
    console.log('Counting rows...');
    totalRows = await countRows(args.datasetId, args.where);
    console.log(`Total rows: ${totalRows.toLocaleString()}`);
    
    // Suggest filters if downloading large dataset without filters
    if (totalRows > 50000 && !args.where) {
      console.log('\n⚠️  This is a large dataset. Consider filtering with --where');
      console.log('Example filters:');
      
      // Suggest date filters if date columns exist
      const dateColumns = metadata.columns.filter(col => 
        col.dataTypeName === 'calendar_date' || 
        col.fieldName.includes('date') || 
        col.fieldName.includes('time')
      );
      
      if (dateColumns.length > 0) {
        const dateCol = dateColumns[0].fieldName;
        console.log(`  --where "${dateCol}>'2024-01-01'"`);
        console.log(`  --where "${dateCol}>'2024-01-01' AND ${dateCol}<'2024-12-31'"`);
      }
      
      console.log('');
    }
    
    const confirmed = await confirmDownload(totalRows);
    if (!confirmed) {
      console.log('Download cancelled.');
      process.exit(0);
    }
  }

  // Build query parameters
  const params = new URLSearchParams();
  if (args.select) params.append('$select', args.select);
  if (args.where) params.append('$where', args.where);
  if (args.order) params.append('$order', args.order);

  // Determine total rows to download
  const rowsToDownload = args.limit || totalRows;

  // Download data in chunks
  console.log(`\nDownloading to ${args.output}...`);
  
  const outputStream = fs.createWriteStream(args.output);
  let offset = 0;
  let downloadedRows = 0;
  let isFirstChunk = true;

  if (args.format === 'json') {
    outputStream.write('[\n');
  }

  while (true) {
    const chunkLimit = Math.min(
      args.chunkSize,
      rowsToDownload ? rowsToDownload - downloadedRows : args.chunkSize
    );
    
    if (chunkLimit <= 0) break;

    const chunkParams = new URLSearchParams(params);
    chunkParams.append('$limit', chunkLimit.toString());
    chunkParams.append('$offset', offset.toString());

    const chunk = await fetchChunk(args.datasetId, args.format, chunkParams);
    
    if (args.format === 'json') {
      const rows = JSON.parse(chunk);
      if (!Array.isArray(rows) || rows.length === 0) break;
      
      rows.forEach((row: any, index: number) => {
        if (!isFirstChunk || index > 0) {
          outputStream.write(',\n');
        }
        outputStream.write('  ' + JSON.stringify(row));
        isFirstChunk = false;
      });
      
      downloadedRows += rows.length;
      
      if (rows.length < chunkLimit) break;
    } else {
      // CSV format
      const lines = chunk.split('\n');
      
      if (lines.length <= 1) break; // No data rows
      
      if (isFirstChunk) {
        // Write header and data
        outputStream.write(chunk);
        isFirstChunk = false;
      } else {
        // Skip header, write data only
        outputStream.write(lines.slice(1).join('\n'));
      }
      
      downloadedRows += lines.length - 1; // Subtract header
      
      if (lines.length - 1 < chunkLimit) break;
    }

    offset += chunkLimit;
    
    // Progress indicator
    if (rowsToDownload) {
      const percent = ((downloadedRows / rowsToDownload) * 100).toFixed(1);
      process.stdout.write(`\rProgress: ${downloadedRows.toLocaleString()} / ${rowsToDownload.toLocaleString()} rows (${percent}%)`);
    } else {
      process.stdout.write(`\rDownloaded: ${downloadedRows.toLocaleString()} rows`);
    }
  }

  if (args.format === 'json') {
    outputStream.write('\n]\n');
  }

  outputStream.end();
  
  console.log(`\n✓ Download complete: ${downloadedRows.toLocaleString()} rows saved to ${args.output}`);
}

// Main
(async () => {
  try {
    const args = parseArgs();
    await downloadDataset(args);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
})();
