/**
 * Build-time only. Reads oldRepertory.json + medicineDetails.json via buildRepertory
 * and writes compact JSON under src/data/generated/. Not imported by route handlers.
 */
import * as fs from "fs";
import * as path from "path";
import {
  neoSymptomsData,
  neoRemediesData,
  getNeoRubrics,
  getNeoNodeRubrics,
  getNeoRemedyById,
  getNeoSymptomById,
  getNeoRemedyToSymptoms,
  getNeoSymptomSearchIndex,
  getNeoRemedySearchIndex,
} from "./buildRepertory";

const outDir = path.join(process.cwd(), "src", "data", "generated");

function write(name: string, data: unknown) {
  const dest = path.join(outDir, name);
  fs.writeFileSync(dest, JSON.stringify(data));
  const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
  console.log(`  wrote ${name} (${mb} MB)`);
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const started = Date.now();

  const chapters = neoSymptomsData.chapters;
  const remedies = neoRemediesData.remedies;
  const rubrics = getNeoRubrics();
  const nodeRubrics = getNeoNodeRubrics();
  const remedyById = getNeoRemedyById();
  const symptomById = getNeoSymptomById();
  const remedyToSymptoms = getNeoRemedyToSymptoms();
  const symptomSearchIndex = getNeoSymptomSearchIndex();
  const remedySearchIndex = getNeoRemedySearchIndex();

  const children: Record<string, { children: unknown[]; type: string }> = {};
  const chaptersList = chapters.map((ch) => {
    const conditions = ch.conditions.map((cond) => ({
      id: cond.id,
      name: cond.name,
      symptomCount: cond.symptoms.length,
    }));
    children[ch.id] = { children: conditions, type: "conditions" };

    for (const cond of ch.conditions) {
      const symptoms = cond.symptoms.map((sym) => ({
        id: sym.id,
        name: sym.name,
        hasSubSymptoms: sym.subSymptoms.length > 0,
        subSymptomCount: sym.subSymptoms.length,
      }));
      children[cond.id] = { children: symptoms, type: "symptoms" };

      for (const sym of cond.symptoms) {
        if (sym.subSymptoms.length > 0) {
          children[sym.id] = {
            children: sym.subSymptoms.map((sub) => ({ id: sub.id, name: sub.name })),
            type: "subSymptoms",
          };
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

  const symptomMeta: Record<string, {
    id: string;
    name: string;
    type: string;
    repertoryName: string;
    conditionName?: string;
    symptomName?: string;
    chapterId?: string;
    conditionId?: string;
    parentSymptomId?: string;
  }> = {};

  for (const [id, entry] of symptomById) {
    symptomMeta[id] = { ...entry };
  }

  // Navigable breadcrumb ids (same lookup the live route does by name).
  const chapterIdByName = new Map(chapters.map((ch) => [ch.name, ch.id]));
  const conditionIdByKey = new Map<string, string>();
  const symptomIdByKey = new Map<string, string>();
  for (const ch of chapters) {
    for (const cond of ch.conditions) {
      conditionIdByKey.set(`${ch.name}\0${cond.name}`, cond.id);
      for (const sym of cond.symptoms) {
        symptomIdByKey.set(`${ch.name}\0${cond.name}\0${sym.name}`, sym.id);
      }
    }
  }
  for (const meta of Object.values(symptomMeta)) {
    const chapterId = chapterIdByName.get(meta.repertoryName);
    if (chapterId) meta.chapterId = chapterId;
    if (meta.conditionName) {
      const conditionId = conditionIdByKey.get(`${meta.repertoryName}\0${meta.conditionName}`);
      if (conditionId) meta.conditionId = conditionId;
    }
    if (meta.symptomName && meta.conditionName) {
      const parentSymptomId = symptomIdByKey.get(`${meta.repertoryName}\0${meta.conditionName}\0${meta.symptomName}`);
      if (parentSymptomId) meta.parentSymptomId = parentSymptomId;
    }
  }

  // Compact triples [numericMedicineId, grade, rawRank] keep order and duplicates.
  const compactNodeRubrics: Record<string, [number, number, number][]> = {};
  for (const [id, entries] of nodeRubrics) {
    if (!entries || entries.length === 0) continue;
    compactNodeRubrics[id] = entries.map((e) => {
      const n = Number(String(e.remedyId).replace(/^neo-med-/, ""));
      if (!Number.isFinite(n)) throw new Error(`Unexpected remedy id ${e.remedyId}`);
      return [n, e.grade, e.rawRank];
    });
  }

  const remediesById: Record<string, (typeof remedies)[number]> = {};
  for (const r of remedies) remediesById[r.id] = r;

  const remedyToSymptomsObj: Record<string, string[]> = {};
  for (const [id, ids] of remedyToSymptoms) remedyToSymptomsObj[id] = ids;

  const remedyRelated: Record<string, { id: string; name: string; abbr: string }[]> = {};
  for (const r of remedies) {
    const symptomIds = remedyToSymptoms.get(r.id) || [];
    const relatedIds = new Set<string>();
    for (const symId of symptomIds) {
      const entries = rubrics[symId];
      if (!Array.isArray(entries)) continue;
      for (const rem of entries) {
        if (rem.remedyId !== r.id) {
          relatedIds.add(rem.remedyId);
          if (relatedIds.size >= 8) break;
        }
      }
      if (relatedIds.size >= 8) break;
    }
    const relatedRemedies: { id: string; name: string; abbr: string }[] = [];
    for (const rid of relatedIds) {
      const rel = remedyById.get(rid);
      if (rel) relatedRemedies.push({ id: rel.id, name: rel.name, abbr: rel.abbr });
    }
    remedyRelated[r.id] = relatedRemedies;
  }

  const remedyList = remedies.map((r) => ({
    id: r.id,
    name: r.name,
    abbr: r.abbr,
    symptomCount: r.commonSymptoms.length,
  }));

  const remedySearch = remedySearchIndex.map((entry) => ({
    id: entry.r.id,
    name: entry.r.name,
    abbr: entry.r.abbr,
    lower: entry.lower,
    abbrLower: entry.abbrLower,
    descLower: entry.descLower,
    bnLower: entry.bnLower,
  }));

  write("chapters-list.json", { chapters: chaptersList });
  write("children.json", children);
  write("symptom-meta.json", symptomMeta);
  const compactLeafRubrics: Record<string, [number, number, number][]> = {};
  for (const [id, entries] of Object.entries(rubrics)) {
    if (!entries || entries.length === 0) continue;
    compactLeafRubrics[id] = entries.map((e) => {
      const n = Number(String(e.remedyId).replace(/^neo-med-/, ""));
      if (!Number.isFinite(n)) throw new Error(`Unexpected remedy id ${e.remedyId}`);
      return [n, e.grade, e.rawRank];
    });
  }

  write("node-rubrics.json", compactNodeRubrics);
  write("leaf-rubrics.json", compactLeafRubrics);
  write("remedies-by-id.json", remediesById);
  write("remedy-list.json", { remedies: remedyList });
  write("remedy-related.json", remedyRelated);
  write("symptom-search-index.json", symptomSearchIndex);
  write("remedy-search-index.json", remedySearch);

  const readme = `# Generated repertory artifacts

Do not edit these files by hand. They are produced by \`npm run precompute\`
(\`scripts/precompute-repertory.ts\`) from \`oldRepertory.json\` and \`medicineDetails.json\`.
The Next.js build runs that script automatically.
`;
  fs.writeFileSync(path.join(outDir, "README.md"), readme);

  console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main();
