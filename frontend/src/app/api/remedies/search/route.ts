import { NextRequest, NextResponse } from "next/server";
import remedySearchIndex from "@/data/generated/remedy-search-index.json";
import { repBnToEn } from "@/i18n/repertoryBn";
import { searchDataHeaders } from "@/lib/cacheHeaders";

type SearchEntry = {
  id: string;
  name: string;
  abbr: string;
  lower: string;
  abbrLower: string;
  descLower: string;
  bnLower: string;
};

const searchIndex = remedySearchIndex as SearchEntry[];

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
      ? entry.bnLower.includes(query) || (englishQuery && (entry.lower.includes(englishQuery) || entry.descLower.includes(englishQuery)))
      : entry.lower.includes(query) || entry.abbrLower.includes(query) || entry.descLower.includes(query) || entry.bnLower.includes(query);

    if (match) {
      results.push({
        id: entry.id,
        name: entry.name,
        abbr: entry.abbr,
        type: "remedy",
      });
      if (results.length >= 50) break;
    }
  }

  return NextResponse.json({ results }, { headers: searchDataHeaders });
}
