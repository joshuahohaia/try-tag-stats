import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import type {
  ScrapedFixture,
  ScrapedPlayerAward,
  TeamPositionHistory,
  TeamSeasonStats,
  TeamPreviousSeason,
  FixtureStatus,
} from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedTeamProfile {
  teamName: string;
  currentPosition?: number;
  played?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  fixtureHistory: ScrapedFixture[];
  upcomingFixtures: ScrapedFixture[];
  playerAwards: ScrapedPlayerAward[];
  historicalSeasons: Array<{
    seasonId: number;
    seasonName: string;
    divisionId: number;
  }>;
  // New detailed stats
  positionHistory: TeamPositionHistory[];
  seasonStats: TeamSeasonStats[];
  previousSeasons: TeamPreviousSeason[];
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

// Parse position history from Google Charts JavaScript
function parsePositionHistory(html: string): TeamPositionHistory[] {
  const positionHistory: TeamPositionHistory[] = [];

  // Look for google.visualization.arrayToDataTable pattern
  // Format: [['Week Number', 'Position'], ['1', 3], ['2', 4], ...]
  const chartDataMatch = html.match(/arrayToDataTable\s*\(\s*\[([\s\S]*?)\]\s*\)/);

  if (chartDataMatch) {
    const dataContent = chartDataMatch[1];
    // Match each data row like ['1', 3] or ['2', 4]
    const rowMatches = dataContent.matchAll(/\[\s*['"](\d+)['"]\s*,\s*(\d+)\s*\]/g);

    for (const match of rowMatches) {
      const week = parseInt(match[1], 10);
      const position = parseInt(match[2], 10);
      if (!isNaN(week) && !isNaN(position)) {
        positionHistory.push({ week, position });
      }
    }
  }

  return positionHistory;
}

// Parse statistics table
function parseSeasonStats($: cheerio.CheerioAPI): TeamSeasonStats[] {
  const stats: TeamSeasonStats[] = [];

  // Find table that contains "Average Scored" or similar
  $('table').each((_, table) => {
    const $table = $(table);
    const tableText = $table.text();

    if (!tableText.includes('Average Scored') && !tableText.includes('Average Conceded')) {
      return;
    }

    // Map row labels to data
    const rowData: Record<string, string[]> = {};
    const headerRow = $table.find('tr').first();
    const headers: string[] = [];

    headerRow.find('td, th').each((i, cell) => {
      const text = $(cell).text().trim();
      if (i > 0 && text) headers.push(text);
    });

    $table.find('tr').each((_, row) => {
      const $row = $(row);
      const $cells = $row.find('td, th');

      if ($cells.length < 2) return;

      const label = $cells.first().text().trim().toLowerCase();
      const values: string[] = [];

      $cells.slice(1).each((_, cell) => {
        values.push($(cell).text().trim());
      });

      if (label && values.length > 0) {
        rowData[label] = values;
      }
    });

    // Build stats for each period
    const periods: Array<'last3' | 'season' | 'allTime'> = ['last3', 'season', 'allTime'];

    for (let i = 0; i < 3; i++) {
      const periodStat: TeamSeasonStats = {
        period: periods[i],
        avgScored: 0,
        avgConceded: 0,
        avgPoints: 0,
        biggestWin: null,
        biggestLoss: null,
      };

      // Try to extract each stat
      for (const [label, values] of Object.entries(rowData)) {
        const value = values[i];
        if (!value) continue;

        if (label.includes('average scored') || label === 'average scored :') {
          periodStat.avgScored = parseFloat(value) || 0;
        } else if (label.includes('average conceded') || label === 'average conceded :') {
          periodStat.avgConceded = parseFloat(value) || 0;
        } else if (label.includes('average points') || label === 'average points :') {
          periodStat.avgPoints = parseFloat(value) || 0;
        } else if (label.includes('biggest win') || label === 'biggest win :') {
          periodStat.biggestWin = value !== '-' && value !== '' ? value : null;
        } else if (label.includes('biggest loss') || label === 'biggest loss :') {
          periodStat.biggestLoss = value !== '-' && value !== '' ? value : null;
        }
      }

      stats.push(periodStat);
    }
  });

  return stats;
}

// Parse previous seasons
function parsePreviousSeasons($: cheerio.CheerioAPI): TeamPreviousSeason[] {
  const previousSeasons: TeamPreviousSeason[] = [];

  // Find section with "Previous Seasons" heading
  const pageText = $('body').text();
  const hasPreviousSeasons = pageText.includes('Previous Seasons');

  if (!hasPreviousSeasons) return previousSeasons;

  // Look for links with Standings URL pattern
  $('a[href*="Standings"]').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href') || '';
    const text = $link.text().trim();

    // Skip if not a season link (should have LeagueId, SeasonId, DivisionId)
    if (!href.includes('LeagueId') || !href.includes('SeasonId')) return;

    const leagueId = extractParam(href, 'LeagueId');
    const seasonId = extractParam(href, 'SeasonId');
    const divisionId = extractParam(href, 'DivisionId');

    // Parse text format: "League Name - Season - Division"
    // Example: "Battersea Park Astro (Monday - 5-a-side) - Autumn 2025 - Open Grade"
    const parts = text.split(' - ');

    if (parts.length >= 2) {
      // Handle case where league name contains " - " (e.g., "Monday - 5-a-side")
      let leagueName = parts[0];
      let seasonName = '';
      let divisionName = '';

      // Work backwards: last part is usually division, second-to-last is season
      if (parts.length >= 3) {
        divisionName = parts[parts.length - 1];
        seasonName = parts[parts.length - 2];
        // Everything else is the league name
        leagueName = parts.slice(0, parts.length - 2).join(' - ');
      } else if (parts.length === 2) {
        seasonName = parts[1];
      }

      // Check if this is already added (might be in the "Current Season" section)
      const exists = previousSeasons.some(
        (s) => s.leagueName === leagueName && s.seasonName === seasonName && s.divisionName === divisionName
      );

      if (!exists && (seasonName || leagueName)) {
        previousSeasons.push({
          leagueName,
          seasonName,
          divisionName,
          leagueId: leagueId || undefined,
          seasonId: seasonId || undefined,
          divisionId: divisionId || undefined,
        });
      }
    }
  });

  return previousSeasons;
}

// Parse player awards from statistics table
function parsePlayerAwards($: cheerio.CheerioAPI, teamName: string, teamId: number): ScrapedPlayerAward[] {
  const playerAwards: ScrapedPlayerAward[] = [];

  $('table').each((_, table) => {
    const $table = $(table);
    const headerText = $table.find('th, tr:first-child td').text().toLowerCase();

    // Look for Player of the Match table
    if (!headerText.includes('player') || (!headerText.includes('award') && !headerText.includes('match'))) {
      return;
    }

    $table.find('tr').each((_, row) => {
      const $row = $(row);
      const $cells = $row.find('td');

      if ($cells.length < 2) return;

      // Skip header row
      const firstCellText = $cells.eq(0).text().trim().toLowerCase();
      if (firstCellText === 'player') return;

      const playerName = $cells.eq(0).text().trim();
      // Award count is usually last column
      const awardCountText = $cells.last().text().trim();
      const awardCount = parseInt(awardCountText, 10) || 1;

      if (playerName && awardCount > 0) {
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

  return playerAwards;
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

  // Parse position history from Google Charts JavaScript
  const positionHistory = parsePositionHistory(html);

  // Parse season stats
  const seasonStats = parseSeasonStats($);

  // Parse previous seasons
  const previousSeasons = parsePreviousSeasons($);

  // Parse player awards
  const playerAwards = parsePlayerAwards($, teamName, teamId);

  // Parse fixture history from tables
  const fixtureHistory: ScrapedFixture[] = [];
  const upcomingFixtures: ScrapedFixture[] = [];

  const tables = $('table');

  tables.each((_, table) => {
    const $table = $(table);
    const $rows = $table.find('tr');
    const rowArray = $rows.toArray();

    // Find the header row - it may not be the first row (there could be a title row first)
    let headerRowIndex = -1;

    for (let rowIdx = 0; rowIdx < rowArray.length; rowIdx++) {
      const rowText = $(rowArray[rowIdx]).text().toLowerCase();

      // Check if this row has both "date" and "opposition" - this is our header row
      const hasDate = rowText.includes('date');
      const hasOpposition = rowText.includes('opposition') || rowText.includes('opponent');

      if (hasDate && hasOpposition) {
        headerRowIndex = rowIdx;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return;
    }

    const $headerRow = $(rowArray[headerRowIndex]);

    // Find column indices
    const $headerCells = $headerRow.find('th, td');
    let dateCol = -1;
    let timeCol = -1;
    let courtCol = -1;
    let oppCol = -1;
    let resultCol = -1;

    $headerCells.each((idx: number, cell: Element) => {
      const cellText = $(cell).text().toLowerCase().trim();
      if (cellText.includes('date')) dateCol = idx;
      else if (cellText.includes('time')) timeCol = idx;
      else if (cellText.includes('court') || cellText.includes('pitch')) courtCol = idx;
      else if (cellText.includes('opposition') || cellText.includes('opponent')) oppCol = idx;
      else if (cellText.includes('result') || cellText.includes('score')) resultCol = idx;
    });

    // Process data rows (all rows after the header row)
    const dataRows = $rows.slice(headerRowIndex + 1);

    dataRows.each((_, row) => {
      const $row = $(row);
      const $cells = $row.find('td');
      const rowText = $row.text().toLowerCase();

      // Skip bye weeks, headers, or empty rows
      if (rowText.includes('bye') || $cells.length < 3) {
        return;
      }

      // Extract date
      const dateText = dateCol >= 0 ? $cells.eq(dateCol).text().trim() : '';
      const dateMatch = dateText.match(/\d{1,2}\s+\w{3}\s+\d{4}/);
      const date = dateMatch ? parseDate(dateMatch[0]) : null;
      if (!date) {
        return;
      }

      // Extract time
      const timeText = timeCol >= 0 ? $cells.eq(timeCol).text().trim() : null;
      const time = timeText?.match(/\d{1,2}:\d{2}/) ? timeText.match(/\d{1,2}:\d{2}/)?.[0] || null : null;

      // Extract pitch/court
      const pitch = courtCol >= 0 ? $cells.eq(courtCol).text().trim() || null : null;

      // Find opposition team from link
      const $oppCell = oppCol >= 0 ? $cells.eq(oppCol) : $row;
      const $oppLink = $oppCell.find('a[href*="TeamId"]');

      let oppTeamId = 0;
      let oppTeamName = '';

      if ($oppLink.length) {
        oppTeamId = extractParam($oppLink.attr('href') || '', 'TeamId') || 0;
        oppTeamName = $oppLink.text().trim();
      } else {
        oppTeamName = oppCol >= 0 ? $cells.eq(oppCol).text().trim() : '';
      }

      if (!oppTeamName) {
        return;
      }

      // Extract result/score - first number is team's score, second is opponent's
      const resultText = resultCol >= 0 ? $cells.eq(resultCol).text().trim() : $row.text();
      const scoreMatch = resultText.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);

      let teamScore: number | null = null;
      let oppScore: number | null = null;
      let status: FixtureStatus = 'scheduled';

      if (scoreMatch) {
        teamScore = parseInt(scoreMatch[1], 10);
        oppScore = parseInt(scoreMatch[2], 10);
        status = 'completed';
      }

      const fixture = {
        date,
        time,
        pitch,
        homeTeamId: teamId,
        homeTeamName: teamName,
        awayTeamId: oppTeamId,
        awayTeamName: oppTeamName,
        homeScore: teamScore,
        awayScore: oppScore,
        status,
      };

      if (status === 'completed') {
        fixtureHistory.push(fixture);
      } else {
        upcomingFixtures.push(fixture);
      }
    });
  });

  // Parse historical seasons from links (keep for backward compatibility)
  const historicalSeasons: Array<{ seasonId: number; seasonName: string; divisionId: number }> = [];

  $('a[href*="SeasonId"]').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href') || '';

    const seasonId = extractParam(href, 'SeasonId');
    const divisionId = extractParam(href, 'DivisionId');

    if (seasonId === null || divisionId === null) return;

    const seasonName = $link.text().trim();

    const exists = historicalSeasons.some((s) => s.seasonId === seasonId && s.divisionId === divisionId);
    if (!exists && seasonName) {
      historicalSeasons.push({ seasonId, seasonName, divisionId });
    }
  });

  logger.info(
    {
      teamName,
      fixtureCount: fixtureHistory.length,
      upcomingCount: upcomingFixtures.length,
      awardCount: playerAwards.length,
      historicalCount: historicalSeasons.length,
      positionHistoryCount: positionHistory.length,
      statsCount: seasonStats.length,
      previousSeasonsCount: previousSeasons.length,
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
    upcomingFixtures,
    playerAwards,
    historicalSeasons,
    positionHistory,
    seasonStats,
    previousSeasons,
  };
}
