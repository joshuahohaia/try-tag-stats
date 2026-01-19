import { describe, it, expect } from 'vitest';
import { parseTeamProfile } from './team-profile.parser.js';

describe('Team Profile Parser', () => {
  describe('parseTeamProfile', () => {
    it('should parse fixture history from standard table format', () => {
      const html = `
        <html>
          <body>
            <h1>At least we try-ed</h1>
            <table>
              <tr>
                <td>Date</td>
                <td>Time</td>
                <td>Court</td>
                <td>Opposition</td>
                <td>Result</td>
              </tr>
              <tr>
                <td>Mon 24 Nov 2025</td>
                <td>21:16</td>
                <td>Pitch A</td>
                <td><a href="/Leagues/TeamProfile?TeamId=1234">Test Team</a></td>
                <td>8 - 10</td>
              </tr>
              <tr>
                <td>Mon 01 Dec 2025</td>
                <td>19:30</td>
                <td>Pitch B</td>
                <td><a href="/Leagues/TeamProfile?TeamId=5678">Another Team</a></td>
                <td>3 - 9</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = parseTeamProfile(html, 8024);

      expect(result.teamName).toBe('At least we try-ed');
      expect(result.fixtureHistory).toHaveLength(2);

      expect(result.fixtureHistory[0].date).toBe('2025-11-24');
      expect(result.fixtureHistory[0].homeScore).toBe(8);
      expect(result.fixtureHistory[0].awayScore).toBe(10);
      expect(result.fixtureHistory[0].awayTeamId).toBe(1234);
      expect(result.fixtureHistory[0].awayTeamName).toBe('Test Team');
      expect(result.fixtureHistory[0].status).toBe('completed');

      expect(result.fixtureHistory[1].date).toBe('2025-12-01');
      expect(result.fixtureHistory[1].awayTeamId).toBe(5678);
    });

    it('should parse scheduled fixtures without scores', () => {
      const html = `
        <html>
          <body>
            <h1>My Team</h1>
            <table>
              <tr>
                <td>Date</td>
                <td>Time</td>
                <td>Court</td>
                <td>Opposition</td>
                <td>Result</td>
              </tr>
              <tr>
                <td>Mon 19 Jan 2026</td>
                <td>20:00</td>
                <td>Pitch A</td>
                <td><a href="/Team.aspx?TeamId=999">Future Team</a></td>
                <td></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = parseTeamProfile(html, 100);

      expect(result.upcomingFixtures).toHaveLength(1);
      expect(result.upcomingFixtures[0].status).toBe('scheduled');
      expect(result.upcomingFixtures[0].homeScore).toBeNull();
      expect(result.upcomingFixtures[0].awayScore).toBeNull();
    });

    it('should skip tables without date and opposition headers', () => {
      const html = `
        <html>
          <body>
            <h1>My Team</h1>
            <table>
              <tr>
                <td>Player</td>
                <td>Awards</td>
              </tr>
              <tr>
                <td>John Doe</td>
                <td>5</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = parseTeamProfile(html, 100);

      expect(result.fixtureHistory).toHaveLength(0);
    });

    it('should handle th tags in headers', () => {
      const html = `
        <html>
          <body>
            <h1>Test Team</h1>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Court</th>
                  <th>Opposition</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>24 Nov 2025</td>
                  <td>19:00</td>
                  <td>Pitch 1</td>
                  <td><a href="/Team?TeamId=123">Opponent</a></td>
                  <td>5 - 3</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const result = parseTeamProfile(html, 50);

      expect(result.fixtureHistory).toHaveLength(1);
      expect(result.fixtureHistory[0].date).toBe('2025-11-24');
      expect(result.fixtureHistory[0].homeScore).toBe(5);
      expect(result.fixtureHistory[0].awayScore).toBe(3);
    });
  });
});
