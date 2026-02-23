---
name: mta-data
description: Access and query MTA (Metropolitan Transportation Authority) open data from the New York State Open Data portal. Use for transit information, real-time data, schedules, and transportation analytics.
---

# MTA Data

Access and analyze open data from the Metropolitan Transportation Authority (MTA) via the New York State Open Data portal at https://data.ny.gov/.

## Important Guidelines

- **Never use emojis** in responses when using this skill. All output should be professional and text-based only.
- Focus on clear, direct communication without decorative characters.
- Present data, analysis results, and explanations in plain text format.

## Purpose

This skill helps you discover and work with MTA datasets including:
- **Ridership data**: Daily, hourly, monthly ridership by mode and station
- **Infrastructure**: Subway stations, bus routes, accessibility features
- **Performance metrics**: On-time performance, elevator/escalator availability
- **Real-time information**: Service status, delays, alerts
- **Geographic data**: Station locations, route maps, service areas
- **Historical data**: Long-term trends and archived information

An important part of this skill is to allow for transparent and reproducible
analysis.

## Prerequisites

- Node.js (for running the scripts)
- DuckDB (for data analysis) - Install with: `brew install duckdb` (macOS) or see https://duckdb.org/docs/installation/
- Internet connection (to access the Socrata API)
- No API key required for basic searches and downloads

The skill will automatically check if DuckDB is installed when attempting to analyze data and provide installation instructions if missing.

## Setup

Install dependencies (first time only):

```bash
cd /path/to/skills/mta-data
npm install
```

This installs TypeScript support and required packages.

## Working Directory

**IMPORTANT**: Scripts must always write files to the user's current working directory, not the skill directory. To ensure this:

1. Always use the **full absolute path** to the script when invoking it (e.g., `/Users/mike/.claude/skills/mta-data/scripts/download-dataset.ts`)
2. Always pass **`--output-dir <USER_CWD>/data`** to download scripts
3. Always pass **`--sql-dir <USER_CWD>/sql`** to analyze scripts

The user's current working directory is provided in the environment context at the start of every conversation (the "Primary working directory"). Use that absolute path when constructing these flags.

Example: if the user's working directory is `/Users/alice/my-project`, all download commands must include `--output-dir /Users/alice/my-project/data` and all analysis commands must include `--sql-dir /Users/alice/my-project/sql`.

## Data Storage

Downloaded datasets are saved to `<USER_CWD>/data/` (passed explicitly via `--output-dir`). This directory is automatically created when downloading data.

## SQL Query Storage

All SQL queries run during analysis are automatically saved to `<USER_CWD>/sql/` (passed explicitly via `--sql-dir`) with timestamps. This provides:
- **Reproducibility**: Every query is saved for future reference
- **Transparency**: Users can see exactly what SQL was run
- **Reusability**: Queries can be rerun with the provided DuckDB command

Each query is saved with a timestamp filename (e.g., `query_2024-02-22_14-30-45.sql`).

## Searching for Datasets

Use the search script to find relevant MTA datasets:

```bash
npx tsx scripts/search-datasets.ts "<search query>" [--limit N]
```

### Search Examples

```bash
# Search for ridership data
npx tsx scripts/search-datasets.ts "ridership"

# Search for subway stations (limit to 5 results)
npx tsx scripts/search-datasets.ts "subway stations" --limit 5

# Search for accessibility information
npx tsx scripts/search-datasets.ts "elevator escalator"

# Search for performance metrics
npx tsx scripts/search-datasets.ts "on-time performance"
```

### Understanding Search Results

Each result includes:
- **Name**: Dataset title
- **ID**: Unique dataset identifier (4-character code, e.g., `vxuj-8kew`)
- **Link**: Direct URL to view/download the dataset
- **Description**: Brief summary of the dataset contents
- **Update Frequency**: How often the dataset is refreshed (daily, monthly, etc.)
- **Time Period**: Temporal coverage of the data
- **Last Updated**: When the dataset was last modified

## Downloading Datasets

Once you've identified a dataset (via search or directly), download it using:

```bash
npx tsx scripts/download-dataset.ts <dataset-id> [options]
```

### Download Options

- `--format <csv|json>` - Output format (default: csv)
- `--output <file>` - Output file path (default: `./data/<dataset-id>.<format>`)
- `--output-dir <dir>` - Output directory (default: ./data)
- `--limit <number>` - Maximum rows to download (default: all)
- `--where <clause>` - SoQL WHERE clause for filtering
- `--select <columns>` - Comma-separated columns to include (default: all)
- `--order <clause>` - SoQL ORDER BY clause for sorting
- `--chunk-size <number>` - Rows per API request (default: 10000)
- `--no-confirm` - Skip confirmation for large downloads

