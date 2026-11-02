import * as fs from "fs";
import * as path from "path";
import { translateRepertory, repBnToEn } from "@/i18n/repertoryBn";

export type NeoSymptomSearchEntry = {
  id: string;
  name: string;
  nameLower: string;
  bnLower: string;
  type: string;
  chapter: string;
  parent?: string;
};

export interface NeoSubSymptom {
  id: string;
  name: string;
}

export interface NeoSymptom {
  id: string;
  name: string;
  subSymptoms: NeoSubSymptom[];
}

export interface NeoCondition {
  id: string;
  name: string;
  symptoms: NeoSymptom[];
}

export interface NeoChapter {
  id: string;
  name: string;
  order: number;
  conditions: NeoCondition[];
}

interface NeoRemedy {
  id: string;
  name: string;
  abbr: string;
  description: string;
  descriptionBn?: string;
  dosage: string;
  dosageBn?: string;
  keynotes?: string;
  keynotesBn?: string;
  affinity?: string;
  affinityBn?: string;
  commonSymptoms: string[];
  modalities: { worse: string[]; better: string[] };
  modalitiesBn?: { worse: string[]; better: string[] };
}

type NeoRubrics = Record<string, { remedyId: string; grade: number; rawRank: number }[]>;
type SymEntry = {
  id: string;
  name: string;
  type: "repertory" | "condition" | "symptom" | "subSymptom";
  repertoryName: string;
  conditionName?: string;
  symptomName?: string;
};

let _data: {
  chapters: NeoChapter[];
  remedies: NeoRemedy[];
  rubrics: NeoRubrics;
  nodeRubrics: Map<string, { remedyId: string; grade: number; rawRank: number }[]>;
  remedyById: Map<string, NeoRemedy>;
  symptomById: Map<string, SymEntry>;
  chapterById: Map<string, NeoChapter>;
  remedyToSymptoms: Map<string, string[]>;
  symptomSearchIndex: NeoSymptomSearchEntry[];
  remedySearchIndex: { lower: string; abbrLower: string; descLower: string; bnLower: string; r: NeoRemedy }[];
} | null = null;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").slice(0, 60);
}

type MedicineDetail = {
  desc: string;
  descBn?: string;
  modalities: {
    worse: string[];
    better: string[];
    worseBn?: string[];
    betterBn?: string[];
  };
  dosage: string;
  dosageBn?: string;
  keynotes: string;
  keynotesBn?: string;
  affinity: string;
  affinityBn?: string;
};

let _medDetails: Record<string, MedicineDetail> | null = null;

function getMedicineDetails(): Record<string, MedicineDetail> {
  if (_medDetails) return _medDetails;
  try {
    const detailPath = path.join(process.cwd(), "src", "data", "medicineDetails.json");
    _medDetails = JSON.parse(fs.readFileSync(detailPath, "utf-8"));
  } catch {
    _medDetails = {};
  }
  return _medDetails!;
}

