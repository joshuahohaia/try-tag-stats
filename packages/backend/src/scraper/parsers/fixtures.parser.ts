import * as cheerio from 'cheerio';
import { ScrapedFixtureSchema } from '@trytag/shared';
import type { ScrapedFixture, FixtureStatus } from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedFixtures {
  fixtures: ScrapedFixture[];
}

// Extract team ID from href
function extractTeamId(href: string): number | null {
  const match = href.match(/TeamId=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Parse date string to YYYY-MM-DD format
function parseDate(dateStr: string): string | null {
  // Try various date formats
  const formats = [
    // "Monday 19 Jan 2026"
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
    // "19/01/2026" or "19-01-2026"
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    // "2026-01-19"
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      if (regex === formats[0]) {
        // "19 Jan 2026" format
        const day = match[1].padStart(2, '0');
        const month = monthMap[match[2].toLowerCase()];
        const year = match[3];
        return `${year}-${month}-${day}`;
      } else if (regex === formats[1]) {
        // "19/01/2026" format
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      } else {
        // Already ISO format
        return match[0];
      }
    }
  }

  return null;
}

// Parse time string to HH:MM format
function parseTime(timeStr: string): string | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return null;
}

// Determine fixture status from scores and date
function determineStatus(homeScore: number | null, awayScore: number | null, dateStr: string): FixtureStatus {
  if (homeScore !== null && awayScore !== null) {
    return 'completed';
  }

  const fixtureDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (fixtureDate < today) {
    // Past date but no score - might be postponed or just missing data
    return 'scheduled';
  }

  return 'scheduled';
}

export function parseFixtures(html: string): ParsedFixtures {
  const $ = cheerio.load(html);
  const fixtures: ScrapedFixture[] = [];

  // Look for fixture entries - typically in tables or divs
  // The structure varies, so we try multiple approaches

  // Approach 1: Table-based fixtures
  $('table').each((_, table) => {
    const $table = $(table);
    const $rows = $table.find('tr');

    let currentDate = '';

    $rows.each((_, row) => {
      const $row = $(row);
      const rowText = $row.text();

      // Check if this is a date header row
      const dateMatch = rowText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+\w+\s+\d{4}/i);
      if (dateMatch) {
        const parsed = parseDate(dateMatch[0]);
        if (parsed) {
          currentDate = parsed;
        }
        return;
      }

      // Look for team links
      const $teamLinks = $row.find('a[href*="TeamId"]');
      if ($teamLinks.length < 2) return;

      const $homeLink = $teamLinks.first();
      const $awayLink = $teamLinks.last();

      const homeTeamId = extractTeamId($homeLink.attr('href') || '');
      const awayTeamId = extractTeamId($awayLink.attr('href') || '');
      const homeTeamName = $homeLink.text().trim();
      const awayTeamName = $awayLink.text().trim();

      if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return;

      // Try to find time
      const timeMatch = rowText.match(/\b(\d{1,2}:\d{2})\b/);
      const time = timeMatch ? parseTime(timeMatch[1]) : null;

      // Try to find pitch
      const pitchMatch = rowText.match(/Pitch\s+[A-Z]/i);
      const pitch = pitchMatch ? pitchMatch[0] : null;

      // Try to find scores (look for data attributes or text patterns)
      let homeScore: number | null = null;
      let awayScore: number | null = null;

      // Check for data attributes
      const homeScoreAttr = $row.find('[data-home-score-for-fixture]').attr('data-home-score-for-fixture');
      const awayScoreAttr = $row.find('[data-away-score-for-fixture]').attr('data-away-score-for-fixture');

      if (homeScoreAttr && awayScoreAttr) {
        const hs = parseInt(homeScoreAttr, 10);
        const as = parseInt(awayScoreAttr, 10);
        if (!isNaN(hs) && !isNaN(as)) {
          homeScore = hs;
          awayScore = as;
        }
      }

      // Also try to find score pattern like "3-2" or "3 - 2"
      if (homeScore === null) {
        const scoreMatch = rowText.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/);
        if (scoreMatch) {
          homeScore = parseInt(scoreMatch[1], 10);
          awayScore = parseInt(scoreMatch[2], 10);
        }
      }

      const date = currentDate || new Date().toISOString().split('T')[0];

      const fixture: ScrapedFixture = {
        date,
        time,
        pitch,
        homeTeamId,
        homeTeamName,
        awayTeamId,
        awayTeamName,
        homeScore,
        awayScore,
        status: determineStatus(homeScore, awayScore, date),
      };

      // Validate with Zod
      const result = ScrapedFixtureSchema.safeParse(fixture);
      if (result.success) {
        fixtures.push(result.data);
      } else {
        logger.warn({ fixture, errors: result.error.errors }, 'Invalid fixture');
      }
    });
  });

  // Approach 2: Div-based fixtures (if table approach didn't find much)
  if (fixtures.length === 0) {
    $('div[class*="fixture"], div[class*="match"], .fixture, .match').each((_, div) => {
      const $div = $(div);
      const $teamLinks = $div.find('a[href*="TeamId"]');

      if ($teamLinks.length < 2) return;

      const $homeLink = $teamLinks.first();
      const $awayLink = $teamLinks.last();

      const homeTeamId = extractTeamId($homeLink.attr('href') || '');
      const awayTeamId = extractTeamId($awayLink.attr('href') || '');
      const homeTeamName = $homeLink.text().trim();
      const awayTeamName = $awayLink.text().trim();

      if (!homeTeamId || !awayTeamId) return;

      const divText = $div.text();
      const dateMatch = divText.match(/\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2}/);
      const date = dateMatch ? parseDate(dateMatch[0]) : new Date().toISOString().split('T')[0];

      if (!date) return;

      const timeMatch = divText.match(/\d{1,2}:\d{2}/);
      const time = timeMatch ? parseTime(timeMatch[0]) : null;

      const fixture: ScrapedFixture = {
        date,
        time,
        pitch: null,
        homeTeamId,
        homeTeamName,
        awayTeamId,
        awayTeamName,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      };

      const result = ScrapedFixtureSchema.safeParse(fixture);
      if (result.success) {
        fixtures.push(result.data);
      }
    });
  }

  logger.info({ fixtureCount: fixtures.length }, 'Parsed fixtures');

  return { fixtures };
}
