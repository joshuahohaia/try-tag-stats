import * as cheerio from 'cheerio';
import { ScrapedPlayerAwardSchema } from '@trytag/shared';
import type { ScrapedPlayerAward } from '@trytag/shared';
import { logger } from '../../utils/logger.js';

interface ParsedStatistics {
  level: 'division' | 'season';
  playerAwards: ScrapedPlayerAward[];
}

// Extract team ID from href
function extractTeamId(href: string): number | null {
  const match = href.match(/TeamId=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseStatistics(html: string, level: 'division' | 'season' = 'division'): ParsedStatistics {
  const $ = cheerio.load(html);
  const playerAwards: ScrapedPlayerAward[] = [];

  // Find tables that look like player statistics
  $('table').each((_, table) => {
    const $table = $(table);
    const $headers = $table.find('th, thead td');
    const headerText = $headers.text().toLowerCase();

    // Check if this looks like a player awards table
    if (!headerText.includes('player') && !headerText.includes('award') && !headerText.includes('match')) {
      return;
    }

    // Map header positions
    const headerMap: Record<string, number> = {};
    $headers.each((idx, th) => {
      const text = $(th).text().trim().toLowerCase();
      if (text.includes('player')) headerMap['player'] = idx;
      else if (text.includes('team')) headerMap['team'] = idx;
      else if (text.includes('award') || text.includes('pom') || text.includes('match')) headerMap['awards'] = idx;
    });

    // Process data rows
    const $rows = $table.find('tbody tr, tr').not(':has(th)');

    $rows.each((_, row) => {
      const $row = $(row);
      const $cells = $row.find('td');

      if ($cells.length < 2) return;

      // Get player name
      const playerIdx = headerMap['player'] ?? 0;
      const playerName = $cells.eq(playerIdx).text().trim();

      if (!playerName) return;

      // Get team name and ID
      const teamIdx = headerMap['team'] ?? 1;
      const $teamCell = $cells.eq(teamIdx);
      const $teamLink = $teamCell.find('a[href*="TeamId"]');

      let teamName = '';
      let teamId: number | undefined;

      if ($teamLink.length) {
        teamName = $teamLink.text().trim();
        teamId = extractTeamId($teamLink.attr('href') || '') ?? undefined;
      } else {
        teamName = $teamCell.text().trim();
      }

      if (!teamName) return;

      // Get award count
      const awardsIdx = headerMap['awards'] ?? 2;
      const awardCountText = $cells.eq(awardsIdx).text().trim();
      const awardCount = parseInt(awardCountText, 10) || 1;

      const award: ScrapedPlayerAward = {
        playerName,
        teamName,
        teamId,
        awardCount,
        awardType: 'player_of_match',
      };

      // Validate with Zod
      const result = ScrapedPlayerAwardSchema.safeParse(award);
      if (result.success) {
        playerAwards.push(result.data);
      } else {
        logger.warn({ award, errors: result.error.errors }, 'Invalid player award');
      }
    });
  });

  logger.info({ level, awardCount: playerAwards.length }, 'Parsed statistics');

  return { level, playerAwards };
}
