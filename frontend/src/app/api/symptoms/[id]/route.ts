import { NextResponse } from "next/server";
import childrenMap from "@/data/generated/children.json";
import { getNeoRemedyById, getNeoSymptomById, getRubricsForNode } from "@/data/neoLoader";
import { staticDataHeaders } from "@/lib/cacheHeaders";

export const revalidate = 3600;

const children = childrenMap as Record<string, { children: { id: string; name: string; hasSubSymptoms?: boolean; subSymptomCount?: number; symptomCount?: number }[]; type: string }>;

function breadcrumbFor(id: string): { id: string; name: string }[] {
  const symptomById = getNeoSymptomById();
  const found = symptomById.get(id);
  if (!found) return [];
  const crumb: { id: string; name: string }[] = [];
  const pushId = (nid?: string) => {
    if (!nid) return;
    const meta = symptomById.get(nid);
    if (meta) crumb.push({ id: meta.id, name: meta.name });
  };
  if (found.type === "repertory") {
    pushId(found.id);
  } else if (found.type === "condition") {
    pushId(found.chapterId);
    pushId(found.id);
  } else if (found.type === "symptom") {
    pushId(found.chapterId);
    pushId(found.conditionId);
    pushId(found.id);
  } else if (found.type === "subSymptom") {
    pushId(found.chapterId);
    pushId(found.conditionId);
    pushId(found.parentSymptomId);
    pushId(found.id);
  }
  return crumb;
}

function childSymptoms(id: string, type: string): { id: string; name: string; hasSubSymptoms: boolean }[] {
  const hit = children[id];
  if (!hit) return [];
  if (type === "repertory") {
    return hit.children.map((c) => ({
      id: c.id,
      name: c.name,
      hasSubSymptoms: (c.symptomCount || 0) > 0,
    }));
  }
  if (type === "condition") {
    return hit.children.map((s) => ({
      id: s.id,
      name: s.name,
      hasSubSymptoms: Boolean(s.hasSubSymptoms) || (s.subSymptomCount || 0) > 0,
    }));
  }
  if (type === "symptom") {
    return hit.children.map((s) => ({
      id: s.id,
      name: s.name,
      hasSubSymptoms: false,
    }));
  }
  return [];
}

export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(({ id }) => {
    const symptomById = getNeoSymptomById();
    const remedyById = getNeoRemedyById();
    const found = symptomById.get(id);
    if (!found) {
      return NextResponse.json({ error: "Symptom not found" }, { status: 404 });
    }

    const subSymptoms = childSymptoms(id, found.type);
    const allRubricEntries = getRubricsForNode(id);

    const remedyAgg = new Map<string, { grade: number; rawRank: number }>();
    for (const entry of allRubricEntries) {
      const existing = remedyAgg.get(entry.remedyId);
      if (!existing) {
        remedyAgg.set(entry.remedyId, { grade: entry.grade, rawRank: entry.rawRank });
      } else {
        if (entry.grade > existing.grade) existing.grade = entry.grade;
        if (entry.rawRank > existing.rawRank) existing.rawRank = entry.rawRank;
      }
    }

    const symptomRemedies = [...remedyAgg.entries()]
      .map(([remedyId, { grade, rawRank }]) => {
        const remedy = remedyById.get(remedyId);
        return remedy
          ? {
              id: remedy.id,
              name: remedy.name,
              abbr: remedy.abbr,
              strength: grade,
              rawRank,
              description: remedy.description,
              descriptionBn: remedy.descriptionBn,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        const br = b as { rawRank: number; strength: number };
        const ar = a as { rawRank: number; strength: number };
        if (br.rawRank !== ar.rawRank) return br.rawRank - ar.rawRank;
        return br.strength - ar.strength;
      })
      .slice(0, 200);

    const body = {
      symptom: { id: found.id, name: found.name, type: found.type, subSymptoms },
      breadcrumb: breadcrumbFor(id),
      remedies: symptomRemedies,
    };

    return NextResponse.json(body, { headers: staticDataHeaders });
  });
}
