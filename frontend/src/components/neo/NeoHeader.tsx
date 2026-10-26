"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeoSearchBar } from "@/components/neo/NeoSearchBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTranslation } from "@/i18n/useTranslation";

interface NeoHeaderProps {
  onToggleSidebar: () => void;
  onSelectSymptom?: (id: string) => void;
  onSelectRemedy?: (id: string) => void;
}

export function NeoHeader({ onToggleSidebar, onSelectSymptom, onSelectRemedy }: NeoHeaderProps) {
  const { language } = useTranslation();
  const isBn = language === "bn";

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center gap-2 px-2 sm:px-4">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 shrink-0">
          <Image
            src="/icon-192.png"
            alt="NeoAI Icon"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-cover shadow-sm"
          />
          <span className="font-semibold text-sm hidden sm:inline">{isBn ? "নিও জোন" : "Neo Zone"}</span>
        </div>
        <div className="flex-1 flex justify-center min-w-0 px-1">
          <NeoSearchBar onSelectSymptom={onSelectSymptom} onSelectRemedy={onSelectRemedy} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
