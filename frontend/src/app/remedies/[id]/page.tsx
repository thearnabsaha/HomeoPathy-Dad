"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, Pill, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioReader } from "@/components/AudioReader";
import { BookmarkButton } from "@/components/BookmarkButton";
import { useTranslation } from "@/i18n/useTranslation";
import { neoApi } from "@/lib/neoApi";
import type { RemedyDetail } from "@/lib/types";
import { translateRepertory, medDescBn, medDosageBn, medWorseBn, medBetterBn } from "@/i18n/repertoryBn";
import { AuthGuard } from "@/components/AuthGuard";

export default function NeoRemedyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AuthGuard><RemedyContent params={params} /></AuthGuard>;
}

function RemedyContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, language } = useTranslation();
  const isBn = language === "bn";
  const bn = (s: string) => (isBn ? translateRepertory(s) : s);
  const [data, setData] = useState<RemedyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    neoApi.getRemedyById(id)
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => { setError(t("common.error")); setLoading(false); });
  }, [id, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-24 w-full" />))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{error || t("common.error")}</p>
          <Link href="/"><Button variant="outline">{t("common.back")}</Button></Link>
        </div>
      </div>
    );
  }

  const { remedy } = data;
  const nameUpper = remedy.name.toUpperCase();
  const descText = isBn ? (medDescBn[nameUpper] || medDescBn[remedy.name] || bn(remedy.description)) : remedy.description;
  const dosageText = isBn ? (medDosageBn[nameUpper] || medDosageBn[remedy.name] || bn(remedy.dosage)) : remedy.dosage;
  const worseItems = isBn
    ? (Array.isArray(medWorseBn[nameUpper]) && medWorseBn[nameUpper].length > 0
        ? medWorseBn[nameUpper]
        : Array.isArray(medWorseBn[remedy.name]) && medWorseBn[remedy.name].length > 0
        ? medWorseBn[remedy.name]
        : remedy.modalities?.worse?.map(bn))
    : remedy.modalities?.worse;
  const betterItems = isBn
    ? (Array.isArray(medBetterBn[nameUpper]) && medBetterBn[nameUpper].length > 0
        ? medBetterBn[nameUpper]
        : Array.isArray(medBetterBn[remedy.name]) && medBetterBn[remedy.name].length > 0
        ? medBetterBn[remedy.name]
        : remedy.modalities?.better?.map(bn))
    : remedy.modalities?.better;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/explorer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center">
                <Pill className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{bn(remedy.name)}</h1>
                {!isBn && <span className="text-sm text-muted-foreground">{remedy.abbr}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AudioReader text={`${remedy.name}. ${remedy.description}`} />
            <BookmarkButton id={remedy.id} name={remedy.name} type="remedy" />
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("remedy.description")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{descText}</p>
        </section>

        {remedy.dosage && (
          <section className="mb-8 p-4 rounded-lg bg-card border border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("remedy.dosage")}</h2>
            <p className="text-sm">{dosageText}</p>
          </section>
        )}

        {remedy.modalities && (
          <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {worseItems && worseItems.length > 0 && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("remedy.worse")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {worseItems.map((w, i) => (<Badge key={i} variant="secondary" className="text-xs">{w}</Badge>))}
                </div>
              </div>
            )}
            {betterItems && betterItems.length > 0 && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("remedy.better")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {betterItems.map((b, i) => (<Badge key={i} variant="secondary" className="text-xs">{b}</Badge>))}
                </div>
              </div>
            )}
          </section>
        )}

        {remedy.relatedRemedies && remedy.relatedRemedies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("remedy.related")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {remedy.relatedRemedies.map((rel) => (
                <Link key={rel.id} href={`/remedies/${rel.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-muted-foreground/30 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{bn(rel.name)}</span>
                    {!isBn && <span className="text-xs text-muted-foreground ml-2">({rel.abbr})</span>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{t("remedy.disclaimer")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
