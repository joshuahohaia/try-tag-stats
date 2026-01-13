import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team } from '@trytag/shared';

interface FavoriteTeam {
  id: number;
  externalTeamId: number;
  name: string;
}

interface FavoritesStore {
  favorites: FavoriteTeam[];
  addTeam: (team: Team) => void;
  removeTeam: (teamId: number) => void;
  isFavorite: (teamId: number) => boolean;
  toggleFavorite: (team: Team) => void;
}

const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],

      addTeam: (team) => {
        const { favorites } = get();
        if (!favorites.some((t) => t.id === team.id)) {
          set({
            favorites: [...favorites, {
              id: team.id,
              externalTeamId: team.externalTeamId,
              name: team.name,
            }],
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

      toggleFavorite: (team) => {
        const { isFavorite, addTeam, removeTeam } = get();
        if (isFavorite(team.id)) {
          removeTeam(team.id);
        } else {
          addTeam(team);
        }
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

  return {
    favorites,
    addTeam,
    removeTeam,
    isFavorite,
    toggleFavorite,
  };
}
