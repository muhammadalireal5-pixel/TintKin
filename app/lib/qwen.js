import "server-only";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

function sanitizeForPrompt(str, maxLength = 100) {
  if (!str || typeof str !== "string") return "";
  // Strip control characters, quotes, curly braces, angle brackets, backticks, and newlines
  const sanitized = str.replace(/[{}\[\]`"'<>\r\n]/g, " ").replace(/\s+/g, " ").trim();
  return sanitized.slice(0, maxLength);
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
      const birthYear = new Date(user.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear) {
        userAge = currentYear - birthYear;
      }
    }

    const safeSex = typeof user.sex === "string" ? user.sex.slice(0, 20) : "Unknown";
    const safeSkinType = typeof user.skinType === "string" ? user.skinType.slice(0, 20) : "Unknown";

    const userProfile = `Age: ${userAge}, Sex: ${safeSex}, Skin Type: ${safeSkinType}, Goals: ${goalsList}${customGoal}`;
    const skinData = `Overall Score: ${Math.round(overallScore ?? 50)}/100, Skin Age: ${Math.round(skinAge ?? 30)}, Wrinkles: ${Math.round(scores?.wrinkles ?? 50)}, Firmness: ${Math.round(scores?.firmness ?? 50)}, Spots: ${Math.round(scores?.spots ?? 50)}, Radiance: ${Math.round(scores?.radiance ?? 50)}`;
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
    
    const response = await openai.chat.completions.create({
      model: process.env.QWEN_MODEL_NAME || "qwen-plus",
      messages: [
        { role: "system", content: "You are an expert AI dermatologist. Always respond with valid JSON only, without markdown formatting like ```json." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    let content = response.choices[0].message.content.trim();
    
    content = content.replace(/^```json/im, "").replace(/^```/im, "").replace(/```$/im, "").trim();
    const result = JSON.parse(content);
    return result;
  } catch {
    return {
      critique: "Your skin shows a unique balance. Keep up with consistent hydration and sun protection to maintain your glow.",
      amRoutine: ["Drink 8 glasses of water", "Apply SPF 50 daily"],
      pmRoutine: ["Cleanse before bed", "Apply moisturizer"],
      facialWorkout: "Gentle upward facial massage during your cleansing routine to promote lymphatic drainage.",
      products: [
        { type: "Cleanser", formula: "Gentle Hydrating Cleanser", description: "To maintain your skin barrier without stripping natural oils." },
        { type: "Serum", formula: "Vitamin C", description: "To boost radiance and provide antioxidant protection." },
        { type: "Moisturizer", formula: "Ceramide Cream", description: "To lock in moisture and keep skin plump throughout the day." }
      ]
    };
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

    const response = await openai.chat.completions.create({
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
