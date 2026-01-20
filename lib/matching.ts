// Compatibility matching algorithm - 6 category scores aligned with question categories
// Each category corresponds to a level in the journey

import { Doc } from "@/convex/_generated/dataModel";
import { INTEREST_COUNT, INTERESTS_BY_ID } from "@/convex/lib/interests";

type UserProfile = Doc<"userProfiles">;

// 6 category weights (total = 100%)
export const CATEGORY_WEIGHTS = {
  theBasics: 0.25,      // Q1-32: Preferences + dealbreakers
  whoYouAre: 0.20,      // Q33-45: Personality + values
  relationshipStyle: 0.20, // Q46-59: Communication + intimacy
  lifestyle: 0.15,      // Q60-71: Daily life
  lifeFuture: 0.10,     // Q72-81: Family + goals
  theDeeperStuff: 0.10, // Q82-90: Interests + philosophy
};

// Category display names
export const CATEGORY_NAMES = {
  theBasics: "The Basics",
  whoYouAre: "Who You Are",
  relationshipStyle: "Relationship Style",
  lifestyle: "Lifestyle",
  lifeFuture: "Life & Future",
  theDeeperStuff: "The Deeper Stuff",
};

// Types
export interface CategoryScores {
  theBasics: number;
  whoYouAre: number;
  relationshipStyle: number;
  lifestyle: number;
  lifeFuture: number;
  theDeeperStuff: number;
}

export interface DealbreakersResult {
  triggered: string[];
  warnings: string[];
  passed: boolean;
}

export interface CompatibilityResult {
  overallScore: number;
  categoryScores: CategoryScores;
  dealbreakers: DealbreakersResult;
  sharedInterests: string[];
  sharedValues: string[];
}

// Helper: Calculate numeric similarity (1-10 scale)
function numericSimilarity(val1: number, val2: number, max: number = 10): number {
  return 1 - Math.abs(val1 - val2) / max;
}

// Helper: Calculate array overlap (Jaccard similarity)
function arrayOverlap(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  const intersection = [...set1].filter(x => set2.has(x));
  const union = new Set([...set1, ...set2]);

  return intersection.length / union.size;
}

// ============================================================
// CATEGORY 1: THE BASICS (Q1-32)
// Checklist preferences + dealbreakers
// ============================================================

interface PreferenceMatch {
  category: string;
  p1MeetsP2: boolean;
  p2MeetsP1: boolean;
  isDealbreaker1: boolean;
  isDealbreaker2: boolean;
}

function checkPreferenceMatch(
  p1Pref: { self: string; openTo: string[]; isDealbreaker: boolean } | undefined,
  p2Pref: { self: string; openTo: string[]; isDealbreaker: boolean } | undefined
): { p1MeetsP2: boolean; p2MeetsP1: boolean; isDealbreaker1: boolean; isDealbreaker2: boolean } {
  if (!p1Pref || !p2Pref) {
    return { p1MeetsP2: true, p2MeetsP1: true, isDealbreaker1: false, isDealbreaker2: false };
  }

  // Does p1's self match p2's openTo?
  const p1MeetsP2 = p2Pref.openTo.length === 0 || p2Pref.openTo.includes(p1Pref.self);
  // Does p2's self match p1's openTo?
  const p2MeetsP1 = p1Pref.openTo.length === 0 || p1Pref.openTo.includes(p2Pref.self);

  return {
    p1MeetsP2,
    p2MeetsP1,
    isDealbreaker1: p1Pref.isDealbreaker,
    isDealbreaker2: p2Pref.isDealbreaker,
  };
}

