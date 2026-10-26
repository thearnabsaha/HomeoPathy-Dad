import type {
  SymptomDetail,
  RemedySummary,
  RemedyDetail,
  AIAnalysis,
  ChatResponse,
  ConsultResponse,
  SearchResult,
  RankingResult,
} from "./types";

export interface NeoSubSymptomSummary {
  id: string;
  name: string;
}

export interface NeoSymptomSummary {
  id: string;
  name: string;
  hasSubSymptoms: boolean;
  subSymptomCount: number;
}

export interface NeoConditionSummary {
  id: string;
  name: string;
  symptomCount: number;
}

export interface NeoRepertorySummary {
  id: string;
  name: string;
  order: number;
  conditionCount: number;
}

const API_BASE = "/api";

const getCache = new Map<string, { data: unknown; ts: number }>();
const GET_CACHE_TTL = 60_000;

async function fetchNeoAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isGet = !options?.method || options.method === "GET";

  if (isGet) {
    const cached = getCache.get(endpoint);
    if (cached && Date.now() - cached.ts < GET_CACHE_TTL) {
      return cached.data as T;
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  const data = await res.json();

  if (isGet) {
    getCache.set(endpoint, { data, ts: Date.now() });
    if (getCache.size > 200) {
      const oldest = getCache.keys().next().value;
      if (oldest) getCache.delete(oldest);
    }
  }

  return data as T;
}

export const neoApi = {
  getSymptoms: () => fetchNeoAPI<{ chapters: NeoRepertorySummary[] }>("/symptoms"),

  getChildren: (parentId: string) =>
    fetchNeoAPI<{ children: (NeoConditionSummary | NeoSymptomSummary | NeoSubSymptomSummary)[]; type: string }>(
      `/symptoms?parent=${encodeURIComponent(parentId)}`
    ),

  getSymptomById: (id: string) =>
    fetchNeoAPI<SymptomDetail>(`/symptoms/${id}?v=2`),

  searchSymptoms: (q: string) =>
    fetchNeoAPI<{ results: SearchResult["symptoms"] }>(`/symptoms/search?q=${encodeURIComponent(q)}`),

  getRemedies: () => fetchNeoAPI<{ remedies: RemedySummary[] }>("/remedies"),

  getRemedyById: (id: string) => fetchNeoAPI<RemedyDetail>(`/remedies/${id}`),

  searchRemedies: (q: string) =>
    fetchNeoAPI<{ results: SearchResult["remedies"] }>(`/remedies/search?q=${encodeURIComponent(q)}`),

  analyzeSymptoms: (symptoms: string[], language: string = "bn") =>
    fetchNeoAPI<AIAnalysis>("/analyze-symptoms", {
      method: "POST",
      body: JSON.stringify({ symptoms, language }),
    }),

  chat: (message: string, language: string = "bn") =>
    fetchNeoAPI<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, language }),
    }),

  consult: (history: { role: string; content: string }[], language: string = "bn") =>
    fetchNeoAPI<ConsultResponse>("/consult", {
      method: "POST",
      body: JSON.stringify({ history, language }),
    }),

  rankRemedies: (symptomIds: string[], topN: number = 30) =>
    fetchNeoAPI<RankingResult>("/rank-remedies", {
      method: "POST",
      body: JSON.stringify({ symptomIds, topN }),
    }),

  doctor: (payload: { complaint: string; round: number; answers: Record<string, string>; history: { role: string; content: string }[]; language: string }) =>
    fetchNeoAPI<DoctorResponse>("/doctor", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export interface DoctorQuestion {
  id: string;
  text: string;
  type: "yesno" | "scale" | "select";
  options: { value: string; label: string }[];
}

export interface DoctorQuestionsResponse {
  type: "questions";
  round: number;
  message: string;
  questions: DoctorQuestion[];
}

export interface DoctorRecommendationResponse {
  type: "recommendation";
  message: string;
  symptomsIdentified: string[];
  primaryRemedy: {
    name: string;
    abbr: string;
    confidence: number;
    explanation: string;
    dosage: string;
    keyIndications: string[];
  };
  alternativeRemedies: { name: string; abbr: string; confidence: number; brief: string }[];
  generalAdvice: string;
  whenToSeekHelp: string;
}

export type DoctorResponse = DoctorQuestionsResponse | DoctorRecommendationResponse;
