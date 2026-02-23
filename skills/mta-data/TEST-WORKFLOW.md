# Complete Workflow Test

This document shows a complete test of all skill functionality.

## 1. Search for Datasets

```bash
npx tsx scripts/search-datasets.ts "subway ridership" --limit 2
```

Expected: List of MTA datasets related to subway ridership

## 2. Download Dataset

```bash
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-02-01' AND date<'2024-02-08'" \
  --select "date,mode,count" \
  --no-confirm \
  --output test-ridership.csv
```

Expected: CSV file with ~49 rows (7 days × 7 modes)

## 3. Basic Analysis - Count Rows

```bash
npx tsx scripts/analyze-data.ts test-ridership.csv \
  --query "SELECT COUNT(*) as total_rows FROM data"
```

Expected: Shows row count

## 4. Aggregate by Mode

```bash
npx tsx scripts/analyze-data.ts test-ridership.csv \
  --query "SELECT mode, 
                  COUNT(*) as days,
                  AVG(CAST(count AS DOUBLE)) as avg_daily,
                  SUM(CAST(count AS BIGINT)) as total
           FROM data 
           GROUP BY mode 
           ORDER BY total DESC"
```

Expected: Table showing aggregates for each transit mode

## 5. Find Peak Days

```bash
npx tsx scripts/analyze-data.ts test-ridership.csv \
  --query "SELECT date, mode, CAST(count AS BIGINT) as ridership
           FROM data
           WHERE mode = 'Subway'
           ORDER BY ridership DESC
           LIMIT 3"
```

Expected: Top 3 subway ridership days

## 6. JSON Output

```bash
npx tsx scripts/analyze-data.ts test-ridership.csv \
  --query "SELECT mode, AVG(CAST(count AS DOUBLE)) as avg 
           FROM data 
           GROUP BY mode 
           ORDER BY avg DESC 
           LIMIT 3" \
  --format json
```

Expected: JSON array with top 3 modes by average

## 7. Show SQL

```bash
npx tsx scripts/analyze-data.ts test-ridership.csv \
  --query "SELECT mode, COUNT(*) as days FROM data GROUP BY mode" \
  --show-sql
```

Expected: Shows SQL query followed by results

## 8. JSON Data Analysis

```bash
# Download as JSON
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date='2024-02-01'" \
  --no-confirm \
  --format json \
  --output test-ridership.json

# Analyze JSON file
npx tsx scripts/analyze-data.ts test-ridership.json \
  --query "SELECT * FROM data ORDER BY CAST(count AS BIGINT) DESC LIMIT 3"
```

Expected: Works with JSON files too

## Cleanup

```bash
rm -f test-ridership.csv test-ridership.json
```

## Success Criteria

All commands should:
- Run without errors
- Produce expected output format
- Handle both CSV and JSON files
- Show progress/status messages
- Display formatted tables (for table output)
- Generate valid JSON (for JSON output)