export function scoreTheBasics(p1: UserProfile, p2: UserProfile): {
  score: number;
  dealbreakersTriggered: string[];
  warnings: string[];
} {
  const prefs1 = p1.preferences;
  const prefs2 = p2.preferences;

  if (!prefs1 || !prefs2) {
    return { score: 50, dealbreakersTriggered: [], warnings: [] };
  }

  const dealbreakersTriggered: string[] = [];
  const warnings: string[] = [];
  let totalScore = 0;
  let count = 0;

  const preferenceCategories = [
    { key: "relationshipGoals", name: "Relationship Goals" },
    { key: "relationshipStyle", name: "Relationship Style" },
    { key: "hasChildren", name: "Has Children" },
    { key: "wantsChildren", name: "Wants Children" },
    { key: "ethnicity", name: "Ethnicity" },
    { key: "religion", name: "Religion" },
    { key: "politics", name: "Politics" },
    { key: "education", name: "Education" },
    { key: "alcohol", name: "Alcohol" },
    { key: "smoking", name: "Smoking" },
    { key: "marijuana", name: "Marijuana" },
    { key: "drugs", name: "Drugs" },
  ] as const;

  for (const { key, name } of preferenceCategories) {
    const pref1 = prefs1[key];
    const pref2 = prefs2[key];
    const match = checkPreferenceMatch(pref1, pref2);

    // Calculate score for this preference
    let prefScore = 0;
    if (match.p1MeetsP2 && match.p2MeetsP1) {
      prefScore = 1; // Both match
    } else if (match.p1MeetsP2 || match.p2MeetsP1) {
      prefScore = 0.5; // One-way match
      if ((match.isDealbreaker1 && !match.p2MeetsP1) || (match.isDealbreaker2 && !match.p1MeetsP2)) {
        dealbreakersTriggered.push(name);
      } else {
        warnings.push(name);
      }
    } else {
      prefScore = 0; // No match
      if (match.isDealbreaker1 || match.isDealbreaker2) {
        dealbreakersTriggered.push(name);
      } else {
        warnings.push(name);
      }
    }

    totalScore += prefScore;
    count++;
  }

  return {
    score: count > 0 ? Math.round((totalScore / count) * 100) : 50,
    dealbreakersTriggered,
    warnings,
  };
}

// ============================================================
// CATEGORY 2: WHO YOU ARE (Q33-45)
// Personality scales + canonical values from essays
// ============================================================

export function scoreWhoYouAre(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let count = 0;

  // Personality traits (11 dimensions)
  const traits = [
    "introversion", "adventurousness", "ambition", "emotionalOpenness",
    "traditionalValues", "independenceNeed", "romanticStyle", "socialEnergy",
    "communicationStyle", "attachmentStyle", "planningStyle"
  ] as const;

  for (const trait of traits) {
    const val1 = p1.traits[trait];
    const val2 = p2.traits[trait];
    if (val1 !== undefined && val2 !== undefined) {
      score += numericSimilarity(val1, val2);
      count++;
    }
  }

  // Canonical values overlap (if available)
  if (p1.canonicalValues && p2.canonicalValues && 
      p1.canonicalValues.length > 0 && p2.canonicalValues.length > 0) {
    score += arrayOverlap(p1.canonicalValues, p2.canonicalValues);
    count++;
  }

  return count > 0 ? Math.round((score / count) * 100) : 50;
}

// ============================================================
// CATEGORY 3: RELATIONSHIP STYLE (Q46-59)
// Communication, attachment, intimacy, finances
// ============================================================

export function scoreRelationshipStyle(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let count = 0;

  // Love language
  if (p1.relationshipStyle.loveLanguage === p2.relationshipStyle.loveLanguage) {
    score += 1;
  } else {
    score += 0.6; // Different love languages can complement
  }
  count++;

  // Conflict style
  if (p1.relationshipStyle.conflictStyle === p2.relationshipStyle.conflictStyle) {
    score += 1;
  } else {
    score += 0.5;
  }
  count++;

  // Communication frequency
  if (p1.relationshipStyle.communicationFrequency === p2.relationshipStyle.communicationFrequency) {
    score += 1;
  } else {
    score += 0.5;
  }
  count++;

  // Financial approach
  if (p1.relationshipStyle.financialApproach === p2.relationshipStyle.financialApproach) {
    score += 1;
  } else {
    score += 0.4;
  }
  count++;

  // Alone time need
  score += numericSimilarity(p1.relationshipStyle.aloneTimeNeed, p2.relationshipStyle.aloneTimeNeed);
  count++;

  // Intimacy profile (if available)
  if (p1.intimacyProfile && p2.intimacyProfile) {
    score += numericSimilarity(
      p1.intimacyProfile.physicalIntimacyImportance,
      p2.intimacyProfile.physicalIntimacyImportance
    );
    count++;

    // PDA comfort
    const pdaLevels: Record<string, number> = {
      "loves_it": 5, "comfortable": 4, "moderate": 3, "private": 2, "uncomfortable": 1
    };
    const pda1 = pdaLevels[p1.intimacyProfile.pdaComfort.toLowerCase()] || 3;
    const pda2 = pdaLevels[p2.intimacyProfile.pdaComfort.toLowerCase()] || 3;
    score += numericSimilarity(pda1, pda2, 5);
    count++;
  }

  return count > 0 ? Math.round((score / count) * 100) : 50;
}

// ============================================================
// CATEGORY 4: LIFESTYLE (Q60-71)
// Sleep, exercise, social life, health, pets
// ============================================================

