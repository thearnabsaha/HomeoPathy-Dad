"use client";

import { useState, useMemo } from "react";
import {
  Brain,
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  ChevronUp,
  ChevronDown,
  Check,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/useTranslation";
import { neoApi } from "@/lib/neoApi";
import { cn } from "@/lib/utils";
import { translateRepertory, toBengaliNumeral, medDescBn, medDosageBn, medWorseBn, medBetterBn } from "@/i18n/repertoryBn";
import { AudioReader } from "@/components/AudioReader";
import type { AIAnalysis, RankingResult, RankedRemedy } from "@/lib/types";

function getRankLabel(
  grade: number,
  t: (k: string) => string
): { label: string; color: string; icon: React.ElementType } {
  if (grade >= 3)
    return {
      label: t("remedy.high"),
      color: "text-green-500 bg-green-500/10 border-green-500/30",
      icon: ArrowUp,
    };
  if (grade === 2)
    return {
      label: t("remedy.medium"),
      color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
      icon: ArrowRight,
    };
  return {
    label: t("remedy.low"),
    color: "text-red-400 bg-red-400/10 border-red-400/30",
    icon: ArrowDown,
  };
}

interface NeoRightPanelProps {
  selectedSymptoms: { id: string; name: string }[];
  onRemoveSymptom: (id: string) => void;
  onClearSymptoms: () => void;
  onViewRemedy?: (id: string) => void;
  ranking?: RankingResult | null;
  aiAnalysis?: AIAnalysis | null;
  onRankingChange?: (r: RankingResult | null) => void;
  onAiAnalysisChange?: (a: AIAnalysis | null) => void;
}

function GradeIndicator({ grade, isBn }: { grade: number; isBn?: boolean }) {
  const colorClass =
    grade >= 3 ? "text-green-500" : grade >= 2 ? "text-yellow-500" : "text-red-400";
  const display = isBn ? toBengaliNumeral(grade) : String(grade);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded text-[10px] font-bold tabular-nums bg-muted/50",
        colorClass
      )}
    >
      {display}
    </span>
  );
}

