import symptomMetaJson from "@/data/generated/symptom-meta.json";
import compactRubricsJson from "@/data/generated/node-rubrics.json";

export type { NeoRemedy } from "@/data/neoRemedies";
export { getNeoRemedyById, getNeoRemedy } from "@/data/neoRemedies";
export type SymptomMeta = {
  id: string;
  name: string;
  type: "repertory" | "condition" | "symptom" | "subSymptom" | string;
  repertoryName: string;
  conditionName?: string;
  symptomName?: string;
  chapterId?: string;
  conditionId?: string;
  parentSymptomId?: string;
};

type CompactRubrics = Record<string, [number, number, number][]>;
type RubricEntry = { remedyId: string; grade: number; rawRank: number };

const symptomMeta = symptomMetaJson as Record<string, SymptomMeta>;
const compactRubrics = compactRubricsJson as unknown as CompactRubrics;
const symptomById = new Map<string, SymptomMeta>(Object.entries(symptomMeta));
const inflatedRubrics = new Map<string, RubricEntry[]>();

function inflateRubrics(nodeId: string): RubricEntry[] {
  const cached = inflatedRubrics.get(nodeId);
  if (cached) return cached;
  const rows = compactRubrics[nodeId];
  if (!rows || rows.length === 0) return [];
  const entries = rows.map(([n, grade, rawRank]) => ({
    remedyId: `neo-med-${n}`,
    grade,
    rawRank,
  }));
  inflatedRubrics.set(nodeId, entries);
  return entries;
}

export function getRubricsForNode(nodeId: string): RubricEntry[] {
  const direct = inflateRubrics(nodeId);
  if (direct.length > 0) return direct;
  const parts = nodeId.split("-");
  while (parts.length > 2) {
    parts.pop();
    const parentId = parts.join("-");
    const parent = inflateRubrics(parentId);
    if (parent.length > 0) return parent;
  }
  return [];
}

export function getNeoSymptomById() {
  return symptomById;
}


export function getSymptomMeta(id: string): SymptomMeta | undefined {
  return symptomById.get(id);
}