### Download Examples

**Basic download (CSV to ./data/):**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew
# Saves to: ./data/vxuj-8kew.csv
```

**Download as JSON with limit:**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew --format json --limit 1000
# Saves to: ./data/vxuj-8kew.json
```

**Download to custom directory:**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew --output-dir ./my-data
# Saves to: ./my-data/vxuj-8kew.csv
```

**Filter by date range:**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew \
  --where "date>'2024-01-01' AND date<'2024-12-31'"
# Saves to: ./data/vxuj-8kew.csv
```

**Specify exact output path:**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew \
  --output ./reports/ridership-2024.csv
# Saves to: ./reports/ridership-2024.csv (creates directory if needed)
```

**Select specific columns:**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew \
  --select "date,subways_total_estimated_ridership,buses_total_estimated_ridersip"
```

**Complex query (filter + select + order):**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew \
  --where "date>'2024-01-01'" \
  --select "date,subways_total_estimated_ridership" \
  --order "date DESC" \
  --limit 100
```

**Download without confirmation (for automation):**
```bash
npx tsx scripts/download-dataset.ts vxuj-8kew \
  --where "date>'2024-01-01'" \
  --no-confirm
```

### Understanding the Download Process

1. **Directory creation**: The output directory (default: ./data) is created automatically if it doesn't exist
2. **Metadata fetch**: The script fetches dataset metadata to display available columns
3. **Column display**: All available columns are shown with their data types and descriptions
4. **Row counting**: For large unfiltered downloads, the script counts rows and asks for confirmation
5. **Filtering suggestions**: If downloading a large dataset without filters, helpful filter examples are shown (e.g., date filters for datasets with date columns)
6. **Confirmation**: User is asked to confirm downloads over 50,000 rows (unless `--no-confirm` is used or when used indirectly)
7. **Pagination**: Data is downloaded in chunks (default: 10,000 rows per request) to handle large datasets efficiently
8. **Progress tracking**: Download progress is shown with row counts and percentages
9. **File saved**: Files are saved to ./data/ by default, or to the specified location

### Smart Filtering

When the user mentions filtering criteria, examine the available columns and construct appropriate filters:

**Date filtering:**
- User says "past year" → `--where "date>'2024-01-01'"`
- User says "since March 2024" → `--where "date>'2024-03-01'"`
- User says "2024 only" → `--where "date>='2024-01-01' AND date<'2025-01-01'"`

**Value filtering:**
- User mentions specific subway line → Find line/route column and filter
- User wants specific station → Find station column and filter
- User wants threshold (e.g., "high ridership") → Use numeric comparison

**Column selection:**
- User mentions specific metrics → Use `--select` to include only relevant columns
- Reduces download size and processing time

### When to Confirm vs Auto-Download

**Confirm with user:**
- Dataset has >50,000 rows and no filters applied
- User's request is ambiguous about which data subset they want
- This is a direct, interactive request from the user

**Auto-download (no confirmation):**
- `--no-confirm` flag is used
- This skill is being called indirectly as part of another task
- User has specified clear filtering criteria
- Dataset is small (<50,000 rows)

## Common Workflows

### Workflow 1: Find and Download Daily Ridership

User request: "Get me daily subway ridership for 2024"

Steps:
1. Search for dataset: `npx tsx scripts/search-datasets.ts "daily ridership subway"`
2. Identify relevant dataset (e.g., `vxuj-8kew`)
3. Check columns (script shows them during download)
4. Download with filters:
   ```bash
   npx tsx scripts/download-dataset.ts vxuj-8kew \
     --where "date>='2024-01-01' AND date<'2025-01-01'" \
     --select "date,subways_total_estimated_ridership" \
     --output subway-ridership-2024.csv
   ```

### Workflow 2: Explore Elevator Availability

User request: "Show me elevator availability data for subway stations"

Steps:
1. Search: `npx tsx scripts/search-datasets.ts "elevator availability subway"`
2. Review search results to find the right dataset
3. Download a sample to explore: `npx tsx scripts/download-dataset.ts <dataset-id> --limit 100`
4. Examine columns and data structure
5. Download full dataset or filtered subset based on analysis needs

### Workflow 3: Compare Multiple Datasets

User request: "Compare bus and subway ridership trends"

Steps:
1. Search for bus data: `npx tsx scripts/search-datasets.ts "bus ridership"`
2. Search for subway data: `npx tsx scripts/search-datasets.ts "subway ridership"`
3. Download both datasets with matching time periods
4. Analyze and compare using preferred data analysis tools

## Common Search Terms

- **Ridership**: `ridership`, `passenger`, `traffic`
- **Stations**: `stations`, `stops`, `complexes`
- **Routes**: `routes`, `lines`, `service`
- **Accessibility**: `elevator`, `escalator`, `ada`, `accessible`
- **Performance**: `on-time`, `delays`, `reliability`
- **Geographic**: `location`, `map`, `coordinates`
- **Real-time**: `real-time`, `live`, `current`
- **Specific modes**: `subway`, `bus`, `lirr`, `metro-north`, `bridges`, `tunnels`

## Browse All MTA Datasets

Visit: https://data.ny.gov/browse?Dataset-Information_Agency=Metropolitan+Transportation+Authority

## Data Formats

MTA datasets are available in various formats:
- **CSV**: Comma-separated values (Excel-compatible) - Default, best for most use cases
- **JSON**: JavaScript Object Notation (API-friendly) - Better for programmatic access
- **RDF**: Resource Description Framework (semantic web) - Available via direct API
- **RSS**: Really Simple Syndication (for updates) - Available via direct API
- **XML**: Extensible Markup Language - Available via direct API

The download script supports CSV and JSON. For other formats, use the Socrata API directly (see references).

## Tips

- **Data organization**: Downloads are automatically saved to ./data/ directory for easy management
- **SQL transparency**: All queries are automatically saved to ./sql/ with timestamps for complete reproducibility
- **Start with searches**: Use broad terms first, then refine
- **Check metadata**: Review columns before downloading to ensure you have the right dataset
- **Use limits for exploration**: Download a small sample (e.g., `--limit 100`) to explore structure
- **Filter server-side**: Always use `--where` instead of downloading everything and filtering locally
- **Select only needed columns**: Use `--select` to reduce download size and processing time
- **Check update frequency**: Verify the dataset is current enough for your needs
- **Use consistent time periods**: When comparing datasets, ensure date ranges align
- **Save command history**: Document your download commands for reproducibility
- **Reference files easily**: With default ./data/ location, files can be referenced as `data/dataset-id.csv`
- **Rerun analyses**: Use the provided DuckDB command from sql/ files to reproduce any analysis

## SoQL Query Reference

The `--where`, `--select`, and `--order` options use Socrata Query Language (SoQL):

**Date functions:**
- `date>'2024-01-01'` - After January 1, 2024
- `date BETWEEN '2024-01-01' AND '2024-12-31'` - Date range
- `date_extract_y(date)=2024` - Year equals 2024
- `date_extract_m(date)=3` - Month equals March

**Numeric comparisons:**
- `ridership>100000` - Greater than
- `ridership<50000` - Less than
- `ridership BETWEEN 10000 AND 100000` - Range

**Text matching:**
- `station='Times Sq-42 St'` - Exact match
- `station LIKE '%42%'` - Contains
- `upper(station)='TIMES SQ-42 ST'` - Case-insensitive

**Combining conditions:**
- `AND` - Both conditions must be true
- `OR` - Either condition must be true
- `NOT` - Negation

**Ordering:**
- `date DESC` - Descending (newest first)
- `date ASC` - Ascending (oldest first)
- `ridership DESC, date ASC` - Multiple columns

See [references/socrata-api.md](references/socrata-api.md) for complete SoQL documentation.

## Analyzing Data with DuckDB

After downloading data, analyze it using DuckDB for transparent, reproducible analysis.

### Prerequisites

DuckDB must be installed. The analyze script will automatically check for DuckDB and display installation instructions if it's not found.

- macOS: `brew install duckdb`
- Linux: See https://duckdb.org/docs/installation/
- Windows: See https://duckdb.org/docs/installation/

### Basic Analysis

```bash
npx tsx scripts/analyze-data.ts <data-file> --query "<SQL query>" [options]
```

**Options:**
- `--query <sql>` - SQL query to run (required)
- `--format <table|json|csv>` - Output format (default: table)
- `--output <file>` - Write results to file
- `--show-sql` - Display the SQL query before results
- `--sql-dir <dir>` - Directory to save SQL queries (default: ./sql)

**Automatic SQL Storage:**
Every query is automatically saved to the `./sql/` directory with a timestamp. After running a query, you'll see:
- The path where the SQL was saved
- A DuckDB command to rerun the exact same query

### Analysis Examples

**Count rows:**
```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT COUNT(*) as total_rows FROM data"
```

**Find highest ridership days:**
```bash
npx tsx scripts/analyze-data.ts data/vxuj-8kew.csv \
  --query "SELECT date, subways_total_estimated_ridership 
           FROM data 
           ORDER BY CAST(subways_total_estimated_ridership AS BIGINT) DESC 
           LIMIT 10"
