import leafRubricsJson from "@/data/generated/leaf-rubrics.json";
import symptomSearchIndexJson from "@/data/generated/symptom-search-index.json";
import { getNeoRemedyById, type NeoRemedy } from "@/data/neoLoader";

type RubricEntry = { remedyId: string; grade: number; rawRank: number };
type CompactRubrics = Record<string, [number, number, number][]>;
type SearchEntry = {
  id: string;
  name: string;
  nameLower: string;
  bnLower: string;
  type: string;
  chapter: string;
  parent?: string;
};

const compactLeaf = leafRubricsJson as unknown as CompactRubrics;
const searchIndex = symptomSearchIndexJson as SearchEntry[];

let _rubrics: Record<string, RubricEntry[]> | null = null;

export function getNeoRubrics(): Record<string, RubricEntry[]> {
  if (_rubrics) return _rubrics;
  const out: Record<string, RubricEntry[]> = {};
  for (const [id, rows] of Object.entries(compactLeaf)) {
    out[id] = rows.map(([n, grade, rawRank]) => ({
      remedyId: `neo-med-${n}`,
      grade,
      rawRank,
    }));
  }
  _rubrics = out;
  return _rubrics;
}

export function getNeoSymptomSearchIndex() {
  return searchIndex;
}

export const neoRemediesData = {
  get remedies(): NeoRemedy[] {
    return [...getNeoRemedyById().values()];
  },
};
