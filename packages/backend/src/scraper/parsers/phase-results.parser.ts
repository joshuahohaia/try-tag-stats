import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

/**
 * Played games of a later phase, read from the points tooltips on the Spawtz phase standings page.
 *
 * Spawtz lists a game under the team that earned points for it: "A vs B, 12/10/2026 20:40 - 2 points
 * for Win" appears under the winner, and a drawn game appears under both teams. The loser is not
 * listed. The page publishes no scores. A loss is therefore only known when the opponent's tooltip
 * names the team in a game the opponent won, never from a missing line.
 *
 * Games are read per team and only trusted for a team when the Win, Draw and Loss counts found in
 * the tooltips equal the W, D and L columns of that team's standings row.
 */
export interface PhaseGame {
  date: string; // YYYY-MM-DD
  time: string | null;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  /** H = first-named team won, A = second-named team won, D = draw. */
  outcome: 'H' | 'A' | 'D';
  /** Real scores from the division page's Results section, when that page lists this game. */
  homeScore?: number;
  awayScore?: number;
}

export interface PhaseTableResults {
  divisionId: number | null;
  heading: string | null;
  games: PhaseGame[];
  /** Spawtz team ids whose tooltip games add up to their standings row. Only these are safe to show. */
  verifiedTeamIds: number[];
  /** Team ids whose games do not add up, for logging. */
  unverifiedTeamIds: number[];
}

const MATCH_LINE = /^(.*),\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?\s*$/;

function ownText(el: cheerio.Cheerio<Element>): string {
  return el.clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
}

