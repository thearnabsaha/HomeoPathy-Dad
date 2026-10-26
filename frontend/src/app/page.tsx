"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Stethoscope, BookOpen, Globe, Mic, Zap, Smartphone, Clock,
  ArrowRight, MessageCircle, Search, CheckCircle2, Sparkles, HeartPulse,
  LogIn, User, Database, Shield, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { toBengaliNumeral } from "@/i18n/repertoryBn";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useNeoAuth } from "@/hooks/useNeoAuth";

export default function LandingPage() {
  const { t, language } = useTranslation();
  const isBn = language === "bn";
  const { user } = useNeoAuth();
  const n = (v: string) => {
    if (!isBn) return v;
    return v.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d)]);
  };

  const features = [
    { icon: Brain, title: isBn ? "AI ডায়াগনস্টিক ডাক্তার" : "AI Diagnostic Doctor", desc: isBn ? "৩ ধাপে প্রশ্ন-উত্তর করে সঠিক ওষুধ খুঁজে দেবে। টাইপ করতে হবে না!" : "3-round structured Q&A finds the right medicine. No typing needed!" },
    { icon: BookOpen, title: isBn ? "ক্লাসিক্যাল রেপার্টরি" : "Classical Repertory", desc: isBn ? "৪৩টি রেপার্টরি, ৭,২৩৯ লক্ষণ, ১,১০৩ ওষুধ ও ৯৫,৯০৭ সম্পর্ক।" : "43 repertories, 7,239 symptoms, 1,103 medicines & 95,907 relationships." },
    { icon: Stethoscope, title: isBn ? "ফ্রি-ফর্ম AI পরামর্শ" : "Free-form AI Consult", desc: isBn ? "AI চিকিৎসকের সাথে মুক্ত কথোপকথনে ওষুধ খুঁজুন।" : "Chat freely with AI physician to find the right remedy." },
    { icon: Globe, title: isBn ? "সম্পূর্ণ দ্বিভাষী" : "Fully Bilingual", desc: isBn ? "বাংলা ও ইংরেজি — প্রতিটি শব্দ অনুবাদিত।" : "Bengali & English — every single word translated." },
    { icon: Mic, title: isBn ? "ভয়েস ইনপুট" : "Voice Input", desc: isBn ? "কথা বলে লক্ষণ জানান, লিখতে হবে না।" : "Describe symptoms by voice, no typing needed." },
    { icon: Database, title: isBn ? "ক্লাউড ইতিহাস" : "Cloud History", desc: isBn ? "লগইন করে পরামর্শ সংরক্ষণ করুন, যেকোনো ডিভাইসে দেখুন।" : "Login to save consultations, access from any device." },
    { icon: Shield, title: isBn ? "নিরাপদ অ্যাকাউন্ট" : "Secure Accounts", desc: isBn ? "এনক্রিপ্টেড পাসওয়ার্ড, JWT অথেনটিকেশন।" : "Encrypted passwords, JWT authentication." },
    { icon: Smartphone, title: isBn ? "মোবাইল ফ্রেন্ডলি" : "Mobile Friendly", desc: isBn ? "PWA — ফোনে অ্যাপের মতো চলবে।" : "PWA — works like a native app on phone." },
    { icon: Zap, title: isBn ? "বজ্র-দ্রুত" : "Lightning Fast", desc: isBn ? "অপটিমাইজড ক্যাশিং, লেজি লোডিং।" : "Optimized caching, lazy loading." },
  ];

  const steps = [
    { icon: MessageCircle, num: n("01"), title: isBn ? "সমস্যা বলুন" : "Describe Problem", desc: isBn ? "আপনার সমস্যা বর্ণনা করুন — ভয়েস বা টাইপ করে।" : "Describe your problem — by voice or typing." },
    { icon: Search, num: n("02"), title: isBn ? "৩ ধাপে প্রশ্ন-উত্তর" : "3-Round Q&A", desc: isBn ? "সিলেক্ট বক্স থেকে উত্তর দিন। প্রতিবার আরও লক্ষণ যোগ করতে পারবেন।" : "Answer via selection boxes. Add more symptoms each time." },
    { icon: CheckCircle2, num: n("03"), title: isBn ? "ওষুধ পান" : "Get Medicines", desc: isBn ? "১০-১৫টি ওষুধ, মাত্রা, ব্যাখ্যা সহ। নাম দিয়ে সংরক্ষণ করুন।" : "10-15 medicines with dosage & explanation. Save with a name." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon-192.png"
              alt="NeoAI"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover shadow-sm"
            />
            <span className="font-bold text-sm tracking-tight">NeoAI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/explorer">
              <Button variant="ghost" size="sm" className="text-xs hidden sm:inline-flex">{t("nav.explorer")}</Button>
            </Link>
            <Link href="/repertory">
              <Button variant="ghost" size="sm" className="text-xs hidden sm:inline-flex">{t("nav.repertory")}</Button>
            </Link>
            <Link href="/doctor">
              <Button size="sm" className="text-xs gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isBn ? "AI ডাক্তার" : "AI Doctor"}</span>
              </Button>
            </Link>
            <Link href="/doctor/history">
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 hidden sm:inline-flex">
                <Clock className="h-3.5 w-3.5" />
                {isBn ? "ইতিহাস" : "History"}
              </Button>
            </Link>
            {user ? (
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="hidden sm:inline">
                    {user?.name ? user.name.split(" ")[0] : (user?.email?.split("@")[0] || "")}
                  </span>
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  {isBn ? "লগইন" : "Login"}
                </Button>
              </Link>
            )}
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center text-center pt-20 sm:pt-28 pb-16 sm:pb-24">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary mb-8 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 animate-pulse-slow" />
              {isBn ? "ক্লাসিক্যাল রেপার্টরি দ্বারা প্রশিক্ষিত AI" : "AI Trained on Classical Repertory"}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 max-w-4xl animate-fade-in">
              {isBn ? (
                <>
                  <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">NeoAI</span>{" "}
                  হোমিওপ্যাথিক চিকিৎসক
                </>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">NeoAI</span>{" "}
                  Homeopathic Physician
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-fade-in">
              {isBn
                ? "ক্লাসিক্যাল রেপার্টরি ডাটাবেসে প্রশিক্ষিত AI ডাক্তার। ৩ ধাপে প্রশ্ন-উত্তর — সিলেক্ট বক্স থেকে উত্তর দিন, টাইপ করতে হবে না। সঠিক হোমিওপ্যাথিক ওষুধ খুঁজুন।"
                : "AI doctor trained on classical repertory database. Answer in 3 rounds via selection boxes — no typing. Find the right homeopathic medicine with confidence scores."}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mb-16 animate-fade-in">
              <Link href="/doctor">
                <Button size="lg" className="gap-2.5 text-sm px-8 py-3 h-12 rounded-xl w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02]">
                  <HeartPulse className="h-5 w-5" />
                  {isBn ? "AI ডাক্তার শুরু করুন" : "Start AI Doctor"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/explorer">
                <Button variant="outline" size="lg" className="gap-2 text-sm px-6 py-3 h-12 rounded-xl w-full sm:w-auto hover:bg-primary/5 transition-all">
                  <BookOpen className="h-4 w-4" />
                  {isBn ? "রেপার্টরি দেখুন" : "Explore Repertory"}
                </Button>
              </Link>
              <Link href="/consult">
                <Button variant="outline" size="lg" className="gap-2 text-sm px-6 py-3 h-12 rounded-xl w-full sm:w-auto hover:bg-primary/5 transition-all">
                  <Stethoscope className="h-4 w-4" />
                  {isBn ? "ফ্রি-ফর্ম পরামর্শ" : "Free-form Consult"}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 w-full max-w-xl animate-fade-in">
              {[
                { val: n("1103"), label: isBn ? "ওষুধ" : "Medicines" },
                { val: n("7239"), label: isBn ? "লক্ষণ" : "Symptoms" },
                { val: n("43"), label: isBn ? "রেপার্টরি" : "Repertories" },
                { val: n("95907"), label: isBn ? "সম্পর্ক" : "Relations" },
              ].map((s, i) => (
                <div key={i} className="text-center group">
                  <div className="text-3xl sm:text-4xl font-bold text-primary group-hover:scale-105 transition-transform">{s.val}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* How it works */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 sm:mb-18">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
              {isBn ? "কিভাবে কাজ করে" : "How It Works"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              {isBn ? "৩টি সহজ ধাপ" : "3 Simple Steps"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative p-7 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 group">
                <div className="text-[10px] font-mono text-muted-foreground/30 mb-5">{step.num}</div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-4 h-4 w-4 text-muted-foreground/20 -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Features grid */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 sm:mb-18">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
              {isBn ? "বৈশিষ্ট্যসমূহ" : "Features"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              {isBn ? "সবকিছু এক জায়গায়" : "Everything in One Place"}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {features.map((feat, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-border hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-2">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 sm:py-28 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <HeartPulse className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {isBn ? "এখনই শুরু করুন" : "Get Started Now"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            {isBn
              ? "বিনামূল্যে ব্যবহার করুন। লগইন করে আপনার পরামর্শ ক্লাউডে সংরক্ষণ করুন।"
              : "Use for free. Login to save your consultations to the cloud."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/doctor">
              <Button size="lg" className="gap-2.5 text-sm px-8 py-3 h-12 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02]">
                <HeartPulse className="h-5 w-5" />
                {isBn ? "AI ডাক্তার শুরু করুন" : "Start AI Doctor"}
              </Button>
            </Link>
            {!user && (
              <Link href="/login">
                <Button variant="outline" size="lg" className="gap-2 text-sm px-6 py-3 h-12 rounded-xl">
                  <LogIn className="h-4 w-4" />
                  {isBn ? "সাইন আপ / লগইন" : "Sign Up / Login"}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image
              src="/icon-192.png"
              alt="NeoAI"
              width={24}
              height={24}
              className="h-6 w-6 rounded-md object-cover shadow-sm"
            />
            <span className="text-xs font-bold tracking-tight">NeoAI</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed max-w-xl mx-auto mb-3">
            {isBn
              ? "এটি শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। পেশাদার হোমিওপ্যাথিক পরামর্শের বিকল্প নয়।"
              : "For educational purposes only. Not a substitute for professional homeopathic advice."}
          </p>
          <p className="text-[10px] text-muted-foreground/30">
            {isBn ? "ক্লাসিক্যাল রেপার্টরি দ্বারা চালিত" : "Powered by Classical Repertory"}
          </p>
        </div>
      </footer>
    </div>
  );
}
