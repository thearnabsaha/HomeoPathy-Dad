"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { translateRepertory, toBengaliNumeral } from "@/i18n/repertoryBn";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import Link from "next/link";
import {
  BookOpen, ChevronRight, Layers, FolderOpen, Stethoscope, Pill,
  Star, RotateCcw, Sparkles, ArrowLeft, Clock, Check, Loader2, Edit3, Save, X, Trash2,
  ArrowUp, ArrowRight, ArrowDown,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { useNeoAuth } from "@/hooks/useNeoAuth";

interface Repertory { id: number; name: string; conditionCount: number; }
interface Condition { id: number; name: string; symptomCount: number; }
interface Symptom { id: number; name: string; hasSubSymptoms: boolean; medicineCount: number; }
interface SubSymptom { id: number; name: string; symptomsTypeID: number; }
interface Medicine { id: number; name: string; rank: number; repertory: string; condition: string; symptom: string; subSymptom: string; }
interface SelectedMedicine { symptomName: string; subSymptomName?: string; medicines: Medicine[]; repertoryName?: string; conditionName?: string; }

function getRankLabel(rank: number, t: (k: string) => string): { label: string; color: string; icon: React.ElementType } {
  if (rank >= 3) return { label: t("repertory.rankHigh"), color: "text-green-500 bg-green-500/10 border-green-500/30", icon: ArrowUp };
  if (rank === 2) return { label: t("repertory.rankMid"), color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30", icon: ArrowRight };
  return { label: t("repertory.rankLow"), color: "text-red-400 bg-red-400/10 border-red-400/30", icon: ArrowDown };
}

export default function NeoRepertoryPage() {
  return <AuthGuard><RepertoryContent /></AuthGuard>;
}

function RepertoryContent() {
  const { t, language } = useTranslation();
  const isBn = language === "bn";
  const bn = useCallback((text: string) => (isBn ? translateRepertory(text) : text), [isBn]);
  const num = useCallback((n: number) => (isBn ? toBengaliNumeral(n) : String(n)), [isBn]);
  const { token } = useNeoAuth();

  const [repertories, setRepertories] = useState<Repertory[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [subSymptoms, setSubSymptoms] = useState<SubSymptom[]>([]);
  const [selectedRep, setSelectedRep] = useState<Repertory | null>(null);
  const [selectedCond, setSelectedCond] = useState<Condition | null>(null);
  const [selectedSymp, setSelectedSymp] = useState<Symptom | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubSymptom | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [allSelections, setAllSelections] = useState<SelectedMedicine[]>([]);
  const [aggregated, setAggregated] = useState<{ name: string; rank: number; count: number; avgRank: number }[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-save state
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [showRename, setShowRename] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/repertory").then((r) => r.json()).then((d) => setRepertories(d.repertories || []));
  }, []);

  const sorted = <T extends { name: string }>(arr: T[]) =>
    [...arr].sort((a, b) => bn(a.name).localeCompare(bn(b.name), isBn ? "bn" : "en"));

  const sortedRepertories = useMemo(() => sorted(repertories), [repertories, bn, isBn]);
  const sortedConditions = useMemo(() => sorted(conditions), [conditions, bn, isBn]);
  const sortedSymptoms = useMemo(() => sorted(symptoms), [symptoms, bn, isBn]);
  const sortedSubSymptoms = useMemo(() => sorted(subSymptoms), [subSymptoms, bn, isBn]);

  const selectRepertory = useCallback(async (rep: Repertory) => {
    setSelectedRep(rep); setSelectedCond(null); setSelectedSymp(null); setSelectedSub(null);
    setConditions([]); setSymptoms([]); setSubSymptoms([]); setMedicines([]);
    setLoading(true);
    const res = await fetch(`/api/repertory?repertoryId=${rep.id}`);
    setConditions((await res.json()).conditions || []);
    setLoading(false);
  }, []);

  const selectCondition = useCallback(async (cond: Condition) => {
    setSelectedCond(cond); setSelectedSymp(null); setSelectedSub(null);
    setSymptoms([]); setSubSymptoms([]); setMedicines([]);
    if (!selectedRep) return;
    setLoading(true);
    const res = await fetch(`/api/repertory?repertoryId=${selectedRep.id}&conditionId=${cond.id}`);
    setSymptoms((await res.json()).symptoms || []);
    setLoading(false);
  }, [selectedRep]);

  const selectSymptom = useCallback(async (symp: Symptom) => {
    setSelectedSymp(symp); setSelectedSub(null); setSubSymptoms([]); setMedicines([]);
    if (!selectedRep || !selectedCond) return;
    setLoading(true);
    const res = await fetch(`/api/repertory?repertoryId=${selectedRep.id}&conditionId=${selectedCond.id}&symptomId=${symp.id}`);
    const data = await res.json();
    if (data.subSymptoms?.length > 0) setSubSymptoms(data.subSymptoms);
    if (data.medicines?.length > 0) { setMedicines(data.medicines); addSel(symp.name, undefined, data.medicines, selectedRep.name, selectedCond.name); }
    setLoading(false);
  }, [selectedRep, selectedCond]);

  const selectSubSymptom = useCallback(async (sub: SubSymptom) => {
    setSelectedSub(sub); setMedicines([]);
    if (!selectedRep || !selectedCond || !selectedSymp) return;
    setLoading(true);
    const res = await fetch(`/api/repertory?repertoryId=${selectedRep.id}&conditionId=${selectedCond.id}&symptomId=${selectedSymp.id}&subSymptomId=${sub.id}`);
    const data = await res.json();
    if (data.medicines?.length > 0) { setMedicines(data.medicines); addSel(selectedSymp.name, sub.name, data.medicines, selectedRep.name, selectedCond.name); }
    setLoading(false);
  }, [selectedRep, selectedCond, selectedSymp]);

  const addSel = (sn: string, ssn: string | undefined, m: Medicine[], repName?: string, condName?: string) => {
    setAllSelections((prev) => {
      const next = [...prev, { symptomName: sn, subSymptomName: ssn, medicines: m, repertoryName: repName, conditionName: condName }];
      aggregate(next);
      return next;
    });
  };

  const removeSel = (index: number) => {
    setAllSelections((prev) => {
      const next = prev.filter((_, i) => i !== index);
      aggregate(next);
      return next;
    });
  };

  const aggregate = (sels: SelectedMedicine[]) => {
    const map = new Map<string, { rank: number; count: number }>();
    for (const s of sels) for (const m of s.medicines) {
      const e = map.get(m.name);
      if (e) { e.rank += m.rank; e.count += 1; } else map.set(m.name, { rank: m.rank, count: 1 });
    }
    setAggregated(
      Array.from(map.entries())
        .map(([name, { rank, count }]) => ({ name, rank, count, avgRank: Math.round(rank / count) }))
        .sort((a, b) => b.count - a.count || b.rank - a.rank)
    );
  };

  // Auto-save: debounced save whenever allSelections changes
  useEffect(() => {
    if (!token || allSelections.length === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      doAutoSave(allSelections, aggregated);
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [allSelections, aggregated, token]);

  const doAutoSave = async (sels: SelectedMedicine[], agg: { name: string; rank: number; count: number }[]) => {
    if (!token || sels.length === 0) return;
    setAutoSaving(true);
    try {
      const autoName = sels.map((s) => s.symptomName).filter((v, i, a) => a.indexOf(v) === i).join(", ");
      const payload = {
        name: sessionName || autoName,
        selections: sels.map((s) => ({
          symptomName: s.symptomName,
          subSymptomName: s.subSymptomName,
          medicineCount: s.medicines.length,
          medicines: s.medicines.map((m) => ({ name: m.name, rank: m.rank })),
        })),
        aggregated: agg.slice(0, 30),
      };

      if (savedSessionId) {
        await fetch(`/api/repertory-sessions/${savedSessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch("/api/repertory-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setSavedSessionId(data.session?.id || null);
          if (!sessionName) setSessionName(autoName);
        }
      }
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 3000);
    } catch {}
    setAutoSaving(false);
  };

  const renameSession = async (newName: string) => {
    if (!token || !savedSessionId || !newName.trim()) return;
    try {
      await fetch(`/api/repertory-sessions/${savedSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setSessionName(newName.trim());
    } catch {}
    setShowRename(false);
  };

  const resetAll = () => {
    setSelectedRep(null); setSelectedCond(null); setSelectedSymp(null); setSelectedSub(null);
    setConditions([]); setSymptoms([]); setSubSymptoms([]); setMedicines([]);
    setAllSelections([]); setAggregated([]);
    setSavedSessionId(null); setAutoSaved(false); setSessionName("");
  };

  const Col = ({ icon: Icon, label, count, items, selected, onSelect, placeholder }: {
    icon: React.ElementType; label: string; count: number;
    items: { id: number; name: string; extra?: string | number; arrow?: boolean }[];
    selected: number | null; onSelect: (item: { id: number; name: string }) => void; placeholder: string;
  }) => (
    <div className="overflow-y-auto max-h-[40vh] sm:max-h-[calc(100vh-8rem)]">
      <div className="sticky top-0 bg-card border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5" /> {label} ({num(count)})
        </div>
      </div>
      <div className="p-1">
        {items.length === 0 && !loading && <p className="text-xs text-muted-foreground p-3">{placeholder}</p>}
        {items.map((item) => (
          <button key={item.id} onClick={() => onSelect(item as { id: number; name: string })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start justify-between gap-1.5 ${
              selected === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}>
            <span className="break-words whitespace-normal leading-snug flex-1">{bn(item.name)}</span>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {item.extra !== undefined && <span className={`text-[10px] tabular-nums ${selected === item.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{typeof item.extra === 'number' ? num(item.extra) : item.extra}</span>}
              {item.arrow && <ChevronRight className={`h-3 w-3 ${selected === item.id ? "text-primary-foreground/60" : "text-muted-foreground"}`} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">{isBn ? "নিও রেপার্টরি" : "Neo Repertory"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/repertory/history">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Clock className="h-3 w-3" /> {isBn ? "ইতিহাস" : "History"}
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={resetAll}>
              <RotateCcw className="h-3 w-3" /> {t("repertory.reset")}
            </Button>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card px-3 sm:px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <button onClick={resetAll} className="hover:text-foreground">{t("repertory.allRepertories")}</button>
          {selectedRep && <><ChevronRight className="h-3 w-3" /><button onClick={() => selectRepertory(selectedRep)} className="text-foreground font-medium">{bn(selectedRep.name)}</button></>}
          {selectedCond && <><ChevronRight className="h-3 w-3" /><button onClick={() => selectCondition(selectedCond)} className="text-foreground font-medium">{bn(selectedCond.name)}</button></>}
          {selectedSymp && <><ChevronRight className="h-3 w-3" /><span className="text-foreground font-medium">{bn(selectedSymp.name)}</span></>}
          {selectedSub && <><ChevronRight className="h-3 w-3" /><span className="text-foreground font-medium">{bn(selectedSub.name)}</span></>}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border min-h-[60vh]">
            <Col icon={Layers} label={t("repertory.repertories")} count={repertories.length}
              items={sortedRepertories.map((r) => ({ ...r, extra: r.conditionCount }))}
              selected={selectedRep?.id ?? null} onSelect={(r) => selectRepertory(r as Repertory)} placeholder={t("repertory.selectRepertory")} />
            <Col icon={FolderOpen} label={t("repertory.conditions")} count={conditions.length}
              items={sortedConditions.map((c) => ({ ...c, extra: (c as Condition).symptomCount }))}
              selected={selectedCond?.id ?? null} onSelect={(c) => selectCondition(c as Condition)} placeholder={t("repertory.selectRepertory")} />
            <Col icon={Stethoscope} label={t("repertory.symptoms")} count={symptoms.length}
              items={sortedSymptoms.map((s) => ({ ...s, arrow: (s as Symptom).hasSubSymptoms }))}
              selected={selectedSymp?.id ?? null} onSelect={(s) => selectSymptom(s as Symptom)} placeholder={t("repertory.selectCondition")} />
            <Col icon={Pill} label={t("repertory.subSymptoms")} count={subSymptoms.length}
              items={sortedSubSymptoms.map((s) => ({ ...s }))}
              selected={selectedSub?.id ?? null} onSelect={(s) => selectSubSymptom(s as SubSymptom)} placeholder={t("repertory.selectSymptom")} />
          </div>

          {medicines.length > 0 && (
            <div className="border-t border-border p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Pill className="h-4 w-4" /> {t("repertory.medicinesFor")}: {selectedSub ? bn(selectedSub.name) : selectedSymp ? bn(selectedSymp.name) : ""}
                <span className="text-xs font-normal text-muted-foreground ml-auto">{num(medicines.length)} {t("repertory.medicines")}</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">#</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">{t("repertory.medicine")}</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">{t("repertory.totalSymptoms")}</th>
                    <th className="pb-2 font-medium text-muted-foreground">{t("repertory.rank")}</th>
                  </tr></thead>
                  <tbody>
                    {medicines.map((med, i) => {
                      const rl = getRankLabel(med.rank, t);
                      const RankIcon = rl.icon;
                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 pr-3 text-muted-foreground font-mono text-xs">{num(i + 1)}</td>
                          <td className="py-2 pr-3 font-medium">{bn(med.name)}</td>
                          <td className="py-2 pr-3 text-muted-foreground text-center">{num(med.rank)}</td>
                          <td className="py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${rl.color}`}>
                              <RankIcon className="h-2.5 w-2.5" />
                              {rl.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {allSelections.length > 0 && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-8rem)]">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 z-10">
              <h3 className="text-sm font-bold">{t("repertory.recommended")}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{num(allSelections.length)} {t("repertory.selections")}</p>

              {/* Auto-save indicator */}
              {token && (
                <div className="mt-2">
                  {autoSaving && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {isBn ? "সংরক্ষণ করছি..." : "Saving..."}
                    </div>
                  )}
                  {autoSaved && !autoSaving && (
                    <div className="flex items-center gap-1.5 text-[10px] text-primary">
                      <Check className="h-3 w-3" />
                      {isBn ? "সংরক্ষিত" : "Saved"}
                    </div>
                  )}
                  {savedSessionId && !autoSaving && !autoSaved && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Check className="h-3 w-3" />
                      {isBn ? "ক্লাউডে আছে" : "On cloud"}
                    </div>
                  )}
                  {savedSessionId && (
                    showRename ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)}
                          className="flex-1 h-6 rounded border border-border bg-background px-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") renameSession(sessionName); if (e.key === "Escape") setShowRename(false); }}
                        />
                        <button onClick={() => renameSession(sessionName)} className="text-primary hover:text-primary/80"><Save className="h-3 w-3" /></button>
                        <button onClick={() => setShowRename(false)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setShowRename(true)} className="flex items-center gap-1 mt-1 text-[10px] text-primary hover:text-primary/80">
                        <Edit3 className="h-2.5 w-2.5" /> {isBn ? "নাম পরিবর্তন" : "Rename"}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
            <div className="p-3">
              {aggregated.slice(0, 20).map((med, i) => {
                const rl = getRankLabel(med.avgRank, t);
                const RankIcon = rl.icon;
                return (
                  <div key={med.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{num(i + 1)}</span>
                      <span className="text-sm font-medium truncate">{bn(med.name)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{num(med.count)}x</span>
                      <span className="text-xs font-semibold bg-secondary px-1.5 py-0.5 rounded">{num(med.rank)}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold ${rl.color}`}>
                        <RankIcon className="h-2 w-2" />
                        {rl.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Top Medicine Rank List */}
            {aggregated.length > 0 && (
              <div className="border-t border-border px-4 py-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t("repertory.topMedicineRank")}
                </h4>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.index")}</th>
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.medicine")}</th>
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.totalSymptoms")}</th>
                        <th className="pb-1.5 font-medium text-muted-foreground">{t("repertory.rank")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregated.slice(0, 10).map((med, i) => {
                        const rl = getRankLabel(med.avgRank, t);
                        const RankIcon = rl.icon;
                        return (
                          <tr key={med.name} className="border-b border-border/30">
                            <td className="py-1.5 pr-2 text-muted-foreground font-mono">{num(i + 1)}</td>
                            <td className="py-1.5 pr-2 font-medium">{bn(med.name)}</td>
                            <td className="py-1.5 pr-2 text-muted-foreground text-center">{num(med.count)}</td>
                            <td className="py-1.5">
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold ${rl.color}`}>
                                <RankIcon className="h-2 w-2" />
                                {num(i + 1)} - {rl.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Medicine Rank List All - detailed breakdown by selection */}
            {allSelections.length > 0 && (
              <div className="border-t border-border px-4 py-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t("repertory.allMedicineRank")}
                </h4>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.index")}</th>
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.repertories")}</th>
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.conditions")}</th>
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.symptoms")}</th>
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.subSymptoms")}</th>
                        <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.medicine")}</th>
                        <th className="pb-1.5 font-medium text-muted-foreground">{t("repertory.rank")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let idx = 0;
                        return allSelections.flatMap((sel) =>
                          sel.medicines.map((med) => {
                            idx++;
                            const rl = getRankLabel(med.rank, t);
                            const RankIcon = rl.icon;
                            return (
                              <tr key={`${sel.symptomName}-${sel.subSymptomName}-${med.name}-${idx}`} className="border-b border-border/30">
                                <td className="py-1.5 pr-2 text-muted-foreground font-mono">{num(idx)}</td>
                                <td className="py-1.5 pr-2 text-muted-foreground truncate max-w-[60px]">{bn(sel.repertoryName || "-")}</td>
                                <td className="py-1.5 pr-2 text-muted-foreground truncate max-w-[60px]">{bn(sel.conditionName || "-")}</td>
                                <td className="py-1.5 pr-2 text-muted-foreground truncate max-w-[60px]">{bn(sel.symptomName)}</td>
                                <td className="py-1.5 pr-2 text-muted-foreground truncate max-w-[60px]">{sel.subSymptomName ? bn(sel.subSymptomName) : "-"}</td>
                                <td className="py-1.5 pr-2 font-medium">{bn(med.name)}</td>
                                <td className="py-1.5">
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold ${rl.color}`}>
                                    <RankIcon className="h-2 w-2" />
                                    {num(med.rank)} - {rl.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-muted-foreground">
                  {isBn ? "নির্বাচন ইতিহাস" : "Selection History"} ({num(allSelections.length)})
                </h4>
                {allSelections.length > 1 && (
                  <button onClick={() => {
                    setAllSelections([]); setAggregated([]);
                    if (savedSessionId && token) {
                      fetch(`/api/repertory-sessions/${savedSessionId}`, {
                        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
                      }).catch(() => {});
                      setSavedSessionId(null); setSessionName(""); setAutoSaved(false);
                    }
                  }} className="text-[10px] text-destructive hover:text-destructive/80 flex items-center gap-0.5">
                    <Trash2 className="h-2.5 w-2.5" /> {isBn ? "সব মুছুন" : "Clear"}
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {allSelections.map((sel, i) => (
                  <SwipeHistoryItem key={`${sel.symptomName}-${sel.subSymptomName}-${i}`} onDelete={() => removeSel(i)}>
                    <div className="flex items-center gap-1.5 py-1.5 px-1 group">
                      <span className="text-[9px] text-muted-foreground/40 w-3 shrink-0 text-right">{num(i + 1)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">
                          {bn(sel.symptomName)}{sel.subSymptomName ? <span className="text-muted-foreground/50"> &gt; {bn(sel.subSymptomName)}</span> : ""}
                        </p>
                        <p className="text-[9px] text-foreground/70 font-medium">{num(sel.medicines.length)} {t("repertory.medicines")}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeSel(i); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive shrink-0">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </SwipeHistoryItem>
                ))}
              </div>

              {/* Link to full history page */}
              {token && (
                <div className="mt-3 pt-2 border-t border-border/30">
                  <Link href="/repertory/history" className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 font-medium">
                    <Clock className="h-3 w-3" />
                    {isBn ? "সব সংরক্ষিত সেশন দেখুন" : "View All Saved Sessions"}
                    <ChevronRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function SwipeHistoryItem({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const threshold = 60;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -100));
  };

  const onTouchEnd = () => {
    setSwiping(false);
    if (offset < -threshold) {
      setOffset(-100);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-y-0 right-0 flex items-center z-0">
        {offset <= -threshold && (
          <button onClick={() => { setOffset(0); onDelete(); }} className="h-full px-3 bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center gap-1 animate-fade-in">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative z-10 bg-card"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
