// Static, editorial guidance shown on the dashboard's product recommendation
// cards. Keyed by product type (see PRODUCT_TYPES in ./products) so it works
// for both AI-personalized recommendations and the DEFAULT_RECOMMENDED_PRODUCTS
// starter kit — the "why" in a product's `description` is personalized by the
// AI, but *how* and *when* to use a given product type doesn't change
// per-user, so it's hand-written once here instead of round-tripped through
// the AI prompt.

export const PRODUCT_GUIDANCE = Object.freeze({
  Cleanser: {
    when: "AM & PM — first step of both routines",
    how: [
      "Wet your face with lukewarm water (hot water strips your barrier).",
      "Massage a coin-sized amount in gentle circular motions for 30-60 seconds.",
      "Rinse thoroughly and pat dry — don't rub.",
    ],
    faqs: [
      {
        q: "Why do I need a cleanser if my skin already looks clean?",
        a: "Sweat, oil, sunscreen, and pollution build up through the day even when skin looks fine. Left on overnight, that buildup can clog pores and dull your glow — a cleanser clears the slate so everything you apply after it actually absorbs.",
      },
      {
        q: "Can I use the same cleanser morning and night?",
        a: "Yes. Unless a dermatologist has told you otherwise, one gentle cleanser for both AM and PM is perfectly fine — consistency matters more than variety here.",
      },
      {
        q: "My skin feels tight after cleansing — is that normal?",
        a: "Tightness usually means the formula is too stripping for you. Follow up with moisturizer right away, and consider a gentler, fragrance-free cleanser next time.",
      },
    ],
  },
  Serum: {
    when: "AM, after cleansing and before moisturizer (treatment serums like retinol are usually PM-only)",
    how: [
      "Apply 2-3 drops to clean, dry skin.",
      "Pat gently into cheeks, forehead, and neck — avoid the eye area.",
      "Wait 1-2 minutes before layering moisturizer or sunscreen on top.",
    ],
    faqs: [
      {
        q: "Why do I need this specific serum?",
        a: "Serums carry the highest concentration of active ingredients in a routine, which is why they're matched to your lowest-scoring areas — the targeted ingredient is what actually moves the needle on things like dullness, fine lines, or dark spots.",
      },
      {
        q: "When will I start seeing results?",
        a: "Most actives need 4-6 weeks of consistent use before changes are visible — skin cell turnover takes time, so daily use matters more than any single application.",
      },
      {
        q: "Can I use it every day?",
        a: "Brightening and hydrating serums (like Vitamin C or hyaluronic acid) are usually fine daily. Stronger actives (retinol, strong acids) often start at 2-3x a week — ease in and watch how your skin responds.",
      },
    ],
  },
  Moisturizer: {
    when: "AM & PM — last step before sunscreen (AM) or your final PM step",
    how: [
      "Warm a pea-to-dime-sized amount between your fingertips.",
      "Press and smooth it over your face and neck while skin is still slightly damp.",
      "Give it a minute to settle before applying sunscreen or makeup.",
    ],
    faqs: [
      {
        q: "Do I still need moisturizer if my skin is oily?",
        a: "Yes — oily skin can still be dehydrated, and skipping moisturizer often triggers *more* oil production to compensate. A lightweight, oil-free formula keeps skin balanced without feeling heavy.",
      },
      {
        q: "Why does it matter if my skin is damp when I apply it?",
        a: "Moisturizer works by sealing in water, not adding it. Applying to slightly damp skin traps extra hydration underneath, making the same product noticeably more effective.",
      },
      {
        q: "Can this replace my sunscreen?",
        a: "No — even moisturizers labeled with SPF often don't give full coverage. Always apply a dedicated sunscreen as your last AM step.",
      },
    ],
  },
  Sunscreen: {
    when: "Every morning, as the final step — reapply if you're outdoors for 2+ hours",
    how: [
      "Apply as the very last step of your AM routine, after moisturizer.",
      "Use a generous, even layer across your face, neck, and ears.",
      "Reapply every 2 hours if you're outside for an extended period.",
    ],
    faqs: [
      {
        q: "Do I need sunscreen even when it's cloudy or I'm indoors?",
        a: "UV rays pass through clouds and windows. Daily sunscreen is the single biggest factor in preventing premature fine lines, dark spots, and uneven tone — more impactful than almost any other product in your routine.",
      },
      {
        q: "Will sunscreen make my skin feel greasy or break me out?",
        a: "Modern lightweight and mineral formulas are designed to sit comfortably under makeup without clogging pores. If a formula feels heavy, it's worth trying a different texture rather than skipping it.",
      },
      {
        q: "Does my skin tone mean I don't need sunscreen?",
        a: "All skin tones are affected by UV exposure — it's still the leading cause of premature aging and dark spots regardless of how visible sunburn is.",
      },
    ],
  },
  Exfoliant: {
    when: "PM, 2-3x per week — never combine with other strong actives the same night",
    how: [
      "Apply to clean, dry skin on exfoliation nights only — not every day.",
      "Follow with a hydrating moisturizer to support your barrier.",
      "Always wear sunscreen the next morning — exfoliated skin is more sun-sensitive.",
    ],
    faqs: [
      {
        q: "Why do I need to exfoliate if I already cleanse daily?",
        a: "Cleansing removes surface dirt and oil, but exfoliating clears away built-up dead skin cells that cleansing alone can't — that's what reveals brighter, smoother skin underneath and helps your other products absorb better.",
      },
      {
        q: "Can I exfoliate every day for faster results?",
        a: "More isn't better here — over-exfoliating damages your skin barrier, causing redness and sensitivity. 2-3x a week is the sweet spot for most people.",
      },
      {
        q: "Can I use it the same night as my serum?",
        a: "Stacking actives can be irritating. On exfoliation nights, keep the rest of your routine simple — cleanser, exfoliant, moisturizer — and save other treatment serums for other nights.",
      },
    ],
  },
});

export const DEFAULT_PRODUCT_GUIDANCE = {
  when: "As directed on your routine.",
  how: ["Apply to clean, dry skin as part of your daily routine."],
  faqs: [],
};

/** @param {string} type */
export function getProductGuidance(type) {
  return PRODUCT_GUIDANCE[/** @type {keyof typeof PRODUCT_GUIDANCE} */ (type)] || DEFAULT_PRODUCT_GUIDANCE;
}