export function scoreLifestyle(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let count = 0;

  // Sleep schedule
  if (p1.lifestyle.sleepSchedule === p2.lifestyle.sleepSchedule) {
    score += 1;
  } else {
    score += 0.5;
  }
  count++;

  // Exercise level
  if (p1.lifestyle.exerciseLevel === p2.lifestyle.exerciseLevel) {
    score += 1;
  } else {
    score += 0.5;
  }
  count++;

  // Alcohol use
  if (p1.lifestyle.alcoholUse === p2.lifestyle.alcoholUse) {
    score += 1;
  } else if (p1.lifestyle.alcoholUse === "Never" || p2.lifestyle.alcoholUse === "Never") {
    score += 0.4;
  } else {
    score += 0.7;
  }
  count++;

  // Drug use
  if (p1.lifestyle.drugUse === p2.lifestyle.drugUse) {
    score += 1;
  } else if (p1.lifestyle.drugUse === "Never" || p2.lifestyle.drugUse === "Never") {
    score += 0.3;
  } else {
    score += 0.6;
  }
  count++;

  // Location preference
  if (p1.lifestyle.locationPreference === p2.lifestyle.locationPreference) {
    score += 1;
  } else if (p1.lifestyle.locationPreference === "flexible" || p2.lifestyle.locationPreference === "flexible") {
    score += 0.8;
  } else {
    score += 0.4;
  }
  count++;

  // Pet preference
  if (p1.lifestyle.petPreference === p2.lifestyle.petPreference) {
    score += 1;
  } else if (p1.lifestyle.petPreference === "neutral" || p2.lifestyle.petPreference === "neutral") {
    score += 0.8;
  } else {
    score += 0.5;
  }
  count++;

  // Social profile (if available)
  if (p1.socialProfile && p2.socialProfile) {
    score += numericSimilarity(p1.socialProfile.goOutFrequency, p2.socialProfile.goOutFrequency);
    count++;
  }

  // Health (if available)
  if (p1.health && p2.health) {
    score += numericSimilarity(p1.health.physicalHealthRating, p2.health.physicalHealthRating);
    count++;
  }

  return count > 0 ? Math.round((score / count) * 100) : 50;
}

// ============================================================
// CATEGORY 5: LIFE & FUTURE (Q72-81)
// Family closeness, location, career ambitions
// ============================================================

export function scoreLifeFuture(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let count = 0;

  // Family closeness
  score += numericSimilarity(p1.familyPlans.familyCloseness, p2.familyPlans.familyCloseness);
  count++;

  // Kids preference
  const kidsCompat: Record<string, Record<string, number>> = {
    yes: { yes: 1, maybe: 0.7, open: 0.8, no: 0.1, already_has: 0.8, unknown: 0.5 },
    no: { no: 1, maybe: 0.4, open: 0.5, yes: 0.1, already_has: 0.2, unknown: 0.5 },
    maybe: { maybe: 0.8, yes: 0.7, no: 0.4, open: 0.8, already_has: 0.6, unknown: 0.6 },
    open: { open: 0.9, yes: 0.8, no: 0.5, maybe: 0.8, already_has: 0.7, unknown: 0.7 },
    already_has: { already_has: 0.9, yes: 0.8, open: 0.7, maybe: 0.6, no: 0.2, unknown: 0.5 },
    unknown: { unknown: 0.5, yes: 0.5, no: 0.5, maybe: 0.6, open: 0.7, already_has: 0.5 },
  };

  const kids1 = p1.familyPlans.wantsKids.toLowerCase().replace(" ", "_");
  const kids2 = p2.familyPlans.wantsKids.toLowerCase().replace(" ", "_");
  score += kidsCompat[kids1]?.[kids2] ?? 0.5;
  count++;

  // Demographics (religion/politics weighted by importance)
  if (p1.demographics && p2.demographics) {
    // Religion
    const religionImportance = Math.max(p1.demographics.religiosity, p2.demographics.religiosity) / 10;
    if (religionImportance > 0.2) {
      const religionMatch = p1.demographics.religion?.toLowerCase() === p2.demographics.religion?.toLowerCase() ? 1 : 0.3;
      score += religionMatch * religionImportance;
      count += religionImportance;
    }

    // Politics
    const politicsImportance = Math.max(p1.demographics.politicalIntensity, p2.demographics.politicalIntensity) / 10;
    if (politicsImportance > 0.2) {
      const politicsMatch = p1.demographics.politicalLeaning?.toLowerCase() === p2.demographics.politicalLeaning?.toLowerCase() ? 1 : 0.3;
      score += politicsMatch * politicsImportance;
      count += politicsImportance;
    }
  }

  return count > 0 ? Math.round((score / count) * 100) : 50;
}

