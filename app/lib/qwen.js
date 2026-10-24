import "server-only";
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import { calculateAge } from "@/lib/utils/date";
import { DEFAULT_RECOMMENDED_PRODUCTS, PRODUCT_TYPES } from "@/lib/constants/products";
import { STATUS, ERROR_CODES } from "@/lib/constants/status";
import { okResult, errorResult } from "@/lib/utils/result";
import { PLAN_DURATION_DAYS, PLAN_METRICS, METRIC_LABELS, PLAN_PHASES, PLAN_LIMITS } from "@/lib/constants/plan";

// Lazy singleton: the OpenAI SDK's constructor throws immediately if no
// apiKey is resolvable. Built eagerly at module scope, that throw happened
// at *import* time — and since this module is reachable from the shared
// actions.js barrel, Next's build-time page-data collection imports it for
// every page (including ones that never call AI advice, like /leaderboard),
// so one missing env var (e.g. an unconfigured Preview deployment) failed
// the entire build. Constructing it on first actual use means a missing key
// only ever surfaces inside the try/catch below, as the existing
// "AI advice unavailable" fallback already handles.
let openaiClient = null;
function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY,
      // International region: the account key isn't served by the mainland-China
      // endpoint (dashscope.aliyuncs.com) and requests there hang until timeout.
      baseURL: process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      // SDK defaults are a 10-minute timeout with 2 retries, which outlives a
      // serverless invocation; callers already fall back when advice fails.
      timeout: 45000,
      maxRetries: 1,
    });
  }
  return openaiClient;
}

