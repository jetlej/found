// Canonical values for AI extraction from essays
// Small set (~30 items) makes AI extraction reliable and matchable

// Core personal values - AI maps essay answers to these
export const CANONICAL_VALUES = [
  "honesty",
  "loyalty",
  "family",
  "growth",
  "adventure",
  "independence",
  "security",
  "creativity",
  "ambition",
  "kindness",
  "humor",
  "faith",
  "authenticity",
  "empathy",
  "respect",
  "integrity",
  "balance",
  "passion",
  "curiosity",
  "optimism",
  "resilience",
  "patience",
  "generosity",
  "compassion",
  "courage",
  "wisdom",
  "freedom",
  "tradition",
  "equality",
  "justice",
] as const;

export type CanonicalValue = typeof CANONICAL_VALUES[number];

// Relationship-specific values - what matters in partnerships
export const RELATIONSHIP_VALUES = [
  "communication",
  "quality_time",
  "physical_affection",
  "trust",
  "emotional_support",
  "personal_space",
  "shared_goals",
  "romance",
  "humor_together",
  "stability",
  "growth_together",
  "adventure_together",
  "family_building",
  "mutual_independence",
  "teamwork",
] as const;

export type RelationshipValue = typeof RELATIONSHIP_VALUES[number];

// Human-readable labels for display
export const VALUE_LABELS: Record<string, string> = {
  // Core values
  honesty: "Honesty",
  loyalty: "Loyalty",
  family: "Family",
  growth: "Personal Growth",
  adventure: "Adventure",
  independence: "Independence",
  security: "Security",
  creativity: "Creativity",
  ambition: "Ambition",
  kindness: "Kindness",
  humor: "Humor",
  faith: "Faith",
  authenticity: "Authenticity",
  empathy: "Empathy",
  respect: "Respect",
  integrity: "Integrity",
  balance: "Work-Life Balance",
  passion: "Passion",
  curiosity: "Curiosity",
  optimism: "Optimism",
  resilience: "Resilience",
  patience: "Patience",
  generosity: "Generosity",
  compassion: "Compassion",
  courage: "Courage",
  wisdom: "Wisdom",
  freedom: "Freedom",
  tradition: "Tradition",
  equality: "Equality",
  justice: "Justice",
  // Relationship values
  communication: "Open Communication",
  quality_time: "Quality Time Together",
  physical_affection: "Physical Affection",
  trust: "Trust",
  emotional_support: "Emotional Support",
  personal_space: "Personal Space",
  shared_goals: "Shared Goals",
  romance: "Romance",
  humor_together: "Laughing Together",
  stability: "Stability",
  growth_together: "Growing Together",
  adventure_together: "Adventures Together",
  family_building: "Building a Family",
  mutual_independence: "Mutual Independence",
  teamwork: "Being a Team",
};

// Get display label for a value
export function getValueLabel(value: string): string {
  return VALUE_LABELS[value] || value;
}

// Check if a value is in our canonical list
export function isCanonicalValue(value: string): boolean {
  return CANONICAL_VALUES.includes(value as CanonicalValue);
}

export function isRelationshipValue(value: string): boolean {
  return RELATIONSHIP_VALUES.includes(value as RelationshipValue);
}

// Format canonical values for AI prompt
export function getCanonicalValuesForPrompt(): string {
  return CANONICAL_VALUES.join(", ");
}

export function getRelationshipValuesForPrompt(): string {
  return RELATIONSHIP_VALUES.join(", ");
}
