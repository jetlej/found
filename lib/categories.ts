// Category definitions for the level system
// Each category completion = +1 level

export type CategoryId =
  | "basic_traits"
  | "core_values"
  | "lifestyle_health"
  | "life_story"
  | "social_life"
  | "communication_style"
  | "relationship_expectations"
  | "family_kids"
  | "intimacy"
  | "love_philosophy"
  | "leisure_quirks"
  | "final_thoughts";

export interface Category {
  id: CategoryId;
  name: string; // Display name
  dbName: string; // Name as stored in questions table
  level: number; // Level unlocked by completing this category
  questionRange: [number, number]; // [start, end] question order numbers
  unlockDescription: string; // What completing this category unlocks
}

export const CATEGORIES: Category[] = [
  {
    id: "basic_traits",
    name: "Basic Traits",
    dbName: "Basic Traits",
    level: 1,
    questionRange: [1, 12],
    unlockDescription: "Waitlist entry & basic matching",
  },
  {
    id: "core_values",
    name: "Core Values",
    dbName: "Core Values",
    level: 2,
    questionRange: [13, 20],
    unlockDescription: "Core Values compatibility score",
  },
  {
    id: "lifestyle_health",
    name: "Lifestyle & Health",
    dbName: "Lifestyle & Health",
    level: 3,
    questionRange: [21, 35],
    unlockDescription: "Lifestyle compatibility score",
  },
  {
    id: "life_story",
    name: "Your Life Story",
    dbName: "Your Life Story",
    level: 4,
    questionRange: [36, 45],
    unlockDescription: "Life Story compatibility score",
  },
  {
    id: "social_life",
    name: "Social Life",
    dbName: "Social Life",
    level: 5,
    questionRange: [46, 52],
    unlockDescription: "Social compatibility score",
  },
  {
    id: "communication_style",
    name: "Communication Style",
    dbName: "Communication Style",
    level: 6,
    questionRange: [53, 60],
    unlockDescription: "Communication compatibility score",
  },
  {
    id: "relationship_expectations",
    name: "Relationship Expectations",
    dbName: "Relationship Expectations",
    level: 7,
    questionRange: [61, 70],
    unlockDescription: "Relationship compatibility score",
  },
  {
    id: "family_kids",
    name: "Family & Kids",
    dbName: "Family & Kids",
    level: 8,
    questionRange: [71, 78],
    unlockDescription: "Family compatibility score",
  },
  {
    id: "intimacy",
    name: "Intimacy",
    dbName: "Intimacy",
    level: 9,
    questionRange: [79, 84],
    unlockDescription: "Intimacy compatibility score",
  },
  {
    id: "love_philosophy",
    name: "Love Philosophy",
    dbName: "Love Philosophy",
    level: 10,
    questionRange: [85, 90],
    unlockDescription: "Philosophy compatibility score",
  },
  {
    id: "leisure_quirks",
    name: "Leisure & Quirks",
    dbName: "Leisure & Quirks",
    level: 11,
    questionRange: [91, 95],
    unlockDescription: "Quirks compatibility score",
  },
  {
    id: "final_thoughts",
    name: "Final Thoughts",
    dbName: "Final Thoughts",
    level: 12,
    questionRange: [96, 100],
    unlockDescription: "Full profile & max visibility",
  },
];

export const MAX_LEVEL = 12;

export function getCategoryById(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByLevel(level: number): Category | undefined {
  return CATEGORIES.find((c) => c.level === level);
}

export function getNextCategory(completedCategories: string[]): Category | undefined {
  return CATEGORIES.find((c) => !completedCategories.includes(c.id));
}

export function getQuestionCountForCategory(category: Category): number {
  return category.questionRange[1] - category.questionRange[0] + 1;
}
