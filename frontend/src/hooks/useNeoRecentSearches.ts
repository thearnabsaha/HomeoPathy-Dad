"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "neoai-recent-searches";
const MAX_ITEMS = 10;

export function useNeoRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSearches(parsed.filter((s) => typeof s === "string"));
      }
    } catch {}
  }, []);

  const addSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const updated = [trimmed, ...searches.filter((s) => s !== trimmed)].slice(0, MAX_ITEMS);
      setSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [searches]
  );

  const clearSearches = useCallback(() => {
    setSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { searches, addSearch, clearSearches };
}
