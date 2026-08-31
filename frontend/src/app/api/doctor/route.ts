import { NextRequest, NextResponse } from "next/server";
import { neoRemediesData, getNeoRubrics, getNeoRemedyById, getNeoSymptomSearchIndex } from "@/data/neoLoader";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MODEL_CASCADE = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-safeguard-20b",
];

function findRelevantRemedies(complaint: string, answers: Record<string, string>, limit = 60): { name: string; abbr: string; score: number }[] {
  const text = `${complaint} ${Object.values(answers).join(" ")}`.toLowerCase();
  const keywords = text.split(/[\s,→.;:?!]+/).filter((w) => w.length > 2);
  const rubrics = getNeoRubrics();
  const remedyById = getNeoRemedyById();
  const scores = new Map<string, number>();

  for (const [symId, entries] of Object.entries(rubrics)) {
    const symWords = symId.replace(/-/g, " ").split(" ");
    let match = 0;
    for (const kw of keywords) {
      if (symWords.some((sw) => sw.includes(kw))) match++;
    }
    if (match > 0 && Array.isArray(entries)) {
      for (const e of entries) {
        scores.set(e.remedyId, (scores.get(e.remedyId) || 0) + e.grade * match);
      }
    }
  }

  if (scores.size < 10) {
    const idx = getNeoSymptomSearchIndex();
    for (const entry of idx) {
      for (const kw of keywords) {
        if (entry.nameLower.includes(kw)) {
          const symEntries = rubrics[entry.id];
          if (Array.isArray(symEntries)) {
            for (const e of symEntries) {
              scores.set(e.remedyId, (scores.get(e.remedyId) || 0) + e.grade);
            }
          }
        }
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([rid, score]) => {
      const r = remedyById.get(rid);
      return r ? { name: r.name, abbr: r.abbr, score } : null;
    })
    .filter(Boolean) as { name: string; abbr: string; score: number }[];
}

function buildSystemPrompt(round: number, totalRounds: number, language: string, dbRemedies?: string) {
  const isBn = language === "bn";

  const dbConstraint = dbRemedies
    ? `\n\nCRITICAL DATABASE CONSTRAINT: You MUST ONLY recommend medicines from the following list. These are the ONLY medicines in our database. Do NOT invent or suggest any medicine not in this list.\n\nAVAILABLE MEDICINES FROM OUR DATABASE:\n${dbRemedies}\n\nIf a medicine is not in the list above, DO NOT recommend it. Pick the best matches from this list ONLY.`
    : "";

  return `You are Dr. NeoAI, a structured homeopathic diagnostic AI. You operate EXCLUSIVELY on our classical repertory database with 43 repertories, 521 conditions, 7,239 symptoms, 4,900 sub-symptoms, and 1,103 medicines (95,907 medicine-symptom relationships).

IMPORTANT: You must ONLY use medicines from our database. You must NEVER recommend medicines from outside sources or your general training data. Our database is your ONLY source of truth for medicine names.

You work in a STRUCTURED DIAGNOSTIC MODE. The patient describes a complaint, then you ask EXACTLY ${totalRounds} rounds of diagnostic questions. After all rounds are complete, you give medicine recommendations.

THIS IS ROUND ${round} OF ${totalRounds}.

${round <= totalRounds ? `CURRENT TASK: Ask 3-5 diagnostic questions. Each question MUST have selectable options.` : `CURRENT TASK: Based on ALL collected answers, provide medicine recommendations ONLY from our database.`}

You MUST respond ONLY in valid JSON (no markdown fences).

${round <= totalRounds ? `QUESTION ROUND FORMAT:
{
  "type": "questions",
  "round": ${round},
  "message": "${isBn ? "বাংলায় একটি সংক্ষিপ্ত বার্তা" : "A brief message about this round"}",
  "questions": [
    {
      "id": "q1",
      "text": "${isBn ? "বাংলায় প্রশ্ন" : "Question text"}",
      "type": "yesno" | "scale" | "select",
      "options": [
        { "value": "yes", "label": "${isBn ? "হ্যাঁ" : "Yes"}" },
        { "value": "no", "label": "${isBn ? "না" : "No"}" }
      ]
    }
  ]
}

Question types:
- "yesno": Options are Yes/No (${isBn ? "হ্যাঁ/না" : "Yes/No"})
- "scale": Options are frequency/severity numbers like 1-5 or "Rarely/Sometimes/Often/Always" (${isBn ? "কদাচিৎ/মাঝে মাঝে/প্রায়ই/সবসময়" : ""})
- "select": Multiple choice with 3-5 descriptive options

RULES FOR QUESTIONS:
- Ask 3-5 questions per round
- Questions must be medically relevant for homeopathic repertorization
- Round 1: Focus on primary complaint details (location, sensation, severity)
- Round 2: Focus on modalities (what makes it better/worse, time patterns)
- Round 3: Focus on constitutional symptoms (mental state, food preferences, thermal state)
- Each question MUST have "id", "text", "type", and "options" fields
- Options must have "value" and "label" fields
- ${isBn ? "All text/labels MUST be in Bengali (বাংলা)" : "All text in English"}` :

`RECOMMENDATION FORMAT:
{
  "type": "recommendation",
  "message": "${isBn ? "বাংলায় বিশ্লেষণ সারসংক্ষেপ" : "Analysis summary"}",
  "symptomsIdentified": ["symptom1", "symptom2"],
  "primaryRemedy": {
    "name": "Medicine Name (MUST be from the database list)",
    "abbr": "Abbr.",
    "confidence": 90,
    "explanation": "${isBn ? "বাংলায় ব্যাখ্যা" : "Explanation"}",
    "dosage": "${isBn ? "মাত্রা" : "Dosage"}",
    "keyIndications": ["ind1", "ind2", "ind3"]
  },
  "alternativeRemedies": [
    { "name": "Name (MUST be from database)", "abbr": "Abbr.", "confidence": 80, "brief": "${isBn ? "কারণ" : "Reason"}" }
  ],
  "generalAdvice": "${isBn ? "সাধারণ পরামর্শ" : "General advice"}",
  "whenToSeekHelp": "${isBn ? "কখন ডাক্তার দেখাবেন" : "When to see a doctor"}"
}

RULES FOR RECOMMENDATION:
- Provide 10-15 total medicines (1 primary + 9-14 alternatives)
- ALL medicine names MUST come from our database list above. Do NOT use any other medicine.
- ${isBn ? "All text in Bengali except medicine name and abbr" : "All text in English except medicine name and abbr stay in English"}
- Confidence between 30-95
- Base recommendations on ALL answers from all 3 rounds`}${dbConstraint}

${isBn ? "গুরুত্বপূর্ণ: ওষুধের নাম ও সংক্ষেপনাম ছাড়া সব কিছু বাংলায় লিখুন।" : ""}
Do NOT wrap JSON in markdown code fences.`;
}

type Message = { role: string; content: string };

async function callGroq(messages: Message[]) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here" || apiKey === "your_grok_api_key_here") return null;

  for (const model of MODEL_CASCADE) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 4096 }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      const content = data.choices[0].message.content;
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(cleaned);
    } catch { continue; }
  }
  return null;
}

