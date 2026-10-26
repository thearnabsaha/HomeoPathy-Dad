"use client";

import { useState, useCallback, useEffect } from "react";

interface Bookmark {
  id: string;
  name: string;
  type: "symptom" | "remedy";
  timestamp: number;
}

const STORAGE_KEY = "neoai-bookmarks";

export function useNeoBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setBookmarks(parsed.filter((b) => b && typeof b.id === "string"));
        }
      }
    } catch {}
  }, []);

  const save = useCallback((items: Bookmark[]) => {
    setBookmarks(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addBookmark = useCallback(
    (id: string, name: string, type: "symptom" | "remedy") => {
      if (bookmarks.some((b) => b.id === id)) return;
      save([...bookmarks, { id, name, type, timestamp: Date.now() }]);
    },
    [bookmarks, save]
  );

  const removeBookmark = useCallback(
    (id: string) => {
      save(bookmarks.filter((b) => b.id !== id));
    },
    [bookmarks, save]
  );

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (id: string, name: string, type: "symptom" | "remedy") => {
      if (isBookmarked(id)) {
        removeBookmark(id);
      } else {
        addBookmark(id, name, type);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  const clearAll = useCallback(() => {
    save([]);
  }, [save]);

  return { bookmarks, addBookmark, removeBookmark, isBookmarked, toggleBookmark, clearAll };
}
