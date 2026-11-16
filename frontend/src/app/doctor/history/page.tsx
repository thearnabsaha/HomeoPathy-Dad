"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, Trash2, Pill, HeartPulse, ChevronDown, ChevronUp,
  Activity, ShieldAlert, Sparkles, CheckCircle2, X, Edit3, Save,
  Loader2, LogIn, Database, HardDrive, MessageCircle, Check,
  RotateCcw, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { useTranslation } from "@/i18n/useTranslation";
import { translateRepertory, toBengaliNumeral } from "@/i18n/repertoryBn";
import { AuthGuard } from "@/components/AuthGuard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useNeoDoctorHistory, DoctorHistoryEntry } from "@/hooks/useNeoDoctorHistory";
import { useNeoAuth } from "@/hooks/useNeoAuth";
import { cn } from "@/lib/utils";

interface SavedQuestionEntry {
  id: string;
  text: string;
  type: "yesno" | "scale" | "select";
  options: { value: string; label: string }[];
  selectedValue: string;
}

interface SavedRound {
  round: number;
  questions: SavedQuestionEntry[];
}

interface SavedCycle {
  complaint: string;
  rounds: SavedRound[];
}

interface DbConsultation {
  id: string;
  name: string;
  complaints: string[];
  cycles: SavedCycle[];
  recommendation: DoctorHistoryEntry["recommendation"];
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

export default function DoctorHistoryPage() {
  return <AuthGuard><HistoryContent /></AuthGuard>;
}

function HistoryContent() {
  const { t, language } = useTranslation();
  const isBn = language === "bn";
  const bn = (s: string) => (isBn ? translateRepertory(s) : s);
  const num = (n: number) => (isBn ? toBengaliNumeral(n) : String(n));

  const { user, token } = useNeoAuth();
  const { entries: localEntries, removeEntry: removeLocal, clearAll: clearLocal } = useNeoDoctorHistory();

  const [dbEntries, setDbEntries] = useState<DbConsultation[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [tab, setTab] = useState<"cloud" | "local">(user ? "cloud" : "local");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchDb = useCallback(async () => {
    if (!token) return;
    setDbLoading(true);
    try {
      const res = await fetch("/api/consultations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDbEntries(data.consultations || []);
      }
    } catch {}
    setDbLoading(false);
  }, [token]);

  useEffect(() => {
    if (user && token) { setTab("cloud"); fetchDb(); }
    else setTab("local");
  }, [user, token, fetchDb]);

  const deleteDb = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/consultations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {}
  };

  const renameDb = async (id: string, newName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setDbEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name: newName } : e)));
      }
    } catch {}
  };

  const clearDbAll = async () => {
    if (!token) return;
    for (const e of dbEntries) await deleteDb(e.id);
    setDbEntries([]);
    setConfirmClear(false);
  };

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const showingCloud = tab === "cloud" && user;
  const currentEntries = showingCloud ? dbEntries : localEntries;
  const isEmpty = currentEntries.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 h-14 max-w-4xl mx-auto w-full">
          <Link href="/doctor" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Clock className="h-5 w-5 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">
              {isBn ? "পরামর্শের ইতিহাস" : "Consultation History"}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {showingCloud
                ? (isBn ? `${toBengaliNumeral(dbEntries.length)}টি সংরক্ষিত (ক্লাউড)` : `${dbEntries.length} saved (cloud)`)
                : (isBn ? `${toBengaliNumeral(localEntries.length)}টি (লোকাল)` : `${localEntries.length} (local)`)}
            </p>
          </div>
          {!isEmpty && (
            confirmClear ? (
              <div className="flex items-center gap-1.5">
                <Button variant="destructive" size="sm" onClick={() => showingCloud ? clearDbAll() : (clearLocal(), setConfirmClear(false))} className="text-xs h-7 px-2">
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

      {user && (
        <div className="border-b border-border bg-card/50">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted max-w-xs">
              <button
                onClick={() => setTab("cloud")}
                className={cn("flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                  tab === "cloud" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <Database className="h-3 w-3" />
                {isBn ? "ক্লাউড" : "Cloud"}
                {dbEntries.length > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{num(dbEntries.length)}</Badge>}
              </button>
              <button
                onClick={() => setTab("local")}
                className={cn("flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                  tab === "local" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <HardDrive className="h-3 w-3" />
                {isBn ? "লোকাল" : "Local"}
                {localEntries.length > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{num(localEntries.length)}</Badge>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
          {dbLoading && showingCloud ? (
            <div className="flex flex-col items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">{isBn ? "লোড হচ্ছে..." : "Loading..."}</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center text-center pt-16 animate-fade-in">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <Clock className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h2 className="text-lg font-semibold mb-2">
                {isBn ? "কোনো পরামর্শের ইতিহাস নেই" : "No Consultation History"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {showingCloud
                  ? (isBn ? "NeoAI ডাক্তার থেকে পরামর্শ সংরক্ষণ করুন।" : "Save consultations from NeoAI Doctor.")
                  : (isBn ? "NeoAI ডাক্তার থেকে পরামর্শ নিলে স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।" : "Consultations from NeoAI Doctor will be automatically saved here.")}
              </p>
              {!user && (
                <Link href="/login" className="mb-4">
                  <Button variant="outline" className="gap-2 rounded-xl">
                    <LogIn className="h-4 w-4" />
                    {isBn ? "লগইন করে ক্লাউডে সংরক্ষণ করুন" : "Login to save to cloud"}
                  </Button>
                </Link>
              )}
              <Link href="/doctor">
                <Button className="gap-2 rounded-xl">
                  <HeartPulse className="h-4 w-4" />
                  {isBn ? "NeoAI ডাক্তার শুরু করুন" : "Start NeoAI Doctor"}
                </Button>
              </Link>
            </div>
          ) : showingCloud ? (
            dbEntries.map((entry) => (
              <SwipeCard key={entry.id} onSwipeDelete={() => deleteDb(entry.id)}>
                <DbCard
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => toggle(entry.id)}
                  onDelete={() => deleteDb(entry.id)}
                  onRename={(n) => renameDb(entry.id, n)}
                  isBn={isBn}
                  bn={bn}
                  num={num}
                />
              </SwipeCard>
            ))
          ) : (
            localEntries.map((entry) => (
              <SwipeCard key={entry.id} onSwipeDelete={() => removeLocal(entry.id)}>
                <LocalCard
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => toggle(entry.id)}
                  onDelete={() => removeLocal(entry.id)}
                  isBn={isBn}
                  bn={bn}
                  num={num}
                />
              </SwipeCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Swipe-to-delete wrapper ─── */
function SwipeCard({ children, onSwipeDelete }: { children: React.ReactNode; onSwipeDelete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (dx < 0) {
      setOffset(Math.max(dx, -180));
    }
  };

  const onTouchEnd = () => {
    setSwiping(false);
    if (offset < -threshold) {
      setOffset(-180);
    } else {
      setOffset(0);
    }
  };

  const confirmDelete = () => {
    setOffset(-9999);
    setTimeout(onSwipeDelete, 200);
  };

  const cancel = () => setOffset(0);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete background revealed on swipe */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3 z-0">
        {offset <= -threshold && (
          <>
            <button onClick={confirmDelete} className="h-10 px-4 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium flex items-center gap-1.5 transition-all animate-fade-in">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button onClick={cancel} className="h-10 px-3 rounded-lg bg-muted text-muted-foreground text-xs font-medium flex items-center transition-all animate-fade-in">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <div
        ref={containerRef}
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

/* ─── Q&A Rounds display ─── */
function QARoundsDisplay({ cycles, isBn }: { cycles: SavedCycle[]; isBn: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const totalQuestions = cycles.reduce((sum, c) => sum + c.rounds.reduce((rs, r) => rs + (r.questions?.length || 0), 0), 0);
  if (totalQuestions === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-medium flex-1">
          {isBn ? `প্রশ্ন-উত্তর (${toBengaliNumeral(totalQuestions)}টি প্রশ্ন)` : `Q&A (${totalQuestions} questions)`}
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border/50 animate-fade-in">
          {cycles.map((cycle, ci) => (
            <div key={ci} className="px-3 py-2.5">
              {cycles.length > 1 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="secondary" className="text-[9px]">
                    {isBn ? `লক্ষণ ${toBengaliNumeral(ci + 1)}` : `Symptom ${ci + 1}`}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">{cycle.complaint}</span>
                </div>
              )}
              {cycle.rounds.map((round, ri) => (
                <div key={ri} className="mb-2 last:mb-0">
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                    {isBn ? `ধাপ ${toBengaliNumeral(round.round)}` : `Round ${round.round}`}
                  </p>
                  <div className="space-y-1.5">
                    {round.questions?.map((q, qi) => (
                      <div key={qi} className="flex items-start gap-2">
                        <MessageCircle className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-muted-foreground leading-snug">{q.text}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Check className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-[11px] font-medium text-foreground">
                              {q.options.find((o) => o.value === q.selectedValue)?.label || q.selectedValue || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Shared recommendation detail renderer ─── */
function RecommendationDetail({ rec, isBn, bn, num }: {
  rec: DoctorHistoryEntry["recommendation"]; isBn: boolean; bn: (s: string) => string; num: (n: number) => string;
}) {
  return (
    <>
      {rec.message && <p className="text-xs text-muted-foreground leading-relaxed">{rec.message}</p>}
      {rec.primaryRemedy && (
        <div className="p-3 rounded-lg bg-background border border-primary/20">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              {isBn ? "প্রধান ওষুধ" : "Primary Remedy"}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold">{bn(rec.primaryRemedy.name)}</span>
            {!isBn && <Badge variant="secondary" className="text-[9px]">{rec.primaryRemedy.abbr}</Badge>}
          </div>
          <ConfidenceBar value={rec.primaryRemedy.confidence} className="mb-2" />
          {rec.primaryRemedy.explanation && (
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{rec.primaryRemedy.explanation}</p>
          )}
          {rec.primaryRemedy.dosage && (
            <p className="text-[10px] text-muted-foreground"><span className="font-medium">{isBn ? "মাত্রা:" : "Dosage:"}</span> {rec.primaryRemedy.dosage}</p>
          )}
          {rec.primaryRemedy.keyIndications?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {rec.primaryRemedy.keyIndications.map((ind, i) => (
                <Badge key={i} variant="secondary" className="text-[9px]">{ind}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
      {rec.alternativeRemedies?.length > 0 && (
        <div className="p-3 rounded-lg bg-background border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {isBn ? "বিকল্প ওষুধ" : "Alternatives"} ({num(rec.alternativeRemedies.length)})
            </span>
          </div>
          <div className="space-y-1">
            {rec.alternativeRemedies.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground/50 w-4 text-right shrink-0">{num(i + 2)}</span>
                <span className="font-medium truncate">{bn(r.name)}</span>
                <span className="text-muted-foreground/50 shrink-0">{num(r.confidence)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {rec.generalAdvice && (
        <div className="p-2.5 rounded-lg bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground">{isBn ? "সাধারণ পরামর্শ" : "General Advice"}</span>
          <p className="text-[11px] mt-0.5 text-muted-foreground leading-relaxed">{rec.generalAdvice}</p>
        </div>
      )}
      {rec.whenToSeekHelp && (
        <div className="p-2.5 rounded-lg bg-background border border-yellow-900/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ShieldAlert className="h-3 w-3 text-yellow-500" />
            <span className="text-[10px] font-medium text-yellow-500">{isBn ? "কখন ডাক্তার দেখাবেন" : "When to See a Doctor"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.whenToSeekHelp}</p>
        </div>
      )}
    </>
  );
}

/* ─── Cloud DB card ─── */
function DbCard({ entry, expanded, onToggle, onDelete, onRename, isBn, bn, num }: {
  entry: DbConsultation; expanded: boolean; onToggle: () => void; onDelete: () => void;
  onRename: (name: string) => void; isBn: boolean; bn: (s: string) => string; num: (n: number) => string;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const rec = entry.recommendation;
  const primaryName = rec?.primaryRemedy?.name || "—";
  const ts = new Date(entry.createdAt).getTime();

  const handleReopen = () => {
    const params = new URLSearchParams();
    params.set("reopen", "1");
    params.set("consultationId", entry.id);
    params.set("complaints", (entry.complaints || []).join("|||"));
    params.set("primaryRemedy", rec?.primaryRemedy?.name || "");
    params.set("primaryDosage", rec?.primaryRemedy?.dosage || "");
    router.push(`/doctor?${params.toString()}`);
  };

  return (
    <div className={cn("rounded-xl border transition-all animate-fade-in",
      expanded ? "border-primary/30 bg-card shadow-sm" : "border-border bg-card/50 hover:border-border/80"
    )}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Database className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{entry.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground truncate">
              {bn(primaryName)} — {entry.complaints?.join(", ")}
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
              <Button size="sm" onClick={() => { onRename(editName.trim()); setEditing(false); }} className="h-8 px-2 text-xs">
                <Save className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-8 px-2"><X className="h-3 w-3" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium flex-1">{entry.name}</span>
              <Button variant="ghost" size="sm" onClick={() => { setEditName(entry.name); setEditing(true); }} className="h-7 px-2 text-xs gap-1">
                <Edit3 className="h-3 w-3" /> {isBn ? "নাম পরিবর্তন" : "Rename"}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {entry.complaints?.map((c, i) => (
              <Badge key={i} className="text-[10px] bg-primary/10 text-primary border-primary/20">{c}</Badge>
            ))}
          </div>

          {entry.cycles && entry.cycles.length > 0 && (
            <QARoundsDisplay cycles={entry.cycles} isBn={isBn} />
          )}

          {rec && <RecommendationDetail rec={rec} isBn={isBn} bn={bn} num={num} />}

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleReopen} className="flex-1 gap-1.5 text-xs rounded-lg h-8">
              <RotateCcw className="h-3 w-3" /> {isBn ? "আপডেট দিন" : "Give Update"}
            </Button>
            <Link href="/doctor">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg h-8">
                <HeartPulse className="h-3 w-3" /> {isBn ? "নতুন" : "New"}
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

/* ─── Local storage card ─── */
function LocalCard({ entry, expanded, onToggle, onDelete, isBn, bn, num }: {
  entry: DoctorHistoryEntry; expanded: boolean; onToggle: () => void; onDelete: () => void;
  isBn: boolean; bn: (s: string) => string; num: (n: number) => string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rec = entry.recommendation;
  const primaryName = rec?.primaryRemedy?.name || "—";

  return (
    <div className={cn("rounded-xl border transition-all animate-fade-in",
      expanded ? "border-primary/30 bg-card shadow-sm" : "border-border bg-card/50 hover:border-border/80"
    )}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{bn(primaryName)}</span>
            {rec?.primaryRemedy && <Badge variant="secondary" className="text-[9px] shrink-0">{num(rec.primaryRemedy.confidence)}%</Badge>}
          </div>
          <span className="text-[10px] text-muted-foreground truncate block">{entry.complaints?.join(", ")}</span>
          <span className="text-[10px] text-muted-foreground/60">{timeAgo(entry.timestamp, isBn)}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3 animate-fade-in">
          <div className="flex flex-wrap gap-1.5">
            {entry.complaints?.map((c, i) => (
              <Badge key={i} className="text-[10px] bg-primary/10 text-primary border-primary/20">{c}</Badge>
            ))}
          </div>

          {rec && <RecommendationDetail rec={rec} isBn={isBn} bn={bn} num={num} />}

          <div className="flex items-center gap-2 pt-1">
            <Link href="/doctor" className="flex-1">
              <Button size="sm" className="w-full gap-1.5 text-xs rounded-lg h-8">
                <HeartPulse className="h-3 w-3" /> {isBn ? "নতুন পরামর্শ" : "New Consultation"}
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
                <Trash2 className="h-3 w-3" /> {isBn ? "মুছুন" : "Delete"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