function generateFallbackQuestions(round: number, isBn: boolean) {
  const rounds: Record<number, { message: string; questions: { id: string; text: string; type: string; options: { value: string; label: string }[] }[] }> = {
    1: {
      message: isBn ? "আপনার প্রধান সমস্যা সম্পর্কে কিছু প্রশ্ন করছি:" : "Some questions about your main complaint:",
      questions: [
        { id: "q1", text: isBn ? "ব্যথা কি তীব্র?" : "Is the pain severe?", type: "yesno", options: [{ value: "yes", label: isBn ? "হ্যাঁ" : "Yes" }, { value: "no", label: isBn ? "না" : "No" }] },
        { id: "q2", text: isBn ? "কতদিন ধরে এই সমস্যা?" : "How long have you had this problem?", type: "select", options: [{ value: "days", label: isBn ? "কয়েক দিন" : "Few days" }, { value: "weeks", label: isBn ? "কয়েক সপ্তাহ" : "Few weeks" }, { value: "months", label: isBn ? "কয়েক মাস" : "Few months" }, { value: "years", label: isBn ? "কয়েক বছর" : "Years" }] },
        { id: "q3", text: isBn ? "ব্যথার তীব্রতা ১-৫ স্কেলে কত?" : "Pain severity on 1-5 scale?", type: "scale", options: [{ value: "1", label: isBn ? "১ - হালকা" : "1 - Mild" }, { value: "2", label: isBn ? "২ - মৃদু" : "2 - Slight" }, { value: "3", label: isBn ? "৩ - মাঝারি" : "3 - Moderate" }, { value: "4", label: isBn ? "৪ - তীব্র" : "4 - Severe" }, { value: "5", label: isBn ? "৫ - অত্যন্ত তীব্র" : "5 - Very severe" }] },
      ],
    },
    2: {
      message: isBn ? "এখন মডালিটিজ সম্পর্কে জানতে চাই:" : "Now about modalities:",
      questions: [
        { id: "q4", text: isBn ? "ঠান্ডায় কি খারাপ হয়?" : "Does cold make it worse?", type: "yesno", options: [{ value: "yes", label: isBn ? "হ্যাঁ" : "Yes" }, { value: "no", label: isBn ? "না" : "No" }] },
        { id: "q5", text: isBn ? "কখন বেশি কষ্ট হয়?" : "When does it feel worst?", type: "select", options: [{ value: "morning", label: isBn ? "সকালে" : "Morning" }, { value: "afternoon", label: isBn ? "দুপুরে" : "Afternoon" }, { value: "evening", label: isBn ? "সন্ধ্যায়" : "Evening" }, { value: "night", label: isBn ? "রাতে" : "Night" }] },
        { id: "q6", text: isBn ? "বিশ্রামে কি ভালো লাগে?" : "Does rest help?", type: "yesno", options: [{ value: "yes", label: isBn ? "হ্যাঁ" : "Yes" }, { value: "no", label: isBn ? "না" : "No" }] },
      ],
    },
    3: {
      message: isBn ? "সাংবিধানিক লক্ষণ সম্পর্কে:" : "About constitutional symptoms:",
      questions: [
        { id: "q7", text: isBn ? "আপনি কি বেশি পিপাসার্ত?" : "Are you very thirsty?", type: "yesno", options: [{ value: "yes", label: isBn ? "হ্যাঁ" : "Yes" }, { value: "no", label: isBn ? "না" : "No" }] },
        { id: "q8", text: isBn ? "আপনার মেজাজ কেমন?" : "How is your mood?", type: "select", options: [{ value: "anxious", label: isBn ? "উদ্বিগ্ন" : "Anxious" }, { value: "irritable", label: isBn ? "বিরক্ত" : "Irritable" }, { value: "sad", label: isBn ? "বিষণ্ণ" : "Sad" }, { value: "normal", label: isBn ? "স্বাভাবিক" : "Normal" }] },
        { id: "q9", text: isBn ? "আপনি কি গরম না ঠান্ডা পছন্দ করেন?" : "Do you prefer warm or cold?", type: "select", options: [{ value: "warm", label: isBn ? "গরম" : "Warm" }, { value: "cold", label: isBn ? "ঠান্ডা" : "Cold" }, { value: "neither", label: isBn ? "কোনোটাই না" : "Neither" }] },
      ],
    },
  };
  const r = rounds[round] || rounds[1];
  return { type: "questions" as const, round, ...r };
}

