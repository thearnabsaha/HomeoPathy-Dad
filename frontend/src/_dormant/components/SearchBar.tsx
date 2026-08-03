"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, Clock, ArrowLeft, Pill, Stethoscope } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { api } from "@/lib/api";
import { VoiceInput } from "@/components/VoiceInput";
import { translateData } from "@/i18n/dataTranslations";

interface SearchBarProps {
  onSelectSymptom?: (id: string) => void;
  onSelectRemedy?: (id: string) => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function SearchBar({ onSelectSymptom, onSelectRemedy }: SearchBarProps) {
  const { t, language } = useTranslation();
  const { searches, addSearch } = useRecentSearches();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{
    symptoms: { id: string; name: string; chapter: string }[];
    remedies: { id: string; name: string; abbr: string }[];
  }>({ symptoms: [], remedies: [] });
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => mobileInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ symptoms: [], remedies: [] });
      return;
    }
    setLoading(true);
    try {
      const [symRes, remRes] = await Promise.all([
        api.searchSymptoms(q),
        api.searchRemedies(q),
      ]);
      setResults({
        symptoms: symRes.results.slice(0, 8),
        remedies: remRes.results.slice(0, 8),
      });
    } catch {
      setResults({ symptoms: [], remedies: [] });
    }
    setLoading(false);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const selectSymptom = (id: string, name: string) => {
    addSearch(name);
    setQuery("");
    setIsOpen(false);
    setMobileOpen(false);
    onSelectSymptom?.(id);
  };

  const selectRemedy = (id: string, name: string) => {
    addSearch(name);
    setQuery("");
    setIsOpen(false);
    setMobileOpen(false);
    onSelectRemedy?.(id);
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setQuery("");
    setResults({ symptoms: [], remedies: [] });
  };

  const hasResults = results.symptoms.length > 0 || results.remedies.length > 0;
  const showRecent = query.length === 0 && searches.length > 0;

  const renderResults = (large: boolean) => (
    <>
      {loading && (
        <div className="px-4 py-4 text-sm text-muted-foreground text-center">
          <div className="inline-flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            {t("common.loading")}
          </div>
        </div>
      )}

      {showRecent && (
        <div className={large ? "px-4 py-2" : "p-2"}>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("search.recent")}
          </div>
          {searches.map((s, i) => (
            <button
              key={i}
              onClick={() => handleChange(s)}
              className={`flex items-center gap-3 w-full px-3 text-left hover:bg-accent active:bg-accent rounded-lg transition-colors ${
                large ? "py-3 text-base" : "py-1.5 text-sm"
              }`}
            >
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}

      {results.symptoms.length > 0 && (
        <div className={large ? "px-4 py-2" : "p-2"}>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-3 w-3" />
            {t("search.symptoms")}
          </div>
          {results.symptoms.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSymptom(s.id, s.name)}
              className={`flex flex-col w-full px-3 text-left hover:bg-accent active:bg-accent rounded-lg transition-colors ${
                large ? "py-3" : "py-1.5"
              }`}
            >
              <span className={large ? "text-base" : "text-sm"}>
                {translateData(s.name, language)}
              </span>
              <span className="text-xs text-muted-foreground">
                {translateData(s.chapter, language)}
              </span>
            </button>
          ))}
        </div>
      )}

      {results.remedies.length > 0 && (
        <div className={large ? "px-4 py-2 border-t border-border" : "p-2 border-t border-border"}>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Pill className="h-3 w-3" />
            {t("search.remedies")}
          </div>
          {results.remedies.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRemedy(r.id, r.name)}
              className={`flex items-center gap-3 w-full px-3 text-left hover:bg-accent active:bg-accent rounded-lg transition-colors ${
                large ? "py-3" : "py-1.5"
              }`}
            >
              <span className={large ? "text-base flex-1" : "text-sm"}>
                {translateData(r.name, language)}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{r.abbr}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && !hasResults && (
        <div className="px-4 py-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("search.noResults")}</p>
        </div>
      )}
    </>
  );

  const mobileOverlay = mobileOpen && portalRoot
    ? createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "hsl(var(--background))",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderBottom: "1px solid hsl(var(--border))",
            }}
          >
            <button
              onClick={closeMobile}
              style={{
                padding: "8px",
                color: "hsl(var(--muted-foreground))",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </button>
            <div style={{ flex: 1, position: "relative" }}>
              <Search
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "hsl(var(--muted-foreground))",
                }}
              />
              <input
                ref={mobileInputRef}
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={t("search.placeholder")}
                autoFocus
                enterKeyHint="search"
                style={{
                  width: "100%",
                  paddingLeft: 40,
                  paddingRight: 60,
                  paddingTop: 12,
                  paddingBottom: 12,
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                  fontSize: 19,
                  outline: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setResults({ symptoms: [], remedies: [] });
                      mobileInputRef.current?.focus();
                    }}
                    style={{
                      padding: 6,
                      color: "hsl(var(--muted-foreground))",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                )}
                <VoiceInput
                  onResult={(text) => {
                    setQuery(text);
                    handleChange(text);
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>{renderResults(true)}</div>
        </div>,
        portalRoot
      )
    : null;

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground text-sm active:bg-accent"
          style={{ minWidth: 120, touchAction: "manipulation" }}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("search.placeholder")}</span>
        </button>
        {mobileOverlay}
      </>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={t("search.placeholder")}
          className="w-full pl-9 pr-16 py-2 rounded-md border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="absolute right-1 flex items-center gap-1">
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults({ symptoms: [], remedies: [] });
              }}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <VoiceInput
            onResult={(text) => {
              setQuery(text);
              handleChange(text);
            }}
          />
        </div>
      </div>

      {isOpen &&
        (hasResults || showRecent || loading || (query.length >= 2 && !hasResults)) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-xl max-h-[70vh] overflow-y-auto">
            {renderResults(false)}
          </div>
        )}
    </div>
  );
}
