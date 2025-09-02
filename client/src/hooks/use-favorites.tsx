import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FavoritesContextType = {
  favorites: string[];
  toggleFavorite: (bookId: string) => void;
  isFavorite: (bookId: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

const FAVORITES_STORAGE_KEY = "library-favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored);
        if (Array.isArray(parsedFavorites)) {
          setFavorites(parsedFavorites);
        }
      }
    } catch (error) {
      console.warn("Failed to load favorites from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn("Failed to save favorites to localStorage:", error);
    }
  }, [favorites]);

  const toggleFavorite = (bookId: string) => {
    setFavorites(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const isFavorite = (bookId: string) => {
    return favorites.includes(bookId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}