function loadData() {
  if (_data) return _data;

  const medDetails = getMedicineDetails();
  const jsonPath = path.join(process.cwd(), "src", "data", "oldRepertory.json");
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as {
    repertories: {
      id: number; name: string;
      conditions: {
        id: number; name: string;
        symptoms: {
          id: number; name: string;
          medicines?: { id: number; name: string; rank: number }[];
          subSymptoms: {
            id: number; name: string;
            medicines?: { id: number; name: string; rank: number }[];
          }[];
        }[];
      }[];
    }[];
  };

  const chapters: NeoChapter[] = [];
  const remedyMap = new Map<string, NeoRemedy>();
  const remedySymMap = new Map<string, Set<string>>();
  const rubrics: NeoRubrics = {};
  const symptomById = new Map<string, SymEntry>();
  let order = 1;

  for (const rep of raw.repertories) {
    const repId = `neo-${slugify(rep.name)}`;
    const conditions: NeoCondition[] = [];

    symptomById.set(repId, {
      id: repId, name: rep.name, type: "repertory", repertoryName: rep.name,
    });

    for (const cond of rep.conditions) {
      const condId = `${repId}-${slugify(cond.name)}`;
      const neoSymptoms: NeoSymptom[] = [];

      symptomById.set(condId, {
        id: condId, name: cond.name, type: "condition",
        repertoryName: rep.name, conditionName: cond.name,
      });

      for (const symp of cond.symptoms) {
        const sympId = `${condId}-${slugify(symp.name)}`;
        const neoSubs: NeoSubSymptom[] = [];

        symptomById.set(sympId, {
          id: sympId, name: symp.name, type: "symptom",
          repertoryName: rep.name, conditionName: cond.name, symptomName: symp.name,
        });

        if (symp.medicines) regMeds(sympId, symp.medicines, remedyMap, remedySymMap, rubrics, medDetails);

        if (symp.subSymptoms?.length) {
          for (const sub of symp.subSymptoms) {
            const subId = `${sympId}-${slugify(sub.name)}`;
            neoSubs.push({ id: subId, name: sub.name });

            symptomById.set(subId, {
              id: subId, name: sub.name, type: "subSymptom",
              repertoryName: rep.name, conditionName: cond.name, symptomName: symp.name,
            });

            if (sub.medicines) regMeds(subId, sub.medicines, remedyMap, remedySymMap, rubrics, medDetails);
          }
        }

        neoSymptoms.push({ id: sympId, name: symp.name, subSymptoms: neoSubs });
      }

      conditions.push({ id: condId, name: cond.name, symptoms: neoSymptoms });
    }

    chapters.push({ id: repId, name: rep.name, order: order++, conditions });
  }

  const remedies: NeoRemedy[] = [];
  for (const [, rem] of remedyMap) {
    const sIds = remedySymMap.get(rem.id);
    rem.commonSymptoms = sIds ? [...sIds].slice(0, 20) : [];
    remedies.push(rem);
  }

  const chapterById = new Map<string, NeoChapter>();
  for (const ch of chapters) chapterById.set(ch.id, ch);

  const remedyToSymptoms = new Map<string, string[]>();
  for (const [symId, entries] of Object.entries(rubrics)) {
    for (const e of entries) {
      let arr = remedyToSymptoms.get(e.remedyId);
      if (!arr) { arr = []; remedyToSymptoms.set(e.remedyId, arr); }
      arr.push(symId);
    }
  }

  const nodeRubrics = new Map<string, { remedyId: string; grade: number; rawRank: number }[]>();
  for (const ch of chapters) {
    const chEntries: { remedyId: string; grade: number; rawRank: number }[] = [];
    for (const cond of ch.conditions) {
      const condEntries: { remedyId: string; grade: number; rawRank: number }[] = [];
      for (const sym of cond.symptoms) {
        const symEntries: { remedyId: string; grade: number; rawRank: number }[] = [];
        const r = rubrics[sym.id];
        if (r) symEntries.push(...r);
        for (const sub of sym.subSymptoms) {
          const sr = rubrics[sub.id];
          if (sr) {
            symEntries.push(...sr);
            nodeRubrics.set(sub.id, sr);
          }
        }
        nodeRubrics.set(sym.id, symEntries);
        condEntries.push(...symEntries);
      }
      nodeRubrics.set(cond.id, condEntries);
      chEntries.push(...condEntries);
    }
    nodeRubrics.set(ch.id, chEntries);
  }

  _data = {
    chapters, remedies, rubrics, nodeRubrics,
    remedyById: new Map(remedies.map((r) => [r.id, r])),
    symptomById, chapterById, remedyToSymptoms,
    symptomSearchIndex: [],
    remedySearchIndex: [],
  };

  return _data;
}

let _symptomSearchIndex: NeoSymptomSearchEntry[] | null = null;
let _remedySearchIndex: { lower: string; abbrLower: string; descLower: string; bnLower: string; r: NeoRemedy }[] | null = null;

function buildSymptomSearchIndex(chapters: NeoChapter[]): NeoSymptomSearchEntry[] {
  if (_symptomSearchIndex) return _symptomSearchIndex;
  const index: NeoSymptomSearchEntry[] = [];
  for (const ch of chapters) {
    index.push({ id: ch.id, name: ch.name, nameLower: ch.name.toLowerCase(), bnLower: translateRepertory(ch.name).toLowerCase(), type: "repertory", chapter: ch.name });
    for (const cond of ch.conditions) {
      index.push({ id: cond.id, name: cond.name, nameLower: cond.name.toLowerCase(), bnLower: translateRepertory(cond.name).toLowerCase(), type: "condition", chapter: ch.name });
      for (const sym of cond.symptoms) {
        index.push({ id: sym.id, name: sym.name, nameLower: sym.name.toLowerCase(), bnLower: translateRepertory(sym.name).toLowerCase(), type: "symptom", chapter: ch.name, parent: cond.name });
        for (const sub of sym.subSymptoms) {
          index.push({ id: sub.id, name: sub.name, nameLower: sub.name.toLowerCase(), bnLower: translateRepertory(sub.name).toLowerCase(), type: "subSymptom", chapter: ch.name, parent: sym.name });
        }
      }
    }
  }
  _symptomSearchIndex = index;
  return _symptomSearchIndex;
}

