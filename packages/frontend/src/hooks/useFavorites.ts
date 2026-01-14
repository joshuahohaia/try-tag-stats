import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team } from '@trytag/shared';

interface FavoriteTeam {
  id: number;
  externalTeamId: number;
  name: string;
  leagueId?: number;
}

interface FavoritesStore {
  favorites: FavoriteTeam[];
  addTeam: (team: Team, leagueId?: number) => void;
  removeTeam: (teamId: number) => void;
  isFavorite: (teamId: number) => boolean;
  toggleFavorite: (team: Team, leagueId?: number) => void;
  hasTeamInLeague: (leagueId: number) => boolean;
}

const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],

      addTeam: (team, leagueId) => {
        const { favorites } = get();
        if (!favorites.some((t) => t.id === team.id)) {
          set({
            favorites: [...favorites, {
              id: team.id,
              externalTeamId: team.externalTeamId,
              name: team.name,
              leagueId,
            }],
          });
        } else if (leagueId) {
          // Update leagueId if team exists but didn't have one
          set({
            favorites: favorites.map((t) =>
              t.id === team.id && !t.leagueId ? { ...t, leagueId } : t
            ),
          });
        }
      },

      removeTeam: (teamId) => {
        set({
          favorites: get().favorites.filter((t) => t.id !== teamId),
        });
      },

      isFavorite: (teamId) => {
        return get().favorites.some((t) => t.id === teamId);
      },

      toggleFavorite: (team, leagueId) => {
        const { isFavorite, addTeam, removeTeam } = get();
        if (isFavorite(team.id)) {
          removeTeam(team.id);
        } else {
          addTeam(team, leagueId);
        }
      },

      hasTeamInLeague: (leagueId) => {
        return get().favorites.some((t) => t.leagueId === leagueId);
      },
    }),
    {
      name: 'trytag-favorites',
    }
  )
);

export function useFavoriteTeams() {
  const favorites = useFavoritesStore((state) => state.favorites);
  const addTeam = useFavoritesStore((state) => state.addTeam);
  const removeTeam = useFavoritesStore((state) => state.removeTeam);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const hasTeamInLeague = useFavoritesStore((state) => state.hasTeamInLeague);

  return {
    favorites,
    addTeam,
    removeTeam,
    isFavorite,
    toggleFavorite,
    hasTeamInLeague,
  };
}
