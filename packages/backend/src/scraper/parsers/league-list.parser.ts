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

  const nameLower = leagueName.toLowerCase();
  for (const [region, keywords] of Object.entries(regionMappings)) {
    if (keywords.some((keyword) => nameLower.includes(keyword.toLowerCase()))) {
      return region;
    }
  }
  return 'Other';
}

function parseUrlParams(href: string): Record<string, number> {
  const params: Record<string, number> = {};
  const match = href.match(/\?(.+)$/);
  if (match) {
    const searchParams = new URLSearchParams(match[1]);
    for (const [key, value] of searchParams.entries()) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) params[key] = num;
    }
  }
  return params;
}

export function parseLeagueList(html: string): ParsedLeagueList {
  const $ = cheerio.load(html);
  const items: ScrapedLeagueListItem[] = [];
  const regions = new Set<string>();
  const seasons = new Map<number, string>();

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
    const { LeagueId: leagueId, SeasonId: seasonId, DivisionId: divisionId } = params;
    if (!leagueId || !seasonId || !divisionId) return;

    const $parent = $el.closest('tr, div, li');
    const parentText = $parent.text().trim();

    // Enhanced Season Extraction
    const seasonMatch = parentText.match(/(Winter|Spring|Summer|Autumn)\s+\d{4}(?:\/\d{2})?/i);
    const seasonName = seasonMatch ? seasonMatch[0] : `Season ${seasonId}`;
    seasons.set(seasonId, seasonName);

    // 2. Enhanced Division Extraction (added Super League, Social, Grade variants)
    const divisionMatch = parentText.match(
      /(Division\s+\d+|Open\s+Grade|[A-Z]-Grade|Pool\s+[A-Z]|Plate|Cup|Super\s+League|Social\s+League|Intermediate|Beginner|Group\s+\d+)/i
    );
    // Fallback: If no division text is found (like West Hampstead), use "Open Grade" or "League"
    const divisionName = divisionMatch ? divisionMatch[0] : 'Open Grade';

    //Robust Venue/League Name Extraction
    // Look for the "Current Leagues" header which is the most reliable anchor
    let leagueName = $el
      .closest('div')
      .find('h2, h3, h4, strong')
      .first()
      .text()
      .replace('Current Leagues', '')
      .trim();

    if (!leagueName) {
      leagueName = $parent
        .prevAll('h2, h3, h4, strong')
        .first()
        .text()
        .replace('Current Leagues', '')
        .trim();
    }

    // If still no league name, use parent text minus season/division
    if (!leagueName) {
      leagueName = parentText
        .split('Fixtures')[0]
        .split('Standings')[0]
        .replace(seasonName, '')
        .replace(divisionName, '')
        .replace(/[()-]/g, '')
        .trim();
    }

    if (!leagueName || leagueName.length < 3) return;

    const region = inferRegion(leagueName);
    regions.add(region);

    const item: ScrapedLeagueListItem = {
      leagueId,
      externalId: `league_${leagueId}_season_${seasonId}_division_${divisionId}`,
      seasonId,
      divisionId,
      leagueName,
      seasonName,
      divisionName,
      region,
    };

    const result = ScrapedLeagueListItemSchema.safeParse(item);
    if (result.success) {
      const exists = items.some(
        (i) => i.leagueId === leagueId && i.seasonId === seasonId && i.divisionId === divisionId
      );
      if (!exists) items.push(result.data);
    } else {
      logger.warn({ item, errors: result.error.errors }, 'Invalid league list item');
    }
  });

  logger.info({ itemCount: items.length, regionCount: regions.size }, 'Parsed league list');
  return { items, regions, seasons };
}
