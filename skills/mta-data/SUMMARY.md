# MTA Data Skill - Complete Summary

A comprehensive Pi coding agent skill for searching, downloading, and analyzing MTA open data using the Socrata API and DuckDB.

## Capabilities

### 1. Search (search-datasets.ts)
- Search the Socrata catalog for MTA datasets
- Filter to show only MTA-published data
- Display metadata, links, update frequency, and time periods
- Support for limiting results

### 2. Download (download-dataset.ts)
- Download datasets in CSV or JSON format
- Smart filtering with SoQL WHERE clauses
- Column selection to reduce data size
- Automatic pagination (10,000 rows/chunk)
- Progress tracking with row counts
- User confirmation for large downloads (>50k rows)
- Filter suggestions for large datasets
- Metadata display before download

### 3. Analyze (analyze-data.ts)
- SQL analysis using DuckDB
- Supports both CSV and JSON files
- Multiple output formats (table, JSON, CSV)
- Optional SQL display (--show-sql)
- Transparent, reproducible analysis
- Automatic SQL query storage to ./sql/ directory with timestamps
- Provides DuckDB rerun command for every query

## File Structure

```
mta-data/
├── SKILL.md                      # Main skill instructions (591 lines)
├── README.md                     # Human documentation
├── TEST-WORKFLOW.md              # Testing guide
├── SUMMARY.md                    # This file
├── package.json                  # Dependencies
├── .gitignore                    # Ignore downloads
├── scripts/
│   ├── search-datasets.ts        # Search catalog
│   ├── download-dataset.ts       # Download with filters
│   └── analyze-data.ts           # SQL analysis
└── references/
    ├── socrata-api.md            # Socrata API reference (224 lines)
    ├── analysis-patterns.md      # DuckDB SQL patterns (444 lines)
    └── example-analysis.md       # Complete workflow example (251 lines)
```

## Key Features

### Intelligent Downloading
- Filters data at the API level (not client-side)
- Suggests helpful filters for large datasets
- Confirms before downloading >50k rows
- Can bypass confirmation with --no-confirm flag
- Shows all available columns before download

### Transparent Analysis
- All analysis done with SQL (not opaque Python scripts)
- Every query automatically saved to ./sql/ with timestamps
- Users can see and reproduce queries
- DuckDB rerun command provided for every analysis
- DuckDB's output is clean and formatted
- Supports complex queries (CTEs, window functions, etc.)

### Smart Interaction Patterns

**For specific questions:**
1. Download relevant data with filters
2. Run SQL query to get answer (automatically saved to ./sql/)
3. Present direct answer
4. Ask if user wants to see the SQL
5. If yes, show the raw SQL verbatim, explanation, SQL file location, and DuckDB rerun command

**For exploratory analysis:**
1. Download data
2. Run query and show results directly
3. DuckDB's table output is self-explanatory
4. Don't ask about SQL unless user requests

**For indirect use:**
- Skip confirmations (use --no-confirm)
- Don't ask about showing SQL
- Just return results

## Documentation

### SKILL.md (Main skill file)
- Prerequisites and setup
- Searching for datasets
- Downloading with filters and options
- Analysis with DuckDB
- Common workflows and examples
- When to show SQL vs when not to
- SoQL query reference
- Tips and best practices

### analysis-patterns.md
- Basic queries (count, sample, unique values)
- Time series analysis (daily totals, trends, moving averages)
- Aggregations (totals by mode, summary stats)
- Comparisons (mode vs mode, rankings)
- Trends and growth (day-over-day, week-over-week, YoY)
- Filtering patterns (top N, date ranges, thresholds)
- Advanced queries (outliers, running totals, pivots)
- DuckDB tips and common column names

### example-analysis.md
- Complete end-to-end example
- From user question to final answer
- Shows all intermediate steps
- Demonstrates when to show SQL
- Follow-up analysis examples
- Best practices and patterns

### socrata-api.md
- Discovery API reference
- SODA API reference
- SoQL query syntax
- Authentication and rate limits
- Common MTA dataset IDs
- Error handling

## Example Usage

### Search for datasets
```bash
npx tsx scripts/search-datasets.ts "ridership"
```

### Download with filters
```bash
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-01-01' AND date<'2025-01-01'" \
  --select "date,mode,count" \
  --output ridership-2024.csv
```

### Analyze the data
```bash
npx tsx scripts/analyze-data.ts ridership-2024.csv \
  --query "SELECT mode, 
                  AVG(CAST(count AS DOUBLE)) as avg_daily
           FROM data 
           GROUP BY mode 
           ORDER BY avg_daily DESC"
```

### Show SQL with results
```bash
npx tsx scripts/analyze-data.ts ridership-2024.csv \
  --query "SELECT * FROM data LIMIT 10" \
  --show-sql
```

## Learning Resources

The skill includes extensive documentation:
- 1,510 total lines of documentation
- 591 lines in main SKILL.md
- 444 lines of SQL patterns
- 251 lines of complete examples
- 224 lines of API reference

## Requirements

- Node.js (for TypeScript execution)
- DuckDB (`brew install duckdb`)
- Internet connection
- No API key required for basic use

## Design Philosophy

1. **Transparency**: All analysis is SQL-based and visible
2. **Reproducibility**: Users can run the same queries
3. **Progressive disclosure**: Basic answers first, details on request
4. **Smart defaults**: CSV format, reasonable chunk sizes
5. **User-friendly**: Progress indicators, confirmations, suggestions
6. **Composable**: Can be used directly or by other skills
7. **Self-documenting**: Clear column names, explanatory SQL

## Use Cases

- Track ridership trends over time
- Compare modes of transportation
- Identify peak usage periods
- Analyze station-level metrics
- Calculate growth rates
- Find outliers and anomalies
- Generate custom reports
- Export data for visualization

## Data Quality

All data is:
- Publicly available (no authentication needed)
- Provided by the MTA
- Hosted by New York State
- Updated regularly (varies by dataset)
- Well-documented with metadata

## Workflow Integration

The skill supports:
- Direct user interaction (with confirmations and explanations)
- Indirect use by other skills (automatic mode with --no-confirm)
- Batch processing (JSON output for pipelines)
- Custom analysis (full SQL support)

## Testing

See TEST-WORKFLOW.md for comprehensive test cases covering:
- Search functionality
- CSV and JSON downloads
- Filtering and column selection
- Basic and advanced analysis
- All output formats
- SQL display option

## Notes

- CSV files may have >1M rows - use filters!
- DuckDB auto-loads data into table named 'data'
- Cast string columns for numeric operations
- Check column names with LIMIT 1 first
- Use CTEs for complex multi-step queries
- Window functions great for time series
