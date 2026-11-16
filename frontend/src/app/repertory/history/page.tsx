"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Clock, Trash2, Pill, ChevronDown, ChevronUp,
  Loader2, X, Edit3, Save, Star, BookOpen, Database, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/useTranslation";
import { translateRepertory, toBengaliNumeral } from "@/i18n/repertoryBn";
import { AuthGuard } from "@/components/AuthGuard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useNeoAuth } from "@/hooks/useNeoAuth";
import { cn } from "@/lib/utils";

interface SavedSelection {
  symptomName: string;
  subSymptomName?: string;
  medicineCount: number;
  medicines: { name: string; rank: number }[];
}

interface SavedAgg { name: string; rank: number; count: number; }

interface RepertorySession {
  id: string;
  name: string;
  selections: SavedSelection[];
  aggregated: SavedAgg[];
  createdAt: string;
}

function timeAgo(ts: number, isBn: boolean): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isBn ? "এইমাত্র" : "Just now";
  if (mins < 60) return isBn ? `${toBengaliNumeral(mins)} মিনিট আগে` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isBn ? `${toBengaliNumeral(hrs)} ঘণ্টা আগে` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return isBn ? `${toBengaliNumeral(days)} দিন আগে` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return isBn ? `${toBengaliNumeral(months)} মাস আগে` : `${months}mo ago`;
}

export default function RepertoryHistoryPage() {
  return <AuthGuard><HistoryContent /></AuthGuard>;
}

