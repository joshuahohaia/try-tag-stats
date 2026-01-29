import type { PlayerAwardWithDetails } from '@trytag/shared';

/**
 * Calculates the rank for each player based on their award count.
 * Players with the same award count receive the same rank.
 *
 * @param statistics - Array of player award details.
 * @returns A Map where keys are player IDs and values are their ranks.
 */
export function calculateAwardPositions(
  statistics: PlayerAwardWithDetails[]
): Map<number, number> {
  const positions = new Map<number, number>();
  if (!statistics || statistics.length === 0) {
    return positions;
  }

  // Get unique award counts in descending order
  const uniqueCounts = [...new Set(statistics.map((s) => s.awardCount))].sort(
    (a, b) => b - a
  );

  // Create a map of award count to rank
  const countToPosition = new Map<number, number>();
  uniqueCounts.forEach((count, index) => {
    countToPosition.set(count, index + 1);
  });

  // Assign rank to each player
  statistics.forEach((stat) => {
    const rank = countToPosition.get(stat.awardCount);
    if (rank) {
      positions.set(stat.player.id, rank);
    }
  });

  return positions;
}