export function parsePhaseResults(html: string): PhaseTableResults[] {
  const $ = cheerio.load(html);
  const out: PhaseTableResults[] = [];

  $('table').each((_, table) => {
    const $table = $(table);
    const rows = $table.find('tr').filter((__, tr) => $(tr).find('td.STTeamCell').length > 0);
    if (rows.length === 0) return;

    const teams = new Map<number, { name: string; w: number; l: number; d: number; pf: number; pa: number }>();
    const nameToId = new Map<string, number>();
    const duplicateNames = new Set<string>();
    let divisionId: number | null = null;
    const tooltipRows: Array<{ teamId: number; lines: Array<{ text: string; kinds: string[] }> }> = [];

    rows.each((__, tr) => {
      const $tr = $(tr);
      const link = $tr.find('td.STTeamCell a').first();
      const href = link.attr('href') ?? '';
      const idMatch = href.match(/TeamId=(\d+)/i);
      if (!idMatch) return;
      const teamId = parseInt(idMatch[1], 10);
      const div = href.match(/DivisionId=(\d+)/i);
      if (div) divisionId = divisionId ?? parseInt(div[1], 10);
      const name = link.text().replace(/\s+/g, ' ').trim();

      // Columns after the team cell: Pld, W, L, D
      const played = $tr.find('td.played').first();
      const w = parseInt(played.next().text().trim(), 10);
      const l = parseInt(played.next().next().text().trim(), 10);
      const d = parseInt(played.next().next().next().text().trim(), 10);
      const pf = parseInt($tr.find('td.for').first().text().trim(), 10);
      const pa = parseInt($tr.find('td.for').first().next().text().trim(), 10);
      teams.set(teamId, { name, w, l, d, pf, pa });
      if (nameToId.has(name)) duplicateNames.add(name);
      nameToId.set(name, teamId);

      const lines: Array<{ text: string; kinds: string[] }> = [];
      $tr.find('td.Points .StandingsToolTip > ul > li').each((___, li) => {
        const $li = $(li);
        const kinds: string[] = [];
        $li.find('.PointsList li').each((____, k) => {
          const m = $(k).text().replace(/\s+/g, ' ').match(/for\s+(\w+)/i);
          if (m) kinds.push(m[1].toLowerCase());
        });
        lines.push({ text: ownText($li), kinds });
      });
      tooltipRows.push({ teamId, lines });
    });

    const games = new Map<string, PhaseGame>();
    const ambiguous = new Set<number>();
    const counts = new Map<number, { w: number; l: number; d: number }>();
    const bump = (id: number, k: 'w' | 'l' | 'd') => {
      const c = counts.get(id) ?? { w: 0, l: 0, d: 0 };
      c[k] += 1;
      counts.set(id, c);
    };

    for (const { teamId, lines } of tooltipRows) {
      const self = teams.get(teamId);
      if (!self) continue;
      for (const line of lines) {
        const m = line.text.match(MATCH_LINE);
        if (!m) { ambiguous.add(teamId); continue; }
        const [, names, dd, mm, yyyy, time] = m;
        // Split "A vs B" where both sides are known teams of this table and one is this team.
        const parts = names.split(' vs ');
        let home: string | null = null;
        let away: string | null = null;
        for (let i = 1; i < parts.length; i++) {
          const left = parts.slice(0, i).join(' vs ').trim();
          const right = parts.slice(i).join(' vs ').trim();
          if (nameToId.has(left) && nameToId.has(right) && (left === self.name || right === self.name)) {
            home = left; away = right; break;
          }
        }
        if (!home || !away || duplicateNames.has(home) || duplicateNames.has(away) || home === away) { ambiguous.add(teamId); continue; }
        const homeId = nameToId.get(home)!;
        const awayId = nameToId.get(away)!;
        const win = line.kinds.includes('win');
        const draw = line.kinds.includes('draw');
        if (win === draw) { ambiguous.add(teamId); continue; }
        let outcome: 'H' | 'A' | 'D';
        if (draw) outcome = 'D';
        else outcome = teamId === homeId ? 'H' : 'A';
        const key = `${yyyy}-${mm}-${dd} ${time ?? ''}|${homeId}|${awayId}`;
        const existing = games.get(key);
        if (existing) {
          // Same game seen from the other team: both tooltips must agree.
          if (existing.outcome !== outcome) { ambiguous.add(homeId); ambiguous.add(awayId); }
          continue;
        }
        games.set(key, {
          date: `${yyyy}-${mm}-${dd}`,
          time: time ?? null,
          homeTeamId: homeId,
          awayTeamId: awayId,
          homeTeamName: home,
          awayTeamName: away,
          outcome,
        });
      }
    }

    // Attach real scores from the Results section of the same page. A score is only used when it
    // agrees with the points-tooltip result of that game, and a team's scores are only trusted when
    // every one of its games has a score and the totals equal the standings For/Against columns.
    const scored = parseResultsSection($);
    for (const g of games.values()) {
      const r = scored.find((x) => x.date === g.date && x.homeTeamId === g.homeTeamId && x.awayTeamId === g.awayTeamId);
      if (!r) continue;
      const o: 'H' | 'A' | 'D' = r.homeScore > r.awayScore ? 'H' : r.homeScore < r.awayScore ? 'A' : 'D';
      if (o !== g.outcome) { ambiguous.add(g.homeTeamId); ambiguous.add(g.awayTeamId); continue; }
      g.homeScore = r.homeScore;
      g.awayScore = r.awayScore;
    }
    for (const [id, t] of teams) {
      const mine = [...games.values()].filter((g) => g.homeTeamId === id || g.awayTeamId === id);
      const withScore = mine.filter((g) => g.homeScore !== undefined);
      if (withScore.length === 0) continue;
      const pf = withScore.reduce((a, g) => a + (g.homeTeamId === id ? g.homeScore! : g.awayScore!), 0);
      const pa = withScore.reduce((a, g) => a + (g.homeTeamId === id ? g.awayScore! : g.homeScore!), 0);
      if (withScore.length !== mine.length || pf !== t.pf || pa !== t.pa) {
        // Not provably complete: drop scores for this team's games (result-only stays).
        for (const g of mine) { delete g.homeScore; delete g.awayScore; }
      }
    }

    for (const g of games.values()) {
      if (g.outcome === 'D') { bump(g.homeTeamId, 'd'); bump(g.awayTeamId, 'd'); }
      else if (g.outcome === 'H') { bump(g.homeTeamId, 'w'); bump(g.awayTeamId, 'l'); }
      else { bump(g.awayTeamId, 'w'); bump(g.homeTeamId, 'l'); }
    }

    const verified: number[] = [];
    const unverified: number[] = [];
    for (const [id, t] of teams) {
      const c = counts.get(id) ?? { w: 0, l: 0, d: 0 };
      const ok = !ambiguous.has(id) && Number.isFinite(t.w) && Number.isFinite(t.l) && Number.isFinite(t.d)
        && c.w === t.w && c.l === t.l && c.d === t.d;
      (ok ? verified : unverified).push(id);
    }

    const heading = $table.prevAll('h3').first().text().trim() || null;
    out.push({ divisionId, heading, games: [...games.values()], verifiedTeamIds: verified, unverifiedTeamIds: unverified });
  });

  return out;
}

interface ScoredResult { date: string; homeTeamId: number; awayTeamId: number; homeScore: number; awayScore: number }

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

/** Reads the "Results" table (class FTable) of a Spawtz division standings page: date header rows, then game rows with a score. */
function parseResultsSection($: cheerio.CheerioAPI): ScoredResult[] {
  const out: ScoredResult[] = [];
  $('table.FTable').each((_, table) => {
    let date: string | null = null;
    $(table).find('tr').each((__, tr) => {
      const $tr = $(tr);
      const head = $tr.find('td[colspan]').first().text().replace(/\s+/g, ' ').trim();
      const dm = head.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
      if (dm && $tr.hasClass('FHeader')) {
        const mm = MONTHS[dm[2].toLowerCase()];
        date = mm ? `${dm[3]}-${mm}-${dm[1].padStart(2, '0')}` : null;
        return;
      }
      const home = $tr.find('td.FHomeTeam a').first().attr('href')?.match(/TeamId=(\d+)/i);
      const away = $tr.find('td.FAwayTeam a').first().attr('href')?.match(/TeamId=(\d+)/i);
      const sc = $tr.find('td.FScore').first().text().replace(/\s+/g, ' ').trim().match(/^(\d{1,3}) - (\d{1,3})$/);
      if (!date || !home || !away || !sc) return;
      out.push({ date, homeTeamId: +home[1], awayTeamId: +away[1], homeScore: +sc[1], awayScore: +sc[2] });
    });
  });
  return out;
}
