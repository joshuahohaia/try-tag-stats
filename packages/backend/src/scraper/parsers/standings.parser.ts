import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { ScrapedStandingRowSchema } from '@trytag/shared';
import type { ScrapedStandingRow } from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedStandings {
  divisionName: string;
  standings: ScrapedStandingRow[];
}

// Extract team ID from href
function extractTeamId(href: string): number | null {
  const match = href.match(/TeamId=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Parse a number, defaulting to 0 if invalid
function parseNum(text: string): number {
  const num = parseInt(text.trim(), 10);
  return isNaN(num) ? 0 : num;
}

export function parseStandings(html: string): ParsedStandings {
  const $ = cheerio.load(html);
  const standings: ScrapedStandingRow[] = [];

  // Try to find division name from page title or heading
  let divisionName = $('h1, h2, .title, .heading').first().text().trim();
  if (!divisionName) {
    divisionName = $('title').text().split('-')[0]?.trim() || 'Unknown Division';
  }

  // Find the standings table - look for tables with team standings columns
  const $tables = $('table');

  $tables.each((_, table) => {
    const $table = $(table);
    
    // Find header row
    let $headerRow = $table.find('thead tr').first();
    if ($headerRow.length === 0) {
      $headerRow = $table.find('tr.STHeaderRow').first();
    }
    if ($headerRow.length === 0) {
      $headerRow = $table.find('tr').has('th').first() as cheerio.Cheerio<Element>;
    }
    
    // If still no specific header row found, try the first row
    if ($headerRow.length === 0) {
        $headerRow = $table.find('tr').first();
    }

    const $headers = $headerRow.find('th, td');
    const headerText = $headers.text().toLowerCase();

    // Check if this looks like a standings table (has key columns)
    if (!headerText.includes('team') && !headerText.includes('pts')) {
      return;
    }

    // Map header positions
    const headerMap: Record<string, number> = {};
    $headers.each((idx, th) => {
      const text = $(th).text().trim().toLowerCase();
      if (text === 'team' || text === 'name') headerMap['team'] = idx;
      else if (text === 'pld' || text === 'p' || text === 'played') headerMap['played'] = idx;
      else if (text === 'w' || text === 'won' || text === 'wins') headerMap['wins'] = idx;
      else if (text === 'l' || text === 'lost' || text === 'losses') headerMap['losses'] = idx;
      else if (text === 'd' || text === 'drawn' || text === 'draws') headerMap['draws'] = idx;
      else if (text === 'ff') headerMap['forfeitsFor'] = idx;
      else if (text === 'fa') headerMap['forfeitsAgainst'] = idx;
      else if (text === 'f' || text === 'for' || text === 'pf') headerMap['pointsFor'] = idx;
      else if (text === 'a' || text === 'against' || text === 'pa') headerMap['pointsAgainst'] = idx;
      else if (text === 'dif' || text === 'diff' || text === 'pd') headerMap['pointDifference'] = idx;
      else if (text === 'b' || text === 'bonus' || text === 'bp') headerMap['bonusPoints'] = idx;
      else if (text === 'pts' || text === 'points' || text === 'total') headerMap['totalPoints'] = idx;
    });

    // Process data rows
    const $rows = $table.find('tr').not($headerRow);
    let position = 0;

    $rows.each((_, element) => {
      const $row = $(element);
      const $cells = $row.find('td');

      if ($cells.length < 3) return;

      position++;

      // Find team name and ID
      let teamName = '';
      let teamId = 0;

      const $teamCell = headerMap['team'] !== undefined
        ? $cells.eq(headerMap['team'])
        : $cells.first();

      const $teamLink = $teamCell.find('a[href*="TeamId"]');
      if ($teamLink.length) {
        teamName = $teamLink.text().trim();
        teamId = extractTeamId($teamLink.attr('href') || '') || 0;
      } else {
        teamName = $teamCell.text().trim();
      }

      if (!teamName || teamId === 0) return;

      // Extract stats
      const getValue = (key: string, defaultIdx?: number): number => {
        const idx = headerMap[key] ?? defaultIdx;
        if (idx === undefined) return 0;
        return parseNum($cells.eq(idx).text());
      };

      const row: ScrapedStandingRow = {
        position,
        teamId,
        teamName,
        played: getValue('played', 1),
        wins: getValue('wins', 2),
        losses: getValue('losses', 3),
        draws: getValue('draws', 4),
        forfeitsFor: getValue('forfeitsFor', 5),
        forfeitsAgainst: getValue('forfeitsAgainst', 6),
        pointsFor: getValue('pointsFor', 7),
        pointsAgainst: getValue('pointsAgainst', 8),
        pointDifference: getValue('pointDifference', 9),
        bonusPoints: getValue('bonusPoints', 10),
        totalPoints: getValue('totalPoints', 11),
      };

      // Validate with Zod
      const result = ScrapedStandingRowSchema.safeParse(row);
      if (result.success) {
        standings.push(result.data);
      } else {
        logger.warn({ row, errors: result.error.errors }, 'Invalid standing row');
      }
    });
  });

  logger.info({ divisionName, standingsCount: standings.length }, 'Parsed standings');

  return { divisionName, standings };
}
