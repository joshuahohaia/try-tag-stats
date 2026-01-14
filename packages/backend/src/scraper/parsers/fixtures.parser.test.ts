import { describe, it, expect } from 'vitest';
import { parseFixtures } from './fixtures.parser.js';

describe('Fixtures Parser', () => {
  describe('parseFixtures', () => {
    it('should parse fixtures from a table', () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td colspan="4">Monday 20 Jan 2025</td>
              </tr>
              <tr>
                <td>7:00</td>
                <td><a href="/Team.aspx?TeamId=100">Team Alpha</a></td>
                <td>vs</td>
                <td><a href="/Team.aspx?TeamId=200">Team Beta</a></td>
                <td>Pitch A</td>
              </tr>
              <tr>
                <td>7:30</td>
                <td><a href="/Team.aspx?TeamId=300">Team Gamma</a></td>
                <td>3 - 2</td>
                <td><a href="/Team.aspx?TeamId=400">Team Delta</a></td>
                <td>Pitch B</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = parseFixtures(html);

      expect(result.fixtures).toHaveLength(2);

      // First fixture - scheduled
      expect(result.fixtures[0].homeTeamId).toBe(100);
      expect(result.fixtures[0].homeTeamName).toBe('Team Alpha');
      expect(result.fixtures[0].awayTeamId).toBe(200);
      expect(result.fixtures[0].awayTeamName).toBe('Team Beta');
      expect(result.fixtures[0].date).toBe('2025-01-20');
      expect(result.fixtures[0].time).toBe('07:00');
      expect(result.fixtures[0].status).toBe('scheduled');

      // Second fixture - completed with score
      expect(result.fixtures[1].homeTeamId).toBe(300);
      expect(result.fixtures[1].awayTeamId).toBe(400);
      expect(result.fixtures[1].homeScore).toBe(3);
      expect(result.fixtures[1].awayScore).toBe(2);
      expect(result.fixtures[1].status).toBe('completed');
    });

    it('should handle fixtures with data attributes for scores', () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td colspan="4">Saturday 25 Jan 2025</td>
              </tr>
              <tr>
                <td><a href="/Team.aspx?TeamId=111">Home Team</a></td>
                <td>
                  <span data-home-score-for-fixture="5"></span>
                  <span data-away-score-for-fixture="3"></span>
                </td>
                <td><a href="/Team.aspx?TeamId=222">Away Team</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = parseFixtures(html);

      expect(result.fixtures).toHaveLength(1);
      expect(result.fixtures[0].homeScore).toBe(5);
      expect(result.fixtures[0].awayScore).toBe(3);
      expect(result.fixtures[0].status).toBe('completed');
    });

    it('should skip rows without valid team links', () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td>Monday 20 Jan 2025</td>
              </tr>
              <tr>
                <td>Header Row</td>
              </tr>
              <tr>
                <td><a href="/Team.aspx?TeamId=100">Only One Team</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = parseFixtures(html);

      expect(result.fixtures).toHaveLength(0);
    });

    it('should skip fixtures where home and away are the same team', () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td>Monday 20 Jan 2025</td>
              </tr>
              <tr>
                <td><a href="/Team.aspx?TeamId=100">Same Team</a></td>
                <td>vs</td>
                <td><a href="/Team.aspx?TeamId=100">Same Team</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = parseFixtures(html);

      expect(result.fixtures).toHaveLength(0);
    });

    it('should handle empty HTML', () => {
      const html = '<html><body></body></html>';

      const result = parseFixtures(html);

      expect(result.fixtures).toHaveLength(0);
    });

    it('should parse div-based fixtures as fallback', () => {
      const html = `
        <html>
          <body>
            <div class="fixture">
              <span>25 Jan 2025</span>
              <span>19:00</span>
              <a href="/Team.aspx?TeamId=500">Div Team A</a>
              vs
              <a href="/Team.aspx?TeamId=600">Div Team B</a>
            </div>
          </body>
        </html>
      `;

      const result = parseFixtures(html);

      expect(result.fixtures).toHaveLength(1);
      expect(result.fixtures[0].homeTeamId).toBe(500);
      expect(result.fixtures[0].awayTeamId).toBe(600);
      expect(result.fixtures[0].date).toBe('2025-01-25');
      expect(result.fixtures[0].time).toBe('19:00');
    });

    it('should parse various date formats', () => {
      const testCases = [
        { date: 'Monday 5 Feb 2025', expected: '2025-02-05' },
        { date: 'Wednesday 15 Mar 2025', expected: '2025-03-15' },
        { date: 'Sunday 1 Dec 2025', expected: '2025-12-01' },
      ];

      for (const { date, expected } of testCases) {
        const html = `
          <html>
            <body>
              <table>
                <tr><td>${date}</td></tr>
                <tr>
                  <td><a href="/Team.aspx?TeamId=1">A</a></td>
                  <td><a href="/Team.aspx?TeamId=2">B</a></td>
                </tr>
              </table>
            </body>
          </html>
        `;

        const result = parseFixtures(html);
        expect(result.fixtures[0]?.date).toBe(expected);
      }
    });
  });
});
