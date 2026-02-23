#!/usr/bin/env node

/**
 * Search for MTA datasets on the New York State Open Data portal (data.ny.gov)
 * 
 * Usage: ./search-datasets.ts <search query> [--limit N]
 * 
 * Examples:
 *   ./search-datasets.ts "ridership"
 *   ./search-datasets.ts "subway stations" --limit 10
 *   ./search-datasets.ts "escalator" --limit 5
 */

import * as https from 'https';

interface CliArgs {
  searchQuery: string;
  limit: number;
}

interface DomainMetadata {
  key: string;
  value: string;
}

interface SearchResult {
  resource: {
    name: string;
    id: string;
    description?: string;
    updatedAt?: string;
  };
  classification: {
    domain_metadata?: DomainMetadata[];
  };
}

interface SearchResponse {
  results: SearchResult[];
}

// Parse command line arguments
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let searchQuery = '';
  let limit = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && i + 1 < args.length) {
      limit = parseInt(args[i + 1], 10);
      i++; // Skip next arg
    } else {
      searchQuery += (searchQuery ? ' ' : '') + args[i];
    }
  }

  if (!searchQuery) {
    console.error('Error: Please provide a search query');
    console.error('Usage: ./search-datasets.ts <search query> [--limit N]');
    process.exit(1);
  }

  return { searchQuery, limit };
}

// Make API request
async function searchDatasets(query: string, limit: number): Promise<SearchResponse> {
  return new Promise((resolve, reject) => {
    const baseUrl = 'https://api.us.socrata.com/api/catalog/v1';
    const params = new URLSearchParams({
      domains: 'data.ny.gov',
      search_context: 'data.ny.gov',
      q: query,
      only: 'datasets',
      limit: limit.toString(),
    });

    const url = `${baseUrl}?${params.toString()}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response: SearchResponse = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${(error as Error).message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
  });
}

// Main
(async () => {
  try {
    const args = parseArgs();
    const response = await searchDatasets(args.searchQuery, args.limit);

    if (!response.results || response.results.length === 0) {
      console.log('No datasets found for query:', args.searchQuery);
      return;
    }

    // Filter for MTA datasets
    const mtaDatasets = response.results.filter(result => {
      const metadata = result.classification.domain_metadata || [];
      const agencyField = metadata.find(m => m.key === 'Dataset-Information_Agency');
      return agencyField && agencyField.value === 'Metropolitan Transportation Authority';
    });

    if (mtaDatasets.length === 0) {
      console.log('No MTA datasets found for query:', args.searchQuery);
      console.log('\nTry a different search term or visit https://data.ny.gov/browse?Dataset-Information_Agency=Metropolitan+Transportation+Authority');
      return;
    }

    console.log(`Found ${mtaDatasets.length} MTA dataset(s) for "${args.searchQuery}":\n`);

    mtaDatasets.forEach((result, index) => {
      const resource = result.resource;
      const metadata = result.classification.domain_metadata || [];

      // Extract useful metadata
      const updateFreq = metadata.find(m => m.key === 'Dataset-Summary_Posting-Frequency');
      const timePeriod = metadata.find(m => m.key === 'Dataset-Summary_Time-Period');

      console.log(`${index + 1}. ${resource.name}`);
      console.log(`   ID: ${resource.id}`);
      console.log(`   Link: https://data.ny.gov/d/${resource.id}`);

      if (resource.description) {
        // Truncate long descriptions
        const desc = resource.description.length > 200
          ? resource.description.substring(0, 200) + '...'
          : resource.description;
        console.log(`   Description: ${desc}`);
      }

      if (updateFreq) {
        console.log(`   Update Frequency: ${updateFreq.value}`);
      }

      if (timePeriod) {
        console.log(`   Time Period: ${timePeriod.value}`);
      }

      if (resource.updatedAt) {
        const lastUpdated = new Date(resource.updatedAt).toLocaleDateString();
        console.log(`   Last Updated: ${lastUpdated}`);
      }

      console.log('');
    });

    console.log('Browse all MTA datasets: https://data.ny.gov/browse?Dataset-Information_Agency=Metropolitan+Transportation+Authority');
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
})();