```

**Calculate averages by mode:**
```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode, AVG(CAST(count AS DOUBLE)) as avg_daily 
           FROM data 
           GROUP BY mode 
           ORDER BY avg_daily DESC"
```

**Filter and aggregate:**
```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT date, SUM(CAST(count AS BIGINT)) as total_ridership 
           FROM data 
           WHERE mode IN ('Subway', 'Bus') 
           GROUP BY date 
           ORDER BY date"
```

**JSON output for further processing:**
```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode, COUNT(*) as days, AVG(CAST(count AS DOUBLE)) as avg 
           FROM data 
           GROUP BY mode" \
  --format json > summary.json
```

**Show the SQL with results:**
```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT * FROM data LIMIT 5" \
  --show-sql
```

### Answering User Questions

When a user asks a specific question, follow this pattern:

1. **Download the relevant data** (with appropriate filters)
2. **Analyze using DuckDB** to get the answer
3. **Present the direct answer** to the user's question
4. **Ask if they want to see how you got the answer** (unless being used indirectly)
5. **If yes, show the SQL query and explain the approach**

#### Example: Specific Question

**User asks**: "What was the average subway ridership in January 2024?"

**Steps:**

1. Download data:
```bash
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-01-01' AND date<'2024-02-01' AND mode='Subway'" \
  --no-confirm
