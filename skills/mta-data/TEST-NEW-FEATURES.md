# Test New Features - Data Directory and Tool Checks

This document tests the new features added to the MTA Data skill:
1. Default ./data/ directory for downloads
2. Custom output directory support
3. DuckDB installation check

## Test 1: Default Data Directory

**Test:** Download without specifying output path

```bash
npx tsx scripts/download-dataset.ts sayj-mze2 --limit 3 --no-confirm
```

**Expected:**
- Creates ./data/ directory if it doesn't exist
- Saves file to ./data/sayj-mze2.csv
- Shows message: "Download complete: X rows saved to ./data/sayj-mze2.csv"

**Verify:**
```bash
ls -la data/
cat data/sayj-mze2.csv
```

## Test 2: Custom Output Directory

**Test:** Download to custom directory

```bash
npx tsx scripts/download-dataset.ts vxuj-8kew --limit 3 --no-confirm --output-dir ./my-data
```

**Expected:**
- Creates ./my-data/ directory if it doesn't exist
- Saves file to ./my-data/vxuj-8kew.csv
- Shows message: "Download complete: X rows saved to ./my-data/vxuj-8kew.csv"

**Verify:**
```bash
ls -la my-data/
cat my-data/vxuj-8kew.csv
```

## Test 3: Explicit Output Path

**Test:** Specify exact output file path

```bash
npx tsx scripts/download-dataset.ts sayj-mze2 --limit 3 --no-confirm --output ./reports/ridership.csv
```

**Expected:**
- Creates ./reports/ directory if it doesn't exist
- Saves file to ./reports/ridership.csv (not to ./data/)
- Shows message: "Download complete: X rows saved to ./reports/ridership.csv"

**Verify:**
```bash
ls -la reports/
cat reports/ridership.csv
```

## Test 4: Analyze Data from Default Location

**Test:** Analyze file in default data directory

```bash
npx tsx scripts/download-dataset.ts sayj-mze2 --limit 10 --no-confirm
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode, COUNT(*) as rows FROM data GROUP BY mode"
```

**Expected:**
- File downloads to ./data/sayj-mze2.csv
- Analysis runs successfully
- Shows table with mode counts

## Test 5: DuckDB Installation Check

**Test:** Run analysis with DuckDB installed

```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT COUNT(*) FROM data"
```

**Expected:**
- Script checks for DuckDB
- If installed: query runs successfully
- If not installed: shows error message with installation instructions

**Error message should include:**
```
Error: DuckDB is not installed.

Please install DuckDB:
  macOS:   brew install duckdb
  Linux:   See https://duckdb.org/docs/installation/
  Windows: See https://duckdb.org/docs/installation/
```

## Test 6: End-to-End Workflow

**Test:** Complete workflow from search to analysis

```bash
# Search
npx tsx scripts/search-datasets.ts "daily ridership" --limit 1

# Download (to default location)
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-02-01' AND date<'2024-02-08'" \
  --no-confirm

# Analyze (from default location)
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode, AVG(CAST(count AS DOUBLE)) as avg FROM data GROUP BY mode ORDER BY avg DESC" \
  --show-sql
```

**Expected:**
- Search returns dataset info
- Download saves to ./data/sayj-mze2.csv
- Analysis runs and shows:
  - SQL query (because of --show-sql)
  - Results table with mode averages

## Cleanup

```bash
rm -rf data/ my-data/ reports/
```

## Success Criteria

All tests pass with:
- Correct directory creation
- Files saved to expected locations
- DuckDB check runs before analysis
- Clear error messages if DuckDB missing
- All file paths in output messages match actual locations
- Data directory is in .gitignore (not committed)
