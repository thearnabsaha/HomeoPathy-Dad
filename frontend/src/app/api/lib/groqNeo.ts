import { neoRemediesData, getNeoRubrics, getNeoRemedyById, getNeoSymptomSearchIndex } from "@/data/neoLoader";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MODEL_CASCADE = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-safeguard-20b",
];

function buildAnalyzePrompt(symptoms: string[]) {
  const text = symptoms.join(" ").toLowerCase();
  const keywords = text.split(/[\s,→.;:?!]+/).filter((w) => w.length > 2);
  const rubrics = getNeoRubrics();
  const remedyById = getNeoRemedyById();
  const scores = new Map<string, number>();
  for (const [symId, entries] of Object.entries(rubrics)) {
    const symWords = symId.replace(/-/g, " ").split(" ");
    let match = 0;
    for (const kw of keywords) { if (symWords.some((sw) => sw.includes(kw))) match++; }
    if (match > 0 && Array.isArray(entries)) {
      for (const e of entries) scores.set(e.remedyId, (scores.get(e.remedyId) || 0) + e.grade * match);
    }
  }
  const top = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
    .map(([rid]) => { const r = remedyById.get(rid); return r ? `${r.name} (${r.abbr})` : null; })
    .filter(Boolean);
  const dbList = top.length > 0 ? top.join(", ") : neoRemediesData.remedies.slice(0, 40).map((r) => `${r.name} (${r.abbr})`).join(", ");

  return `আপনি ডাঃ NeoAI, একজন বিশেষজ্ঞ হোমিওপ্যাথিক চিকিৎসক। আপনি NeoAI সিস্টেমের অংশ যেটি একটি বিশেষ ক্লাসিক্যাল রেপার্টরি ডাটাবেসে প্রশিক্ষিত। আপনার ডাটাবেসে ৪৩টি রেপার্টরি বিভাগ, ৫২১টি অবস্থা, ৭২৩৯টি লক্ষণ, ৪৯০০টি উপ-লক্ষণ এবং ১১০৩টি ওষুধ রয়েছে (মোট ৯৫,৯০৭টি ওষুধ-লক্ষণ সম্পর্ক)।

CRITICAL: You MUST ONLY recommend medicines from our database. Here are the relevant medicines from our database for this case:
${dbList}

Do NOT recommend any medicine not listed above. These are the ONLY medicines you can use.

লক্ষণ দেওয়া হলে আপনাকে অবশ্যই:
1. এই ক্লাসিক্যাল রেপার্টরি পদ্ধতি ব্যবহার করে লক্ষণ বিশ্লেষণ করুন
2. প্রাসঙ্গিকতা অনুসারে সেরা ৫টি ওষুধ পরামর্শ দিন (শুধুমাত্র উপরের তালিকা থেকে)
3. প্রতিটি ওষুধের জন্য বিস্তারিত যুক্তি দিন

আপনাকে অবশ্যই শুধুমাত্র এই কাঠামোতে বৈধ JSON-এ উত্তর দিতে হবে:
{
  "analysis": "লক্ষণ চিত্রের বিস্তারিত বিশ্লেষণ",
  "remedies": [
    {
      "name": "Full Remedy Name",
      "abbr": "Abbr.",
      "confidence": 85,
      "explanation": "কেন লক্ষণগুলোর সাথে মিলছে তার বিস্তারিত ব্যাখ্যা",
      "dosage": "পরামর্শকৃত শক্তি ও মাত্রা",
      "keyFeatures": ["মূলবৈশিষ্ট্য১", "মূলবৈশিষ্ট্য২", "মূলবৈশিষ্ট্য৩"]
    }
  ],
  "precautions": "সতর্কতা ও দায়মুক্তি"
}

CRITICAL LANGUAGE RULE: By default, ALL text fields MUST be written in Bengali (বাংলা). Only remedy "name" and "abbr" fields should remain in English.

RULES:
- ALWAYS return exactly 5 remedies, sorted by confidence (highest first)
- ALL remedy names MUST come from the database list above
- Confidence must be between 30 and 95
- NEVER return empty remedies array
- explanation must reference the specific symptoms provided
- Include a disclaimer about consulting a qualified homeopath
- Do NOT wrap JSON in markdown code fences`;
}

