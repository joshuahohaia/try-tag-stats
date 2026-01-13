import * as cheerio from 'cheerio';
import type { ScrapedFixture, ScrapedPlayerAward, FixtureStatus } from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedTeamProfile {
  teamName: string;
  currentPosition?: number;
  played?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  fixtureHistory: ScrapedFixture[];
  playerAwards: ScrapedPlayerAward[];
  historicalSeasons: Array<{
    seasonId: number;
    seasonName: string;
    divisionId: number;
  }>;
}

// Extract IDs from href
function extractParam(href: string, param: string): number | null {
  const regex = new RegExp(`${param}=(\\d+)`);
  const match = href.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

// Parse date string to YYYY-MM-DD format
function parseDate(dateStr: string): string | null {
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Try "Mon 24 Nov 2025" format
  const match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = monthMap[match[2].toLowerCase()];
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function parseTeamProfile(html: string, teamId: number): ParsedTeamProfile {
  const $ = cheerio.load(html);

  // Get team name from heading
  const teamName = $('h1, h2, .team-name').first().text().trim() || `Team ${teamId}`;

  // Parse current stats if present
  let currentPosition: number | undefined;
  let played: number | undefined;
  let wins: number | undefined;
  let losses: number | undefined;
  let draws: number | undefined;

  // Look for stats in text like "Position: 4th" or "Won 2, Lost 3"
  const pageText = $('body').text();

  const posMatch = pageText.match(/position[:\s]+(\d+)/i);
  if (posMatch) currentPosition = parseInt(posMatch[1], 10);

  const wonMatch = pageText.match(/won[:\s]+(\d+)/i);
  if (wonMatch) wins = parseInt(wonMatch[1], 10);

  const lostMatch = pageText.match(/lost[:\s]+(\d+)/i);
  if (lostMatch) losses = parseInt(lostMatch[1], 10);

  const drawnMatch = pageText.match(/drawn?[:\s]+(\d+)/i);
  if (drawnMatch) draws = parseInt(drawnMatch[1], 10);

  // Parse fixture history from tables
  const fixtureHistory: ScrapedFixture[] = [];

  $('table').each((_, table) => {
    const $table = $(table);
    const headerText = $table.find('th').text().toLowerCase();

    // Look for fixture/results table
    if (!headerText.includes('date') && !headerText.includes('opposition') && !headerText.includes('result')) {
      return;
    }

    $table.find('tbody tr, tr').not(':has(th)').each((_, row) => {
      const $row = $(row);
      const $cells = $row.find('td');
      const rowText = $row.text();

      // Skip bye weeks
      if (rowText.toLowerCase().includes('bye')) return;

      // Try to extract date
      const dateMatch = rowText.match(/\d{1,2}\s+\w{3}\s+\d{4}/);
      const date = dateMatch ? parseDate(dateMatch[0]) : null;
      if (!date) return;

      // Try to find opposition team
      const $oppLink = $row.find('a[href*="TeamId"]');
      let oppTeamId = 0;
      let oppTeamName = '';

      if ($oppLink.length) {
        oppTeamId = extractParam($oppLink.attr('href') || '', 'TeamId') || 0;
        oppTeamName = $oppLink.text().trim();
      }

      if (!oppTeamId || !oppTeamName) return;

      // Try to parse score like "8-10" or "8 - 10"
      const scoreMatch = rowText.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let status: FixtureStatus = 'scheduled';

      if (scoreMatch) {
        // Assuming the first number is this team's score
        homeScore = parseInt(scoreMatch[1], 10);
        awayScore = parseInt(scoreMatch[2], 10);
        status = 'completed';
      }

      // We don't know if this team is home or away, so we'll assume home
      // The actual home/away will be determined by the fixture in the database
      fixtureHistory.push({
        date,
        time: null,
        pitch: null,
        homeTeamId: teamId,
        homeTeamName: teamName,
        awayTeamId: oppTeamId,
        awayTeamName: oppTeamName,
        homeScore,
        awayScore,
        status,
      });
    });
  });

  // Parse player awards
  const playerAwards: ScrapedPlayerAward[] = [];

  $('table').each((_, table) => {
    const $table = $(table);
    const headerText = $table.find('th').text().toLowerCase();

    if (!headerText.includes('player') || !headerText.includes('award')) {
      return;
    }

    $table.find('tbody tr, tr').not(':has(th)').each((_, row) => {
      const $row = $(row);
      const $cells = $row.find('td');

      if ($cells.length < 2) return;

      const playerName = $cells.eq(0).text().trim();
      const awardCountText = $cells.eq(1).text().trim();
      const awardCount = parseInt(awardCountText, 10) || 1;

      if (playerName) {
        playerAwards.push({
          playerName,
          teamName,
          teamId,
          awardCount,
          awardType: 'player_of_match',
        });
      }
    });
  });

  // Parse historical seasons from links
  const historicalSeasons: Array<{ seasonId: number; seasonName: string; divisionId: number }> = [];

  $('a[href*="SeasonId"]').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href') || '';

    const seasonId = extractParam(href, 'SeasonId');
    const divisionId = extractParam(href, 'DivisionId');

    if (!seasonId || !divisionId) return;

    const seasonName = $link.text().trim();

    // Avoid duplicates
    const exists = historicalSeasons.some((s) => s.seasonId === seasonId && s.divisionId === divisionId);
    if (!exists && seasonName) {
      historicalSeasons.push({ seasonId, seasonName, divisionId });
    }
  });

  logger.info(
    {
      teamName,
      fixtureCount: fixtureHistory.length,
      awardCount: playerAwards.length,
      historicalCount: historicalSeasons.length,
    },
    'Parsed team profile'
  );

  return {
    teamName,
    currentPosition,
    played,
    wins,
    losses,
    draws,
    fixtureHistory,
    playerAwards,
    historicalSeasons,
  };
}
