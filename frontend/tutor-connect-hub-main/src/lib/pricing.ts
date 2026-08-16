export const gradeBands = [
  "KG",
  "Grade 1-4",
  "Grade 5-6",
  "Grade 7-8",
  "Grade 9-10",
  "Grade 11-12",
  "University level",
] as const;

export type GradeBand = (typeof gradeBands)[number];
export type GradePricingEntry = {
  mode: "FIXED" | "NEGOTIATION";
  amount?: number | string | null;
};
export type GradePricingMap = Record<string, GradePricingEntry>;

export function parseGradePricing(value: unknown): GradePricingMap {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as GradePricingMap;
  }
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function summarizeGradePricing(value: unknown, fallback?: number | string | null) {
  const pricing = parseGradePricing(value);
  const amounts = Object.values(pricing)
    .filter((entry) => entry?.mode === "FIXED")
    .map((entry) => Number(entry.amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (amounts.length) return `From ${Math.min(...amounts)} ETB/hour`;
  if (Object.values(pricing).some((entry) => entry?.mode === "NEGOTIATION")) {
    return "By negotiation";
  }
  if (fallback !== null && fallback !== undefined && fallback !== "") {
    return `${fallback} ETB/hour`;
  }
  return "-";
}

export function formatGradePricing(value: unknown) {
  const pricing = parseGradePricing(value);
  return gradeBands
    .filter((grade) => pricing[grade])
    .map((grade) => {
      const entry = pricing[grade];
      if (entry.mode === "NEGOTIATION") return `${grade}: By negotiation`;
      const amount = Number(entry.amount);
      return Number.isFinite(amount) && amount > 0
        ? `${grade}: ${amount} ETB/hour`
        : `${grade}: -`;
    });
}

export function rateForGrade(value: unknown, grade: string, fallback = 0) {
  const pricing = parseGradePricing(value);
  const entry = pricing[grade];

  if (!entry) {
    return {
      amount: fallback,
      label: fallback > 0 ? `${fallback} ETB` : "By negotiation",
      negotiable: fallback <= 0,
    };
  }

  if (entry.mode === "NEGOTIATION") {
    return { amount: 0, label: "By negotiation", negotiable: true };
  }

  const amount = Number(entry.amount);
  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : fallback,
    label: Number.isFinite(amount) && amount > 0 ? `${amount} ETB` : "By negotiation",
    negotiable: !(Number.isFinite(amount) && amount > 0),
  };
}
