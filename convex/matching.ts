import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Weights for different compatibility factors (must sum to 1.0)
const WEIGHTS = {
  values: 0.25, // Core values alignment
  lifestyle: 0.2, // Daily habits compatibility
  relationshipStyle: 0.2, // How they approach relationships
  familyPlans: 0.15, // Kids and family alignment
  interests: 0.1, // Shared hobbies
  personality: 0.1, // Complementary traits
};

// Calculate overlap between two arrays (Jaccard similarity)
function calculateArrayOverlap(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1.map((s) => s.toLowerCase()));
  const set2 = new Set(arr2.map((s) => s.toLowerCase()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Calculate similarity between two numeric values (normalized to 0-1)
function calculateNumericSimilarity(
  val1: number,
  val2: number,
  max: number = 10
): number {
  const diff = Math.abs(val1 - val2);
  return 1 - diff / max;
}

// Calculate values compatibility
function calculateValuesScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const valuesOverlap = calculateArrayOverlap(profile1.values, profile2.values);

  // Check for dealbreaker conflicts
  const dealbreaker1Set = new Set(
    profile1.dealbreakers.map((d) => d.toLowerCase())
  );
  const dealbreaker2Set = new Set(
    profile2.dealbreakers.map((d) => d.toLowerCase())
  );

  // Check if any of profile1's traits match profile2's dealbreakers (and vice versa)
  // This is a simplified check - in production you'd want more sophisticated matching
  let dealbreakersConflict = false;

  // For now, just use values overlap
  return valuesOverlap;
}

// Calculate lifestyle compatibility
function calculateLifestyleScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const lifestyle1 = profile1.lifestyle;
  const lifestyle2 = profile2.lifestyle;

  let score = 0;
  let factors = 0;

  // Sleep schedule compatibility
  if (lifestyle1.sleepSchedule === lifestyle2.sleepSchedule) {
    score += 1;
  } else if (
    (lifestyle1.sleepSchedule.includes("morning") &&
      lifestyle2.sleepSchedule.includes("morning")) ||
    (lifestyle1.sleepSchedule.includes("night") &&
      lifestyle2.sleepSchedule.includes("night"))
  ) {
    score += 0.7;
  } else {
    score += 0.3;
  }
  factors++;

  // Exercise level compatibility
  if (lifestyle1.exerciseLevel === lifestyle2.exerciseLevel) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Alcohol use compatibility
  if (lifestyle1.alcoholUse === lifestyle2.alcoholUse) {
    score += 1;
  } else if (
    lifestyle1.alcoholUse === "Never" ||
    lifestyle2.alcoholUse === "Never"
  ) {
    // One person doesn't drink - might be an issue
    score += 0.4;
  } else {
    score += 0.7;
  }
  factors++;

  // Drug use compatibility
  if (lifestyle1.drugUse === lifestyle2.drugUse) {
    score += 1;
  } else if (lifestyle1.drugUse === "Never" || lifestyle2.drugUse === "Never") {
    score += 0.3;
  } else {
    score += 0.6;
  }
  factors++;

  // Location preference compatibility
  if (lifestyle1.locationPreference === lifestyle2.locationPreference) {
    score += 1;
  } else if (
    lifestyle1.locationPreference === "flexible" ||
    lifestyle2.locationPreference === "flexible"
  ) {
    score += 0.8;
  } else {
    score += 0.4;
  }
  factors++;

  // Pet preference - simplified
  if (lifestyle1.petPreference === lifestyle2.petPreference) {
    score += 1;
  } else if (
    lifestyle1.petPreference === "neutral" ||
    lifestyle2.petPreference === "neutral"
  ) {
    score += 0.7;
  } else {
    score += 0.4;
  }
  factors++;

  return score / factors;
}

// Calculate relationship style compatibility
function calculateRelationshipStyleScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const style1 = profile1.relationshipStyle;
  const style2 = profile2.relationshipStyle;

  let score = 0;
  let factors = 0;

  // Love language - some combinations are more compatible
  if (style1.loveLanguage === style2.loveLanguage) {
    score += 1;
  } else {
    score += 0.6; // Different love languages can still work
  }
  factors++;

  // Communication frequency
  if (style1.communicationFrequency === style2.communicationFrequency) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Conflict style
  if (style1.conflictStyle === style2.conflictStyle) {
    score += 1;
  } else {
    score += 0.6;
  }
  factors++;

  // Financial approach
  if (style1.financialApproach === style2.financialApproach) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Alone time need - similar needs are better
  score += calculateNumericSimilarity(style1.aloneTimeNeed, style2.aloneTimeNeed);
  factors++;

  return score / factors;
}

