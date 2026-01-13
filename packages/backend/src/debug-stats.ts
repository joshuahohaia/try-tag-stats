import { scraperClient } from './scraper/client.js';
import { parseStatistics } from './scraper/parsers/statistics.parser.js';
import { ENDPOINTS } from '@trytag/shared';

async function main() {
  const params = {
    VenueId: '0',
    LeagueId: 977,
    SeasonId: 94,
    DivisionId: 8073,
    // Level: 'Division', // Uncomment to test with explicit level
  };

  console.log('Fetching statistics for:', params);
  try {
    const html = await scraperClient.fetchWithParams(ENDPOINTS.STATISTICS, params);
    console.log('HTML length:', html.length);
    
    const parsed = parseStatistics(html);
    console.log('Parsed awards count:', parsed.playerAwards.length);
    if (parsed.playerAwards.length > 0) {
      console.log('First award:', parsed.playerAwards[0]);
    } else {
        console.log('No awards found. HTML preview:');
        const match = html.match(/<table[\s\S]*?<\/table>/);
        console.log(match ? match[0].substring(0, 500) : 'No table found');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
