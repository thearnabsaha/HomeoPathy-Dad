import remediesByIdJson from "@/data/generated/remedies-by-id.json";

export interface NeoRemedy {
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

const remediesById = remediesByIdJson as Record<string, NeoRemedy>;
const remedyById = new Map<string, NeoRemedy>(Object.entries(remediesById));

export function getNeoRemedyById() {
  return remedyById;
}

export function getNeoRemedy(id: string): NeoRemedy | undefined {
  return remedyById.get(id);
}