// Calculate family plans compatibility
function calculateFamilyPlansScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const family1 = profile1.familyPlans;
  const family2 = profile2.familyPlans;

  let score = 0;
  let factors = 0;

  // Kids preference - this is often a dealbreaker
  const kidsCompatibility: Record<string, Record<string, number>> = {
    yes: { yes: 1, maybe: 0.7, open: 0.8, no: 0.1, already_has: 0.8, unknown: 0.5 },
    no: { no: 1, maybe: 0.4, open: 0.5, yes: 0.1, already_has: 0.2, unknown: 0.5 },
    maybe: { maybe: 0.8, yes: 0.7, no: 0.4, open: 0.8, already_has: 0.6, unknown: 0.6 },
    open: { open: 0.9, yes: 0.8, no: 0.5, maybe: 0.8, already_has: 0.7, unknown: 0.7 },
    already_has: { already_has: 0.9, yes: 0.8, open: 0.7, maybe: 0.6, no: 0.2, unknown: 0.5 },
    unknown: { unknown: 0.5, yes: 0.5, no: 0.5, maybe: 0.6, open: 0.7, already_has: 0.5 },
  };

  const kids1 = family1.wantsKids.toLowerCase().replace(" ", "_");
  const kids2 = family2.wantsKids.toLowerCase().replace(" ", "_");
  score += kidsCompatibility[kids1]?.[kids2] ?? 0.5;
  factors++;

  // Family closeness - similar values are good
  score += calculateNumericSimilarity(family1.familyCloseness, family2.familyCloseness);
  factors++;

  return score / factors;
}

// Calculate interests overlap
function calculateInterestsScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  return calculateArrayOverlap(profile1.interests, profile2.interests);
}

// Calculate personality complementarity
// Some traits work better when similar, others when complementary
function calculatePersonalityScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const traits1 = profile1.traits;
  const traits2 = profile2.traits;

  let score = 0;

  // Introversion - similar is usually better
  score += calculateNumericSimilarity(traits1.introversion, traits2.introversion);

  // Adventurousness - similar is usually better
  score += calculateNumericSimilarity(traits1.adventurousness, traits2.adventurousness);

  // Ambition - similar is usually better
  score += calculateNumericSimilarity(traits1.ambition, traits2.ambition);

  // Emotional openness - similar is usually better
  score += calculateNumericSimilarity(traits1.emotionalOpenness, traits2.emotionalOpenness);

  // Traditional values - similar is usually better (can be a dealbreaker if very different)
  score += calculateNumericSimilarity(traits1.traditionalValues, traits2.traditionalValues);

  // Independence need - can be complementary or similar
  score += calculateNumericSimilarity(traits1.independenceNeed, traits2.independenceNeed);

  return score / 6;
}

// Main compatibility calculation function
export function calculateCompatibility(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): {
  score: number;
  breakdown: {
    values: number;
    lifestyle: number;
    relationshipStyle: number;
    familyPlans: number;
    interests: number;
    personality: number;
  };
} {
  const breakdown = {
    values: calculateValuesScore(profile1, profile2),
    lifestyle: calculateLifestyleScore(profile1, profile2),
    relationshipStyle: calculateRelationshipStyleScore(profile1, profile2),
    familyPlans: calculateFamilyPlansScore(profile1, profile2),
    interests: calculateInterestsScore(profile1, profile2),
    personality: calculatePersonalityScore(profile1, profile2),
  };

  // Calculate weighted score
  const score =
    breakdown.values * WEIGHTS.values +
    breakdown.lifestyle * WEIGHTS.lifestyle +
    breakdown.relationshipStyle * WEIGHTS.relationshipStyle +
    breakdown.familyPlans * WEIGHTS.familyPlans +
    breakdown.interests * WEIGHTS.interests +
    breakdown.personality * WEIGHTS.personality;

  // Convert to 0-100 scale
  return {
    score: Math.round(score * 100),
    breakdown: {
      values: Math.round(breakdown.values * 100),
      lifestyle: Math.round(breakdown.lifestyle * 100),
      relationshipStyle: Math.round(breakdown.relationshipStyle * 100),
      familyPlans: Math.round(breakdown.familyPlans * 100),
      interests: Math.round(breakdown.interests * 100),
      personality: Math.round(breakdown.personality * 100),
    },
  };
}

// Query to get compatibility between two users
export const getCompatibility = query({
  args: {
    userId1: v.id("users"),
    userId2: v.id("users"),
  },
  handler: async (ctx, args) => {
    const profile1 = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId1))
      .first();

    const profile2 = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId2))
      .first();

    if (!profile1 || !profile2) {
      return null;
    }

    return calculateCompatibility(profile1, profile2);
  },
});

// Internal query to get top matches for a user
export const getTopMatches = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!userProfile) {
      return [];
    }

    // Get all other profiles
    const allProfiles = await ctx.db.query("userProfiles").collect();
    const otherProfiles = allProfiles.filter(
      (p) => p.userId !== args.userId
    );

    // Calculate compatibility with each
    const matches = otherProfiles.map((profile) => ({
      userId: profile.userId,
      ...calculateCompatibility(userProfile, profile),
    }));

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
});
