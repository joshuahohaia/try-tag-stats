import { describe, it, expect } from 'vitest';
import { parseStandings } from './standings.parser.js';

describe('Standings Parser', () => {
  describe('parseStandings', () => {
    it('should parse a valid standings table', () => {
      const html = `
        <html>
          <head><title>Division A - Standings</title></head>
          <body>
            <h1>Division A</h1>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Pld</th>
                  <th>W</th>
                  <th>L</th>
                  <th>D</th>
                  <th>FF</th>
                  <th>FA</th>
                  <th>F</th>
                  <th>A</th>
                  <th>Dif</th>
                  <th>B</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><a href="/Team.aspx?TeamId=123">Team Alpha</a></td>
                  <td>10</td>
                  <td>8</td>
                  <td>1</td>
                  <td>1</td>
                  <td>0</td>
                  <td>0</td>
                  <td>150</td>
                  <td>80</td>
                  <td>70</td>
                  <td>5</td>
                  <td>30</td>
                </tr>
                <tr>
                  <td><a href="/Team.aspx?TeamId=456">Team Beta</a></td>
                  <td>10</td>
                  <td>6</td>
                  <td>3</td>
                  <td>1</td>
                  <td>0</td>
                  <td>0</td>
                  <td>120</td>
                  <td>100</td>
                  <td>20</td>
                  <td>3</td>
                  <td>22</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const result = parseStandings(html);

      expect(result.divisionName).toBe('Division A');
      expect(result.standings).toHaveLength(2);

      expect(result.standings[0]).toEqual({
        position: 1,
        teamId: 123,
        teamName: 'Team Alpha',
        played: 10,
        wins: 8,
        losses: 1,
        draws: 1,
        forfeitsFor: 0,
        forfeitsAgainst: 0,
        pointsFor: 150,
        pointsAgainst: 80,
        pointDifference: 70,
        bonusPoints: 5,
        totalPoints: 30,
      });

      expect(result.standings[1]).toEqual({
        position: 2,
        teamId: 456,
        teamName: 'Team Beta',
        played: 10,
        wins: 6,
        losses: 3,
        draws: 1,
        forfeitsFor: 0,
        forfeitsAgainst: 0,
        pointsFor: 120,
        pointsAgainst: 100,
        pointDifference: 20,
        bonusPoints: 3,
        totalPoints: 22,
      });
    });

    it('should handle empty table', () => {
      const html = `
        <html>
          <body>
            <table>
              <thead>
                <tr><th>Team</th><th>Pts</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </body>
        </html>
      `;

      const result = parseStandings(html);

      expect(result.standings).toHaveLength(0);
    });

    it('should skip rows without team ID', () => {
      const html = `
        <html>
          <body>
            <h1>Test Division</h1>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Pld</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Team Without Link</td>
                  <td>5</td>
                  <td>10</td>
                </tr>
                <tr>
                  <td><a href="/Team.aspx?TeamId=789">Valid Team</a></td>
                  <td>5</td>
                  <td>15</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const result = parseStandings(html);

      // Only the valid team should be parsed
      expect(result.standings).toHaveLength(1);
      expect(result.standings[0].teamId).toBe(789);
    });

    it('should handle alternative header names', () => {
      // Parser requires both "team" (or "name") AND "pts" (or "points") in headers
      const html = `
        <html>
          <body>
            <h1>League Table</h1>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Played</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Drawn</th>
                  <th>For</th>
                  <th>Against</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><a href="/Team.aspx?TeamId=100">Test Team</a></td>
                  <td>8</td>
                  <td>5</td>
                  <td>2</td>
                  <td>1</td>
                  <td>100</td>
                  <td>50</td>
                  <td>16</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const result = parseStandings(html);

      expect(result.standings).toHaveLength(1);
      expect(result.standings[0].played).toBe(8);
      expect(result.standings[0].wins).toBe(5);
      expect(result.standings[0].losses).toBe(2);
      expect(result.standings[0].draws).toBe(1);
    });

    it('should extract division name from title if no heading', () => {
      const html = `
        <html>
          <head><title>Summer League - Results</title></head>
          <body>
            <table>
              <tr><th>Team</th><th>Pts</th></tr>
            </table>
          </body>
        </html>
      `;

      const result = parseStandings(html);

      expect(result.divisionName).toBe('Summer League');
    });
  });
});