function RankedRemedyCard({
  remedy,
  language,
  t,
  onClick,
}: {
  remedy: RankedRemedy;
  language: string;
  t: (k: string) => string;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const getBadgeStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (rank === 2) return "bg-gray-300/20 text-gray-300 border-gray-300/30";
    if (rank === 3) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const isBn = language === "bn";
  const tr = (text: string) => (isBn ? translateRepertory(text) : text);
  const toBengaliNum = (n: number) => (isBn ? toBengaliNumeral(n) : String(n));

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20",
        remedy.rank <= 3 && "ring-1 ring-foreground/5"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex-shrink-0 h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-bold",
            getBadgeStyle(remedy.rank)
          )}
        >
          {toBengaliNum(remedy.rank)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClick}
              className="text-sm font-semibold hover:underline truncate"
            >
              {tr(remedy.name)}
            </button>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {remedy.abbr}
            </span>
            <AudioReader text={`${remedy.name}. ${remedy.description?.substring(0, 80)}`} />
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[10px] text-muted-foreground shrink-0 tabular-nums"
              title={t("repertory.totalSymptoms")}
            >
              {toBengaliNum(remedy.symptomsCovered)}x
            </span>
            <div className="flex-1" />
            <span
              className="text-xs font-semibold bg-secondary text-foreground px-1.5 py-0.5 rounded shrink-0 tabular-nums"
              title={t("repertory.rank")}
            >
              {toBengaliNum(remedy.totalScore)}
            </span>
            {(() => {
              const rl = getRankLabel(remedy.maxGrade, t);
              const RankIcon = rl.icon;
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold shrink-0",
                    rl.color
                  )}
                >
                  <RankIcon className="h-2 w-2" />
                  {rl.label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        {expanded ? t("rank.hideDetails") : t("rank.showDetails")}
      </button>

      {expanded && (() => {
        const nu = remedy.name.toUpperCase();
        const descBn = medDescBn[nu] || medDescBn[remedy.name];
        const dosBn = medDosageBn[nu] || medDosageBn[remedy.name];
        const worBn = medWorseBn[nu] || medWorseBn[remedy.name];
        const betBn = medBetterBn[nu] || medBetterBn[remedy.name];
        return (
        <div className="mt-2 space-y-2 animate-slide-up">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isBn && descBn ? descBn : tr(remedy.description)}
          </p>
          <div>
            <p className="text-[10px] font-medium mb-1">{t("rank.symptomMatch")}:</p>
            <div className="space-y-0.5">
              {remedy.coverageDetails.map((cd, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-[10px] text-muted-foreground"
                >
                  <GradeIndicator grade={cd.grade} isBn={isBn} />
                  <span>{tr(cd.symptomName)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            <span className="font-medium">{t("remedy.dosage")}:</span> {isBn && dosBn ? dosBn : tr(remedy.dosage)}
          </div>
          {remedy.modalities && (
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="font-medium text-red-400/80">{t("rank.worse")}:</span>
                <p className="text-muted-foreground mt-0.5">
                  {isBn && worBn
                    ? worBn.slice(0, 4).join(", ")
                    : remedy.modalities.worse?.slice(0, 4).map((w) => tr(w)).join(", ")}
                </p>
              </div>
              <div>
                <span className="font-medium text-green-400/80">{t("rank.better")}:</span>
                <p className="text-muted-foreground mt-0.5">
                  {isBn && betBn
                    ? betBn.slice(0, 4).join(", ")
                    : remedy.modalities.better?.slice(0, 4).map((b) => tr(b)).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
          <div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function NeoRightPanel({
  selectedSymptoms,
  onRemoveSymptom,
  onClearSymptoms,
  onViewRemedy,
  ranking: externalRanking,
  aiAnalysis: externalAiAnalysis,
  onRankingChange,
  onAiAnalysisChange,
}: NeoRightPanelProps) {
  const { t, language } = useTranslation();
  const [localRanking, setLocalRanking] = useState<RankingResult | null>(null);
  const [localAiAnalysis, setLocalAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const ranking = externalRanking ?? localRanking;
  const aiAnalysis = externalAiAnalysis ?? localAiAnalysis;

  const updateRanking = (r: RankingResult | null) => {
    setLocalRanking(r);
    onRankingChange?.(r);
  };

  const updateAiAnalysis = (a: AIAnalysis | null) => {
    setLocalAiAnalysis(a);
    onAiAnalysisChange?.(a);
  };

  const toBengaliNum = (n: number) =>
    language === "bn" ? toBengaliNumeral(n) : String(n);

  const tr = (text: string) => (language === "bn" ? translateRepertory(text) : text);

  const topTwoRows = useMemo(() => {
    if (!ranking?.rankedRemedies) return [];
    type Row = {
      symptomId: string;
      symptomLabel: string;
      remedyId: string;
      remedyName: string;
      rawRank: number;
    };
    const groups = new Map<string, Row[]>();
    for (const rem of ranking.rankedRemedies) {
      if (!Array.isArray(rem?.coverageDetails)) continue;
      for (const cd of rem.coverageDetails) {
        if (!cd) continue;
        const parts: string[] = [];
        if (cd.conditionName) parts.push(cd.conditionName);
        if (cd.parentSymptomName) parts.push(cd.parentSymptomName);
        if (cd.symptomName) parts.push(cd.symptomName);
        const label = parts.join(" > ");
        const row: Row = {
          symptomId: cd.symptomId || "",
          symptomLabel: label,
          remedyId: rem.id || "",
          remedyName: rem.name || "",
          rawRank: cd.grade || 0,
        };
        const list = groups.get(cd.symptomId);
        if (list) list.push(row);
        else groups.set(cd.symptomId, [row]);
      }
    }
    const flat: Row[] = [];
    for (const list of groups.values()) {
      list.sort((a, b) => b.rawRank - a.rawRank);
      flat.push(...list.slice(0, 2));
    }
    return flat;
  }, [ranking?.rankedRemedies]);

  const allMedicineRows = useMemo(() => {
    if (!ranking?.rankedRemedies) return [];
    type Row = {
      symptomId: string;
      symptomLabel: string;
      remedyId: string;
      remedyName: string;
      rawRank: number;
    };
    const rows: Row[] = [];
    for (const rem of ranking.rankedRemedies) {
      if (!Array.isArray(rem?.coverageDetails)) continue;
      for (const cd of rem.coverageDetails) {
        if (!cd) continue;
        const parts: string[] = [];
        if (cd.conditionName) parts.push(cd.conditionName);
        if (cd.parentSymptomName) parts.push(cd.parentSymptomName);
        if (cd.symptomName) parts.push(cd.symptomName);
        rows.push({
          symptomId: cd.symptomId || "",
          symptomLabel: parts.join(" > "),
          remedyId: rem.id || "",
          remedyName: rem.name || "",
          rawRank: cd.grade || 0,
        });
      }
    }
    rows.sort((a, b) => {
      const s = (a.symptomLabel || "").localeCompare(b.symptomLabel || "");
      if (s !== 0) return s;
      if (b.rawRank !== a.rawRank) return b.rawRank - a.rawRank;
      return (a.remedyName || "").localeCompare(b.remedyName || "");
    });
    return rows.slice(0, 100);
  }, [ranking?.rankedRemedies]);

  const handleRank = async () => {
    if (selectedSymptoms.length === 0) return;
    setLoading(true);
    setError(null);
    updateAiAnalysis(null);
    try {
      const result = await neoApi.rankRemedies(
        selectedSymptoms.map((s) => s.id)
      );
      updateRanking(result);
    } catch {
      setError(t("common.requestFailed"));
    }
    setLoading(false);
  };

  const handleAiAnalyze = async () => {
    if (selectedSymptoms.length === 0) return;
    setAiLoading(true);
    try {
      const result = await neoApi.analyzeSymptoms(
        selectedSymptoms.map((s) => s.name),
        language
      );
      if (result && (result.analysis || result.remedies?.length)) {
        updateAiAnalysis(result);
      }
    } catch {
      // supplementary - don't block
    }
    setAiLoading(false);
  };

  const handleFullAnalysis = async () => {
    await handleRank();
    handleAiAnalyze();
  };

  const panelContent = (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{t("ai.title")}</h2>
      </div>

      {selectedSymptoms.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {toBengaliNum(selectedSymptoms.length)} {t("symptom.selected")}
            </span>
            <button
              onClick={onClearSymptoms}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("symptom.clearSelection")}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedSymptoms.map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="gap-1 text-xs cursor-pointer"
                onClick={() => onRemoveSymptom(s.id)}
              >
                {tr(s.name)}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
          <Button
            onClick={handleFullAnalysis}
            disabled={loading}
            size="sm"
            className="w-full mt-3 gap-2"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? t("ai.analyzing") : t("rank.findBest")}
          </Button>
        </div>
      )}

      {selectedSymptoms.length === 0 && !ranking && (
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
            {t("ai.noSelection")}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {loading && <AnalysisSkeleton />}

      {!loading && ranking && ranking.rankedRemedies.length > 0 && (
        <div className="space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("rank.topRemedies")} ({toBengaliNum(ranking.totalRemediesFound)})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {toBengaliNum(ranking.totalSymptomsAnalyzed)} {t("rank.symptomsAnalyzed")}
              </span>
              <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                <Check className="h-2.5 w-2.5" />
                {language === "bn" ? "সংরক্ষিত" : "Saved"}
              </span>
            </div>
          </div>

          {aiLoading && (
            <div className="flex items-center gap-2 p-2 rounded bg-card border border-border">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{t("rank.aiEnriching")}</span>
            </div>
          )}

          {aiAnalysis && (
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {aiAnalysis.analysis}
              </p>
              {aiAnalysis.precautions && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                  <AlertTriangle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground">{aiAnalysis.precautions}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {ranking.rankedRemedies.map((rem) => (
              <RankedRemedyCard
                key={rem.id}
                remedy={rem}
                language={language}
                t={t}
                onClick={() => onViewRemedy?.(rem.id)}
              />
            ))}
          </div>

          {/* Top Medicine Rank List - top 2 medicines per selected symptom/sub-symptom */}
          <div className="border-t border-border pt-3 mt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("repertory.topMedicineRank")}
            </h4>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.index")}</th>
                    <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.symptoms")}</th>
                    <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.medicine")}</th>
                    <th className="pb-1.5 font-medium text-muted-foreground">{t("repertory.rank")}</th>
                  </tr>
                </thead>
                <tbody>
                  {topTwoRows.map((row, i) => {
                    const rl = getRankLabel(row.rawRank, t);
                    const RankIcon = rl.icon;
                    return (
                      <tr key={`${row.symptomId}-${row.remedyId}-${i}`} className="border-b border-border/30">
                        <td className="py-1.5 pr-2 text-muted-foreground font-mono">{toBengaliNum(i + 1)}</td>
                        <td
                          className="py-1.5 pr-2 text-muted-foreground truncate max-w-[200px]"
                          title={tr(row.symptomLabel)}
                        >
                          {tr(row.symptomLabel)}
                        </td>
                        <td className="py-1.5 pr-2 font-medium">{tr(row.remedyName)}</td>
                        <td className="py-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold",
                              rl.color
                            )}
                          >
                            <RankIcon className="h-2 w-2" />
                            {toBengaliNum(row.rawRank)} - {rl.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Medicine Rank List All - flat, sorted so same-symptom rows sit together */}
          <div className="border-t border-border pt-3 mt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("repertory.allMedicineRank")}
            </h4>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.index")}</th>
                    <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.symptoms")}</th>
                    <th className="pb-1.5 pr-2 font-medium text-muted-foreground">{t("repertory.medicine")}</th>
                    <th className="pb-1.5 font-medium text-muted-foreground">{t("repertory.rank")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let prevSymptomId: string | null = null;
                    return allMedicineRows.map((row, i) => {
                      const rl = getRankLabel(row.rawRank, t);
                      const RankIcon = rl.icon;
                      const newGroup = row.symptomId !== prevSymptomId;
                      prevSymptomId = row.symptomId;
                      return (
                        <tr
                          key={`${row.symptomId}-${row.remedyId}-${i}`}
                          className={cn(
                            "border-b border-border/30",
                            newGroup && i > 0 && "border-t-2 border-t-border/60"
                          )}
                        >
                          <td className="py-1.5 pr-2 text-muted-foreground font-mono">{toBengaliNum(i + 1)}</td>
                          <td
                            className="py-1.5 pr-2 text-muted-foreground truncate max-w-[200px]"
                            title={tr(row.symptomLabel)}
                          >
                            {newGroup ? (
                              <span className="font-medium text-foreground/80">{tr(row.symptomLabel)}</span>
                            ) : (
                              <span aria-hidden="true" className="opacity-30">·</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-2 font-medium">{tr(row.remedyName)}</td>
                          <td className="py-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold",
                                rl.color
                              )}
                            >
                              <RankIcon className="h-2 w-2" />
                              {toBengaliNum(row.rawRank)} - {rl.label}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && ranking && ranking.rankedRemedies.length === 0 && (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">{t("rank.noResults")}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden xl:block w-80 border-l border-border bg-background">
        <ScrollArea className="h-[calc(100vh-3.5rem)]">{panelContent}</ScrollArea>
      </aside>

      <div className="xl:hidden">
        {selectedSymptoms.length > 0 && (
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background shadow-lg text-xs font-medium"
          >
            <Brain className="h-3.5 w-3.5" />
            {toBengaliNum(selectedSymptoms.length)} {t("symptom.selected")}
            {mobileOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-background/80"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-40 max-h-[75vh] rounded-t-2xl border-t border-border bg-background shadow-xl overflow-y-auto animate-slide-up">
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              {panelContent}
            </div>
          </>
        )}
      </div>
    </>
  );
}
