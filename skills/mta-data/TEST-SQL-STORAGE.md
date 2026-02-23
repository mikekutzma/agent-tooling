# Test SQL Storage Feature

This document tests the automatic SQL query storage feature.

## Feature Overview

Every SQL query run through the analyze-data.ts script is automatically saved to the `./sql/` directory with a timestamp filename. This provides complete transparency and reproducibility.

## Test 1: Basic Query with Automatic Storage

**Test:** Run a simple query and verify SQL is saved

```bash
# Download sample data
npx tsx scripts/download-dataset.ts sayj-mze2 --limit 10 --no-confirm

# Run analysis
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT COUNT(*) as total FROM data"
```

**Expected Output:**
- Query results displayed
- Message showing: `SQL saved to: sql/query_YYYY-MM-DD_HH-MM-SS.sql`
- Rerun command displayed

**Verify:**
```bash
ls sql/
cat sql/query_*.sql
```

**Expected:**
- SQL file exists with timestamp name
- File contains exact query: `SELECT COUNT(*) as total FROM data`

## Test 2: Show SQL Flag

**Test:** Use --show-sql flag to display query before results

```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode, COUNT(*) FROM data GROUP BY mode" \
  --show-sql
```

**Expected Output:**
- "SQL Query:" header with separator
- The raw SQL query
- SQL file path
- Rerun command
- Query results

**Order should be:**
1. SQL query display
2. File save location
3. Rerun command
4. Results

## Test 3: Verify Rerun Command Works

**Test:** Copy the rerun command and execute it directly

```bash
# Get the rerun command from previous output
# Should look like:
# duckdb -c "CREATE TEMP TABLE data AS SELECT * FROM read_csv_auto('data/sayj-mze2.csv'); $(cat sql/query_*.sql)"

# Run it directly
duckdb -c "CREATE TEMP TABLE data AS SELECT * FROM read_csv_auto('data/sayj-mze2.csv'); $(cat sql/query_2026-02-23_00-03-26.sql)"
```

**Expected:**
- Same results as original query
- No errors
- Proves complete reproducibility

## Test 4: Multiple Queries Create Multiple Files

**Test:** Run several queries and verify each is saved

```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT COUNT(*) FROM data"

npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode FROM data LIMIT 1"

npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT AVG(CAST(count AS DOUBLE)) FROM data"
```

**Verify:**
```bash
ls -lt sql/
wc -l sql/*.sql
```

**Expected:**
- 3 SQL files (plus any from previous tests)
- Each file contains different query
- Files sorted by timestamp (newest first with -lt)

## Test 5: Custom SQL Directory

**Test:** Use --sql-dir to save to a different location

```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT * FROM data LIMIT 5" \
  --sql-dir ./custom-sql
```

**Expected:**
- Creates ./custom-sql/ directory
- Saves query to custom-sql/query_*.sql
- Output shows: `SQL saved to: custom-sql/query_*.sql`

**Verify:**
```bash
ls custom-sql/
cat custom-sql/query_*.sql
```

## Test 6: JSON Data Files

**Test:** Verify SQL storage works with JSON files too

```bash
# Download as JSON
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --limit 5 --no-confirm --format json

# Analyze JSON
npx tsx scripts/analyze-data.ts data/sayj-mze2.json \
  --query "SELECT mode, count FROM data LIMIT 3"
```

**Expected:**
- Query runs successfully
- SQL saved to ./sql/
- Rerun command uses `read_json_auto` instead of `read_csv_auto`

**Verify rerun command format:**
```bash
# Should contain: read_json_auto('data/sayj-mze2.json')
ls -lt sql/ | head -2
cat sql/query_*.sql | tail -1
```

## Test 7: Complex Query Storage

**Test:** Verify complex multi-line queries are saved correctly

```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "WITH avg_by_mode AS (
    SELECT mode, AVG(CAST(count AS DOUBLE)) as avg_count
    FROM data
    GROUP BY mode
  )
  SELECT mode, avg_count, 
         RANK() OVER (ORDER BY avg_count DESC) as rank
  FROM avg_by_mode"
```

**Expected:**
- Query executes successfully
- Multi-line SQL saved to file
- Rerun command works with complex query

**Verify:**
```bash
cat sql/query_*.sql | tail -1
# Should show the full multi-line query
```

## Test 8: Verify SQL File Format

**Test:** Check that SQL files contain only the query

```bash
# View latest SQL file
cat $(ls -t sql/*.sql | head -1)
```

**Expected:**
- File contains ONLY the SQL query
- No headers, footers, or extra text
- Can be directly used with duckdb -c or cat

## Success Criteria

All tests pass with:
- ./sql/ directory created automatically
- Each query saved with unique timestamp filename
- SQL files contain exact query text only
- Rerun commands work correctly
- Both CSV and JSON files supported
- Custom --sql-dir option works
- All queries reproducible via provided commands

## Cleanup

```bash
rm -rf data/ sql/ custom-sql/
```
