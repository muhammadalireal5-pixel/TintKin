// Which of the user's recommended products belongs to a routine step. Products
// carry a `type` (Cleanser, Serum, Moisturizer, Sunscreen, Exfoliant); steps are
// free text, so the step name is matched against keywords for each type.
const STEP_KEYWORDS = [
  ["Sunscreen", /sunscreen|\bspf\b|sun protection|sunblock/i],
  ["Cleanser", /cleans|face wash|wash your face|micellar/i],
  ["Exfoliant", /exfoliat|\baha\b|\bbha\b|peel|salicylic|glycolic|lactic/i],
  ["Moisturizer", /moisturi[sz]|\bcream\b|hydrating gel|barrier/i],
  ["Serum", /serum|vitamin c|niacinamide|retinol|retinoid|treatment|hyaluronic|azelaic/i],
];

const norm = (s) => String(s || "").trim().toLowerCase();

/** The recommended product for a step, or null (at most one, nothing guessed). */
export function productForStep(stepText, products) {
  if (!Array.isArray(products) || products.length === 0) return null;
  const hit = STEP_KEYWORDS.find(([, re]) => re.test(stepText || ""));
  if (!hit) return null;
  return products.find((p) => norm(p.type) === norm(hit[0])) || null;
}

/** First sentence of the product's personalised description, as a short "why it fits" line. */
export function whyLine(product) {
  const text = String(product?.description || "").trim();
  if (!text) return "";
  const first = text.split(/(?<=[.!?])\s/)[0];
  return first.length > 110 ? `${first.slice(0, 107).trimEnd()}...` : first;
}
