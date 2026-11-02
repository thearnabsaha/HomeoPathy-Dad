"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { NeoHeader } from "@/components/neo/NeoHeader";
import { NeoSidebar } from "@/components/neo/NeoSidebar";
import { NeoRightPanel } from "@/components/neo/NeoRightPanel";
import { NeoSymptomTree } from "@/components/neo/NeoSymptomTree";
import { NeoChatWidget } from "@/components/neo/NeoChatWidget";
import { useTranslation } from "@/i18n/useTranslation";
import { useNeoExplorer } from "@/context/NeoExplorerContext";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";

export default function NeoExplorerPage() {
  return <AuthGuard><ExplorerContent /></AuthGuard>;
}

function ExplorerContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    selectedSymptoms,
    activeChapter,
    selectedSymptomId,
    setActiveChapter,
    setSelectedSymptomId,
    toggleSymptom,
    removeSymptom,
    clearSymptoms,
    ranking,
    aiAnalysis,
    setRanking,
    setAiAnalysis,
    saveToHistory,
    history,
    restoreHistory,
    deleteHistory,
    clearHistory,
  } = useNeoExplorer();

  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ranking || selectedSymptoms.length === 0) return;
    const key = selectedSymptoms.map((s) => s.id).sort().join(",") + "|" + ranking.totalRemediesFound;
    if (lastSavedRef.current === key) return;
    lastSavedRef.current = key;
    saveToHistory();
  }, [ranking, selectedSymptoms, saveToHistory]);

  const handleSelectChapter = useCallback((id: string) => {
    setActiveChapter(id);
    setSelectedSymptomId(id);
  }, [setActiveChapter, setSelectedSymptomId]);

  const handleSelectSymptom = useCallback((id: string) => {
    setSelectedSymptomId(id);
    setSidebarOpen(false);
  }, [setSelectedSymptomId]);

  const handleViewRemedy = useCallback(
    (id: string) => { router.push(`/remedies/${id}`); },
    [router]
  );

  const selectedSymptomIds = useMemo(
    () => selectedSymptoms.map((s) => s.id),
    [selectedSymptoms]
  );

  return (
    <div className="min-h-screen bg-background">
      <NeoHeader
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onSelectSymptom={handleSelectSymptom}
        onSelectRemedy={handleViewRemedy}
      />

      <div className="flex">
        <NeoSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeChapter={activeChapter}
          onSelectChapter={handleSelectChapter}
          onSelectSymptom={handleSelectSymptom}
          history={history}
          onRestoreHistory={restoreHistory}
          onDeleteHistory={deleteHistory}
          onClearHistory={clearHistory}
        />

        <main className="flex-1 min-w-0">
          {!selectedSymptomId ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-6 text-center">
              <div className="max-w-lg animate-fade-in">
                <h2 className="text-2xl font-bold tracking-tight mb-3">{t("symptom.explorer")}</h2>
                <p className="text-sm text-muted-foreground mb-4">{t("symptom.selectMultiple")}</p>
                <p className="text-xs text-muted-foreground/50">{t("ai.noSelection")}</p>
              </div>
            </div>
          ) : (
            <NeoSymptomTree
              selectedSymptomId={selectedSymptomId}
              selectedSymptoms={selectedSymptomIds}
              onToggleSymptom={toggleSymptom}
              onViewRemedies={handleSelectSymptom}
              onViewRemedy={handleViewRemedy}
            />
          )}
        </main>

        <NeoRightPanel
          selectedSymptoms={selectedSymptoms}
          onRemoveSymptom={removeSymptom}
          onClearSymptoms={clearSymptoms}
          onViewRemedy={handleViewRemedy}
          ranking={ranking}
          aiAnalysis={aiAnalysis}
          onRankingChange={setRanking}
          onAiAnalysisChange={setAiAnalysis}
        />
      </div>

      <NeoChatWidget />
    </div>
  );
}
