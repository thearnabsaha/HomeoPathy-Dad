import { NextRequest, NextResponse } from "next/server";
import { getNeoRubrics, getNeoRemedyById, getNeoSymptomById } from "@/data/neoLoader";

function findMatchingRubrics(symptomId: string, rubrics: Record<string, { remedyId: string; grade: number; rawRank: number }[]>) {
  const direct = rubrics[symptomId];
  if (direct && direct.length > 0) return [{ symptomId, remedies: direct }];

  const parts = symptomId.split("-");
  while (parts.length > 2) {
    parts.pop();
    const parentId = parts.join("-");
    const parent = rubrics[parentId];
    if (parent && parent.length > 0) return [{ symptomId: parentId, remedies: parent }];
  }
  return [];
}

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    const { symptomIds, topN: rawTopN } = body;

    if (!symptomIds || !Array.isArray(symptomIds) || symptomIds.length === 0) {
      return NextResponse.json({ error: "Please provide an array of symptom IDs" }, { status: 400 });
    }

    const rubrics = getNeoRubrics();
    const remedyById = getNeoRemedyById();
    const symptomById = getNeoSymptomById();

    const topN = Math.min(Math.max(rawTopN || 30, 1), 100);
    const scores = new Map<string, { totalScore: number; symptomsCovered: number; maxGrade: number; details: { symptomId: string; symptomName: string; parentSymptomName?: string; conditionName?: string; grade: number }[] }>();

    for (const symId of symptomIds) {
      for (const rubric of findMatchingRubrics(symId, rubrics)) {
        for (const rem of rubric.remedies) {
          let entry = scores.get(rem.remedyId);
          if (!entry) {
            entry = { totalScore: 0, symptomsCovered: 0, maxGrade: 0, details: [] };
            scores.set(rem.remedyId, entry);
          }
          // totalScore sums the RAW rank (the actual database value like 5, 8, 10) — matches reference site's {{obj.Rank}}.
          // maxGrade tracks the 1–3 clamped grade, used for the High/Medium/Low badge color.
          entry.totalScore += rem.rawRank;
          entry.symptomsCovered++;
          if (rem.grade > entry.maxGrade) entry.maxGrade = rem.grade;
          const sym = symptomById.get(rubric.symptomId);
          // When the matched node is a sub-symptom, sym.symptomName holds its parent symptom's display name.
          const parentName =
            sym?.type === "subSymptom" && sym.symptomName && sym.symptomName !== sym.name
              ? sym.symptomName
              : undefined;
          // details[].grade carries the per-symptom rawRank for display in the "Medicine Rank List All" table.
          entry.details.push({
            symptomId: rubric.symptomId,
            symptomName: sym?.name || rubric.symptomId,
            parentSymptomName: parentName,
            conditionName: sym?.conditionName,
            grade: rem.rawRank,
          });
        }
      }
    }

    const totalSymptoms = symptomIds.length;
    // Use the largest observed rawRank per matched remedy-symptom to define the ceiling for scoreRatio,
    // so the confidence calculation stays sane regardless of how big raw ranks are in the database.
    let maxObservedRawRank = 1;
    for (const entry of scores.values()) {
      for (const d of entry.details) if (d.grade > maxObservedRawRank) maxObservedRawRank = d.grade;
    }
    const maxPossibleScore = totalSymptoms * maxObservedRawRank;

    const ranked = [];
    for (const [remedyId, entry] of scores) {
      const remedy = remedyById.get(remedyId);
      if (!remedy) continue;
      const coverageRatio = entry.symptomsCovered / totalSymptoms;
      const scoreRatio = maxPossibleScore > 0 ? entry.totalScore / maxPossibleScore : 0;
      ranked.push({
        id: remedy.id,
        name: remedy.name,
        abbr: remedy.abbr,
        description: remedy.description,
        dosage: remedy.dosage,
        modalities: remedy.modalities,
        totalScore: entry.totalScore,
        symptomsCovered: entry.symptomsCovered,
        totalSymptoms,
        maxGrade: entry.maxGrade,
        confidence: Math.min(98, Math.round((coverageRatio * 60 + scoreRatio * 40) * 100) / 100),
        coverageDetails: entry.details,
        rank: 0,
      });
    }

    ranked.sort((a, b) => {
      if (b.symptomsCovered !== a.symptomsCovered) return b.symptomsCovered - a.symptomsCovered;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.maxGrade - a.maxGrade;
    });

    const result = ranked.slice(0, topN).map((e, i) => ({ ...e, rank: i + 1 }));

    return NextResponse.json({
      totalSymptomsAnalyzed: symptomIds.length,
      totalRemediesFound: result.length,
      rankedRemedies: result,
    });
  });
}