function buildRemedySearchIndex(remedies: NeoRemedy[]) {
  if (_remedySearchIndex) return _remedySearchIndex;
  _remedySearchIndex = remedies.map((r) => ({
    lower: r.name.toLowerCase(),
    abbrLower: r.abbr.toLowerCase(),
    descLower: r.description.toLowerCase(),
    bnLower: translateRepertory(r.name).toLowerCase(),
    r,
  }));
  return _remedySearchIndex;
}

function regMeds(
  symId: string,
  meds: { id: number; name: string; rank: number }[],
  rMap: Map<string, NeoRemedy>,
  rSym: Map<string, Set<string>>,
  rub: NeoRubrics,
  medDetails: Record<string, MedicineDetail>
) {
  if (!rub[symId]) rub[symId] = [];
  for (const m of meds) {
    const rid = `neo-med-${m.id}`;
    if (!rMap.has(rid)) {
      const detail = medDetails[m.name] || medDetails[m.name.toUpperCase()];
      rMap.set(rid, {
        id: rid, name: m.name,
        abbr: m.name.split(" ").map((w) => w[0]).join("").slice(0, 6) + ".",
        description: detail?.desc || `${m.name} - Classical homeopathic remedy from the repertory database.`,
        descriptionBn: detail?.descBn,
        dosage: detail?.dosage || "30C or as directed by physician",
        dosageBn: detail?.dosageBn,
        keynotes: detail?.keynotes,
        keynotesBn: detail?.keynotesBn,
        affinity: detail?.affinity,
        affinityBn: detail?.affinityBn,
        commonSymptoms: [],
        modalities: detail?.modalities
          ? { worse: detail.modalities.worse || [], better: detail.modalities.better || [] }
          : { worse: [], better: [] },
        modalitiesBn: detail?.modalities
          ? { worse: detail.modalities.worseBn || [], better: detail.modalities.betterBn || [] }
          : undefined,
      });
    }
    if (!rSym.has(rid)) rSym.set(rid, new Set());
    rSym.get(rid)!.add(symId);
    rub[symId].push({ remedyId: rid, grade: Math.min(3, Math.max(1, m.rank)), rawRank: m.rank });
  }
}

export const neoSymptomsData = { get chapters() { return loadData().chapters; } };
export const neoRemediesData = { get remedies() { return loadData().remedies; } };
export function getNeoRubrics() { return loadData().rubrics; }
export function getNeoNodeRubrics() { return loadData().nodeRubrics; }
export function getRubricsForNode(nodeId: string): { remedyId: string; grade: number; rawRank: number }[] {
  const data = loadData();
  const direct = data.nodeRubrics.get(nodeId);
  if (direct && direct.length > 0) return direct;
  const rawRub = data.rubrics[nodeId];
  if (rawRub && rawRub.length > 0) return rawRub;
  const parts = nodeId.split("-");
  while (parts.length > 2) {
    parts.pop();
    const parentId = parts.join("-");
    const parent = data.nodeRubrics.get(parentId);
    if (parent && parent.length > 0) return parent;
    const rawParent = data.rubrics[parentId];
    if (rawParent && rawParent.length > 0) return rawParent;
  }
  return [];
}
export function getNeoRemedyById() { return loadData().remedyById; }
export function getNeoSymptomById() { return loadData().symptomById; }
export function getNeoChapterById() { return loadData().chapterById; }
export function getNeoRemedyToSymptoms() { return loadData().remedyToSymptoms; }
export function getNeoSymptomSearchIndex() {
  const data = loadData();
  return buildSymptomSearchIndex(data.chapters);
}
export function getNeoRemedySearchIndex() {
  const data = loadData();
  return buildRemedySearchIndex(data.remedies);
}
export function getNeoBnToEn() { return repBnToEn; }