function buildChatPrompt(message: string) {
  const keywords = message.toLowerCase().split(/[\s,→.;:?!]+/).filter((w) => w.length > 2);
  const rubrics = getNeoRubrics();
  const remedyById = getNeoRemedyById();
  const scores = new Map<string, number>();
  for (const [symId, entries] of Object.entries(rubrics)) {
    const symWords = symId.replace(/-/g, " ").split(" ");
    let match = 0;
    for (const kw of keywords) { if (symWords.some((sw) => sw.includes(kw))) match++; }
    if (match > 0 && Array.isArray(entries)) {
      for (const e of entries) scores.set(e.remedyId, (scores.get(e.remedyId) || 0) + e.grade * match);
    }
  }
  const top = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
    .map(([rid]) => { const r = remedyById.get(rid); return r ? `${r.name} (${r.abbr})` : null; })
    .filter(Boolean);
  const dbList = top.length > 0 ? top.join(", ") : neoRemediesData.remedies.slice(0, 30).map((r) => `${r.name} (${r.abbr})`).join(", ");

  return `আপনি NeoAI, একটি উন্নত হোমিওপ্যাথিক পরামর্শদাতা AI। আপনি একটি ক্লাসিক্যাল রেপার্টরি ডাটাবেসে প্রশিক্ষিত যাতে ৪৩টি রেপার্টরি, ৭২৩৯টি লক্ষণ এবং ১১০৩টি ওষুধ রয়েছে।

CRITICAL: You MUST ONLY recommend medicines from our database. Relevant medicines for this query:
${dbList}
Do NOT suggest any medicine not in this list.

ব্যবহারকারী লক্ষণ বর্ণনা করলে বা প্রশ্ন করলে:
- হোমিওপ্যাথিক দৃষ্টিকোণ থেকে বিশ্লেষণ করুন
- শুধুমাত্র উপরের তালিকা থেকে ওষুধ পরামর্শ দিন
- উপযুক্ত হলে মাত্রা নির্দেশনা দিন
- সবসময় সতর্কতা উল্লেখ করুন

শুধুমাত্র বৈধ JSON-এ উত্তর দিন:
{
  "message": "বাংলায় আপনার কথোপকথনমূলক উত্তর",
  "remedies": [
    {
      "name": "Remedy Name (MUST be from database list)",
      "abbr": "Abbr.",
      "confidence": 75,
      "brief": "বাংলায় এক লাইনের কারণ"
    }
  ],
  "precautions": "বাংলায় নির্দিষ্ট সতর্কতা"
}

CRITICAL: By default respond entirely in Bengali (বাংলা). Only keep remedy "name" and "abbr" in English. ALL remedy names MUST be from the database list above.
Do NOT wrap JSON in markdown code fences. If no remedies match, still include an empty array.`;
}

