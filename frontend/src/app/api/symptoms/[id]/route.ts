import { NextRequest, NextResponse } from "next/server";
import {
  getNeoSymptomById,
  getNeoRubrics,
  getNeoRemedyById,
  getNeoChapterById,
  neoSymptomsData,
} from "@/data/neoLoader";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
};

const responseCache = new Map<string, unknown>();

function collectChildRubrics(
  symptoms: { id: string; subSymptoms: { id: string }[] }[],
  rubrics: Record<string, { remedyId: string; grade: number; rawRank: number }[]>,
  out: { remedyId: string; grade: number; rawRank: number }[]
) {
  for (const sym of symptoms) {
    const r = rubrics[sym.id];
    if (r) out.push(...r);
    for (const sub of sym.subSymptoms) {
      const sr = rubrics[sub.id];
      if (sr) out.push(...sr);
    }
  }
}

export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const cached = responseCache.get(id);
    if (cached) {
      return NextResponse.json(cached, { headers: CACHE_HEADERS });
    }

    const symptomById = getNeoSymptomById();
    const rubrics = getNeoRubrics();
    const remedyById = getNeoRemedyById();
    const chapterById = getNeoChapterById();
    const chapters = neoSymptomsData.chapters;

    const found = symptomById.get(id);
    if (!found) {
      return NextResponse.json({ error: "Symptom not found" }, { status: 404 });
    }

    // Each child entry carries hasSubSymptoms so the UI can show an expand affordance only when there is a deeper level.
    let subSymptoms: { id: string; name: string; hasSubSymptoms: boolean }[] = [];
    const allRubricEntries: { remedyId: string; grade: number; rawRank: number }[] = [];

    if (found.type === "repertory") {
      const ch = chapterById.get(id);
      if (ch) {
        // Conditions effectively always have child symptoms in the dataset, but compute it honestly.
        subSymptoms = ch.conditions.map((c) => ({
          id: c.id,
          name: c.name,
          hasSubSymptoms: c.symptoms.length > 0,
        }));
        for (const cond of ch.conditions) collectChildRubrics(cond.symptoms, rubrics, allRubricEntries);
      }
    } else if (found.type === "condition") {
      outer_cond: for (const ch of chapters) {
        for (const cond of ch.conditions) {
          if (cond.id === id) {
            subSymptoms = cond.symptoms.map((s) => ({
              id: s.id,
              name: s.name,
              hasSubSymptoms: s.subSymptoms.length > 0,
            }));
            collectChildRubrics(cond.symptoms, rubrics, allRubricEntries);
            break outer_cond;
          }
        }
      }
    } else if (found.type === "symptom") {
      outer_sym: for (const ch of chapters) {
        for (const cond of ch.conditions) {
          for (const sym of cond.symptoms) {
            if (sym.id === id) {
              // sym.subSymptoms are leaf nodes in the data model; they never have deeper children.
              subSymptoms = sym.subSymptoms.map((s) => ({
                id: s.id,
                name: s.name,
                hasSubSymptoms: false,
              }));
              const r = rubrics[sym.id];
              if (r) allRubricEntries.push(...r);
              for (const sub of sym.subSymptoms) {
                const sr = rubrics[sub.id];
                if (sr) allRubricEntries.push(...sr);
              }
              break outer_sym;
            }
          }
        }
      }
    } else if (found.type === "subSymptom") {
      const r = rubrics[id];
      if (r) allRubricEntries.push(...r);
    }

    // Aggregate: highest grade + highest rawRank per remedy
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

    const symptomData = { id: found.id, name: found.name, type: found.type, subSymptoms };

    // Breadcrumb with navigable IDs
    const breadcrumb: { id: string; name: string }[] = [];
    if (found.type === "repertory") {
      breadcrumb.push({ id: found.id, name: found.name });
    } else if (found.type === "condition") {
      for (const ch of chapters) {
        if (ch.name === found.repertoryName) { breadcrumb.push({ id: ch.id, name: ch.name }); break; }
      }
      breadcrumb.push({ id: found.id, name: found.name });
    } else if (found.type === "symptom") {
      for (const ch of chapters) {
        if (ch.name === found.repertoryName) {
          breadcrumb.push({ id: ch.id, name: ch.name });
          for (const cond of ch.conditions) {
            if (cond.name === found.conditionName) { breadcrumb.push({ id: cond.id, name: cond.name }); break; }
          }
          break;
        }
      }
      breadcrumb.push({ id: found.id, name: found.name });
    } else if (found.type === "subSymptom") {
      for (const ch of chapters) {
        if (ch.name === found.repertoryName) {
          breadcrumb.push({ id: ch.id, name: ch.name });
          for (const cond of ch.conditions) {
            if (cond.name === found.conditionName) {
              breadcrumb.push({ id: cond.id, name: cond.name });
              for (const sym of cond.symptoms) {
                if (sym.name === found.symptomName) { breadcrumb.push({ id: sym.id, name: sym.name }); break; }
              }
              break;
            }
          }
          break;
        }
      }
      breadcrumb.push({ id: found.id, name: found.name });
    }

    const body = { symptom: symptomData, breadcrumb, remedies: symptomRemedies };
    responseCache.set(id, body);

    return NextResponse.json(body, { headers: CACHE_HEADERS });
  });
}
