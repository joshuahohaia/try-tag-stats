import * as cheerio from 'cheerio';

/**
 * One game row from the "Fixtures and Results" table of a Spawtz team profile.
 * Scores are from the profile team's point of view. The opponent is identified
 * by the Spawtz TeamId in the row's link, never by name.
 *
 * Spawtz adds label rows such as "Interdivisional Friendly" or "3rd/4th Playoff"
 * as separate table rows. The page does not say which neighbouring game a label
 * belongs to, so each game keeps the label directly above and below it.
 */
export interface TeamResultRow {
  date: string; // YYYY-MM-DD
  time: string | null;
  court: string | null;
  opponentTeamId: number;
  opponentName: string;
  teamScore: number;
  opponentScore: number;
  labelAbove: string | null;
  labelBelow: string | null;
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const DATE_AT_START = /^\w{3}\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i;

function parseDate(text: string): string | null {
  const m = text.match(DATE_AT_START);
  if (!m) return null;
  return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
}

export function parseTeamResults(html: string): TeamResultRow[] {
  const $ = cheerio.load(html);
  const rows: TeamResultRow[] = [];
  let pendingLabel: string | null = null;
  let lastGame: TeamResultRow | null = null;

  $('table').each((_, table) => {
    const headerText = $(table).find('tr').eq(1).text().toLowerCase().replace(/\s+/g, '');
    const firstRow = $(table).find('tr').first().text().toLowerCase();
    if (!firstRow.includes('fixtures and results') && !headerText.includes('opposition')) return;

    $(table).find('tr').each((__, tr) => {
      const cells = $(tr).find('td, th');
      const text = $(tr).text().replace(/\s+/g, ' ').trim();
      if (!text) return;

      const link = $(tr).find('a[href*="TeamId"]').first();
      const date = parseDate(text);
      const scoreMatch = $(tr).find('td').last().text().match(/(\d{1,3})\s*[-\u2013]\s*(\d{1,3})/);

      if (link.length && date && scoreMatch) {
        const idMatch = (link.attr('href') || '').match(/TeamId=(\d+)/);
        if (!idMatch) return;
        const time = cells.eq(1).text().trim();
        const game: TeamResultRow = {
          date,
          time: /^\d{1,2}:\d{2}$/.test(time) ? time : null,
          court: cells.eq(2).text().trim() || null,
          opponentTeamId: parseInt(idMatch[1], 10),
          opponentName: link.text().trim(),
          teamScore: parseInt(scoreMatch[1], 10),
          opponentScore: parseInt(scoreMatch[2], 10),
          labelAbove: pendingLabel,
          labelBelow: null,
        };
        pendingLabel = null;
        lastGame = game;
        rows.push(game);
        return;
      }

      // Not a played game. A date followed by "Bye" or an unplayed game is skipped.
      if (date) return;
      if (/^(date|time|fixtures and results)/i.test(text)) return;

      // Anything else with no date is a label row.
      if (lastGame && lastGame.labelBelow === null) lastGame.labelBelow = text;
      pendingLabel = text;
    });
  });

  return rows;
}
