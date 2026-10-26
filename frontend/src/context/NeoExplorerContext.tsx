"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { RankingResult, AIAnalysis } from "@/lib/types";

const STORAGE_KEY = "neoai-explorer-state";
const HISTORY_KEY = "neoai-history";

export interface NeoHistoryEntry {
  id: string;
  symptoms: { id: string; name: string }[];
  ranking: RankingResult | null;
  aiAnalysis: AIAnalysis | null;
  topRemedy: string;
  timestamp: string;
}

interface NeoExplorerState {
  selectedSymptoms: { id: string; name: string }[];
  activeChapter: string | null;
  selectedSymptomId: string | null;
  ranking: RankingResult | null;
  aiAnalysis: AIAnalysis | null;
}

interface NeoExplorerContextValue extends NeoExplorerState {
  setSelectedSymptoms: (s: { id: string; name: string }[]) => void;
  toggleSymptom: (id: string, name: string) => void;
  removeSymptom: (id: string) => void;
  clearSymptoms: () => void;
  setActiveChapter: (id: string | null) => void;
  setSelectedSymptomId: (id: string | null) => void;
  setRanking: (r: RankingResult | null) => void;
  setAiAnalysis: (a: AIAnalysis | null) => void;
  saveToHistory: () => void;
  history: NeoHistoryEntry[];
  restoreHistory: (entry: NeoHistoryEntry) => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
}

const NeoExplorerContext = createContext<NeoExplorerContextValue | null>(null);

export function NeoExplorerProvider({ children }: { children: ReactNode }) {
  const [selectedSymptoms, setSelectedSymptomsRaw] = useState<{ id: string; name: string }[]>([]);
  const [activeChapter, setActiveChapterRaw] = useState<string | null>(null);
  const [selectedSymptomId, setSelectedSymptomIdRaw] = useState<string | null>(null);
  const [ranking, setRankingRaw] = useState<RankingResult | null>(null);
  const [aiAnalysis, setAiAnalysisRaw] = useState<AIAnalysis | null>(null);
  const [history, setHistory] = useState<NeoHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const stateCacheRef = useRef<Partial<NeoExplorerState>>({});
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        stateCacheRef.current = parsed;
        if (Array.isArray(parsed.selectedSymptoms)) {
          setSelectedSymptomsRaw(
            parsed.selectedSymptoms
              .filter(Boolean)
              .map((s: { id?: string; name?: string } | string) =>
                typeof s === "string"
                  ? { id: s, name: s }
                  : { id: s.id || "", name: s.name || s.id || "" }
              )
              .filter((s: { id: string }) => s.id)
          );
        }
        if (typeof parsed.activeChapter === "string") setActiveChapterRaw(parsed.activeChapter);
        if (typeof parsed.selectedSymptomId === "string") setSelectedSymptomIdRaw(parsed.selectedSymptomId);
        if (parsed.ranking && Array.isArray(parsed.ranking.rankedRemedies)) {
          setRankingRaw(parsed.ranking);
        }
        if (parsed.aiAnalysis && typeof parsed.aiAnalysis === "object") {
          setAiAnalysisRaw(parsed.aiAnalysis);
        }
      }
      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) {
        const parsedHist = JSON.parse(hist);
        if (Array.isArray(parsedHist)) setHistory(parsedHist);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const persist = useCallback((state: Partial<NeoExplorerState>) => {
    Object.assign(stateCacheRef.current, state);
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateCacheRef.current));
      } catch {
        /* storage full */
      }
    }, 400);
  }, []);

  const setSelectedSymptoms = useCallback((s: { id: string; name: string }[]) => {
    setSelectedSymptomsRaw(s);
    persist({ selectedSymptoms: s });
  }, [persist]);

  const toggleSymptom = useCallback((id: string, name: string) => {
    setSelectedSymptomsRaw((prev) => {
      const exists = prev.find((s) => s.id === id);
      const next = exists ? prev.filter((s) => s.id !== id) : [...prev, { id, name }];
      persist({ selectedSymptoms: next });
      return next;
    });
  }, [persist]);

  const removeSymptom = useCallback((id: string) => {
    setSelectedSymptomsRaw((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist({ selectedSymptoms: next });
      return next;
    });
  }, [persist]);

  const clearSymptoms = useCallback(() => {
    setSelectedSymptomsRaw([]);
    setRankingRaw(null);
    setAiAnalysisRaw(null);
    persist({ selectedSymptoms: [], ranking: null, aiAnalysis: null });
  }, [persist]);

  const setActiveChapter = useCallback((id: string | null) => {
    setActiveChapterRaw(id);
    persist({ activeChapter: id });
  }, [persist]);

  const setSelectedSymptomId = useCallback((id: string | null) => {
    setSelectedSymptomIdRaw(id);
    persist({ selectedSymptomId: id });
  }, [persist]);

  const setRanking = useCallback((r: RankingResult | null) => {
    setRankingRaw(r);
    persist({ ranking: r });
  }, [persist]);

  const setAiAnalysis = useCallback((a: AIAnalysis | null) => {
    setAiAnalysisRaw(a);
    persist({ aiAnalysis: a });
  }, [persist]);

  const saveToHistory = useCallback(() => {
    if (selectedSymptoms.length === 0) return;
    const topRemedy = ranking?.rankedRemedies?.[0]?.name || aiAnalysis?.remedies?.[0]?.name || "—";
    const lightweightRanking = ranking
      ? {
          ...ranking,
          rankedRemedies: (ranking.rankedRemedies || []).slice(0, 15).map((r) => ({
            ...r,
            coverageDetails: Array.isArray(r?.coverageDetails) ? r.coverageDetails.slice(0, 10) : [],
          })),
        }
      : null;
    const entry: NeoHistoryEntry = {
      id: Date.now().toString(36),
      symptoms: [...selectedSymptoms],
      ranking: lightweightRanking,
      aiAnalysis,
      topRemedy,
      timestamp: new Date().toISOString(),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 30);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, [selectedSymptoms, ranking, aiAnalysis]);

  const restoreHistory = useCallback((entry: NeoHistoryEntry) => {
    setSelectedSymptomsRaw(entry.symptoms);
    setRankingRaw(entry.ranking);
    setAiAnalysisRaw(entry.aiAnalysis);
    persist({ selectedSymptoms: entry.symptoms, ranking: entry.ranking, aiAnalysis: entry.aiAnalysis });
  }, [persist]);

  const deleteHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* */ }
  }, []);

  if (!hydrated) return null;

  return (
    <NeoExplorerContext.Provider
      value={{
        selectedSymptoms, activeChapter, selectedSymptomId, ranking, aiAnalysis,
        setSelectedSymptoms, toggleSymptom, removeSymptom, clearSymptoms,
        setActiveChapter, setSelectedSymptomId, setRanking, setAiAnalysis,
        saveToHistory, history, restoreHistory, deleteHistory, clearHistory,
      }}
    >
      {children}
    </NeoExplorerContext.Provider>
  );
}

export function useNeoExplorer() {
  const ctx = useContext(NeoExplorerContext);
  if (!ctx) throw new Error("useNeoExplorer must be used within NeoExplorerProvider");
  return ctx;
}
