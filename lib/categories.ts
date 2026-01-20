// Category definitions for the level system
// Each category completion = +1 level
// Restructured to 6 categories with front-loaded compatibility filters

export type CategoryId =
  | "the_basics"
  | "who_you_are"
  | "relationship_style"
  | "lifestyle"
  | "life_future"
  | "deeper_stuff";

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
    id: "the_basics",
    name: "The Basics",
    dbName: "The Basics",
    level: 1,
    questionRange: [1, 33],
    unlockDescription: "Core matching & compatibility filters",
  },
  {
    id: "who_you_are",
    name: "Who You Are",
    dbName: "Who You Are",
    level: 2,
    questionRange: [34, 46],
    unlockDescription: "Personality compatibility score",
  },
  {
    id: "relationship_style",
    name: "Relationship Style",
    dbName: "Relationship Style",
    level: 3,
    questionRange: [47, 60],
    unlockDescription: "Relationship compatibility score",
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    dbName: "Lifestyle",
    level: 4,
    questionRange: [61, 72],
    unlockDescription: "Lifestyle compatibility score",
  },
  {
    id: "life_future",
    name: "Life & Future",
    dbName: "Life & Future",
    level: 5,
    questionRange: [73, 82],
    unlockDescription: "Life goals compatibility score",
  },
  {
    id: "deeper_stuff",
    name: "The Deeper Stuff",
    dbName: "The Deeper Stuff",
    level: 6,
    questionRange: [83, 91],
    unlockDescription: "Full profile & max visibility",
  },
];

export const MAX_LEVEL = 6;

export function getCategoryById(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByLevel(level: number): Category | undefined {
  return CATEGORIES.find((c) => c.level === level);
}

export function getCategoryByDbName(dbName: string): Category | undefined {
  return CATEGORIES.find((c) => c.dbName === dbName);
}

export function getNextCategory(completedCategories: string[]): Category | undefined {
  return CATEGORIES.find((c) => !completedCategories.includes(c.id));
}

export function getQuestionCountForCategory(category: Category): number {
  return category.questionRange[1] - category.questionRange[0] + 1;
}
