# Complete Analysis Example

This document shows a full end-to-end analysis workflow, from user question to final answer.

## User Question

**"What was the average daily subway ridership in February 2024, and how does it compare to bus ridership?"**

## Step 1: Search for Relevant Dataset

```bash
npx tsx scripts/search-datasets.ts "daily ridership"
```

**Output:**
```
Found 2 MTA dataset(s) for "daily ridership":

1. MTA Daily Ridership and Traffic: Beginning 2020
   ID: sayj-mze2
   Link: https://data.ny.gov/d/sayj-mze2
   Description: The daily ridership dataset provides systemwide ridership...
   Update Frequency: Daily
   Time Period: Beginning 3/1/2020
```

**Decision:** Use dataset `sayj-mze2` - it has daily data and covers 2024.

## Step 2: Download the Data

```bash
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-02-01' AND date<'2024-03-01'" \
  --no-confirm \
  --output feb2024-ridership.csv
```

**Output:**
```
Fetching metadata for dataset sayj-mze2...
Dataset: MTA Daily Ridership and Traffic: Beginning 2020
Columns: 3

Available columns:
  - date (calendar_date): Date
  - mode (text): Mode
  - count (number): Count

Downloading to feb2024-ridership.csv...
Download complete: 203 rows saved to feb2024-ridership.csv
```

**Note:** 203 rows = 29 days × 7 modes (Subway, Bus, LIRR, MNR, BT, AAR, SIR)

## Step 3: Analyze the Data

### Query: Average Ridership for Subway and Bus

```bash
npx tsx scripts/analyze-data.ts feb2024-ridership.csv \
  --query "SELECT mode, 
                  COUNT(*) as days,
                  AVG(CAST(count AS DOUBLE)) as avg_daily,
                  SUM(CAST(count AS BIGINT)) as total_month
           FROM data 
           WHERE mode IN ('Subway', 'Bus')
           GROUP BY mode
           ORDER BY avg_daily DESC"
```

**Output:**
```
┌─────────┬──────┬────────────────────┬─────────────┐
│  mode   │ days │     avg_daily      │ total_month │
│ varchar │ int64│      double        │    int128   │
├─────────┼──────┼────────────────────┼─────────────┤
│ Subway  │   29 │  3456789.3103448   │  100246890  │
│ Bus     │   29 │  1234567.8965517   │   35802470  │
└─────────┴──────┴────────────────────┴─────────────┘
```

### Query: Calculate the Difference

```bash
npx tsx scripts/analyze-data.ts feb2024-ridership.csv \
  --query "WITH averages AS (
             SELECT mode, 
                    AVG(CAST(count AS DOUBLE)) as avg_daily
             FROM data 
             WHERE mode IN ('Subway', 'Bus')
             GROUP BY mode
           )
           SELECT 
             MAX(CASE WHEN mode = 'Subway' THEN avg_daily END) as subway_avg,
             MAX(CASE WHEN mode = 'Bus' THEN avg_daily END) as bus_avg,
             MAX(CASE WHEN mode = 'Subway' THEN avg_daily END) - 
             MAX(CASE WHEN mode = 'Bus' THEN avg_daily END) as difference,
             ROUND(100.0 * MAX(CASE WHEN mode = 'Subway' THEN avg_daily END) / 
                   MAX(CASE WHEN mode = 'Bus' THEN avg_daily END), 2) as subway_pct_of_bus
           FROM averages" \
  --format json
```

**Output:**
```json
[{"subway_avg":3456789.310344828,"bus_avg":1234567.896551724,"difference":2222221.413793104,"subway_pct_of_bus":280.06}]
```

## Step 4: Present the Answer

**Direct Answer to User:**

```
In February 2024:
- Average daily subway ridership: 3,456,789 passengers
- Average daily bus ridership: 1,234,568 passengers

The subway averaged 2,222,221 more passengers per day than buses.
Subway ridership was 2.8× (280%) of bus ridership.

Would you like to see the SQL queries I used to calculate this?
```

## Step 5: User Asks for Explanation

If the user responds "yes" to seeing the SQL:

```
I used two queries to answer your question:

Query 1: Calculate average daily ridership for each mode
─────────────────────────────────────────────────────────
SELECT mode, 
       COUNT(*) as days,
       AVG(CAST(count AS DOUBLE)) as avg_daily,
       SUM(CAST(count AS BIGINT)) as total_month
FROM data 
WHERE mode IN ('Subway', 'Bus')
GROUP BY mode
ORDER BY avg_daily DESC
─────────────────────────────────────────────────────────

This query:
1. Filters to only Subway and Bus modes
2. Counts the number of days in the dataset (29 days in February)
3. Calculates the average daily ridership (SUM/COUNT)
4. Shows the total monthly ridership as well
5. Orders by average ridership descending

Query 2: Compare the two modes
─────────────────────────────────────────────────────────
WITH averages AS (
  SELECT mode, AVG(CAST(count AS DOUBLE)) as avg_daily
  FROM data 
  WHERE mode IN ('Subway', 'Bus')
  GROUP BY mode
)
SELECT 
  MAX(CASE WHEN mode = 'Subway' THEN avg_daily END) as subway_avg,
  MAX(CASE WHEN mode = 'Bus' THEN avg_daily END) as bus_avg,
  MAX(CASE WHEN mode = 'Subway' THEN avg_daily END) - 
  MAX(CASE WHEN mode = 'Bus' THEN avg_daily END) as difference,
  ROUND(100.0 * MAX(CASE WHEN mode = 'Subway' THEN avg_daily END) / 
        MAX(CASE WHEN mode = 'Bus' THEN avg_daily END), 2) as subway_pct_of_bus
FROM averages
─────────────────────────────────────────────────────────

This query:
1. Uses a CTE (Common Table Expression) to first calculate averages
2. Pivots the data to put Subway and Bus in separate columns
3. Calculates the absolute difference between them
4. Calculates the percentage ratio (Subway/Bus × 100)

The data was filtered at download time to only include February 2024.
```

## Additional Analysis Examples

### Trend Over the Month

If the user then asks: "Show me the trend over the month"

```bash
npx tsx scripts/analyze-data.ts feb2024-ridership.csv \
  --query "SELECT date,
                  MAX(CASE WHEN mode = 'Subway' THEN CAST(count AS BIGINT) END) as subway,
                  MAX(CASE WHEN mode = 'Bus' THEN CAST(count AS BIGINT) END) as bus
           FROM data
           WHERE mode IN ('Subway', 'Bus')
           GROUP BY date
           ORDER BY date"
```

### Weekday vs Weekend Comparison

```bash
npx tsx scripts/analyze-data.ts feb2024-ridership.csv \
  --query "SELECT 
             CASE 
               WHEN dayofweek(CAST(date AS DATE)) IN (0, 6) THEN 'Weekend'
               ELSE 'Weekday'
             END as day_type,
             mode,
             AVG(CAST(count AS DOUBLE)) as avg_ridership
           FROM data
           WHERE mode IN ('Subway', 'Bus')
           GROUP BY day_type, mode
           ORDER BY mode, day_type"
```

### Find Peak Days

```bash
npx tsx scripts/analyze-data.ts feb2024-ridership.csv \
  --query "SELECT date, 
                  CAST(count AS BIGINT) as ridership,
                  dayname(CAST(date AS DATE)) as day_of_week
           FROM data
           WHERE mode = 'Subway'
           ORDER BY ridership DESC
           LIMIT 5"
```

## Key Patterns Demonstrated

1. **Specific Question → Direct Answer**: Present the answer clearly before offering details
2. **Transparent Methods**: Offer to show SQL queries used
3. **Explainable Results**: When showing SQL, explain what each part does
4. **Progressive Disclosure**: Basic answer first, details on request
5. **Clean Presentation**: Format numbers with commas, percentages, etc.
6. **Follow-up Ready**: Anticipate natural follow-up questions
7. **Reproducible**: User can run the same queries to verify

## When NOT to Ask About Showing SQL

Skip the "want to see SQL?" question when:
- The skill is being used indirectly by another task
- The query is trivial (e.g., `SELECT * FROM data LIMIT 10`)
- The user just wants exploratory data shown (let DuckDB's table format speak for itself)
- The analysis is part of a larger automated workflow

## Best Practices

1. **Filter at download time** when possible (reduces data size)
2. **Cast types explicitly** in SQL (CSV imports are strings)
3. **Show progress** during downloads (user knows something is happening)
4. **Validate data** after download (check row counts, date ranges)
5. **Use descriptive column aliases** in SQL (avg_daily, not avg)
6. **Format numbers** in presentation (3,456,789 not 3456789)
7. **Provide context** with units (passengers, days, percentage)
8. **Offer next steps** or related analysis options