// ============================================================
// CATEGORY 6: THE DEEPER STUFF (Q82-90)
// Shared interests (rarity-weighted) + philosophy
// ============================================================

// Estimate interest popularity (lower = rarer = more valuable)
// In production, this would be calculated from actual user data
function getInterestRarity(interestId: string): number {
  // For now, use a simple heuristic based on category
  const interest = INTERESTS_BY_ID.get(interestId);
  if (!interest) return 1;

  // Assume subcategories like "specific" are rarer than "genres"
  if (interest.subcategory === "specific" || interest.subcategory === "artists" || 
      interest.subcategory === "shows" || interest.subcategory === "games") {
    return 0.3; // Rare - high value
  }
  return 0.7; // Common - lower value
}

export function scoreTheDeeperStuff(p1: UserProfile, p2: UserProfile): {
  score: number;
  sharedInterests: string[];
} {
  let score = 0;
  let count = 0;
  const sharedInterests: string[] = [];

  // Selected interests (from picker) - rarity-weighted
  if (p1.selectedInterests && p2.selectedInterests &&
      p1.selectedInterests.length > 0 && p2.selectedInterests.length > 0) {
    
    const shared = p1.selectedInterests.filter(i => p2.selectedInterests!.includes(i));
    
    // Calculate rarity-weighted score
    let interestScore = 0;
    for (const interestId of shared) {
      const rarity = getInterestRarity(interestId);
      interestScore += (1 - rarity) + 0.5; // Rarer interests worth more
      
      // Get display name for shared interests
      const interest = INTERESTS_BY_ID.get(interestId);
      if (interest) {
        sharedInterests.push(interest.name);
      }
    }

    // Normalize by max possible score
    const maxInterests = Math.max(p1.selectedInterests.length, p2.selectedInterests.length);
    score += maxInterests > 0 ? Math.min(interestScore / maxInterests, 1) : 0;
    count++;
  }

  // Love philosophy (if available)
  if (p1.lovePhilosophy && p2.lovePhilosophy) {
    // Soulmates belief
    if (p1.lovePhilosophy.believesInSoulmates === p2.lovePhilosophy.believesInSoulmates) {
      score += 1;
    } else {
      score += 0.5;
    }
    count++;

    // Romantic gestures overlap
    if (p1.lovePhilosophy.romanticGestures.length > 0 && p2.lovePhilosophy.romanticGestures.length > 0) {
      score += arrayOverlap(p1.lovePhilosophy.romanticGestures, p2.lovePhilosophy.romanticGestures);
      count++;
    }
  }

  return {
    score: count > 0 ? Math.round((score / count) * 100) : 50,
    sharedInterests,
  };
}

// ============================================================
// MAIN COMPATIBILITY CALCULATION
// ============================================================

export function calculateCompatibility(p1: UserProfile, p2: UserProfile): CompatibilityResult {
  // Score each category
  const basicsResult = scoreTheBasics(p1, p2);
  const whoYouAre = scoreWhoYouAre(p1, p2);
  const relationshipStyle = scoreRelationshipStyle(p1, p2);
  const lifestyle = scoreLifestyle(p1, p2);
  const lifeFuture = scoreLifeFuture(p1, p2);
  const deeperResult = scoreTheDeeperStuff(p1, p2);

  const categoryScores: CategoryScores = {
    theBasics: basicsResult.score,
    whoYouAre,
    relationshipStyle,
    lifestyle,
    lifeFuture,
    theDeeperStuff: deeperResult.score,
  };

  // Calculate weighted overall score
  const overallScore = Math.round(
    categoryScores.theBasics * CATEGORY_WEIGHTS.theBasics +
    categoryScores.whoYouAre * CATEGORY_WEIGHTS.whoYouAre +
    categoryScores.relationshipStyle * CATEGORY_WEIGHTS.relationshipStyle +
    categoryScores.lifestyle * CATEGORY_WEIGHTS.lifestyle +
    categoryScores.lifeFuture * CATEGORY_WEIGHTS.lifeFuture +
    categoryScores.theDeeperStuff * CATEGORY_WEIGHTS.theDeeperStuff
  );

  // Get shared canonical values
  const sharedValues = (p1.canonicalValues && p2.canonicalValues)
    ? p1.canonicalValues.filter(v => p2.canonicalValues!.includes(v))
    : [];

  return {
    overallScore,
    categoryScores,
    dealbreakers: {
      triggered: basicsResult.dealbreakersTriggered,
      warnings: basicsResult.warnings,
      passed: basicsResult.dealbreakersTriggered.length === 0,
    },
    sharedInterests: deeperResult.sharedInterests,
    sharedValues,
  };
}
