"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Send, Loader2, RotateCcw, ArrowLeft, Sparkles,
  CheckCircle2, AlertTriangle, Pill, Activity, ClipboardList, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { VoiceInput } from "@/components/VoiceInput";
import { useTranslation } from "@/i18n/useTranslation";
import { neoApi } from "@/lib/neoApi";
import type { ConsultResponse } from "@/lib/types";
import { translateRepertory, toBengaliNumeral } from "@/i18n/repertoryBn";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { AuthGuard } from "@/components/AuthGuard";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: ConsultResponse;
}

export default function NeoConsultPage() {
  return <AuthGuard><ConsultContent /></AuthGuard>;
}

function ConsultContent() {
  const { t, language } = useTranslation();
  const isBn = language === "bn";
  const bn = (s: string) => (isBn ? translateRepertory(s) : s);
  const num = (n: number) => (isBn ? toBengaliNumeral(n) : String(n));
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("gathering");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: "welcome", role: "assistant", content: t("consult.welcome") }]);
    } else {
      setMessages((prev) => prev.map((m) => m.id === "welcome" ? { ...m, content: t("consult.welcome") } : m));
    }
  }, [t, messages.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const history = newMessages.filter((m) => m.id !== "welcome").map((m) => ({ role: m.role, content: m.content }));
      const response = await neoApi.consult(history, language);
      setStage(response.stage || "gathering");
      if (response.symptomsCollected?.length) setSymptoms(response.symptomsCollected);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: response.message, data: response }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: t("chat.error") }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const resetConsultation = () => { setMessages([]); setStage("gathering"); setSymptoms([]); setInput(""); };

  const stageLabel = stage === "recommendation" ? t("consult.recommendation") : stage === "analyzing" ? t("consult.analyzing") : t("consult.gathering");
  const stageColor = stage === "recommendation" ? "text-green-400" : stage === "analyzing" ? "text-yellow-400" : "text-primary";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 h-14 max-w-4xl mx-auto w-full">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Image
            src="/icon-192.png"
            alt="NeoAI"
            width={24}
            height={24}
            className="h-6 w-6 rounded-md object-cover"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{isBn ? "NeoAI পরামর্শ" : "NeoAI Consultation"}</h1>
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${stageColor} bg-current`} />
              <span className={`text-[10px] ${stageColor}`}>{stageLabel}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={resetConsultation} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("consult.newConsult")}</span>
          </Button>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {symptoms.length > 0 && (
            <div className="p-3 rounded-lg border border-border bg-card animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{t("consult.symptomsCollected")}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {symptoms.map((s, i) => (<Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}>
              <div className={`max-w-[90%] md:max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.data?.recommendation && <NeoRecommendationCard data={msg.data.recommendation} t={t} language={language} bn={bn} num={num} isBn={isBn} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-slide-up">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t("consult.thinking")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={t("consult.placeholder")}
                className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[48px] max-h-[120px]"
                rows={1} disabled={loading} />
              <div className="absolute right-2 bottom-2">
                <VoiceInput onResult={(text) => sendMessage(text)} />
              </div>
            </div>
            <Button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="h-12 w-12 rounded-xl shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">{t("consult.disclaimer")}</p>
        </div>
      </div>
    </div>
  );
}

function NeoRecommendationCard({
  data, t, language, bn, num, isBn,
}: {
  data: NonNullable<ConsultResponse["recommendation"]>;
  t: (k: string) => string;
  language: string;
  bn: (s: string) => string;
  num: (n: number) => string;
  isBn: boolean;
}) {
  const { primaryRemedy, alternativeRemedies, generalAdvice, whenToSeekHelp } = data;

  return (
    <div className="mt-4 space-y-4">
      <div className="p-4 rounded-xl bg-background border border-primary/30">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t("consult.primaryRemedy")}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Pill className="h-5 w-5 text-foreground" />
          <span className="text-lg font-bold">{bn(primaryRemedy.name)}</span>
          {!isBn && <Badge variant="secondary">{primaryRemedy.abbr}</Badge>}
        </div>
        <ConfidenceBar value={primaryRemedy.confidence} className="mb-3" />
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{primaryRemedy.explanation}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-card border border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("consult.dosage")}</span>
            <p className="text-xs mt-1">{primaryRemedy.dosage}</p>
          </div>
          {primaryRemedy.keyIndications?.length > 0 && (
            <div className="p-2 rounded-lg bg-card border border-border">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("consult.keyIndications")}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {primaryRemedy.keyIndications.map((ind, i) => (<Badge key={i} variant="secondary" className="text-[10px]">{ind}</Badge>))}
              </div>
            </div>
          )}
        </div>
      </div>

      {alternativeRemedies?.length > 0 && (
        <div className="p-3 rounded-xl bg-background border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("consult.alternatives")} ({num(alternativeRemedies.length)})
            </span>
          </div>
          <div className="space-y-1.5">
            {alternativeRemedies.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                <span className="text-[10px] font-bold text-muted-foreground w-5 text-center shrink-0">{num(i + 2)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{bn(r.name)}</span>
                    {!isBn && <Badge variant="secondary" className="text-[10px] shrink-0">{r.abbr}</Badge>}
                  </div>
                  {r.brief && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{r.brief}</p>}
                </div>
                <div className="shrink-0 w-10 text-right">
                  <span className="text-[10px] font-medium text-muted-foreground">{num(r.confidence)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {generalAdvice && (
        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-xs font-medium text-muted-foreground">{t("consult.generalAdvice")}</span>
          <p className="text-xs mt-1 text-muted-foreground leading-relaxed">{generalAdvice}</p>
        </div>
      )}

      {whenToSeekHelp && (
        <div className="p-3 rounded-xl bg-background border border-yellow-900/30">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">{t("consult.whenToSeek")}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{whenToSeekHelp}</p>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-background border border-border">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">{t("consult.disclaimer")}</p>
      </div>
    </div>
  );
}
