#!/usr/bin/env node

/**
 * Analyze MTA data using DuckDB
 * 
 * Usage: ./analyze-data.ts <data-file> --query "<SQL query>" [options]
 * 
 * Options:
 *   --query <sql>       SQL query to run (required)
 *   --format <table|json|csv>  Output format (default: table)
 *   --output <file>     Write results to file instead of stdout
 *   --show-sql          Show the SQL query before results
 *   --sql-dir <dir>     Directory to save SQL queries (default: ./sql)
 * 
 * Examples:
 *   # Count rows
 *   ./analyze-data.ts ridership.csv --query "SELECT COUNT(*) FROM data"
 * 
 *   # Filter and aggregate
 *   ./analyze-data.ts ridership.csv \
 *     --query "SELECT date, subways_total_estimated_ridership 
 *              FROM data 
 *              WHERE date > '2024-01-01' 
 *              ORDER BY subways_total_estimated_ridership DESC 
 *              LIMIT 10"
 * 
 *   # JSON output
 *   ./analyze-data.ts ridership.csv \
 *     --query "SELECT AVG(subways_total_estimated_ridership) as avg_ridership FROM data" \
 *     --format json
 */

import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CliArgs {
  dataFile: string;
  query: string;
  format: 'table' | 'json' | 'csv';
  output?: string;
  showSql: boolean;
  sqlDir: string;
}

// Parse command line arguments
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: Data file is required');
    console.error('Usage: ./analyze-data.ts <data-file> --query "<SQL query>" [options]');
    process.exit(1);
  }

  const parsed: CliArgs = {
    dataFile: args[0],
    query: '',
    format: 'table',
    showSql: false,
    sqlDir: './sql',
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
        if (i + 1 >= args.length) {
          console.error('Error: --query requires a SQL query');
          process.exit(1);
        }
        parsed.query = args[++i];
        break;
      case '--format':
        if (i + 1 >= args.length) {
          console.error('Error: --format requires a value (table, json, or csv)');
          process.exit(1);
        }
        const format = args[++i].toLowerCase();
        if (format !== 'table' && format !== 'json' && format !== 'csv') {
          console.error('Error: --format must be table, json, or csv');
          process.exit(1);
        }
        parsed.format = format as 'table' | 'json' | 'csv';
        break;
      case '--output':
        if (i + 1 >= args.length) {
          console.error('Error: --output requires a file path');
          process.exit(1);
        }
        parsed.output = args[++i];
        break;
      case '--show-sql':
        parsed.showSql = true;
        break;
      case '--sql-dir':
        if (i + 1 >= args.length) {
          console.error('Error: --sql-dir requires a directory path');
          process.exit(1);
        }
        parsed.sqlDir = args[++i];
        break;
      default:
        console.error(`Error: Unknown option ${args[i]}`);
        process.exit(1);
    }
  }

  if (!parsed.query) {
    console.error('Error: --query is required');
    process.exit(1);
  }

  if (!fs.existsSync(parsed.dataFile)) {
    console.error(`Error: File not found: ${parsed.dataFile}`);
    process.exit(1);
  }

  return parsed;
}

// Check if DuckDB is installed
function checkDuckDB(): boolean {
  const result = spawnSync('which', ['duckdb'], { encoding: 'utf-8' });
  return result.status === 0;
}

// Save SQL query to file
function saveSqlQuery(args: CliArgs): string {
  // Create SQL directory if it doesn't exist
  if (!fs.existsSync(args.sqlDir)) {
    fs.mkdirSync(args.sqlDir, { recursive: true });
  }

  // Generate filename based on timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                    new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
  const filename = `query_${timestamp}.sql`;
  const filepath = path.join(args.sqlDir, filename);

  // Write SQL query to file
  fs.writeFileSync(filepath, args.query);

  return filepath;
}

// Run DuckDB query
async function runQuery(args: CliArgs): Promise<void> {
  // Check if DuckDB is installed
  if (!checkDuckDB()) {
    console.error('Error: DuckDB is not installed.');
    console.error('');
    console.error('Please install DuckDB:');
    console.error('  macOS:   brew install duckdb');
    console.error('  Linux:   See https://duckdb.org/docs/installation/');
    console.error('  Windows: See https://duckdb.org/docs/installation/');
    throw new Error('DuckDB not installed');
  }

  // Save SQL query to file
  const sqlFilePath = saveSqlQuery(args);

  return new Promise((resolve, reject) => {
    const ext = path.extname(args.dataFile).toLowerCase();
    const isJson = ext === '.json';
    
    // Construct SQL with appropriate read function
    let fullQuery: string;
    if (isJson) {
      fullQuery = `CREATE TEMP TABLE data AS SELECT * FROM read_json_auto('${args.dataFile}');\n${args.query}`;
    } else {
      fullQuery = `CREATE TEMP TABLE data AS SELECT * FROM read_csv_auto('${args.dataFile}');\n${args.query}`;
    }

    // Show SQL if requested
    if (args.showSql) {
      console.log('SQL Query:');
      console.log('─'.repeat(60));
      console.log(args.query);
      console.log('─'.repeat(60));
      console.log('');
      console.log(`Saved to: ${sqlFilePath}`);
      console.log(`Rerun: duckdb -c "CREATE TEMP TABLE data AS SELECT * FROM read_${isJson ? 'json' : 'csv'}_auto('${args.dataFile}'); $(cat ${sqlFilePath})"`);
      console.log('');
    }

    // Build DuckDB command arguments
    const duckdbArgs: string[] = ['-c', fullQuery];
    
    // Add output format
    if (args.format === 'json') {
      duckdbArgs.unshift('-json');
    } else if (args.format === 'csv') {
      duckdbArgs.unshift('-csv');
    }

    // Spawn DuckDB process
    const duckdb = spawn('duckdb', duckdbArgs);

    let stdout = '';
    let stderr = '';

    duckdb.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    duckdb.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    duckdb.on('close', (code) => {
      if (code !== 0) {
        console.error('DuckDB Error:');
        console.error(stderr);
        reject(new Error(`DuckDB exited with code ${code}`));
        return;
      }

      // Write to file or stdout
      if (args.output) {
        fs.writeFileSync(args.output, stdout);
        console.log(`Results written to ${args.output}`);
      } else {
        console.log(stdout);
      }

      // Show SQL file location and rerun command
      if (!args.showSql) {
        console.log('');
        console.log(`SQL saved to: ${sqlFilePath}`);
        console.log(`Rerun: duckdb -c "CREATE TEMP TABLE data AS SELECT * FROM read_${isJson ? 'json' : 'csv'}_auto('${args.dataFile}'); $(cat ${sqlFilePath})"`);
      }

      resolve();
    });

    duckdb.on('error', (error) => {
      console.error('Failed to start DuckDB:', error.message);
      console.error('Make sure DuckDB is installed: https://duckdb.org/docs/installation/');
      reject(error);
    });
  });
}

// Main
(async () => {
  try {
    const args = parseArgs();
    await runQuery(args);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
})();
