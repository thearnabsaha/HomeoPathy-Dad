"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Eye, EyeOff, ArrowLeft, Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { useNeoAuth } from "@/hooks/useNeoAuth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function NeoLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { language } = useTranslation();
  const isBn = language === "bn";
  const { user, login, signup, loading: authLoading } = useNeoAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace(redirectTo);
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = mode === "login"
      ? await login(email, password)
      : await signup(email, password, name);

    if (res.ok) {
      router.push(redirectTo);
    } else {
      setError(res.error || (isBn ? "কিছু ভুল হয়েছে" : "Something went wrong"));
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 h-14 max-w-md mx-auto w-full">
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
          <span className="text-sm font-semibold flex-1">{isBn ? "নিও জোন" : "Neo Zone"}</span>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/icon-192.png"
              alt="NeoAI"
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl object-cover shadow-lg mb-4"
            />
            <h1 className="text-2xl font-bold">
              {mode === "login"
                ? (isBn ? "নিও জোনে লগইন" : "Login to Neo Zone")
                : (isBn ? "নিও জোনে সাইন আপ" : "Sign Up for Neo Zone")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isBn ? "আপনার পরামর্শ ইতিহাস সংরক্ষণ করুন" : "Save your consultation history"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted mb-6">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={cn("flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all",
                mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LogIn className="h-3.5 w-3.5" />
              {isBn ? "লগইন" : "Login"}
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              className={cn("flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all",
                mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isBn ? "সাইন আপ" : "Sign Up"}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {isBn ? "আপনার নাম" : "Your Name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBn ? "আপনার নাম লিখুন" : "Enter your name"}
                  required
                  className="w-full h-12 rounded-xl border border-border bg-card px-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {isBn ? "ইমেইল" : "Email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isBn ? "আপনার ইমেইল লিখুন" : "Enter your email"}
                required
                className="w-full h-12 rounded-xl border border-border bg-card px-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {isBn ? "পাসওয়ার্ড" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isBn ? "পাসওয়ার্ড লিখুন (ন্যূনতম ৬ অক্ষর)" : "Enter password (min 6 chars)"}
                  required
                  minLength={6}
                  className="w-full h-12 rounded-xl border border-border bg-card px-4 pr-12 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-fade-in">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading
                ? (isBn ? "অপেক্ষা করুন..." : "Please wait...")
                : mode === "login"
                  ? (isBn ? "লগইন করুন" : "Login")
                  : (isBn ? "অ্যাকাউন্ট তৈরি করুন" : "Create Account")}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground/40 text-center mt-6">
            {isBn ? "আপনার ডেটা নিরাপদে NeonDB-তে সংরক্ষিত থাকবে।" : "Your data is securely stored in NeonDB."}
          </p>
        </div>
      </div>
    </div>
  );
}