# Saves to: ./data/sayj-mze2.csv
```

2. Analyze:
```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT AVG(CAST(count AS DOUBLE)) as avg_ridership FROM data" \
  --format json
```

3. Present answer:
```
The average subway ridership in January 2024 was 3,456,789 passengers per day.

Would you like to see how I calculated this?
```

4. If user says yes, show the SQL verbatim and explain:
```
I used this SQL query:

SELECT AVG(CAST(count AS DOUBLE)) as avg_ridership FROM data

Explanation:
1. CAST(count AS DOUBLE) - Converts the count column to a floating-point number for accurate averaging
2. AVG(...) - Calculates the arithmetic mean across all rows
3. Returns a single value representing the daily average ridership

The data was filtered to January 2024 subway ridership when downloading from the API.

The query has been saved to: sql/query_2024-01-15_14-23-45.sql

To rerun this analysis:
duckdb -c "CREATE TEMP TABLE data AS SELECT * FROM read_csv_auto('data/sayj-mze2.csv'); $(cat sql/query_2024-01-15_14-23-45.sql)"
```

#### Example: Exploratory Analysis

**User asks**: "Show me the ridership trends by mode for the past month"

**Steps:**

1. Download data:
```bash
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-01-01'" \
  --no-confirm
# Saves to: ./data/sayj-mze2.csv
```

2. Analyze and show results directly:
```bash
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode, 
                  COUNT(*) as days, 
                  SUM(CAST(count AS BIGINT)) as total,
                  AVG(CAST(count AS DOUBLE)) as daily_avg,
                  MIN(CAST(count AS BIGINT)) as min_day,
                  MAX(CAST(count AS BIGINT)) as max_day
           FROM data 
           GROUP BY mode 
           ORDER BY total DESC"
```

For exploratory queries, DuckDB's table output is already clear and informative. Show the results directly without asking about explanation (unless user specifically requests it).

### When to Show SQL

**Always show SQL (with `--show-sql` or in explanation):**
- User explicitly asks "how did you calculate this?"
- User requests explanation of methodology
- Complex multi-step analysis
- When teaching or documenting the approach

**Don't show SQL automatically:**
- Simple exploratory queries where output is self-explanatory
- When used indirectly by another skill/task
- User just wants the answer, not the method

**Ask if user wants to see SQL:**
- After providing a direct answer to a specific question
- When the query is interesting or might be reusable
- For non-trivial calculations

### How to Present SQL

When showing SQL to the user (after they ask or when appropriate), **always include**:

1. **The raw SQL query verbatim** - Copy the exact SQL without modification
2. **Clear explanation** - Explain what the query does step by step
3. **SQL file location** - Show where the query was saved (e.g., `sql/query_2024-01-15_14-23-45.sql`)
4. **Rerun command** - Provide the exact DuckDB command to reproduce the analysis

**Template:**
```
I used this SQL query:

[RAW SQL VERBATIM]

Explanation:
[Step-by-step breakdown of what the query does]

The query has been saved to: sql/query_YYYY-MM-DD_HH-MM-SS.sql

