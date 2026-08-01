import OpenAI from "openai";

// Using Qwen through an OpenAI-compatible endpoint (e.g. DeepSeek, Together, or Alibaba's DashScope)
// Ensure QWEN_API_KEY and QWEN_BASE_URL are set in environment variables.
const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1", // Default to DashScope
});

export async function generatePersonalizedAdvice(user, scores, overallScore, skinAge) {
  try {
    const goalsList = user.goals ? user.goals.join(", ") : "General Improvement";
    const customGoal = user.customGoal ? ` (Specifically: ${user.customGoal})` : "";
    const userProfile = `Age: ${user.birthDate ? new Date().getFullYear() - new Date(user.birthDate).getFullYear() : 'Unknown'}, Sex: ${user.sex}, Skin Type: ${user.skinType || 'Unknown'}, Goals: ${goalsList}${customGoal}`;
    const skinData = `Overall Score: ${overallScore}/100, Skin Age: ${skinAge}, Wrinkles: ${scores.wrinkles}, Firmness: ${scores.firmness}, Spots: ${scores.spots}, Radiance: ${scores.radiance}`;

    const prompt = `You are a professional dermatologist and skincare expert AI. 
    Analyze the following user profile and skin analysis scores to generate a personalized skincare critique, daily habits, and a facial workout.

    User Profile:
    ${userProfile}

    Skin Analysis Scores (0-100, higher is better):
    ${skinData}

    Provide the response strictly in the following JSON format. You MUST NOT include any conversational text or markdown formatting (like \`\`\`json) in your response, just the raw JSON object:
    {
      "critique": "A 2-3 sentence personalized analysis highlighting their strengths and areas for improvement based on their goals and scores.",
      "habits": ["Habit 1", "Habit 2", "Habit 3"],
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
    
    // Aggressively strip markdown if it leaked
    content = content.replace(/^```json/im, "").replace(/^```/im, "").replace(/```$/im, "").trim();
    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("Error generating Qwen advice:", error);
    // Fallback if AI fails so the app doesn't break
    return {
      critique: "Your skin shows a unique balance. Keep up with consistent hydration and sun protection to maintain your glow.",
      habits: ["Drink 8 glasses of water", "Apply SPF 50 daily", "Cleanse before bed"],
      facialWorkout: "Gentle upward facial massage during your cleansing routine to promote lymphatic drainage.",
      products: [
        { type: "Cleanser", formula: "Gentle Hydrating Cleanser", description: "To maintain your skin barrier without stripping natural oils." },
        { type: "Serum", formula: "Vitamin C", description: "To boost radiance and provide antioxidant protection." },
        { type: "Moisturizer", formula: "Ceramide Cream", description: "To lock in moisture and keep skin plump throughout the day." }
      ]
    };
  }
}
