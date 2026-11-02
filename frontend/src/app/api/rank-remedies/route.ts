import { NextRequest, NextResponse } from "next/server";
import { getNeoRemedyById, getNeoSymptomById, getRubricsForNode } from "@/data/neoLoader";
import { SymptomBreakdownItem, SymptomRemedyMatch } from "@/lib/types";

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    const { symptomIds, topN: rawTopN } = body;

    if (!symptomIds || !Array.isArray(symptomIds) || symptomIds.length === 0) {
      return NextResponse.json({ error: "Please provide an array of symptom IDs" }, { status: 400 });
    }

    const remedyById = getNeoRemedyById();
    const symptomById = getNeoSymptomById();

    const topN = Math.min(Math.max(rawTopN || 30, 1), 100);
    const scores = new Map<
      string,
      {
        totalScore: number;
        symptomsCovered: number;
        maxGrade: number;
        details: {
          symptomId: string;
          symptomName: string;
          parentSymptomName?: string;
          conditionName?: string;
          grade: number;
        }[];
      }
    >();

    const symptomBreakdown: SymptomBreakdownItem[] = [];

    for (const symId of symptomIds) {
      const sym = symptomById.get(symId);
      const parentName =
        sym?.type === "subSymptom" && sym.symptomName && sym.symptomName !== sym.name
          ? sym.symptomName
          : undefined;

      const parts: string[] = [];
      if (sym?.conditionName) parts.push(sym.conditionName);
      if (parentName) parts.push(parentName);
      if (sym?.name) parts.push(sym.name);
      const symptomLabel = parts.length > 0 ? parts.join(" > ") : (sym?.name || symId);

      const rubricEntries = getRubricsForNode(symId);
      const remMap = new Map<string, { grade: number; rawRank: number }>();
      for (const rem of rubricEntries) {
        const ex = remMap.get(rem.remedyId);
        if (!ex) {
          remMap.set(rem.remedyId, { grade: rem.grade, rawRank: rem.rawRank });
        } else {
          if (rem.grade > ex.grade) ex.grade = rem.grade;
          if (rem.rawRank > ex.rawRank) ex.rawRank = rem.rawRank;
        }
      }

      // Update ranking scores
      for (const [remId, remData] of remMap.entries()) {
        let entry = scores.get(remId);
        if (!entry) {
          entry = { totalScore: 0, symptomsCovered: 0, maxGrade: 0, details: [] };
          scores.set(remId, entry);
        }
        entry.totalScore += remData.rawRank;
        entry.symptomsCovered++;
        if (remData.grade > entry.maxGrade) entry.maxGrade = remData.grade;

        entry.details.push({
          symptomId: symId,
          symptomName: sym?.name || symId,
          parentSymptomName: parentName,
          conditionName: sym?.conditionName,
          grade: remData.rawRank,
        });
      }

      // Build breakdown remedies list sorted by rank
      const remediesList: SymptomRemedyMatch[] = [];
      for (const [remId, remData] of remMap.entries()) {
        const remedyObj = remedyById.get(remId);
        remediesList.push({
          remedyId: remId,
          remedyName: remedyObj?.name || remId,
          grade: remData.grade,
          rawRank: remData.rawRank,
        });
      }

      remediesList.sort((a, b) => {
        if (b.rawRank !== a.rawRank) return b.rawRank - a.rawRank;
        return a.remedyName.localeCompare(b.remedyName);
      });

      symptomBreakdown.push({
        symptomId: symId,
        symptomName: sym?.name || symId,
        parentSymptomName: parentName,
        conditionName: sym?.conditionName,
        repertoryName: sym?.repertoryName,
        symptomLabel,
        remedies: remediesList,
      });
    }

    const totalSymptoms = symptomIds.length;
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
        descriptionBn: remedy.descriptionBn,
        dosage: remedy.dosage,
        dosageBn: remedy.dosageBn,
        modalities: remedy.modalities,
        modalitiesBn: remedy.modalitiesBn,
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
      symptomBreakdown,
    });
  });
}

