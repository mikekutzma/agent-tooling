# Socrata Open Data API Reference

The New York State Open Data portal uses the Socrata Open Data API (SODA) for programmatic access to datasets.

## Discovery API

### Search Catalog

Search for datasets across the data.ny.gov portal:

```
GET https://api.us.socrata.com/api/catalog/v1
```

**Parameters:**
- `domains`: Domain to search (use `data.ny.gov`)
- `search_context`: Context domain (use `data.ny.gov`)
- `q`: Search query string
- `only`: Resource type filter (use `datasets`)
- `limit`: Maximum results to return (default: 100, max: 10000)
- `offset`: Pagination offset

**Example:**
```bash
curl "https://api.us.socrata.com/api/catalog/v1?domains=data.ny.gov&search_context=data.ny.gov&q=subway&only=datasets&limit=10"
```

### Filter by Agency

MTA datasets have the following metadata:
- **Key**: `Dataset-Information_Agency`
- **Value**: `Metropolitan Transportation Authority`

To filter for MTA datasets, parse the response and check `classification.domain_metadata[]` for this key-value pair.

### Response Structure

```json
{
  "results": [
    {
      "resource": {
        "name": "Dataset Name",
        "id": "abcd-1234",
        "description": "Dataset description...",
        "attribution": "Metropolitan Transportation Authority",
        "type": "dataset",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "createdAt": "2020-01-01T00:00:00.000Z",
        "page_views": { ... },
        "download_count": 12345,
        "columns_name": ["Column1", "Column2", ...],
        "columns_field_name": ["column1", "column2", ...],
        "columns_datatype": ["Text", "Number", ...]
      },
      "classification": {
        "domain_category": "Transportation",
        "domain_tags": ["mta", "subway", ...],
        "domain_metadata": [
          {
            "key": "Dataset-Information_Agency",
            "value": "Metropolitan Transportation Authority"
          },
          {
            "key": "Dataset-Summary_Posting-Frequency",
            "value": "Daily"
          },
          {
            "key": "Dataset-Summary_Time-Period",
            "value": "Beginning 2020"
          }
        ]
      },
      "permalink": "https://data.ny.gov/d/abcd-1234"
    }
  ],
  "resultSetSize": 1
}
```

## SODA API (Querying Datasets)

Once you have a dataset ID, query it directly using the Socrata SODA API.

### Base URL Format

```
https://data.ny.gov/resource/{dataset-id}.{format}
```

**Formats:** `json`, `csv`, `xml`, `rdf`, `rss`

### Basic Query

```bash
# Get all records as JSON
curl "https://data.ny.gov/resource/vxuj-8kew.json"

# Get all records as CSV
curl "https://data.ny.gov/resource/vxuj-8kew.csv"
```

### SoQL Queries

Use Socrata Query Language (SoQL) for filtering, aggregation, and sorting:

**Parameters:**
- `$select`: Choose columns to return
- `$where`: Filter rows (SQL-like WHERE clause)
- `$order`: Sort results
- `$limit`: Limit number of results (default: 1000, max: 50000)
- `$offset`: Pagination offset
- `$group`: Group by columns
- `$having`: Filter grouped results

**Examples:**

```bash
# Select specific columns
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$select=date,subways_total_estimated_ridership"

# Filter by date
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$where=date>'2024-01-01'"

# Order by date descending, limit to 10
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$order=date DESC&\$limit=10"

# Combine filters
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$where=date>'2024-01-01'&\$order=date DESC&\$limit=100"

# Aggregate data
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$select=date,sum(subways_total_estimated_ridership)&\$group=date"
```

### SoQL Functions

**Date/Time:**
- `date_trunc_y()`, `date_trunc_ym()`, `date_trunc_ymd()` - Truncate dates
- `date_extract_y()`, `date_extract_m()`, `date_extract_d()` - Extract components

**Aggregation:**
- `sum()`, `avg()`, `min()`, `max()`, `count()`

**String:**
- `upper()`, `lower()`, `concat()`, `starts_with()`, `contains()`

**Geospatial:**
- `within_box()`, `within_circle()`, `distance_in_meters()`

### Authentication

For **unauthenticated requests**:
- Limited to 1,000 requests per rolling 24-hour period
- Throttled to prevent abuse

For **authenticated requests** (with app token):
- Higher rate limits
- More concurrent requests

**Get an app token:** https://data.ny.gov/profile/app_tokens

**Use app token:**
```bash
curl "https://data.ny.gov/resource/vxuj-8kew.json" \
  -H "X-App-Token: YOUR_APP_TOKEN"
```

### Error Responses

```json
{
  "error": true,
  "message": "Error message here",
  "errorCode": "query.execution.invalidQuery"
}
```

Common error codes:
- `query.execution.invalidQuery` - Malformed SoQL
- `query.execution.unknownColumn` - Column doesn't exist
- `query.execution.timeout` - Query took too long
- `query.throttled` - Rate limit exceeded

## Best Practices

1. **Use $limit** to avoid downloading entire datasets
2. **Cache results** when possible to reduce API calls
3. **Use app tokens** for production applications
4. **Filter server-side** with `$where` instead of client-side
5. **Use CSV format** for large exports (more efficient than JSON)
6. **Handle pagination** for datasets larger than limit
7. **URL-encode** SoQL parameters (especially `$` signs)

## Pagination Example

```bash
# First page
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$limit=1000&\$offset=0"

# Second page
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$limit=1000&\$offset=1000"

# Third page
curl "https://data.ny.gov/resource/vxuj-8kew.json?\$limit=1000&\$offset=2000"
```

## Common MTA Dataset IDs

| Dataset | ID | Description |
|---------|-----|-------------|
| MTA Daily Ridership and Traffic | `sayj-mze2` | Daily systemwide ridership (2020+) |
| MTA Subway Stations | `39hk-dx4f` | All subway station info |
| MTA Subway Hourly Ridership | `wujg-7c2s` | Hourly ridership by station (2020-2024) |
| MTA Subway Monthly Ridership | `ak4z-sape` | Monthly ridership by station (2017+) |
| MTA Elevator/Escalator Availability | `rc78-7x78` | Elevator/escalator uptime (2015+) |

Use the search script to discover more datasets.

## Resources

- [SODA API Documentation](https://dev.socrata.com/docs/queries/)
- [SoQL Reference](https://dev.socrata.com/docs/queries/)
- [Discovery API Docs](https://socratadiscovery.docs.apiary.io/)
- [NY Open Data Portal](https://data.ny.gov/)
