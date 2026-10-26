"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, LogOut, User, Mail, Shield, Clock, Sparkles,
  HeartPulse, BookOpen, Database, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { useNeoAuth } from "@/hooks/useNeoAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}

function ProfileContent() {
  const { language } = useTranslation();
  const isBn = language === "bn";
  const { user, logout } = useNeoAuth();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const quickLinks = [
    { href: "/doctor", icon: HeartPulse, label: isBn ? "AI ডাক্তার" : "AI Doctor", desc: isBn ? "নতুন পরামর্শ শুরু করুন" : "Start a new consultation" },
    { href: "/doctor/history", icon: Database, label: isBn ? "পরামর্শ ইতিহাস" : "Consultation History", desc: isBn ? "সংরক্ষিত পরামর্শ দেখুন" : "View saved consultations" },
    { href: "/explorer", icon: BookOpen, label: isBn ? "রেপার্টরি এক্সপ্লোরার" : "Repertory Explorer", desc: isBn ? "লক্ষণ ও ওষুধ অনুসন্ধান" : "Browse symptoms & remedies" },
    { href: "/repertory", icon: BookOpen, label: isBn ? "ক্লাসিক্যাল রেপার্টরি" : "Classical Repertory", desc: isBn ? "৪৩টি রেপার্টরি ব্রাউজ করুন" : "Browse 43 repertories" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 h-14 max-w-2xl mx-auto w-full">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Image
            src="/icon-192.png"
            alt="NeoAI"
            width={24}
            height={24}
            className="h-6 w-6 rounded-md object-cover"
          />
          <span className="text-sm font-semibold flex-1">{isBn ? "প্রোফাইল" : "Profile"}</span>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        {/* User card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{user?.name}</h1>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{isBn ? "ইমেইল" : "Email"}</p>
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{isBn ? "অ্যাকাউন্ট" : "Account"}</p>
                <p className="text-sm font-medium">{isBn ? "সক্রিয়" : "Active"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{isBn ? "সেশন" : "Session"}</p>
                <p className="text-sm font-medium">{isBn ? "৩০ দিন পর্যন্ত সক্রিয়" : "Active for up to 30 days"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold">{isBn ? "দ্রুত লিংক" : "Quick Links"}</h2>
          </div>
          <div className="divide-y divide-border">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors group">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <link.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="rounded-2xl border border-destructive/20 bg-card p-6">
          <h2 className="text-sm font-semibold mb-2">{isBn ? "লগআউট" : "Logout"}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {isBn
              ? "লগআউট করলে আপনাকে আবার লগইন করতে হবে। লোকাল ডেটা মুছে যাবে না।"
              : "You will need to login again. Local data will not be deleted."}
          </p>
          {!confirmLogout ? (
            <Button variant="outline" onClick={() => setConfirmLogout(true)} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-4 w-4" />
              {isBn ? "লগআউট করুন" : "Logout"}
            </Button>
          ) : (
            <div className="flex items-center gap-3 animate-fade-in">
              <Button variant="destructive" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                {isBn ? "নিশ্চিত লগআউট" : "Confirm Logout"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmLogout(false)} className="text-xs">
                {isBn ? "বাতিল" : "Cancel"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
