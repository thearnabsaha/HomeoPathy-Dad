"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VoiceInput } from "@/components/VoiceInput";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { useTranslation } from "@/i18n/useTranslation";
import { neoApi } from "@/lib/neoApi";
import { translateRepertory } from "@/i18n/repertoryBn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  remedies?: { name: string; abbr: string; confidence: number; brief: string }[];
  precautions?: string;
}

export function NeoChatWidget() {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: t("chat.welcome"),
        },
      ]);
    } else if (messages.length > 0) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "welcome" ? { ...m, content: t("chat.welcome") } : m
        )
      );
    }
  }, [isOpen, messages.length, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await neoApi.chat(trimmed, language);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        remedies: response.remedies,
        precautions: response.precautions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: t("chat.error"),
        },
      ]);
    }

    setLoading(false);
  };

  const chatTitle = language === "bn" ? "নিওএআই চ্যাট" : "NeoAI Chat";

  return (
    <>
      {/* Toggle button - fixed bottom-right, purple/violet via bg-primary */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-6 z-50 sm:w-[360px] h-[70vh] sm:h-[500px] rounded-lg border border-border bg-background shadow-xl flex flex-col animate-slide-up">
          {/* Header - Sparkles icon and NeoAI Chat / নিওএআই চ্যাট */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold flex-1">{chatTitle}</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  <p className="text-xs leading-relaxed">{msg.content}</p>

                  {msg.remedies && msg.remedies.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.remedies.map((r, i) => (
                        <div key={i} className="p-2 rounded bg-background/50 border border-border">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-medium">
                              {language === "bn" ? translateRepertory(r.name) : r.name}
                            </span>
                            {language !== "bn" && r.abbr && (
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {r.abbr}
                              </Badge>
                            )}
                          </div>
                          <ConfidenceBar value={r.confidence} className="mb-1" />
                          <p className="text-[10px] text-muted-foreground">{r.brief}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.precautions && (
                    <p className="mt-2 text-[10px] text-muted-foreground italic">
                      {msg.precautions}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t("chat.thinking")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder={t("chat.placeholder")}
                className="flex-1 text-xs h-8"
                disabled={loading}
              />
              <VoiceInput onResult={(text) => sendMessage(text)} />
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
