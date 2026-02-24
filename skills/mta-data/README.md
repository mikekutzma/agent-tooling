# MTA Data Skill

A skill for [Pi](https://buildwithpi.ai/) and [Claude Code](https://code.claude.com/) that provides access to Metropolitan Transportation Authority (MTA) open data from the New York State Open Data portal.

## Installation

This skill can be used with both Pi and Claude Code. For full installation instructions including symlinking to your skills directory, see the [main README](../../README.md#installation).

For more information about skills, see the [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills).

Quick symlink commands:

```bash
# For Pi (global)
ln -s $(pwd) ~/.pi/agent/skills/mta-data

# For Claude Code (global)
ln -s $(pwd) ~/.claude/skills/mta-data
```

## Quick Start

```bash
# Install dependencies (first time only)
npm install

# Search for ridership datasets
npx tsx scripts/search-datasets.ts "ridership"

# Download a dataset (saves to ./data/ by default)
npx tsx scripts/download-dataset.ts vxuj-8kew --limit 100

# Download with filters
npx tsx scripts/download-dataset.ts vxuj-8kew \
  --where "date>'2024-01-01'" \
  --format json

# Analyze the downloaded data (SQL saved to ./sql/ automatically)
npx tsx scripts/analyze-data.ts data/vxuj-8kew.json \
  --query "SELECT * FROM data LIMIT 5"

# View saved SQL queries
ls sql/
cat sql/query_*.sql
```

## What's Included

- **SKILL.md** - Main skill file with comprehensive instructions for the LLM
- **scripts/search-datasets.ts** - TypeScript script to search the MTA data catalog
- **scripts/download-dataset.ts** - TypeScript script to download datasets with filtering
- **scripts/analyze-data.ts** - TypeScript script to analyze data using DuckDB
- **references/socrata-api.md** - Detailed Socrata API documentation for data queries
- **references/analysis-patterns.md** - Common DuckDB analysis patterns for MTA data
- **package.json** - Dependencies for TypeScript support

## Features

- **Search**: Find MTA datasets by description
- **Filter**: Show only MTA-published data
- **Download**: Fetch datasets in CSV or JSON format
- **Smart filtering**: Apply SoQL filters for date ranges, columns, and conditions
- **Column selection**: Download only the columns you need
- **Pagination**: Handle large datasets automatically
- **Metadata**: View dataset info, columns, and update frequency
- **Direct links**: Get URLs to explore datasets online
- **Analysis**: Use DuckDB for transparent, reproducible data analysis
- **No API key required**: Search and download without authentication

## Use Cases

- Find and analyze daily ridership trends
- Compare ridership across different transit modes
- Identify peak usage days and times
- Track elevator/escalator availability over time
- Analyze station-level performance metrics
- Calculate growth rates and trends
- Generate reports with SQL queries

## Requirements

- Node.js (for TypeScript scripts)
- DuckDB (for data analysis): `brew install duckdb` - automatically checked before use
- Internet connection

## Storage

- **Downloaded data**: `./data/` directory (created automatically)
- **SQL queries**: `./sql/` directory (created automatically, includes timestamps and rerun commands)

## How It Works

1. User describes the data they need (e.g., "daily ridership")
2. Skill searches the Socrata catalog API
3. Results are filtered to MTA datasets only
4. Relevant datasets are displayed with links and metadata
5. User can then download or query the data via API

## Data Portal

All datasets are hosted at: https://data.ny.gov/

Browse MTA datasets: https://data.ny.gov/browse?Dataset-Information_Agency=Metropolitan+Transportation+Authority

## API Access

For programmatic access to datasets, see [references/socrata-api.md](references/socrata-api.md) for:
- SODA API endpoints
- SoQL query syntax
- Filtering and aggregation
- Rate limits and authentication

## Example Workflows

### Workflow 1: Find and Download Daily Ridership

```bash
# 1. Search for datasets
npx tsx scripts/search-datasets.ts "daily ridership"

# Output shows:
# - Dataset name: "MTA Daily Ridership and Traffic: Beginning 2020"
# - ID: sayj-mze2
# - Link: https://data.ny.gov/d/sayj-mze2

# 2. Download 2024 data with specific columns
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-01-01' AND date<'2025-01-01'" \
  --select "date,subways_total_estimated_ridership,buses_total_estimated_ridersip" \
  --output ridership-2024.csv
```

### Workflow 2: Explore Subway Stations

```bash
# 1. Search for station data
npx tsx scripts/search-datasets.ts "subway stations"

# 2. Download first 100 rows to explore
npx tsx scripts/download-dataset.ts 39hk-dx4f \
  --limit 100 \
  --format json \
  --output stations-sample.json

# 3. Download full dataset after confirming it's the right one
npx tsx scripts/download-dataset.ts 39hk-dx4f \
  --output all-stations.csv
```

### Workflow 3: Download and Analyze

```bash
# Download subway ridership for 2024
npx tsx scripts/download-dataset.ts sayj-mze2 \
  --where "date>='2024-01-01' AND date<'2025-01-01'" \
  --no-confirm

# Find the busiest days
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT date, mode, CAST(count AS BIGINT) as riders
           FROM data
           ORDER BY riders DESC
           LIMIT 10"

# Calculate monthly averages by mode
npx tsx scripts/analyze-data.ts data/sayj-mze2.csv \
  --query "SELECT mode,
                  COUNT(*) as days,
                  AVG(CAST(count AS DOUBLE)) as avg_daily,
                  SUM(CAST(count AS BIGINT)) as total
           FROM data
           GROUP BY mode
           ORDER BY total DESC"
```

## License

This skill is part of the agent-tooling repository. MTA data is provided by the Metropolitan Transportation Authority and hosted by New York State.