function buildConsultPrompt(conversationHistory: { role: string; content: string }[]) {
  const allText = conversationHistory.map((m) => m.content).join(" ").toLowerCase();
  const keywords = allText.split(/[\s,→.;:?!]+/).filter((w) => w.length > 2);
  const rubrics = getNeoRubrics();
  const remedyById = getNeoRemedyById();
  const scores = new Map<string, number>();
  for (const [symId, entries] of Object.entries(rubrics)) {
    const symWords = symId.replace(/-/g, " ").split(" ");
    let match = 0;
    for (const kw of keywords) { if (symWords.some((sw) => sw.includes(kw))) match++; }
    if (match > 0 && Array.isArray(entries)) {
      for (const e of entries) scores.set(e.remedyId, (scores.get(e.remedyId) || 0) + e.grade * match);
    }
  }
  const top = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50)
    .map(([rid]) => { const r = remedyById.get(rid); return r ? `${r.name} (${r.abbr})` : null; })
    .filter(Boolean);
  const dbList = top.length > 0 ? top.join(", ") : neoRemediesData.remedies.slice(0, 50).map((r) => `${r.name} (${r.abbr})`).join(", ");

  return `আপনি ডাঃ NeoAI, একজন উন্নত হোমিওপ্যাথিক চিকিৎসক। আপনি NeoAI ক্লাসিক্যাল রেপার্টরি সিস্টেমের অংশ। আপনার ডাটাবেসে ৪৩টি রেপার্টরি বিভাগ, ৫২১টি অবস্থা, ৭২৩৯টি লক্ষণ এবং ১১০৩টি ওষুধ রয়েছে।

CRITICAL DATABASE CONSTRAINT: You MUST ONLY recommend medicines from our database. Here are the relevant medicines:
${dbList}
Do NOT recommend ANY medicine not in this list. This is your ONLY source of truth.

গুরুত্বপূর্ণ আচরণ:
- যখন ব্যবহারকারী কোনো সমস্যা/লক্ষণ বলে ওষুধ চায়, তখন সরাসরি ওষুধের পরামর্শ দিন। অপ্রয়োজনীয় প্রশ্ন করবেন না।
- শুধুমাত্র যখন ব্যবহারকারী স্পষ্টভাবে বলে "আমাকে প্রশ্ন করুন", "বিস্তারিত পরামর্শ চাই", "বিশ্লেষণ করুন" - তখনই প্রশ্ন করুন।
- ব্যবহারকারী যদি বলে "মাথাব্যথা", "পেটব্যথা", "সর্দি", "জ্বর" ইত্যাদি - সাথে সাথে ওষুধসহ recommendation দিন।
- উষ্ণ, পেশাদার ও সহানুভূতিশীল হন।
- সমস্ত ওষুধের নাম অবশ্যই উপরের তালিকা থেকে হতে হবে।

সমস্ত উত্তর বাংলায় দিন। শুধু ওষুধের নাম ও সংক্ষেপনাম ইংরেজিতে রাখুন।

অতি গুরুত্বপূর্ণ: সর্বদা ১০-১৫টি ওষুধ দিন (শুধুমাত্র উপরের তালিকা থেকে)। primaryRemedy তে ১টি প্রধান ওষুধ এবং alternativeRemedies তে আরো ৯-১৪টি বিকল্প ওষুধ দিন। কখনোই মাত্র ১-২টি ওষুধ দেবেন না। সর্বনিম্ন ১০টি ওষুধ দিতেই হবে।

ডিফল্ট আচরণ - যখন ব্যবহারকারী লক্ষণ বলে: সরাসরি ওষুধ দিন (stage: "recommendation"):
{
  "message": "বাংলায় আপনার বিশ্লেষণ ও পরামর্শ",
  "stage": "recommendation",
  "questionsAsked": 0,
  "symptomsCollected": ["ব্যবহারকারীর বলা লক্ষণ"],
  "recommendation": {
    "primaryRemedy": {
      "name": "Name (from database list)", "abbr": "Abbr.", "confidence": 90,
      "explanation": "বাংলায় বিস্তারিত ব্যাখ্যা", "dosage": "শক্তি ও মাত্রা",
      "keyIndications": ["ইঙ্গিত১", "ইঙ্গিত২", "ইঙ্গিত৩"]
    },
    "alternativeRemedies": [
      { "name": "Remedy2 (from database list)", "abbr": "Abbr2.", "confidence": 82, "brief": "বাংলায় কারণ" }
    ],
    "generalAdvice": "বাংলায় জীবনধারা পরামর্শ",
    "whenToSeekHelp": "বাংলায় কখন সরাসরি চিকিৎসকের কাছে যেতে হবে"
  }
}

CRITICAL: alternativeRemedies MUST contain at least 9 remedies (preferably 11-14). Total medicines (primary + alternatives) MUST be 10-15. NEVER give less than 10 total medicines. ALL medicine names MUST be from the database list above.

শুধুমাত্র যখন ব্যবহারকারী বিস্তারিত পরামর্শ চায় (stage: "gathering"):
{
  "message": "বাংলায় আপনার প্রশ্ন",
  "stage": "gathering",
  "questionsAsked": 1,
  "symptomsCollected": ["লক্ষণ১"],
  "recommendation": null
}

Do NOT wrap JSON in markdown code fences. Always include a disclaimer in Bengali.`;
}

type Message = { role: string; content: string };

async function callNeoGroqAPI(messages: Message[]) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;

  if (!apiKey || apiKey === "your_groq_api_key_here" || apiKey === "your_grok_api_key_here") {
    return generateNeoFallback(messages[messages.length - 1]?.content || "");
  }

  for (const model of MODEL_CASCADE) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const content = data.choices[0].message.content;
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(cleaned);
    } catch {
      continue;
    }
  }

  return generateNeoFallback(messages[messages.length - 1]?.content || "");
}