To rerun this analysis:
duckdb -c "CREATE TEMP TABLE data AS SELECT * FROM read_csv_auto('path/to/data.csv'); $(cat sql/query_YYYY-MM-DD_HH-MM-SS.sql)"
```

This ensures complete transparency and reproducibility.

### Common Analysis Patterns

**Time series analysis:**
```sql
SELECT date, 
       SUM(CAST(count AS BIGINT)) as total_ridership
FROM data
WHERE mode = 'Subway'
GROUP BY date
ORDER BY date
```

**Comparison across modes:**
```sql
SELECT mode,
       COUNT(DISTINCT date) as days_measured,
       AVG(CAST(count AS DOUBLE)) as avg_daily,
       SUM(CAST(count AS BIGINT)) as total
FROM data
GROUP BY mode
ORDER BY total DESC
```

**Finding peaks and troughs:**
```sql
SELECT date, count
FROM data
WHERE mode = 'Subway'
ORDER BY CAST(count AS BIGINT) DESC
LIMIT 10
```

**Calculating growth rates:**
```sql
WITH daily_totals AS (
  SELECT date,
         SUM(CAST(count AS BIGINT)) as total
  FROM data
  GROUP BY date
  ORDER BY date
)
SELECT date,
       total,
       LAG(total) OVER (ORDER BY date) as prev_day,
       total - LAG(total) OVER (ORDER BY date) as change,
       ROUND(100.0 * (total - LAG(total) OVER (ORDER BY date)) / LAG(total) OVER (ORDER BY date), 2) as pct_change
FROM daily_totals
```

**Filtering by conditions:**
```sql
SELECT date, mode, count
FROM data
WHERE CAST(count AS BIGINT) > 1000000
  AND mode IN ('Subway', 'Bus')
ORDER BY CAST(count AS BIGINT) DESC
```

### DuckDB Tips

- **Type casting**: CSV/JSON columns are often strings, use `CAST(column AS BIGINT)` or `CAST(column AS DOUBLE)` for numeric operations
- **The data table**: Your data is automatically loaded into a table called `data`
- **Date functions**: Use `date_trunc`, `date_part`, etc. for date manipulation
- **Aggregations**: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` work as expected
- **Window functions**: `LAG`, `LEAD`, `ROW_NUMBER`, etc. for time series
- **CTEs**: Use `WITH` for complex queries
- **String operations**: `LIKE`, `UPPER`, `LOWER`, `SUBSTRING`, etc.

### Full Analysis Workflow Example

**User request**: "What were the top 5 busiest subway days in 2024?"

**Complete workflow:**

```bash
# 1. Search for the right dataset
npx tsx scripts/search-datasets.ts "daily ridership subway"

# 2. Download 2024 subway data
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-01-01' AND date<'2025-01-01' AND mode='Subway'" \
  --no-confirm
# Saves to: ./data/sayj-mze2.csv

# 3. Analyze to find top 5 days
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT date, 
                  CAST(count AS BIGINT) as ridership
           FROM data
           ORDER BY ridership DESC
           LIMIT 5"
```

**Output:**
```
┌─────────────────────────┬───────────┐
│          date           │ ridership │
│         varchar         │   int64   │
├─────────────────────────┼───────────┤
│ 2024-09-15T00:00:00.000 │   4523891 │
│ 2024-10-03T00:00:00.000 │   4498234 │
│ 2024-09-22T00:00:00.000 │   4476923 │
│ 2024-11-14T00:00:00.000 │   4461287 │
│ 2024-12-05T00:00:00.000 │   4447651 │
└─────────────────────────┴───────────┘
```

**Response to user:**
```
The top 5 busiest subway days in 2024 were:
1. September 15 - 4,523,891 riders
2. October 3 - 4,498,234 riders  
3. September 22 - 4,476,923 riders
4. November 14 - 4,461,287 riders
5. December 5 - 4,447,651 riders

Would you like to see the SQL query I used to find this?
```

## Additional Resources

- [Socrata API Reference](references/socrata-api.md) - Detailed API documentation
- [MTA Open Data Portal](https://data.ny.gov/browse?Dataset-Information_Agency=Metropolitan+Transportation+Authority)
- [NY Open Data Homepage](https://data.ny.gov/)
- [DuckDB Documentation](https://duckdb.org/docs/) - SQL reference and functions

## Notes

- The search script filters results to only show MTA datasets
- All data is publicly available (no authentication required)
- Some datasets may require API tokens for high-volume queries (>1000 requests/day)
- Data is provided by the MTA and hosted by New York State
- Download scripts use pagination automatically to handle large datasets
- Progress is shown during downloads for better user experience
- DuckDB provides fast, in-process SQL analytics on CSV and JSON files
- Analysis is transparent and reproducible - users can run the same SQL queries
