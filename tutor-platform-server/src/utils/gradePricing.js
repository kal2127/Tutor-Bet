const GRADE_BANDS = [
  "KG",
  "Grade 1-4",
  "Grade 5-6",
  "Grade 7-8",
  "Grade 9-10",
  "Grade 11-12",
  "University level",
];

function parseMaybeJson(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeGradePricingInput(gradeLevels, value) {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const selectedGrades = Array.isArray(gradeLevels) ? gradeLevels : [];
  return selectedGrades.reduce((acc, grade) => {
    const entry = parsed[grade];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return acc;

    const mode = String(entry.mode || "FIXED").toUpperCase();
    if (mode === "NEGOTIATION") {
      acc[grade] = { mode: "NEGOTIATION" };
      return acc;
    }

    acc[grade] = {
      mode: "FIXED",
      amount: Number(entry.amount),
    };
    return acc;
  }, {});
}

function summarizeHourlyRate(pricing, fallback = 0) {
  const amounts = Object.values(pricing || {})
    .filter((entry) => entry && entry.mode === "FIXED")
    .map((entry) => Number(entry.amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (amounts.length) return Math.min(...amounts);
  const fallbackAmount = Number(fallback);
  return Number.isFinite(fallbackAmount) && fallbackAmount > 0 ? fallbackAmount : 0;
}

function formatGradePricing(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "-";

  const lines = Object.entries(parsed).map(([grade, entry]) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    if (entry.mode === "NEGOTIATION") return `${grade}: By negotiation`;
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return `${grade}: ${amount} ETB/hour`;
  }).filter(Boolean);

  return lines.length ? lines.join(", ") : "-";
}

module.exports = {
  GRADE_BANDS,
  normalizeGradePricingInput,
  summarizeHourlyRate,
  formatGradePricing,
};