function generateFallbackRecommendation(answers: Record<string, string>, complaint: string, isBn: boolean) {
  const keywords = complaint.toLowerCase().split(/[\s,→]+/).filter((w) => w.length > 2);
  const rubrics = getNeoRubrics();
  const remedyScores = new Map<string, number>();

  for (const [symId, entries] of Object.entries(rubrics)) {
    const symptomWords = symId.replace(/-/g, " ").split(" ");
    let matchScore = 0;
    for (const kw of keywords) {
      if (symptomWords.some((sw) => sw.includes(kw))) matchScore++;
    }
    if (matchScore > 0 && Array.isArray(entries)) {
      for (const rem of entries) {
        const existing = remedyScores.get(rem.remedyId) || 0;
        remedyScores.set(rem.remedyId, existing + rem.grade * matchScore);
      }
    }
  }

  if (remedyScores.size === 0) {
    const fallbackIds = neoRemediesData.remedies.slice(0, 12);
    for (let i = 0; i < fallbackIds.length; i++) remedyScores.set(fallbackIds[i].id, 12 - i);
  }

  const sorted = [...remedyScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxScore = sorted[0]?.[1] || 1;
  const remedyById = getNeoRemedyById();

  const mapped = sorted.map(([remedyId, score]) => {
    const remedy = remedyById.get(remedyId);
    if (!remedy) return null;
    const confidence = Math.min(95, Math.round((score / maxScore) * 75) + 20);
    return { name: remedy.name, abbr: remedy.abbr, confidence, explanation: remedy.description, brief: remedy.description.substring(0, 80) + "...", dosage: remedy.dosage, keyIndications: [] as string[] };
  }).filter(Boolean) as { name: string; abbr: string; confidence: number; explanation: string; brief: string; dosage: string; keyIndications: string[] }[];

  const primary = mapped[0];
  const alts = mapped.slice(1);

  return {
    type: "recommendation" as const,
    message: isBn
      ? "আপনার সকল উত্তর বিশ্লেষণ করে NeoAI ক্লাসিক্যাল রেপার্টরি থেকে নিম্নলিখিত ওষুধ পরামর্শ দিচ্ছে।"
      : "After analyzing all your answers, NeoAI recommends the following medicines from the classical repertory.",
    symptomsIdentified: keywords,
    primaryRemedy: primary ? { ...primary, keyIndications: primary.keyIndications || [] } : { name: "Nux Vomica", abbr: "Nux-v.", confidence: 75, explanation: "", dosage: "30C", keyIndications: [] },
    alternativeRemedies: alts.map((a) => ({ name: a.name, abbr: a.abbr, confidence: a.confidence, brief: a.brief })),
    generalAdvice: isBn ? "পর্যাপ্ত বিশ্রাম নিন এবং পরিষ্কার পানি পান করুন।" : "Get adequate rest and drink clean water.",
    whenToSeekHelp: isBn ? "লক্ষণ ৩ দিনের বেশি থাকলে বা খারাপ হলে চিকিৎসকের পরামর্শ নিন।" : "Consult a doctor if symptoms persist beyond 3 days or worsen.",
  };
}

function validateRemediesAgainstDb(result: Record<string, unknown>): Record<string, unknown> {
  if (result.type !== "recommendation") return result;
  const remedyById = getNeoRemedyById();
  const allDbNames = new Set<string>();
  for (const [, r] of remedyById) allDbNames.add(r.name.toLowerCase());

  const isInDb = (name: string) => allDbNames.has(name.toLowerCase());

  const primary = result.primaryRemedy as { name: string } | undefined;
  if (primary && !isInDb(primary.name)) {
    const fallbackRemedies = [...remedyById.values()];
    if (fallbackRemedies.length > 0) {
      primary.name = fallbackRemedies[0].name;
      (primary as Record<string, unknown>).abbr = fallbackRemedies[0].abbr;
    }
  }

  const alts = result.alternativeRemedies as { name: string }[] | undefined;
  if (alts) {
    const dbRemedies = [...remedyById.values()];
    let fallbackIdx = 1;
    for (const alt of alts) {
      if (!isInDb(alt.name)) {
        if (fallbackIdx < dbRemedies.length) {
          alt.name = dbRemedies[fallbackIdx].name;
          (alt as Record<string, unknown>).abbr = dbRemedies[fallbackIdx].abbr;
          fallbackIdx++;
        }
      }
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { complaint, round, answers, history, language = "bn" } = body;
    const isBn = language === "bn";
    const currentRound = round || 1;
    const totalRounds = 3;

    if (currentRound > totalRounds) {
      const allAnswers = answers || {};
      const relevant = findRelevantRemedies(complaint || "", allAnswers);
      const dbRemediesList = relevant.length > 0
        ? relevant.map((r, i) => `${i + 1}. ${r.name} (${r.abbr})`).join("\n")
        : neoRemediesData.remedies.slice(0, 60).map((r, i) => `${i + 1}. ${r.name} (${r.abbr})`).join("\n");

      const systemPrompt = buildSystemPrompt(totalRounds + 1, totalRounds, language, dbRemediesList);
      const conversationSummary = `Patient complaint: ${complaint}\n\nAll answers from ${totalRounds} rounds:\n${JSON.stringify(allAnswers, null, 2)}`;
      const groqResult = await callGroq([
        { role: "system", content: systemPrompt },
        ...(history || []),
        { role: "user", content: conversationSummary },
      ]);
      if (groqResult && groqResult.type === "recommendation") {
        return NextResponse.json(validateRemediesAgainstDb(groqResult));
      }
      return NextResponse.json(generateFallbackRecommendation(allAnswers, complaint || "", isBn));
    }

    const systemPrompt = buildSystemPrompt(currentRound, totalRounds, language);
    const userContent = currentRound === 1
      ? `Patient's complaint: ${complaint}`
      : `Previous answers: ${JSON.stringify(answers)}\n\nThis is round ${currentRound}. Ask the next set of diagnostic questions.`;

    const groqResult = await callGroq([
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: userContent },
    ]);

    if (groqResult && groqResult.questions && groqResult.questions.length > 0) {
      return NextResponse.json({ ...groqResult, type: "questions", round: currentRound });
    }

    return NextResponse.json(generateFallbackQuestions(currentRound, isBn));
  } catch (error) {
    console.error("neo doctor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