function generateNeoFallback(input: string) {
  const inputLower = input.toLowerCase();
  const keywords = inputLower.split(/[\s,→]+/).filter((w) => w.length > 2);
  const remedyScores = new Map<string, number>();

  const rubrics = getNeoRubrics();
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
    const fallbackIds = neoRemediesData.remedies.slice(0, 5);
    for (let i = 0; i < fallbackIds.length; i++) {
      remedyScores.set(fallbackIds[i].id, 5 - i);
    }
  }

  const sorted = [...remedyScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxScore = sorted[0]?.[1] || 1;
  const remedyById = getNeoRemedyById();

  return {
    analysis: "NeoAI ক্লাসিক্যাল রেপার্টরি ডাটাবেস থেকে আপনার লক্ষণ বিশ্লেষণ করে নিম্নলিখিত ওষুধগুলি পরামর্শ দিচ্ছে।",
    message: "আপনার লক্ষণগুলি বিশ্লেষণ করে NeoAI ক্লাসিক্যাল রেপার্টরি থেকে মিলে যাওয়া ওষুধ খুঁজে পেয়েছি।",
    remedies: sorted.map(([remedyId, score]) => {
      const remedy = remedyById.get(remedyId);
      if (!remedy) return null;
      const confidence = Math.min(95, Math.round((score / maxScore) * 75) + 20);
      return {
        name: remedy.name,
        abbr: remedy.abbr,
        confidence,
        explanation: remedy.description,
        brief: remedy.description.substring(0, 80) + "...",
        dosage: remedy.dosage,
        keyFeatures: [],
      };
    }).filter(Boolean),
    precautions: "এটি শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। সঠিক রোগনির্ণয় এবং চিকিৎসার জন্য একজন যোগ্য হোমিওপ্যাথিক চিকিৎসকের সাথে পরামর্শ করুন।",
    stage: "recommendation" as const,
    questionsAsked: 0,
    symptomsCollected: keywords,
    recommendation: null,
  };
}

export async function neoAnalyzeSymptoms(symptoms: string[], language = "bn") {
  const langInstruction = language === "en"
    ? "\n\nIMPORTANT: The user prefers English. Provide ALL text in English."
    : "\n\nগুরুত্বপূর্ণ: সমস্ত টেক্সট বাংলায় দিন। শুধু ওষুধের নাম ইংরেজিতে রাখুন।";

  const symptomList = symptoms.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const prompt = `একজন রোগী নিম্নলিখিত লক্ষণগুলি নিয়ে এসেছেন:\n\n${symptomList}\n\nক্লাসিক্যাল রেপার্টরি পদ্ধতি ব্যবহার করে বিস্তারিত রেপার্টরাইজেশন করুন। সেরা ৫টি ওষুধ পরামর্শ দিন (শুধুমাত্র ডাটাবেসের তালিকা থেকে)।${langInstruction}`;

  const result = await callNeoGroqAPI([
    { role: "system", content: buildAnalyzePrompt(symptoms) },
    { role: "user", content: prompt },
  ]);

  if (!result.remedies || result.remedies.length === 0) {
    return generateNeoFallback(symptoms.join(", "));
  }
  return result;
}

export async function neoChatWithAI(message: string, language = "bn") {
  const langPrefix = language === "en" ? "The user prefers English. Respond entirely in English. " : "";
  return callNeoGroqAPI([
    { role: "system", content: buildChatPrompt(message) },
    { role: "user", content: `${langPrefix}${message}` },
  ]);
}

export async function neoConsultWithAI(conversationHistory: Message[], language = "bn") {
  const langAddition = language === "en"
    ? "\n\nCRITICAL: The user prefers English. Respond entirely in English."
    : "";

  const messages = [
    { role: "system", content: buildConsultPrompt(conversationHistory) + langAddition },
    ...conversationHistory,
  ];

  const result = await callNeoGroqAPI(messages);

  if (!result.message && !result.stage) {
    return {
      message: result.analysis || result.response || "দুঃখিত, অনুগ্রহ করে আবার বলুন।",
      stage: "gathering",
      questionsAsked: 0,
      symptomsCollected: [],
      recommendation: null,
    };
  }
  return result;
}
