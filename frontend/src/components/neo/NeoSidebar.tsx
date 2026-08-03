"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ChevronRight, BookmarkIcon, History, Clock, Pill, Layers, FolderOpen, Stethoscope, Loader2, Trash2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n/useTranslation";
import { useNeoBookmarks } from "@/hooks/useNeoBookmarks";
import { neoApi } from "@/lib/neoApi";
import type { NeoRepertorySummary } from "@/lib/neoApi";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { translateRepertory, toBengaliNumeral } from "@/i18n/repertoryBn";
import type { NeoHistoryEntry } from "@/context/NeoExplorerContext";

interface NeoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeChapter: string | null;
  onSelectChapter: (id: string) => void;
  onSelectSymptom: (id: string) => void;
  history?: NeoHistoryEntry[];
  onRestoreHistory?: (entry: NeoHistoryEntry) => void;
  onDeleteHistory?: (id: string) => void;
  onClearHistory?: () => void;
}

type ChildItem = { id: string; name: string; [key: string]: unknown };

function SwipeItem({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const threshold = 55;

  return (
    <div className="relative overflow-hidden rounded-md">
      <div className="absolute inset-y-0 right-0 flex items-center z-0">
        {offset <= -threshold && (
          <button
            onClick={() => { setOffset(0); onDelete(); }}
            className="h-full px-3 bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center gap-1 animate-fade-in"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; setSwiping(true); }}
        onTouchMove={(e) => { if (!swiping) return; const dx = e.touches[0].clientX - startX.current; if (dx < 0) setOffset(Math.max(dx, -90)); }}
        onTouchEnd={() => { setSwiping(false); setOffset(offset < -threshold ? -90 : 0); }}
        className="relative z-10 bg-background"
        style={{ transform: `translateX(${offset}px)`, transition: swiping ? "none" : "transform 0.2s ease-out" }}
      >
        {children}
      </div>
    </div>
  );
}

function formatTimestamp(ts: string, language: string) {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (language === "bn") {
      if (mins < 1) return "এইমাত্র";
      if (mins < 60) return `${mins} মিনিট আগে`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days} দিন আগে`;
      return d.toLocaleDateString("bn-BD");
    }
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return ts;
  }
}

export function NeoSidebar({
  isOpen,
  onClose,
  activeChapter,
  onSelectChapter,
  onSelectSymptom,
  history = [],
  onRestoreHistory,
  onDeleteHistory,
  onClearHistory,
}: NeoSidebarProps) {
  const { t, language } = useTranslation();
  const { bookmarks, removeBookmark, clearAll: clearAllBookmarks } = useNeoBookmarks();
  const [repertories, setRepertories] = useState<NeoRepertorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [expandedCond, setExpandedCond] = useState<string | null>(null);
  const [expandedSym, setExpandedSym] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [filter, setFilter] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");

  const [childrenCache, setChildrenCache] = useState<Record<string, ChildItem[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const isBn = language === "bn";
  const tr = useCallback((s: string) => (isBn ? translateRepertory(s) : s), [isBn]);
  const num = (n: number) => (isBn ? toBengaliNumeral(n) : String(n));

  useEffect(() => {
    neoApi.getSymptoms().then((data) => {
      setRepertories(data.chapters);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sortedReps = useMemo(() => {
    const locale = isBn ? "bn" : "en";
    const items = repertories.map((r) => ({ ...r, _sort: tr(r.name) }));
    items.sort((a, b) => a._sort.localeCompare(b._sort, locale));
    if (!filter) return items;
    const fl = filter.toLowerCase();
    return items.filter((r) => r._sort.toLowerCase().includes(fl));
  }, [repertories, isBn, filter, tr]);

  // Filter history by top remedy name + any symptom name (both raw and translated forms).
  const filteredHistory = useMemo(() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return history;
    return history.filter((entry) => {
      if ((entry.topRemedy || "").toLowerCase().includes(q)) return true;
      if (tr(entry.topRemedy || "").toLowerCase().includes(q)) return true;
      return entry.symptoms.some(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          tr(s.name || "").toLowerCase().includes(q)
      );
    });
  }, [history, historyFilter, tr]);

  const sortChildren = useCallback((items: ChildItem[]): (ChildItem & { _sort: string })[] => {
    const locale = isBn ? "bn" : "en";
    const mapped = items.map((c) => ({ ...c, _sort: tr(c.name) }));
    mapped.sort((a, b) => a._sort.localeCompare(b._sort, locale));
    return mapped;
  }, [isBn, tr]);

  const fetchChildren = useCallback(async (parentId: string) => {
    if (childrenCache[parentId]) return;
    setLoadingId(parentId);
    try {
      const data = await neoApi.getChildren(parentId);
      setChildrenCache((prev) => ({ ...prev, [parentId]: data.children as ChildItem[] }));
    } catch { /* ignore */ }
    setLoadingId(null);
  }, [childrenCache]);

  const handleRepClick = (id: string) => {
    const next = expandedRep === id ? null : id;
    setExpandedRep(next);
    setExpandedCond(null);
    setExpandedSym(null);
    onSelectChapter(id);
    if (next) fetchChildren(id);
  };

  const handleCondClick = (id: string) => {
    const next = expandedCond === id ? null : id;
    setExpandedCond(next);
    setExpandedSym(null);
    onSelectSymptom(id);
    if (next) fetchChildren(id);
  };

  const handleSymClick = (id: string, hasSubs: boolean) => {
    if (hasSubs) {
      const next = expandedSym === id ? null : id;
      setExpandedSym(next);
      if (next) fetchChildren(id);
    }
    onSelectSymptom(id);
  };

  const handleSubClick = (id: string) => {
    onSelectSymptom(id);
    if (window.innerWidth < 1024) onClose();
  };

  const LoadingDots = () => (
    <div className="flex items-center gap-1 px-3 py-1.5">
      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground">{t("common.loading")}</span>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-72 border-r border-border bg-background transition-transform duration-200 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <ScrollArea className="h-full">
          <div className="p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Layers className="h-3 w-3" />
              {t("repertory.repertories")} ({num(repertories.length)})
            </div>

            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("symptom.filterChapters")}
              className="w-full px-2 py-1.5 mb-2 text-xs rounded border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : (
              <nav className="space-y-0.5">
                {sortedReps.map((rep) => {
                  const isRepExpanded = expandedRep === rep.id;
                  const conditions = childrenCache[rep.id] ? sortChildren(childrenCache[rep.id]) : null;

                  return (
                    <div key={rep.id}>
                      <button
                        onClick={() => handleRepClick(rep.id)}
                        className={cn(
                          "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded transition-colors",
                          activeChapter === rep.id
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <span className="truncate flex items-center gap-1.5 min-w-0 flex-1">
                          <Layers className="h-3 w-3 shrink-0 opacity-50" />
                          <span className="truncate">{rep._sort}</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground tabular-nums">{num(rep.conditionCount)}</span>
                          <ChevronRight className={cn("h-3 w-3 transition-transform", isRepExpanded && "rotate-90")} />
                        </div>
                      </button>

                      {isRepExpanded && (
                        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-1.5 animate-fade-in">
                          {loadingId === rep.id && !conditions && <LoadingDots />}
                          {conditions?.map((cond) => {
                            const isCondExpanded = expandedCond === cond.id;
                            const symptoms = childrenCache[cond.id] ? sortChildren(childrenCache[cond.id]) : null;

                            return (
                              <div key={cond.id}>
                                <button
                                  onClick={() => handleCondClick(cond.id)}
                                  className={cn(
                                    "flex items-center justify-between w-full px-2 py-1 text-xs rounded transition-colors",
                                    expandedCond === cond.id
                                      ? "bg-accent/80 text-accent-foreground font-medium"
                                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                                  )}
                                >
                                  <span className="truncate flex items-center gap-1.5 min-w-0 flex-1">
                                    <FolderOpen className="h-2.5 w-2.5 shrink-0 opacity-50" />
                                    <span className="truncate">{cond._sort}</span>
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {typeof cond.symptomCount === "number" && (
                                      <span className="text-[9px] text-muted-foreground tabular-nums">{num(cond.symptomCount as number)}</span>
                                    )}
                                    <ChevronRight className={cn("h-2.5 w-2.5 transition-transform", isCondExpanded && "rotate-90")} />
                                  </div>
                                </button>

                                {isCondExpanded && (
                                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/60 pl-1.5 animate-fade-in">
                                    {loadingId === cond.id && !symptoms && <LoadingDots />}
                                    {symptoms?.map((sym) => {
                                      const hasSubs = !!(sym.hasSubSymptoms || (sym.subSymptomCount as number) > 0);
                                      const isSymExpanded = expandedSym === sym.id;
                                      const subs = childrenCache[sym.id] ? sortChildren(childrenCache[sym.id]) : null;

                                      return (
                                        <div key={sym.id}>
                                          <button
                                            onClick={() => handleSymClick(sym.id, hasSubs)}
                                            className={cn(
                                              "flex items-center justify-between w-full px-1.5 py-0.5 text-[11px] rounded transition-colors",
                                              "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                                            )}
                                          >
                                            <span className="truncate flex items-center gap-1 min-w-0 flex-1">
                                              <Stethoscope className="h-2.5 w-2.5 shrink-0 opacity-40" />
                                              <span className="truncate">{sym._sort}</span>
                                            </span>
                                            {hasSubs && (
                                              <ChevronRight className={cn("h-2.5 w-2.5 shrink-0 transition-transform", isSymExpanded && "rotate-90")} />
                                            )}
                                          </button>

                                          {isSymExpanded && hasSubs && (
                                            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/40 pl-1.5 animate-fade-in">
                                              {loadingId === sym.id && !subs && <LoadingDots />}
                                              {subs?.map((sub) => (
                                                <button
                                                  key={sub.id}
                                                  onClick={() => handleSubClick(sub.id)}
                                                  className="block w-full text-left px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-accent/25 truncate transition-colors"
                                                >
                                                  {sub._sort}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            )}

            {bookmarks.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BookmarkIcon className="h-3 w-3" />
                    {t("nav.bookmarks")} ({num(bookmarks.length)})
                  </h2>
                  <button
                    onClick={clearAllBookmarks}
                    className="text-[10px] text-destructive/70 hover:text-destructive flex items-center gap-0.5 transition-colors"
                    title={isBn ? "সব মুছুন" : "Delete all"}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    <span>{isBn ? "সব মুছুন" : "Clear"}</span>
                  </button>
                </div>
                <div className="space-y-0.5">
                  {bookmarks.map((b) => (
                    <SwipeItem key={b.id} onDelete={() => removeBookmark(b.id)}>
                      <button
                        onClick={() => onSelectSymptom(b.id)}
                        className="block w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent/50 truncate"
                      >
                        {tr(b.name)}
                      </button>
                    </SwipeItem>
                  ))}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    <History className="h-3 w-3" />
                    {t("history.title")} (
                    {historyFilter.trim()
                      ? `${num(filteredHistory.length)}/${num(history.length)}`
                      : num(history.length)}
                    )
                    <ChevronRight className={cn("h-3 w-3 transition-transform", showHistory && "rotate-90")} />
                  </button>
                  {showHistory && onClearHistory && (
                    <button
                      onClick={onClearHistory}
                      className="text-[10px] text-destructive/70 hover:text-destructive flex items-center gap-0.5 transition-colors"
                      title={isBn ? "সব মুছুন" : "Delete all"}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      <span>{isBn ? "সব মুছুন" : "Clear"}</span>
                    </button>
                  )}
                </div>

                {showHistory && (
                  <div className="animate-fade-in">
                    {/* Search input — always visible so users can narrow long histories */}
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        placeholder={t("history.searchPlaceholder")}
                        className="w-full h-7 pl-7 pr-6 rounded-md border border-border bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      {historyFilter && (
                        <button
                          onClick={() => setHistoryFilter("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground"
                          aria-label="Clear search"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {filteredHistory.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-3">
                        {t("history.noMatches")}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 -mr-1">
                        {filteredHistory.map((entry) => (
                          <SwipeItem key={entry.id} onDelete={() => onDeleteHistory?.(entry.id)}>
                            <button
                              onClick={() => onRestoreHistory?.(entry)}
                              className="w-full text-left p-2 rounded border border-border hover:border-foreground/20 hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <Pill className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-[11px] font-medium truncate">{tr(entry.topRemedy)}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {entry.symptoms.slice(0, 3).map((s) => (
                                  <span key={s.id} className="text-[9px] px-1 py-0.5 bg-secondary rounded truncate max-w-[100px]">
                                    {tr(s.name)}
                                  </span>
                                ))}
                                {entry.symptoms.length > 3 && (
                                  <span className="text-[9px] text-muted-foreground">+{num(entry.symptoms.length - 3)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {formatTimestamp(entry.timestamp, language)}
                              </div>
                            </button>
                          </SwipeItem>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
