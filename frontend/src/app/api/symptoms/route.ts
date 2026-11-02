import { NextRequest, NextResponse } from "next/server";
import { neoSymptomsData } from "@/data/neoLoader";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

let cachedTop: unknown[] | null = null;
const childrenMap = new Map<string, { children: unknown[]; type: string }>();

function initData() {
  if (cachedTop && childrenMap.size > 0) return;
  const chapters = neoSymptomsData.chapters;

  cachedTop = chapters.map((ch) => {
    const conditions = ch.conditions.map((cond) => ({
      id: cond.id,
      name: cond.name,
      symptomCount: cond.symptoms.length,
    }));

    childrenMap.set(ch.id, { children: conditions, type: "conditions" });

    for (const cond of ch.conditions) {
      const symptoms = cond.symptoms.map((sym) => ({
        id: sym.id,
        name: sym.name,
        hasSubSymptoms: sym.subSymptoms.length > 0,
        subSymptomCount: sym.subSymptoms.length,
      }));
      childrenMap.set(cond.id, { children: symptoms, type: "symptoms" });

      for (const sym of cond.symptoms) {
        if (sym.subSymptoms.length > 0) {
          const subs = sym.subSymptoms.map((sub) => ({
            id: sub.id,
            name: sub.name,
          }));
          childrenMap.set(sym.id, { children: subs, type: "subSymptoms" });
        }
      }
    }

    return {
      id: ch.id,
      name: ch.name,
      order: ch.order,
      conditionCount: ch.conditions.length,
      conditions,
    };
  });
}

export function GET(request: NextRequest) {
  initData();
  const parentId = request.nextUrl.searchParams.get("parent");

  if (!parentId) {
    return NextResponse.json({ chapters: cachedTop }, { headers: CACHE_HEADERS });
  }

  const hit = childrenMap.get(parentId);
  if (hit) {
    return NextResponse.json(hit, { headers: CACHE_HEADERS });
  }

  return NextResponse.json({ children: [], type: "unknown" }, { headers: CACHE_HEADERS });
}