function HistoryContent() {
  const { language } = useTranslation();
  const isBn = language === "bn";
  const bn = (s: string) => (isBn ? translateRepertory(s) : s);
  const num = (n: number) => (isBn ? toBengaliNumeral(n) : String(n));

  const { token } = useNeoAuth();
  const [sessions, setSessions] = useState<RepertorySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [query, setQuery] = useState("");

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/repertory-sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const deleteSession = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/repertory-sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  const renameSession = async (id: string, newName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/repertory-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name: newName } : s)));
      }
    } catch {}
  };

  const clearAll = async () => {
    if (!token) return;
    for (const s of sessions) await deleteSession(s.id);
    setSessions([]);
    setConfirmClear(false);
  };

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));
  const isEmpty = sessions.length === 0;

  // Search across session name, symptom/sub-symptom names, and aggregated medicine names.
  // Matches both English and Bengali forms so the same query works in either language.
  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    const hit = (s: string | undefined) => {
      if (!s) return false;
      return s.toLowerCase().includes(q) || bn(s).toLowerCase().includes(q);
    };
    return sessions.filter((session) => {
      if (hit(session.name)) return true;
      if ((session.selections || []).some((sel) => hit(sel.symptomName) || hit(sel.subSymptomName))) return true;
      if ((session.aggregated || []).some((med) => hit(med.name))) return true;
      return false;
    });
  }, [sessions, query, bn]);
  const noMatches = !isEmpty && filteredSessions.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 h-14 max-w-4xl mx-auto w-full">
          <Link href="/repertory" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Clock className="h-5 w-5 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">
              {isBn ? "রেপার্টরি ইতিহাস" : "Repertory History"}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {query.trim()
                ? isBn
                  ? `${toBengaliNumeral(filteredSessions.length)} / ${toBengaliNumeral(sessions.length)} সেশন`
                  : `${filteredSessions.length} / ${sessions.length} sessions`
                : isBn
                ? `${toBengaliNumeral(sessions.length)}টি সেশন`
                : `${sessions.length} sessions`}
            </p>
          </div>
          {!isEmpty && (
            confirmClear ? (
              <div className="flex items-center gap-1.5">
                <Button variant="destructive" size="sm" onClick={clearAll} className="text-xs h-7 px-2">
                  {isBn ? "নিশ্চিত" : "Confirm"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} className="text-xs h-7 px-2">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} className="gap-1.5 text-xs text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isBn ? "সব মুছুন" : "Clear All"}</span>
              </Button>
            )
          )}
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">{isBn ? "লোড হচ্ছে..." : "Loading..."}</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center text-center pt-16 animate-fade-in">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h2 className="text-lg font-semibold mb-2">
                {isBn ? "কোনো রেপার্টরি সেশন নেই" : "No Repertory Sessions"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {isBn ? "রেপার্টরিতে লক্ষণ নির্বাচন করলে স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।" : "Sessions are auto-saved when you select symptoms in the repertory."}
              </p>
              <Link href="/repertory">
                <Button className="gap-2 rounded-xl">
                  <BookOpen className="h-4 w-4" />
                  {isBn ? "রেপার্টরি খুলুন" : "Open Repertory"}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Search across sessions: name, symptoms/sub-symptoms, and top medicines */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isBn ? "নাম, লক্ষণ বা ওষুধ দিয়ে খুঁজুন..." : "Search by name, symptom, or medicine..."}
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                    aria-label={isBn ? "মুছুন" : "Clear"}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {noMatches ? (
                <div className="flex flex-col items-center text-center pt-12 animate-fade-in">
                  <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isBn ? "কোনো মিল পাওয়া যায়নি" : "No matches found"}
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <SwipeCard key={session.id} onSwipeDelete={() => deleteSession(session.id)}>
                    <SessionCard
                      session={session}
                      expanded={expandedId === session.id}
                      onToggle={() => toggle(session.id)}
                      onDelete={() => deleteSession(session.id)}
                      onRename={(n) => renameSession(session.id, n)}
                      isBn={isBn} bn={bn} num={num}
                    />
                  </SwipeCard>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Swipe-to-delete wrapper ─── */
function SwipeCard({ children, onSwipeDelete }: { children: React.ReactNode; onSwipeDelete: () => void }) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const threshold = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX;
    const dx = currentX.current - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -180));
  };

  const onTouchEnd = () => {
    setSwiping(false);
    if (offset < -threshold) setOffset(-180);
    else setOffset(0);
  };

  const confirmDelete = () => {
    setOffset(-9999);
    setTimeout(onSwipeDelete, 200);
  };

  const cancel = () => setOffset(0);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3 z-0">
        {offset <= -threshold && (
          <>
            <button onClick={confirmDelete} className="h-10 px-4 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium flex items-center gap-1.5 transition-all animate-fade-in">
              <Trash2 className="h-3.5 w-3.5" /> {/* Delete */}
            </button>
            <button onClick={cancel} className="h-10 px-3 rounded-lg bg-muted text-muted-foreground text-xs font-medium flex items-center transition-all animate-fade-in">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative z-10 bg-background transition-transform"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.25s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Session card ─── */
function SessionCard({ session, expanded, onToggle, onDelete, onRename, isBn, bn, num }: {
  session: RepertorySession; expanded: boolean; onToggle: () => void; onDelete: () => void;
  onRename: (name: string) => void; isBn: boolean; bn: (s: string) => string; num: (n: number) => string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const ts = new Date(session.createdAt).getTime();
  const sels = (session.selections || []) as SavedSelection[];
  const agg = (session.aggregated || []) as SavedAgg[];
  const topMed = agg[0]?.name || "—";

  return (
    <div className={cn("rounded-xl border transition-all animate-fade-in",
      expanded ? "border-primary/30 bg-card shadow-sm" : "border-border bg-card/50 hover:border-border/80"
    )}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Database className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{session.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground truncate">
              {bn(topMed)} — {num(sels.length)} {isBn ? "নির্বাচন" : "selections"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">{timeAgo(ts, isBn)}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3 animate-fade-in">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                className="flex-1 h-8 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => { if (e.key === "Enter" && editName.trim()) { onRename(editName.trim()); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
              />
              <Button size="sm" onClick={() => { onRename(editName.trim()); setEditing(false); }} className="h-8 px-2 text-xs"><Save className="h-3 w-3" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-8 px-2"><X className="h-3 w-3" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium flex-1">{session.name}</span>
              <Button variant="ghost" size="sm" onClick={() => { setEditName(session.name); setEditing(true); }} className="h-7 px-2 text-xs gap-1">
                <Edit3 className="h-3 w-3" /> {isBn ? "নাম পরিবর্তন" : "Rename"}
              </Button>
            </div>
          )}

          {/* Selections */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {isBn ? "নির্বাচিত লক্ষণ" : "Selected Symptoms"}
            </p>
            {sels.map((sel, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1">
                <span className="text-muted-foreground/50 w-4 text-right shrink-0">{num(i + 1)}</span>
                <span className="truncate">{bn(sel.symptomName)}{sel.subSymptomName ? ` > ${bn(sel.subSymptomName)}` : ""}</span>
                <Badge variant="secondary" className="text-[9px] shrink-0">{num(sel.medicineCount)}</Badge>
              </div>
            ))}
          </div>

          {/* Top medicines */}
          {agg.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {isBn ? "শীর্ষ ওষুধ" : "Top Medicines"}
                </span>
              </div>
              <div className="space-y-1.5">
                {agg.slice(0, 10).map((med, i) => (
                  <div key={med.name} className="flex items-center gap-2 text-[11px]">
                    <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                      i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>{num(i + 1)}</span>
                    <span className="font-medium truncate flex-1">{bn(med.name)}</span>
                    <span className="text-muted-foreground/60 shrink-0">{num(med.count)}x</span>
                    <div className="flex gap-0.5 shrink-0">
                      {Array.from({ length: Math.min(Math.ceil(med.rank / med.count), 5) }).map((_, j) => (
                        <Star key={j} className="h-2.5 w-2.5 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Link href="/repertory" className="flex-1">
              <Button size="sm" className="w-full gap-1.5 text-xs rounded-lg h-8">
                <BookOpen className="h-3 w-3" /> {isBn ? "নতুন সেশন" : "New Session"}
              </Button>
            </Link>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button variant="destructive" size="sm" onClick={onDelete} className="text-xs h-8 px-3 rounded-lg">
                  {isBn ? "নিশ্চিত" : "Confirm"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="h-8 px-2"><X className="h-3 w-3" /></Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} className="gap-1.5 text-xs h-8 rounded-lg text-destructive hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
