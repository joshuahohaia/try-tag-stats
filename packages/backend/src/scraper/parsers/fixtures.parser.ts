import * as cheerio from 'cheerio';
import { ScrapedFixtureSchema } from '@trytag/shared';
import type { ScrapedFixture, FixtureStatus } from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedFixtures {
  fixtures: ScrapedFixture[];
}

// Common regex patterns
const DATE_PATTERN = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i;
const TIME_PATTERN = /\b(\d{1,2}:\d{2})(?!\d)/;
const PITCH_PATTERN = /Pitch\s+[A-Z0-9]/i;
const SCORE_PATTERN = /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/;

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// Extract team ID from href
function extractTeamId(href: string): number | null {
  const match = href.match(/TeamId=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Parse date string to YYYY-MM-DD format
function parseDate(dateStr: string): string | null {
  const formats = [
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i,
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      if (regex === formats[0]) {
        const day = match[1].padStart(2, '0');
        const month = MONTH_MAP[match[2].toLowerCase().slice(0, 3)];
        const year = match[3];
        return `${year}-${month}-${day}`;
      } else if (regex === formats[1]) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      } else {
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

// Determine fixture status from scores
function determineStatus(homeScore: number | null, awayScore: number | null): FixtureStatus {
  return homeScore !== null && awayScore !== null ? 'completed' : 'scheduled';
}

// Create and validate a fixture
function createFixture(
  date: string,
  time: string | null,
  pitch: string | null,
  homeTeamId: number,
  homeTeamName: string,
  awayTeamId: number,
  awayTeamName: string,
  homeScore: number | null,
  awayScore: number | null
): ScrapedFixture | null {
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
    status: determineStatus(homeScore, awayScore),
  };

  const result = ScrapedFixtureSchema.safeParse(fixture);
  if (result.success) {
    return result.data;
  }

  logger.warn({ fixture, errors: result.error.errors }, 'Invalid fixture');
  return null;
}

export function parseFixtures(html: string): ParsedFixtures {
  const $ = cheerio.load(html);
  const fixtures: ScrapedFixture[] = [];

  // Approach 1: Table-based fixtures
  $('table').each((_, table) => {
    const $table = $(table);
    const $rows = $table.find('tr');
    let currentDate = '';

    $rows.each((_, row) => {
      const $row = $(row);
      const rowText = $row.text();

      // Check if this is a date header row
      const dateMatch = rowText.match(DATE_PATTERN);
      if (dateMatch) {
        const parsed = parseDate(dateMatch[0]);
        if (parsed) currentDate = parsed;
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

      // Extract time and pitch
      const timeMatch = rowText.match(TIME_PATTERN);
      const time = timeMatch ? parseTime(timeMatch[1]) : null;

      const pitchMatch = rowText.match(PITCH_PATTERN);
      const pitch = pitchMatch ? pitchMatch[0] : null;

      // Extract scores
      let homeScore: number | null = null;
      let awayScore: number | null = null;

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

      if (homeScore === null) {
        const scoreMatch = rowText.match(SCORE_PATTERN);
        if (scoreMatch) {
          homeScore = parseInt(scoreMatch[1], 10);
          awayScore = parseInt(scoreMatch[2], 10);
        }
      }

      const date = currentDate || new Date().toISOString().split('T')[0];

      const fixture = createFixture(
        date, time, pitch,
        homeTeamId, homeTeamName,
        awayTeamId, awayTeamName,
        homeScore, awayScore
      );

      if (fixture) fixtures.push(fixture);
    });
  });

  // Approach 2: Div-based fixtures (fallback if table approach found nothing)
  if (fixtures.length === 0) {
    let currentDate = '';
    const $teamLinks = $('a[href*="TeamId"]');
    const processedPairs = new Set<string>();

    $teamLinks.each((idx, link) => {
      const $homeLink = $(link);
      const homeTeamId = extractTeamId($homeLink.attr('href') || '');
      const homeTeamName = $homeLink.text().trim();

      if (!homeTeamId || !homeTeamName) return;

      const $nextLink = $teamLinks.eq(idx + 1);
      if (!$nextLink.length) return;

      const awayTeamId = extractTeamId($nextLink.attr('href') || '');
      const awayTeamName = $nextLink.text().trim();

      if (!awayTeamId || !awayTeamName || homeTeamId === awayTeamId) return;

      const pairKey = `${homeTeamId}-${awayTeamId}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      // Walk up the DOM to find date context
      let $container = $homeLink.closest('div').parent();
      for (let i = 0; i < 5; i++) {
        const containerText = $container.text();
        const dateMatch = containerText.match(DATE_PATTERN);
        if (dateMatch) {
          const parsed = parseDate(dateMatch[0]);
          if (parsed) currentDate = parsed;
          break;
        }
        $container = $container.parent();
        if (!$container.length) break;
      }

      // Find time and pitch in row context
      const $row = $homeLink.closest('div');
      const rowText = $row.parent().text();

      const timeMatch = rowText.match(TIME_PATTERN);
      const time = timeMatch ? parseTime(timeMatch[1]) : null;

      const pitchMatch = rowText.match(PITCH_PATTERN);
      const pitch = pitchMatch ? pitchMatch[0] : null;

      // Extract scores
      let homeScore: number | null = null;
      let awayScore: number | null = null;

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

      if (homeScore === null) {
        const scoreMatch = rowText.match(SCORE_PATTERN);
        if (scoreMatch) {
          homeScore = parseInt(scoreMatch[1], 10);
          awayScore = parseInt(scoreMatch[2], 10);
        }
      }

      const date = currentDate || new Date().toISOString().split('T')[0];

      const fixture = createFixture(
        date, time, pitch,
        homeTeamId, homeTeamName,
        awayTeamId, awayTeamName,
        homeScore, awayScore
      );

      if (fixture) fixtures.push(fixture);
    });
  }

  logger.info({ fixtureCount: fixtures.length }, 'Parsed fixtures');

  return { fixtures };
}
