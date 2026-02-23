# MTA Data Analysis Patterns

Common DuckDB SQL patterns for analyzing MTA datasets.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Queries](#basic-queries)
- [Time Series Analysis](#time-series-analysis)
- [Aggregations](#aggregations)
- [Comparisons](#comparisons)
- [Trends and Growth](#trends-and-growth)
- [Filtering Patterns](#filtering-patterns)
- [Advanced Queries](#advanced-queries)

## Getting Started

When you run the analysis script, your data is automatically loaded into a table called `data`:

```bash
npx tsx scripts/analyze-data.ts your-file.csv --query "SELECT * FROM data LIMIT 5"
```

**Important**: CSV and JSON columns are often imported as strings. Cast to appropriate types:
- `CAST(column AS BIGINT)` for integer counts
- `CAST(column AS DOUBLE)` for floating-point calculations
- `CAST(column AS DATE)` for date operations

## Basic Queries

### Count Total Rows

```sql
SELECT COUNT(*) as total_rows FROM data
```

### View Sample Data

```sql
SELECT * FROM data LIMIT 10
```

### List All Unique Modes

```sql
SELECT DISTINCT mode FROM data ORDER BY mode
```

### Get Column Summary

```sql
SELECT 
    COUNT(*) as rows,
    COUNT(DISTINCT date) as unique_dates,
    COUNT(DISTINCT mode) as unique_modes
FROM data
```

## Time Series Analysis

### Daily Totals Across All Modes

```sql
SELECT date, 
       SUM(CAST(count AS BIGINT)) as total_ridership
FROM data
GROUP BY date
ORDER BY date
```

### Ridership by Day of Week

```sql
SELECT 
    dayname(CAST(date AS DATE)) as day_of_week,
    AVG(CAST(count AS DOUBLE)) as avg_ridership
FROM data
WHERE mode = 'Subway'
GROUP BY day_of_week
ORDER BY avg_ridership DESC
```

### Monthly Trends

```sql
SELECT 
    strftime(CAST(date AS DATE), '%Y-%m') as month,
    mode,
    SUM(CAST(count AS BIGINT)) as total,
    AVG(CAST(count AS DOUBLE)) as daily_avg
FROM data
GROUP BY month, mode
ORDER BY month, mode
```

### Find Date Range in Dataset

```sql
SELECT 
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    COUNT(DISTINCT date) as total_days
FROM data
```

## Aggregations

### Total Ridership by Mode

```sql
SELECT mode,
       COUNT(*) as days_measured,
       SUM(CAST(count AS BIGINT)) as total_riders,
       AVG(CAST(count AS DOUBLE)) as avg_daily,
       MIN(CAST(count AS BIGINT)) as min_day,
       MAX(CAST(count AS BIGINT)) as max_day
FROM data
GROUP BY mode
ORDER BY total_riders DESC
```

### Summary Statistics

```sql
SELECT mode,
       COUNT(*) as n,
       AVG(CAST(count AS DOUBLE)) as mean,
       STDDEV(CAST(count AS DOUBLE)) as std_dev,
       MIN(CAST(count AS BIGINT)) as min,
       PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CAST(count AS DOUBLE)) as q25,
       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY CAST(count AS DOUBLE)) as median,
       PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CAST(count AS DOUBLE)) as q75,
       MAX(CAST(count AS BIGINT)) as max
FROM data
GROUP BY mode
```

### Cumulative Totals

```sql
SELECT date,
       mode,
       CAST(count AS BIGINT) as daily,
       SUM(CAST(count AS BIGINT)) OVER (
           PARTITION BY mode 
           ORDER BY date
       ) as cumulative
FROM data
ORDER BY mode, date
```

## Comparisons

### Compare Two Modes

```sql
SELECT date,
       MAX(CASE WHEN mode = 'Subway' THEN CAST(count AS BIGINT) END) as subway,
       MAX(CASE WHEN mode = 'Bus' THEN CAST(count AS BIGINT) END) as bus,
       MAX(CASE WHEN mode = 'Subway' THEN CAST(count AS BIGINT) END) - 
       MAX(CASE WHEN mode = 'Bus' THEN CAST(count AS BIGINT) END) as difference
FROM data
WHERE mode IN ('Subway', 'Bus')
GROUP BY date
ORDER BY date
```

### Ratio Between Modes

```sql
SELECT date,
       MAX(CASE WHEN mode = 'Subway' THEN CAST(count AS DOUBLE) END) /
       MAX(CASE WHEN mode = 'Bus' THEN CAST(count AS DOUBLE) END) as subway_to_bus_ratio
FROM data
WHERE mode IN ('Subway', 'Bus')
GROUP BY date
HAVING subway_to_bus_ratio IS NOT NULL
ORDER BY date
```

### Ranking by Day

```sql
SELECT date,
       mode,
       CAST(count AS BIGINT) as ridership,
       RANK() OVER (PARTITION BY mode ORDER BY CAST(count AS BIGINT) DESC) as rank_in_mode
FROM data
ORDER BY mode, rank_in_mode
```

## Trends and Growth

### Day-over-Day Change

```sql
SELECT date,
       CAST(count AS BIGINT) as ridership,
       LAG(CAST(count AS BIGINT)) OVER (ORDER BY date) as prev_day,
       CAST(count AS BIGINT) - LAG(CAST(count AS BIGINT)) OVER (ORDER BY date) as change,
       ROUND(100.0 * (CAST(count AS BIGINT) - LAG(CAST(count AS BIGINT)) OVER (ORDER BY date)) / 
             LAG(CAST(count AS BIGINT)) OVER (ORDER BY date), 2) as pct_change
FROM data
WHERE mode = 'Subway'
ORDER BY date
```

### Week-over-Week Growth

```sql
SELECT date,
       CAST(count AS BIGINT) as ridership,
       LAG(CAST(count AS BIGINT), 7) OVER (ORDER BY date) as same_day_prev_week,
       ROUND(100.0 * (CAST(count AS BIGINT) - LAG(CAST(count AS BIGINT), 7) OVER (ORDER BY date)) / 
             LAG(CAST(count AS BIGINT), 7) OVER (ORDER BY date), 2) as pct_change_wow
FROM data
WHERE mode = 'Subway'
ORDER BY date
```

### Moving Average (7-day)

```sql
SELECT date,
       CAST(count AS BIGINT) as daily,
       AVG(CAST(count AS DOUBLE)) OVER (
           ORDER BY date 
           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ) as moving_avg_7day
FROM data
WHERE mode = 'Subway'
ORDER BY date
```

### Year-over-Year Comparison

```sql
SELECT 
    strftime(CAST(date AS DATE), '%m-%d') as day_of_year,
    MAX(CASE WHEN strftime(CAST(date AS DATE), '%Y') = '2023' 
             THEN CAST(count AS BIGINT) END) as ridership_2023,
    MAX(CASE WHEN strftime(CAST(date AS DATE), '%Y') = '2024' 
             THEN CAST(count AS BIGINT) END) as ridership_2024,
    MAX(CASE WHEN strftime(CAST(date AS DATE), '%Y') = '2024' 
             THEN CAST(count AS BIGINT) END) -
    MAX(CASE WHEN strftime(CAST(date AS DATE), '%Y') = '2023' 
             THEN CAST(count AS BIGINT) END) as yoy_change
FROM data
WHERE mode = 'Subway' 
  AND strftime(CAST(date AS DATE), '%Y') IN ('2023', '2024')
GROUP BY day_of_year
ORDER BY day_of_year
```

## Filtering Patterns

### Top N Records

```sql
SELECT date, mode, CAST(count AS BIGINT) as ridership
FROM data
WHERE mode = 'Subway'
ORDER BY ridership DESC
LIMIT 10
```

### Bottom N Records

```sql
SELECT date, mode, CAST(count AS BIGINT) as ridership
FROM data
WHERE mode = 'Subway'
  AND CAST(count AS BIGINT) > 0  -- Exclude zeros
ORDER BY ridership ASC
LIMIT 10
```

### Filter by Date Range

```sql
SELECT date, mode, CAST(count AS BIGINT) as ridership
FROM data
WHERE date >= '2024-01-01' 
  AND date < '2024-02-01'
ORDER BY date
```

### Filter by Multiple Modes

```sql
SELECT date, mode, CAST(count AS BIGINT) as ridership
FROM data
WHERE mode IN ('Subway', 'Bus', 'LIRR')
ORDER BY date, mode
```

### Filter by Threshold

```sql
SELECT date, mode, CAST(count AS BIGINT) as ridership
FROM data
WHERE CAST(count AS BIGINT) > 3000000
ORDER BY CAST(count AS BIGINT) DESC
```

### Weekday vs Weekend

```sql
SELECT 
    CASE 
        WHEN dayofweek(CAST(date AS DATE)) IN (0, 6) THEN 'Weekend'
        ELSE 'Weekday'
    END as day_type,
    mode,
    COUNT(*) as days,
    AVG(CAST(count AS DOUBLE)) as avg_ridership
FROM data
GROUP BY day_type, mode
ORDER BY mode, day_type
```

## Advanced Queries

### Identify Outliers (>2 Standard Deviations)

```sql
WITH stats AS (
    SELECT mode,
           AVG(CAST(count AS DOUBLE)) as mean,
           STDDEV(CAST(count AS DOUBLE)) as std_dev
    FROM data
    GROUP BY mode
)
SELECT d.date, 
       d.mode, 
       CAST(d.count AS BIGINT) as ridership,
       s.mean,
       ROUND((CAST(d.count AS DOUBLE) - s.mean) / s.std_dev, 2) as z_score
FROM data d
JOIN stats s ON d.mode = s.mode
WHERE ABS((CAST(d.count AS DOUBLE) - s.mean) / s.std_dev) > 2
ORDER BY ABS((CAST(d.count AS DOUBLE) - s.mean) / s.std_dev) DESC
```

### Running Total by Mode

```sql
SELECT date,
       mode,
       CAST(count AS BIGINT) as daily,
       SUM(CAST(count AS BIGINT)) OVER (
           PARTITION BY mode 
           ORDER BY date 
           ROWS UNBOUNDED PRECEDING
       ) as running_total
FROM data
ORDER BY mode, date
```

### Percent of Total by Mode

```sql
WITH daily_totals AS (
    SELECT date,
           SUM(CAST(count AS BIGINT)) as total
    FROM data
    GROUP BY date
)
SELECT d.date,
       d.mode,
       CAST(d.count AS BIGINT) as ridership,
       dt.total,
       ROUND(100.0 * CAST(d.count AS DOUBLE) / dt.total, 2) as pct_of_total
FROM data d
JOIN daily_totals dt ON d.date = dt.date
ORDER BY d.date, pct_of_total DESC
```

### Find Consecutive Days Above Threshold

```sql
WITH marked AS (
    SELECT date,
           CAST(count AS BIGINT) as ridership,
           CASE WHEN CAST(count AS BIGINT) > 4000000 THEN 1 ELSE 0 END as above_threshold,
           SUM(CASE WHEN CAST(count AS BIGINT) > 4000000 THEN 0 ELSE 1 END) 
               OVER (ORDER BY date) as grp
    FROM data
    WHERE mode = 'Subway'
)
SELECT MIN(date) as start_date,
       MAX(date) as end_date,
       COUNT(*) as consecutive_days,
       AVG(ridership) as avg_ridership
FROM marked
WHERE above_threshold = 1
GROUP BY grp
HAVING COUNT(*) > 1
ORDER BY consecutive_days DESC
```

### Pivot: Modes as Columns

```sql
SELECT date,
       MAX(CASE WHEN mode = 'Subway' THEN CAST(count AS BIGINT) END) as subway,
       MAX(CASE WHEN mode = 'Bus' THEN CAST(count AS BIGINT) END) as bus,
       MAX(CASE WHEN mode = 'LIRR' THEN CAST(count AS BIGINT) END) as lirr,
       MAX(CASE WHEN mode = 'MNR' THEN CAST(count AS BIGINT) END) as mnr,
       MAX(CASE WHEN mode = 'BT' THEN CAST(count AS BIGINT) END) as bridges_tunnels
FROM data
GROUP BY date
ORDER BY date
```

## Tips for Analysis

1. **Always cast numeric columns**: CSV/JSON imports are usually strings
2. **Use CTEs** for complex queries to make them readable
3. **Window functions** are powerful for time series (LAG, LEAD, SUM OVER, etc.)
4. **Filter early** in the query to improve performance
5. **Use EXPLAIN** to understand query execution: `EXPLAIN SELECT ...`
6. **Date functions**: `strftime`, `date_part`, `date_trunc` for date manipulation
7. **Test with LIMIT** before running on full dataset
8. **Check for NULLs**: Use `WHERE column IS NOT NULL` when needed

## Common Column Names

Different MTA datasets use different column names. Common patterns:

- **Dates**: `date`, `month`, `transit_timestamp`, `transit_date`
- **Ridership**: `count`, `ridership`, `estimated_ridership`, `entries`
- **Mode**: `mode`, `service`, `line`
- **Station**: `station`, `station_name`, `complex_name`, `stop_name`
- **Counts**: `total_outages`, `availability`, `trips`, `traffic`

Use `SELECT * FROM data LIMIT 1` to see column names in your dataset.

## Resources

- [DuckDB SQL Reference](https://duckdb.org/docs/sql/introduction)
- [DuckDB Date Functions](https://duckdb.org/docs/sql/functions/date)
- [DuckDB Window Functions](https://duckdb.org/docs/sql/window_functions)
- [DuckDB Aggregate Functions](https://duckdb.org/docs/sql/functions/aggregates)