export async function generatePersonalizedAdvice(user, scores, overallScore, skinAge, uvIndex = null) {
  try {
    const goalsList = Array.isArray(user.goals)
      ? user.goals.map(g => sanitizeForPrompt(g, 40)).filter(Boolean).join(", ")
      : "General Improvement";

    const cleanCustomGoal = sanitizeForPrompt(user.customGoal, 100);
    const customGoal = cleanCustomGoal ? ` (Specifically: ${cleanCustomGoal})` : "";

    let userAge = "Unknown";
    if (user.birthDate) {
      const age = calculateAge(user.birthDate);
      if (typeof age === "number" && !isNaN(age)) {
        userAge = age;
      }
    }

    const safeSex = typeof user.sex === "string" ? user.sex.slice(0, 20) : "Unknown";
    const safeSkinType = typeof user.skinType === "string" ? user.skinType.slice(0, 20) : "Unknown";

    const formatScore = (val) => (typeof val === "number" && !isNaN(val) ? Math.round(val) : "Unknown");
    const userProfile = `Age: ${userAge}, Sex: ${safeSex}, Skin Type: ${safeSkinType}, Goals: ${goalsList}${customGoal}`;
    const skinData = `Overall Score: ${formatScore(overallScore)}/100, Skin Age: ${formatScore(skinAge)}, Wrinkles: ${formatScore(scores?.wrinkles)}, Firmness: ${formatScore(scores?.firmness)}, Spots: ${formatScore(scores?.spots)}, Radiance: ${formatScore(scores?.radiance)}`;
    const uvData = uvIndex !== null && !isNaN(uvIndex) ? `Current UV Index: ${Number(uvIndex)}` : 'Current UV Index: Unknown';

    const prompt = `You are a professional dermatologist and skincare expert AI. 
    Analyze the following user profile, skin analysis scores, and environmental data to generate a personalized skincare critique, AM/PM routine checklist, and a facial workout.
    
    CRITICAL RULE ON TONE: Keep your advice behavioral, not prescriptive. E.g., "wear sunscreen today" or "skip your exfoliant today." NEVER specify SPF numbers or precise product concentrations. Personalize using their detected skin issues (e.g. if firmness is low or skin looks irritated/red, suggest barrier repair and skipping strong actives like retinol).

    User Profile:
    ${userProfile}

    Skin Analysis Scores (0-100, higher is better):
    ${skinData}

    Environmental Data:
    ${uvData}

    Provide the response strictly in the following JSON format. You MUST NOT include any conversational text or markdown formatting (like \`\`\`json) in your response, just the raw JSON object:
    {
      "critique": "A 2-3 sentence personalized analysis highlighting their strengths and areas for improvement based on their goals and scores.",
      "amRoutine": ["Actionable behavioral step 1 (e.g. Apply gentle cleanser)", "Step 2 (e.g. Wear sunscreen due to high UV)"],
      "pmRoutine": ["Actionable behavioral step 1", "Step 2", "Step 3"],
      "facialWorkout": "A specific, actionable facial exercise or massage routine name and brief instructions (e.g., 'Gua Sha Jawline Sculpting: ...') that directly addresses their lowest score or primary goal.",
      "products": [
        {
          "type": "Cleanser", 
          "formula": "e.g., Salicylic Acid or Gentle Oat",
          "description": "Brief explanation of why this helps their specific skin concerns."
        },
        ... (Exactly 3 product recommendations)
      ]
    }

    CRITICAL product selection guidelines:
    - The 3 products MUST be chosen based on the user's unique profile, their lowest scores, and their stated goals.
    - Each product's "type" must be exactly one of: "Cleanser", "Serum", "Moisturizer", "Sunscreen", or "Exfoliant". No other types are allowed.
    - At least one product should be a targeted treatment (e.g., Serum, Exfoliant, or Sunscreen) that specifically improves their weakest area (e.g., wrinkles, firmness, spots, or radiance).
    - Include a cleanser appropriate for their skin type (from the user profile).
    - The third product should support barrier repair or provide daily protection (e.g., a moisturizer or sunscreen).
    - Avoid generic, one-size-fits-all products. Each recommendation must be justified by the user's data.`;
    
    const response = await getOpenAIClient().chat.completions.create({
      model: process.env.QWEN_MODEL_NAME || "deepseek-v4-pro-0813",
      // Thinking mode spends ~4k reasoning tokens (~50s) and blows the timeout;
      // without it the same JSON comes back in ~8s.
      enable_thinking: false,
      messages: [
        { role: "system", content: "You are an expert AI dermatologist. Always respond with valid JSON only, without markdown formatting like ```json." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    let content = response.choices[0].message.content.trim();
    
    content = content.replace(/^```json/im, "").replace(/^```/im, "").replace(/```$/im, "").trim();
    const result = JSON.parse(content);
    return okResult({
      critique: typeof result.critique === "string" ? result.critique : "",
      amRoutine: Array.isArray(result.amRoutine) ? result.amRoutine : [],
      pmRoutine: Array.isArray(result.pmRoutine) ? result.pmRoutine : [],
      facialWorkout: typeof result.facialWorkout === "string" ? result.facialWorkout : "",
      products: Array.isArray(result.products) ? result.products : []
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "ai-advice-generation" }, extra: { status: err?.status } });
    return errorResult(
      ERROR_CODES.AI_ADVICE_UNAVAILABLE,
      "Personalized AI advice is temporarily unavailable."
    );
  }
}

const PLAN_JSON_RULES = `Respond with the raw JSON object only. No markdown, no commentary.`;

function describeUser(user) {
  const goals = Array.isArray(user.goals)
    ? user.goals.map((g) => sanitizeForPrompt(g, 40)).filter(Boolean).join(", ")
    : "";
  const custom = sanitizeForPrompt(user.customGoal, 100);
  let age = "Unknown";
  if (user.birthDate) {
    const a = calculateAge(user.birthDate);
    if (typeof a === "number" && !isNaN(a)) age = a;
  }
  const sex = typeof user.sex === "string" ? user.sex.slice(0, 20) : "Unknown";
  const skinType = typeof user.skinType === "string" ? user.skinType.slice(0, 20) : "Unknown";
  return `Age: ${age}, Sex: ${sex}, Skin type: ${skinType}, Goals: ${goals || "General improvement"}${custom ? ` (Specifically: ${custom})` : ""}`;
}

function describeScores(scores) {
  return PLAN_METRICS.map((m) => `${METRIC_LABELS[m]} (${m}): ${Number.isFinite(scores?.[m]) ? Math.round(scores[m]) : "unknown"}`).join(", ");
}

async function callPlanModel(prompt) {
  const response = await getOpenAIClient().chat.completions.create({
    model: process.env.QWEN_MODEL_NAME || "deepseek-v4-pro-0813",
    // Same reasoning as generatePersonalizedAdvice: thinking mode blows the timeout.
    enable_thinking: false,
    messages: [
      { role: "system", content: "You are an expert AI dermatologist. Always respond with valid JSON only, without markdown formatting like ```json." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });
  const content = response.choices[0].message.content
    .trim()
    .replace(/^```json/im, "")
    .replace(/^```/im, "")
    .replace(/```$/im, "")
    .trim();
  return JSON.parse(content);
}

/**
 * Asks the model for a 30-day plan draft: a base routine for week 1, then what
 * each later phase ADDS. lib/plan/build.js bounds and validates the result, so
 * this returns the parsed JSON as-is (or an error envelope).
 */
export async function generatePlanDraft(user, scores, overallScore, skinAge, focus, uvIndex = null) {
  try {
    const focusText = focus.length
      ? focus.map((f) => `${f.label} (${f.metric}) ${f.baseline}, aim for ${f.target}`).join("; ")
      : "no clear weakest area";
    const phaseText = PLAN_PHASES.map((p) => `"${p.key}" (days ${p.startDay}-${p.endDay}): ${p.intent}`).join("\n    ");
    const uv = uvIndex !== null && !isNaN(uvIndex) ? `Current UV index: ${Number(uvIndex)}` : "Current UV index: unknown";

    const prompt = `You are a professional dermatologist and skincare coach. Build a ${PLAN_DURATION_DAYS}-day plan that improves this person's skin, in four phases.

    User: ${describeUser(user)}
    Skin analysis (0-100, higher is better): ${describeScores(scores)}; overall ${Number.isFinite(overallScore) ? Math.round(overallScore) : "unknown"}/100; skin age ${Number.isFinite(skinAge) ? Math.round(skinAge) : "unknown"}
    Focus areas for this plan: ${focusText}
    ${uv}

    Phases:
    ${phaseText}

    Rules:
    - "foundation" is the whole starting routine: 3-4 morning ("am") steps and 2-3 evening ("pm") steps, gentle and safe for a beginner.
    - Every later phase lists ONLY what it ADDS on top of the previous phases: at most ${PLAN_LIMITS.addsPerPhase} steps per slot, often just one or none. Never repeat an earlier step. Introduce at most one new active ingredient at a time, in the "target" phase first.
    - Each step: "text" is one concrete action under ${PLAN_LIMITS.textLength} characters (what to do, and when if it matters). "why" is one sentence explaining why this step is for THIS person, tied to their scores, skin type or goals. "metric" is the score it supports (one of ${PLAN_METRICS.join(", ")}) or null.
    - Keep it behavioural and safe: never specify SPF numbers, percentages or concentrations. If skin looks irritated or firmness is low, favour barrier repair and skip strong actives.
    - "summary" is 2 sentences: what the plan focuses on and what they can expect to feel in 30 days. No guarantees or medical claims.

    JSON shape:
    {
      "summary": "...",
      "phases": {
        "foundation": { "am": [{"text":"...","why":"...","metric":null}], "pm": [ ... ] },
        "target": { "am": [], "pm": [ ... ] },
        "build": { "am": [ ... ], "pm": [] },
        "lockin": { "am": [], "pm": [ ... ] }
      }
    }
    ${PLAN_JSON_RULES}`;

    const draft = await callPlanModel(prompt);
    return okResult({ draft });
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "ai-plan-generation" }, extra: { status: err?.status } });
    return errorResult(ERROR_CODES.AI_ADVICE_UNAVAILABLE, "Your personalised plan is temporarily unavailable.");
  }
}

/**
 * Asks the model to adjust the FUTURE of a plan after a check-in scan. It sees
 * the current steps (by id), how the scores moved, and how consistently the
 * user followed the routine, and may drop steps by id and add new ones.
 */
export async function generatePlanAdjustment(user, plan, { day, scores, adherencePercent }) {
  try {
    const stepLines = plan.steps
      .filter((s) => s.startDay <= day && (s.endDay == null || day <= s.endDay))
      .map((s) => `${s.id} [${s.slot}] ${sanitizeForPrompt(s.text, PLAN_LIMITS.textLength)}`)
      .join("\n    ");
    const moved = plan.focus
      .map((f) => `${f.label}: started ${f.baseline}, now ${Number.isFinite(scores?.[f.metric]) ? Math.round(scores[f.metric]) : "unknown"}, aim ${f.target}`)
      .join("; ");

    const prompt = `You are a dermatologist and skincare coach reviewing a check-in on day ${day} of a ${plan.durationDays}-day skin plan.

    User: ${describeUser(user)}
    Progress on focus areas: ${moved}
    Routine consistency over the last 7 days: ${Number.isFinite(adherencePercent) ? Math.round(adherencePercent) : "unknown"}%
    Current steps (id [slot] text):
    ${stepLines}

    Decide what, if anything, should change from tomorrow. Rules:
    - If consistency is low, prefer simplifying (drop a step) over adding. If progress is good, change little.
    - "drop" is a list of step ids from the list above. "add" has at most ${PLAN_LIMITS.addsPerPhase} new steps per slot, same step shape as before ("text", "why" tied to this person, "metric").
    - Keep it behavioural and safe: no SPF numbers, percentages or concentrations.
    - "note" is 1-2 encouraging sentences telling the user what you changed and why (or that the plan stays as it is).

    JSON shape: { "note": "...", "drop": ["s3"], "add": { "am": [], "pm": [] } }
    ${PLAN_JSON_RULES}`;

    const adjustment = await callPlanModel(prompt);
    return okResult({ adjustment });
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "ai-plan-adjustment" }, extra: { status: err?.status } });
    return errorResult(ERROR_CODES.AI_ADVICE_UNAVAILABLE, "Your plan check-in is temporarily unavailable.");
  }
}

export async function analyzeProductIngredients(base64Image) {
  try {
    if (!base64Image || typeof base64Image !== "string" || !base64Image.startsWith("data:image/")) {
      throw new Error("Invalid image format");
    }

    const prompt = `You are a professional cosmetic chemist and dermatologist.
    Read the ingredients list from the provided image of a skincare product.
    Based on the ingredients, determine:
    1. The product category (e.g., "Cleanser", "Serum", "Moisturizer", "Sunscreen", "Exfoliant", "Retinol").
    2. The key active ingredients (formula).
    3. A short description of how it benefits the skin.
    4. An "aging multiplier" between 0.65 and 0.95 indicating its potency. (e.g., strong retinoids/acids = 0.65-0.70, potent serums = 0.70-0.75, basic moisturizers/cleansers = 0.8-0.95. Lower is better for anti-aging, but NEVER output below 0.65 for a single non-clinical product).

    Respond strictly with a JSON object in this format (no markdown, no conversational text):
    {
      "type": "Product Category",
      "formula": "Key Actives (e.g. 2% Salicylic Acid)",
      "description": "Brief explanation of benefits.",
      "customMultiplier": 0.7
    }`;

    const response = await getOpenAIClient().chat.completions.create({
      model: "qwen-vl-max",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ]
    });

    let content = response.choices[0].message.content.trim();
    content = content.replace(/^```json/im, "").replace(/^```/im, "").replace(/```$/im, "").trim();
    
    const result = JSON.parse(content);
    return result;
  } catch {
    throw new Error("Failed to analyze product ingredients.");
  }
}
