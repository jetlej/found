// Compatibility matching algorithm - 6 category scores
// Uses structured onboarding answers + voice-parsed profile data

import { Doc } from "@/convex/_generated/dataModel";
import { INTERESTS_BY_ID } from "@/convex/lib/interests";

type UserProfile = Doc<"userProfiles">;
type User = Doc<"users">;

// 6 category weights (total = 100%)
export const CATEGORY_WEIGHTS = {
  theBasics: 0.25,         // Relationship goals, kids, substances, dealbreakers
  whoYouAre: 0.20,         // Personality traits + values
  relationshipStyle: 0.20, // Communication, conflict, intimacy, finances
  lifestyle: 0.15,         // Sleep, exercise, social, location, pets
  lifeFuture: 0.10,        // Family, kids, religion, politics
  theDeeperStuff: 0.10,    // Interests, passions, philosophy
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
// CATEGORY 1: THE BASICS
// Structured onboarding answers + voice-extracted dealbreakers
// ============================================================

// Relationship goal compatibility matrix
const RELATIONSHIP_GOAL_COMPAT: Record<string, Record<string, number>> = {
  marriage:      { marriage: 1, long_term: 0.7, life_partner: 0.6, figuring_out: 0.3 },
  long_term:     { long_term: 1, marriage: 0.7, life_partner: 0.8, figuring_out: 0.4 },
  life_partner:  { life_partner: 1, long_term: 0.8, marriage: 0.6, figuring_out: 0.4 },
  figuring_out:  { figuring_out: 0.7, long_term: 0.4, marriage: 0.3, life_partner: 0.4 },
};

// Substance adjacency scoring
function substanceSimilarity(a: string | undefined, b: string | undefined, levels: string[]): number {
  if (!a || !b) return 0.5;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  const ia = levels.indexOf(la);
  const ib = levels.indexOf(lb);
  if (ia === -1 || ib === -1) return 0.5;
  const distance = Math.abs(ia - ib);
  if (distance === 1) return 0.6;
  return 0.2;
}

export function scoreTheBasics(
  p1: UserProfile, p2: UserProfile,
  u1?: User, u2?: User,
): {
  score: number;
  dealbreakersTriggered: string[];
  warnings: string[];
} {
  const dealbreakersTriggered: string[] = [];
  const warnings: string[] = [];
  let totalScore = 0;
  let count = 0;

  // --- Relationship goals (from users table) ---
  if (u1?.relationshipGoal && u2?.relationshipGoal) {
    const s = RELATIONSHIP_GOAL_COMPAT[u1.relationshipGoal]?.[u2.relationshipGoal] ?? 0.5;
    totalScore += s;
    count++;
    if (s <= 0.3) warnings.push("Relationship Goals");
  }

  // --- Kids (from users table) ---
  const kidsCompat: Record<string, Record<string, number>> = {
    yes: { yes: 1, open: 0.8, not_sure: 0.6, no: 0.1 },
    no: { no: 1, open: 0.5, not_sure: 0.4, yes: 0.1 },
    open: { open: 0.9, yes: 0.8, not_sure: 0.8, no: 0.5 },
    not_sure: { not_sure: 0.7, open: 0.8, yes: 0.6, no: 0.4 },
  };
  if (u1?.wantsChildren && u2?.wantsChildren) {
    const s = kidsCompat[u1.wantsChildren]?.[u2.wantsChildren] ?? 0.5;
    totalScore += s;
    count++;
    if (s <= 0.2) dealbreakersTriggered.push("Kids");
    else if (s <= 0.4) warnings.push("Kids");
  }

  // --- Substances (from users table) ---
  const drinkLevels = ["never", "rarely", "socially", "regularly"];
  const smokeLevels = ["never", "sometimes", "regularly"];

  if (u1?.drinking && u2?.drinking) {
    totalScore += substanceSimilarity(u1.drinking, u2.drinking, drinkLevels);
    count++;
  }
  if (u1?.smoking && u2?.smoking) {
    totalScore += substanceSimilarity(u1.smoking, u2.smoking, smokeLevels);
    count++;
  }
  if (u1?.marijuana && u2?.marijuana) {
    totalScore += substanceSimilarity(u1.marijuana, u2.marijuana, smokeLevels);
    count++;
  }
  if (u1?.drugs && u2?.drugs) {
    totalScore += substanceSimilarity(u1.drugs, u2.drugs, smokeLevels);
    count++;
  }

  // --- Relationship type (from users table) ---
  const RELATIONSHIP_TYPE_COMPAT: Record<string, Record<string, number>> = {
    monogamy:         { monogamy: 1, "open to either": 0.7, "non-monogamy": 0.1 },
    "non-monogamy":   { "non-monogamy": 1, "open to either": 0.7, monogamy: 0.1 },
    "open to either": { "open to either": 0.9, monogamy: 0.7, "non-monogamy": 0.7 },
  };
  if (u1?.relationshipType && u2?.relationshipType) {
    const rt1 = u1.relationshipType.toLowerCase();
    const rt2 = u2.relationshipType.toLowerCase();
    const s = RELATIONSHIP_TYPE_COMPAT[rt1]?.[rt2] ?? 0.5;
    totalScore += s;
    count++;
    if (s <= 0.2) warnings.push("Relationship Type");
  }

  // --- Voice-extracted dealbreakers cross-check ---
  const allDealbreakers1 = [
    ...(p1.dealbreakers || []),
    ...(p1.partnerPreferences?.dealbreakersInPartner || []),
  ];
  const allDealbreakers2 = [
    ...(p2.dealbreakers || []),
    ...(p2.partnerPreferences?.dealbreakersInPartner || []),
  ];
  const keywords1 = new Set([...(p1.keywords || []), ...(p1.values || [])].map(s => s.toLowerCase()));
  const keywords2 = new Set([...(p2.keywords || []), ...(p2.values || [])].map(s => s.toLowerCase()));

  for (const db of allDealbreakers1) {
    if (keywords2.has(db.toLowerCase())) {
      dealbreakersTriggered.push(db);
    }
  }
  for (const db of allDealbreakers2) {
    if (keywords1.has(db.toLowerCase())) {
      dealbreakersTriggered.push(db);
    }
  }

  // --- Fallback: old preferences-based scoring for legacy users ---
  if (count === 0 && p1.preferences && p2.preferences) {
    const prefKeys = [
      "relationshipGoals", "relationshipStyle", "hasChildren", "wantsChildren",
      "ethnicity", "religion", "politics", "education",
      "alcohol", "smoking", "marijuana", "drugs",
    ] as const;

    for (const key of prefKeys) {
      const pref1 = p1.preferences[key];
      const pref2 = p2.preferences[key];
      if (!pref1 || !pref2) continue;

      const p1Meets = pref2.openTo.length === 0 || pref2.openTo.includes(pref1.self);
      const p2Meets = pref1.openTo.length === 0 || pref1.openTo.includes(pref2.self);

      if (p1Meets && p2Meets) {
        totalScore += 1;
      } else if (p1Meets || p2Meets) {
        totalScore += 0.5;
        if ((pref1.isDealbreaker && !p2Meets) || (pref2.isDealbreaker && !p1Meets)) {
          dealbreakersTriggered.push(key);
        }
      } else {
        if (pref1.isDealbreaker || pref2.isDealbreaker) {
          dealbreakersTriggered.push(key);
        }
      }
      count++;
    }
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

  // Broader values overlap (voice-extracted)
  if (p1.values && p2.values && p1.values.length > 0 && p2.values.length > 0) {
    score += arrayOverlap(p1.values, p2.values);
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

export function scoreLifestyle(p1: UserProfile, p2: UserProfile, u1?: User, u2?: User): number {
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

  // Pet preference - try voice-parsed lifestyle, fallback to users table
  const pet1 = p1.lifestyle.petPreference || u1?.pets;
  const pet2 = p2.lifestyle.petPreference || u2?.pets;
  if (pet1 && pet2) {
    if (pet1.toLowerCase() === pet2.toLowerCase()) {
      score += 1;
    } else if (pet1.toLowerCase() === "neutral" || pet2.toLowerCase() === "neutral") {
      score += 0.8;
    } else {
      score += 0.5;
    }
    count++;
  }

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

export function scoreLifeFuture(
  p1: UserProfile, p2: UserProfile,
  u1?: User, u2?: User,
): number {
  let score = 0;
  let count = 0;

  // Family closeness
  score += numericSimilarity(p1.familyPlans.familyCloseness, p2.familyPlans.familyCloseness);
  count++;

  // Kids preference (from voice-parsed familyPlans, already enriched with structured answer)
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

  // Religion/politics - try demographics from profile, fallback to users table
  const rel1 = p1.demographics?.religion ?? u1?.religion;
  const rel2 = p2.demographics?.religion ?? u2?.religion;
  const relImp1 = p1.demographics?.religiosity ?? u1?.religionImportance ?? 5;
  const relImp2 = p2.demographics?.religiosity ?? u2?.religionImportance ?? 5;

  const religionImportance = Math.max(relImp1, relImp2) / 10;
  if (rel1 && rel2 && religionImportance > 0.2) {
    const religionMatch = rel1.toLowerCase() === rel2.toLowerCase() ? 1 : 0.3;
    score += religionMatch * religionImportance;
    count += religionImportance;
  }

  const pol1 = p1.demographics?.politicalLeaning ?? u1?.politicalLeaning;
  const pol2 = p2.demographics?.politicalLeaning ?? u2?.politicalLeaning;
  const polImp1 = p1.demographics?.politicalIntensity ?? u1?.politicalImportance ?? 5;
  const polImp2 = p2.demographics?.politicalIntensity ?? u2?.politicalImportance ?? 5;

  const politicsImportance = Math.max(polImp1, polImp2) / 10;
  if (pol1 && pol2 && politicsImportance > 0.2) {
    const politicsMatch = pol1.toLowerCase() === pol2.toLowerCase() ? 1 : 0.3;
    score += politicsMatch * politicsImportance;
    count += politicsImportance;
  }

  // Ethnicity - try demographics from profile, fallback to users table
  const eth1 = p1.demographics?.ethnicity ?? u1?.ethnicity;
  const eth2 = p2.demographics?.ethnicity ?? u2?.ethnicity;
  if (eth1 && eth2) {
    score += eth1.toLowerCase() === eth2.toLowerCase() ? 0.8 : 0.5;
    count++;
  }

  return count > 0 ? Math.round((score / count) * 100) : 50;
}

// ============================================================
// CATEGORY 6: THE DEEPER STUFF
// Shared interests + passions + philosophy
// ============================================================

export function scoreTheDeeperStuff(p1: UserProfile, p2: UserProfile): {
  score: number;
  sharedInterests: string[];
} {
  let score = 0;
  let count = 0;
  const sharedInterests: string[] = [];

  // Voice-extracted interests (free-text)
  if (p1.interests && p2.interests &&
      p1.interests.length > 0 && p2.interests.length > 0) {
    const overlap = arrayOverlap(p1.interests, p2.interests);
    score += overlap;
    count++;

    // Collect shared interests for display
    const set2 = new Set(p2.interests.map(s => s.toLowerCase()));
    for (const interest of p1.interests) {
      if (set2.has(interest.toLowerCase())) {
        sharedInterests.push(interest);
      }
    }
  }

  // Passions overlap (from bioElements)
  if (p1.bioElements?.passions && p2.bioElements?.passions &&
      p1.bioElements.passions.length > 0 && p2.bioElements.passions.length > 0) {
    score += arrayOverlap(p1.bioElements.passions, p2.bioElements.passions);
    count++;
  }

  // Fallback: selected interests from picker (legacy)
  if (count === 0 && p1.selectedInterests && p2.selectedInterests &&
      p1.selectedInterests.length > 0 && p2.selectedInterests.length > 0) {
    const shared = p1.selectedInterests.filter(i => p2.selectedInterests!.includes(i));
    for (const interestId of shared) {
      const interest = INTERESTS_BY_ID.get(interestId);
      if (interest) sharedInterests.push(interest.name);
    }
    const maxInterests = Math.max(p1.selectedInterests.length, p2.selectedInterests.length);
    score += maxInterests > 0 ? shared.length / maxInterests : 0;
    count++;
  }

  // Love philosophy (if available)
  if (p1.lovePhilosophy && p2.lovePhilosophy) {
    if (p1.lovePhilosophy.believesInSoulmates === p2.lovePhilosophy.believesInSoulmates) {
      score += 1;
    } else {
      score += 0.5;
    }
    count++;

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

export function calculateCompatibility(
  p1: UserProfile, p2: UserProfile,
  u1?: User, u2?: User,
): CompatibilityResult {
  // Score each category
  const basicsResult = scoreTheBasics(p1, p2, u1, u2);
  const whoYouAre = scoreWhoYouAre(p1, p2);
  const relationshipStyle = scoreRelationshipStyle(p1, p2);
  const lifestyle = scoreLifestyle(p1, p2, u1, u2);
  const lifeFuture = scoreLifeFuture(p1, p2, u1, u2);
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
