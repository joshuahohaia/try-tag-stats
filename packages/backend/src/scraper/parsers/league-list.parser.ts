import * as cheerio from 'cheerio';
import { ScrapedLeagueListItemSchema } from '@trytag/shared';
import type { ScrapedLeagueListItem } from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedLeagueList {
  items: ScrapedLeagueListItem[];
  regions: Set<string>;
  seasons: Map<number, string>;
}

// Extract region from league name (e.g., "Acton Wasps" -> "London")
function inferRegion(leagueName: string): string {
  const regionMappings: Record<string, string[]> = {
    'London': [
      'Acton', 'Battersea', 'Brixton', 'Camberwell', 'Clapham', 'Finsbury',
      'Hackney', 'Hammersmith', 'Highbury', 'Islington', 'Kennington',
      'Mile End', 'Paddington', 'Putney', 'Regent', 'Shoreditch',
      'Southwark', 'Stockwell', 'Stratford', 'Tower', 'Wandsworth',
      'Wembley', 'Westminster', 'Wimbledon', 'London',
    ],
    'Manchester': ['Manchester', 'Salford', 'Trafford'],
    'Leeds': ['Leeds', 'Headingley'],
    'Newcastle': ['Newcastle', 'Gateshead'],
    'Edinburgh': ['Edinburgh', 'Murrayfield'],
    'Glasgow': ['Glasgow'],
    'Bristol': ['Bristol'],
    'Birmingham': ['Birmingham', 'Solihull'],
    'Cardiff': ['Cardiff'],
    'Liverpool': ['Liverpool'],
    'Sheffield': ['Sheffield'],
    'Nottingham': ['Nottingham'],
    'Brighton': ['Brighton'],
    'Southampton': ['Southampton'],
    'Oxford': ['Oxford'],
    'Cambridge': ['Cambridge'],
  };

  for (const [region, keywords] of Object.entries(regionMappings)) {
    for (const keyword of keywords) {
      if (leagueName.toLowerCase().includes(keyword.toLowerCase())) {
        return region;
      }
    }
  }

  return 'Other';
}

// Parse URL parameters from href
function parseUrlParams(href: string): Record<string, number> {
  const params: Record<string, number> = {};
  const match = href.match(/\?(.+)$/);
  if (match) {
    const searchParams = new URLSearchParams(match[1]);
    for (const [key, value] of searchParams.entries()) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        params[key] = num;
      }
    }
  }
  return params;
}

export function parseLeagueList(html: string): ParsedLeagueList {
  const $ = cheerio.load(html);
  const items: ScrapedLeagueListItem[] = [];
  const regions = new Set<string>();
  const seasons = new Map<number, string>();

  // Find all league entries - look for links to Fixtures or Standings pages
  $('a[href*="Fixtures"], a[href*="Standings"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';

    // Skip if not a league link
    if (!href.includes('LeagueId=') || !href.includes('SeasonId=') || !href.includes('DivisionId=')) {
      return;
    }

    const params = parseUrlParams(href);
    const leagueId = params['LeagueId'];
    const seasonId = params['SeasonId'];
    const divisionId = params['DivisionId'];

    if (!leagueId || !seasonId || !divisionId) {
      return;
    }

    // Try to find the league/division name from parent elements
    const $parent = $el.closest('tr, div, li');
    let leagueName = '';
    let divisionName = '';
    let seasonName = '';

    // Try to extract text from parent context
    const parentText = $parent.text().trim();

    // Look for season text (e.g., "Winter 2025/26", "Spring 2026")
    const seasonMatch = parentText.match(/(Winter|Spring|Summer|Autumn)\s+\d{4}(?:\/\d{2})?/i);
    if (seasonMatch) {
      seasonName = seasonMatch[0];
      seasons.set(seasonId, seasonName);
    }

    // Look for division text (e.g., "Division 1", "Open Grade", "Pool A")
    const divisionMatch = parentText.match(/(Division\s+\d+|Open\s+Grade|[A-Z]-Grade|Pool\s+[A-Z]|Plate|Cup)/i);
    if (divisionMatch) {
      divisionName = divisionMatch[0];
    }

    // Try to get league name from heading or strong tag
    const $heading = $parent.prevAll('h2, h3, h4, strong').first();
    if ($heading.length) {
      leagueName = $heading.text().trim();
    }

    // If still no league name, use parent text minus season/division
    if (!leagueName) {
      leagueName = parentText
        .replace(seasonMatch?.[0] || '', '')
        .replace(divisionMatch?.[0] || '', '')
        .replace(/Fixtures|Standings/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Skip if we couldn't determine a meaningful league name
    if (!leagueName || leagueName.length < 3) {
      return;
    }

    const region = inferRegion(leagueName);
    regions.add(region);

    const item: ScrapedLeagueListItem = {
      leagueId,
      seasonId,
      divisionId,
      leagueName,
      seasonName: seasonName || `Season ${seasonId}`,
      divisionName: divisionName || 'Division',
      region,
    };

    // Validate with Zod
    const result = ScrapedLeagueListItemSchema.safeParse(item);
    if (result.success) {
      // Avoid duplicates (same division)
      const exists = items.some(
        (i) => i.leagueId === leagueId && i.seasonId === seasonId && i.divisionId === divisionId
      );
      if (!exists) {
        items.push(result.data);
      }
    } else {
      logger.warn({ item, errors: result.error.errors }, 'Invalid league list item');
    }
  });

  logger.info({ itemCount: items.length, regionCount: regions.size }, 'Parsed league list');

  return { items, regions, seasons };
}
