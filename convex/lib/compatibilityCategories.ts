import { v } from 'convex/values';

/**
 * Single source of truth for AI compatibility scoring categories.
 * All 10 categories map directly to voice question data.
 */
export const COMPATIBILITY_CATEGORIES = [
  {
    key: 'coreValues',
    label: 'Core Values',
    weight: 2,
    description: 'Alignment on fundamental personal values and priorities',
  },
  {
    key: 'lifestyleAlignment',
    label: 'Lifestyle',
    weight: 1.5,
    description: 'Compatible daily routines, work-life balance, and habits',
  },
  {
    key: 'relationshipGoals',
    label: 'Relationship Goals',
    weight: 2,
    description: 'Shared vision for what the relationship looks like',
  },
  {
    key: 'emotionalCompatibility',
    label: 'Emotional',
    weight: 1.5,
    description: 'Emotional depth, vulnerability, and mutual understanding',
  },
  {
    key: 'familyPlanning',
    label: 'Family Planning',
    weight: 2,
    description: 'Alignment on kids, family closeness, and future plans',
  },
  {
    key: 'socialLifestyle',
    label: 'Social Life',
    weight: 1,
    description: 'Compatible social energy, friend groups, and going-out habits',
  },
  {
    key: 'growthMindset',
    label: 'Growth Mindset',
    weight: 2,
    description:
      'Shared commitment to personal growth — therapy, self-reflection, spiritual practices, learning from mistakes. Score high when both actively invest in becoming better people.',
  },
  {
    key: 'sharedPassions',
    label: 'Shared Passions',
    weight: 1,
    description:
      "How compatible their passions and interests are — shared hobbies, complementary energy, or overlapping worlds. They don't need identical interests, just passions that click together.",
  },
  {
    key: 'lifeStoryDepth',
    label: 'Life Story & Depth',
    weight: 1.5,
    description: 'Compatible life experiences, emotional maturity, depth of character',
  },
  {
    key: 'partnerFit',
    label: 'Partner Fit',
    weight: 2,
    description: 'How well each person matches what the other explicitly wants',
  },
] as const;

export type CategoryKey = (typeof COMPATIBILITY_CATEGORIES)[number]['key'];

export type CategoryScores = Record<CategoryKey, number>;
export type CategorySummaries = Record<CategoryKey, string>;

export const CATEGORY_KEYS = COMPATIBILITY_CATEGORIES.map((c) => c.key);

// Convex validator for categoryScores — used in mutation args (strict: all fields required)
export const categoryScoresValidator = v.object(
  Object.fromEntries(CATEGORY_KEYS.map((k) => [k, v.number()])) as Record<
    CategoryKey,
    ReturnType<typeof v.number>
  >
);

// Convex validator for categorySummaries — per-category text explanations
export const categorySummariesValidator = v.object(
  Object.fromEntries(CATEGORY_KEYS.map((k) => [k, v.string()])) as Record<
    CategoryKey,
    ReturnType<typeof v.string>
  >
);

// JSON snippet for the AI prompt — asks for { score, summary } per category
export const categoryScoresPromptJson = CATEGORY_KEYS.map(
  (k) =>
    `    "${k}": { "score": <0-10>, "summary": "1-2 sentence explanation of why this score was given, referencing specific details from both profiles." }`
).join(',\n');

// Category descriptions for the AI prompt
export const categoryDescriptionsPrompt = COMPATIBILITY_CATEGORIES.map(
  (c) => `- **${c.key}**: ${c.description}`
).join('\n');

// Max possible weighted sum (for normalization to 0-100)
const MAX_WEIGHTED = COMPATIBILITY_CATEGORIES.reduce((s, c) => s + c.weight * 10, 0);

// Weighted sum of category scores, normalized to 0-100
export function sumCategoryScores(scores: CategoryScores): number {
  const weighted = COMPATIBILITY_CATEGORIES.reduce(
    (sum, c) => sum + (scores[c.key] ?? 0) * c.weight,
    0
  );
  return Math.round((weighted / MAX_WEIGHTED) * 100);
}

// Mock scores for tests
export function mockCategoryScores(base = 7): CategoryScores {
  return Object.fromEntries(CATEGORY_KEYS.map((k) => [k, base])) as CategoryScores;
}

// Mock summaries for tests
export function mockCategorySummaries(text = 'Good alignment.'): CategorySummaries {
  return Object.fromEntries(CATEGORY_KEYS.map((k) => [k, text])) as CategorySummaries;
}
