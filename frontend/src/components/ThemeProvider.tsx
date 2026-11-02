"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect } from "react";

function ThemeColorUpdater() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "dark" ? "#09080c" : "#ffffff";

    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;

    const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]') as HTMLMetaElement | null;
    if (lightMeta) lightMeta.content = resolvedTheme === "dark" ? "#09080c" : "#ffffff";

    const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]') as HTMLMetaElement | null;
    if (darkMeta) darkMeta.content = resolvedTheme === "dark" ? "#09080c" : "#ffffff";
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeColorUpdater />
      {children}
    </NextThemesProvider>
  );
}

