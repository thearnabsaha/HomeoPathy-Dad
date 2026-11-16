import { NextRequest, NextResponse } from "next/server";
import symptomSearchIndex from "@/data/generated/symptom-search-index.json";
import { repBnToEn } from "@/i18n/repertoryBn";
import { searchDataHeaders } from "@/lib/cacheHeaders";

type SearchEntry = {
  id: string;
  name: string;
  nameLower: string;
  bnLower: string;
  type: string;
  chapter: string;
  parent?: string;
};

const searchIndex = symptomSearchIndex as SearchEntry[];

function isBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

export function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get("q") || "").trim();
  if (!raw || raw.length < 2) {
    return NextResponse.json({ results: [] }, { headers: searchDataHeaders });
  }

  const query = raw.toLowerCase();
  const bengali = isBengali(raw);
  const bnToEn = repBnToEn;

  let englishQuery = "";
  if (bengali && bnToEn[raw]) {
    englishQuery = bnToEn[raw].toLowerCase();
  }

  const results = [];

  for (const entry of searchIndex) {
    const match = bengali
      ? entry.bnLower.includes(query) || (englishQuery && entry.nameLower.includes(englishQuery))
      : entry.nameLower.includes(query) || entry.bnLower.includes(query);

    if (match) {
      results.push({
        id: entry.id,
        name: entry.name,
        type: entry.type,
        chapter: entry.chapter,
        parent: entry.parent,
      });
      if (results.length >= 75) break;
    }
  }

  return NextResponse.json({ results }, { headers: searchDataHeaders });
}
