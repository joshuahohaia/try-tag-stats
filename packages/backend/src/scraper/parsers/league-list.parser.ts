import * as cheerio from 'cheerio';
import { ScrapedLeagueListItemSchema } from '@trytag/shared';
import type { ScrapedLeagueListItem } from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedLeagueList {
  items: ScrapedLeagueListItem[];
  regions: Set<string>;
  seasons: Map<number, string>;
}

function inferRegion(leagueName: string): string {
  const regionMappings: Record<string, string[]> = {
    London: [
      'Acton',
      'Battersea',
      'Balham',
      'Barnes',
      'Borough',
      'Brixton',
      'Burgess',
      'Camberwell',
      'Catford',
      'Chiswick',
      'Clapham',
      'Dulwich',
      'East London',
      'Finsbury',
      'Hackney',
      'Hammersmith',
      'Highbury',
      'Islington',
      'Kennington',
      'Mile End',
      'Olympic Park',
      'Paddington',
      'Putney',
      'Regent',
      'Rotherhithe',
      'Shoreditch',
      'Southwark',
      'Stockwell',
      'Stratford',
      'Tooting',
      'Tottenham',
      'Tower',
      'Wandsworth',
      'Waterloo',
      'West Hampstead',
      'Wembley',
      'Westminster',
      'Wimbledon',
      'London',
    ],
    Manchester: ['Manchester', 'Salford', 'Trafford', 'Burnage', 'Chorlton'],
    Leeds: ['Leeds', 'Headingley', 'Horsforth', 'Yarnbury', 'Weetwood'],
    Newcastle: ['Newcastle', 'Gateshead', 'The Parks'],
    Edinburgh: ['Edinburgh', 'Murrayfield', 'Bangholm', 'Broughton', 'Inverleith', 'Mary Erskine'],
    Bristol: ['Bristol', 'Lockleaze', 'Hengrove', 'SGS', 'Clifton'],
    Brighton: ['Brighton', 'Cardinal Newman'],
    Reading: ['Reading'],
    Coventry: ['Coventry', 'Alan Higgs'],
    Warwick: ['Warwick'],
    Wakefield: ['Wakefield'],
    York: ['York'],
    Wigan: ['Wigan'],
    Oxford: ['Oxford'],
    Sheffield: ['Sheffield'],
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
    if (
      !href.includes('LeagueId=') ||
      !href.includes('SeasonId=') ||
      !href.includes('DivisionId=')
    ) {
      return;
    }

    const params = parseUrlParams(href);
    const leagueId = params['LeagueId'];
    const seasonId = params['SeasonId'];
    const divisionId = params['DivisionId'];

    if (leagueId === undefined || seasonId === undefined || divisionId === undefined) {
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
    const divisionMatch = parentText.match(
      /(Division\s+\d+|Open\s+Grade|[A-Z]-Grade|Pool\s+[A-Z]|Plate|Cup)/i
    );
    if (divisionMatch) {
      divisionName = divisionMatch[0];
    } else {
      divisionName = 'Division 1';
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

    // Clean up trailing dashes and separators (e.g., " - -" or " - ")
    // Include various dash characters: hyphen (-), en-dash (–), em-dash (—)
    leagueName = leagueName
      .replace(/[\s\-–—]+$/g, '')  // Remove trailing spaces and dashes
      .replace(/^[\s\-–—]+/g, '')  // Remove leading spaces and dashes
      .trim();

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
