import { v } from "convex/values";
import { query, internalQuery, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Weights for different compatibility factors (must sum to 1.0)
const WEIGHTS = {
  values: 0.15, // Core values alignment
  lifestyle: 0.12, // Daily habits compatibility
  relationshipStyle: 0.12, // How they approach relationships
  familyPlans: 0.15, // Kids and family alignment (critical)
  interests: 0.08, // Shared hobbies
  personality: 0.12, // Complementary traits (11 dimensions now)
  socialCompatibility: 0.08, // Social style alignment
  intimacyCompatibility: 0.08, // Intimacy preferences
  lovePhilosophy: 0.05, // Beliefs about love
  partnerPreferences: 0.05, // Match against what they want
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

// Calculate personality complementarity (expanded to 11 dimensions)
function calculatePersonalityScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const traits1 = profile1.traits;
  const traits2 = profile2.traits;

  let score = 0;
  let factors = 0;

  // Original 6 traits - similar is usually better
  score += calculateNumericSimilarity(traits1.introversion, traits2.introversion);
  factors++;
  
  score += calculateNumericSimilarity(traits1.adventurousness, traits2.adventurousness);
  factors++;
  
  score += calculateNumericSimilarity(traits1.ambition, traits2.ambition);
  factors++;
  
  score += calculateNumericSimilarity(traits1.emotionalOpenness, traits2.emotionalOpenness);
  factors++;
  
  // Traditional values - similar is usually better (can be a dealbreaker if very different)
  score += calculateNumericSimilarity(traits1.traditionalValues, traits2.traditionalValues);
  factors++;
  
  // Independence need - can be complementary or similar
  score += calculateNumericSimilarity(traits1.independenceNeed, traits2.independenceNeed);
  factors++;

  // New 5 traits (Phase 1)
  // Romantic style - similar is better (both romantic or both practical)
  score += calculateNumericSimilarity(traits1.romanticStyle, traits2.romanticStyle);
  factors++;
  
  // Social energy - similar is better (both homebodies or both social)
  score += calculateNumericSimilarity(traits1.socialEnergy, traits2.socialEnergy);
  factors++;
  
  // Communication style - similar is better
  score += calculateNumericSimilarity(traits1.communicationStyle, traits2.communicationStyle);
  factors++;
  
  // Attachment style - complementary can work (avoidant + anxious is tricky though)
  // For now, similar is safer
  score += calculateNumericSimilarity(traits1.attachmentStyle, traits2.attachmentStyle);
  factors++;
  
  // Planning style - some flexibility here, but similar is generally better
  score += calculateNumericSimilarity(traits1.planningStyle, traits2.planningStyle);
  factors++;

  return score / factors;
}

// Calculate social compatibility (Phase 3)
function calculateSocialCompatibilityScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const social1 = profile1.socialProfile;
  const social2 = profile2.socialProfile;

  // If either profile doesn't have social data, return neutral
  if (!social1 || !social2) return 0.5;

  let score = 0;
  let factors = 0;

  // Social style match
  if (social1.socialStyle === social2.socialStyle) {
    score += 1;
  } else {
    // Adjacent styles are okay
    const styles = ["introverted", "quiet", "balanced", "active", "very_active"];
    const idx1 = styles.indexOf(social1.socialStyle);
    const idx2 = styles.indexOf(social2.socialStyle);
    if (idx1 >= 0 && idx2 >= 0) {
      const diff = Math.abs(idx1 - idx2);
      score += 1 - (diff * 0.2);
    } else {
      score += 0.5;
    }
  }
  factors++;

  // Go out frequency - similar is better
  score += calculateNumericSimilarity(social1.goOutFrequency, social2.goOutFrequency);
  factors++;

  // Friend approval importance - if both care a lot, it matters more
  score += calculateNumericSimilarity(social1.friendApprovalImportance, social2.friendApprovalImportance);
  factors++;

  return score / factors;
}

// Calculate intimacy compatibility (Phase 4)
function calculateIntimacyCompatibilityScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const intimacy1 = profile1.intimacyProfile;
  const intimacy2 = profile2.intimacyProfile;

  // If either profile doesn't have intimacy data, return neutral
  if (!intimacy1 || !intimacy2) return 0.5;

  let score = 0;
  let factors = 0;

  // Physical intimacy importance - similar expectations are better
  score += calculateNumericSimilarity(
    intimacy1.physicalIntimacyImportance,
    intimacy2.physicalIntimacyImportance
  );
  factors++;

  // Physical attraction importance - similar is better
  score += calculateNumericSimilarity(
    intimacy1.physicalAttractionImportance,
    intimacy2.physicalAttractionImportance
  );
  factors++;

  // PDA comfort - similar is better
  const pdaLevels = ["uncomfortable", "private", "moderate", "comfortable", "loves_it"];
  const pda1 = pdaLevels.indexOf(intimacy1.pdaComfort);
  const pda2 = pdaLevels.indexOf(intimacy2.pdaComfort);
  if (pda1 >= 0 && pda2 >= 0) {
    score += 1 - (Math.abs(pda1 - pda2) * 0.2);
  } else {
    score += 0.5;
  }
  factors++;

  // Connection triggers overlap
  if (intimacy1.connectionTriggers.length > 0 && intimacy2.connectionTriggers.length > 0) {
    score += calculateArrayOverlap(intimacy1.connectionTriggers, intimacy2.connectionTriggers);
    factors++;
  }

  return score / factors;
}

// Calculate love philosophy compatibility (Phase 5)
function calculateLovePhilosophyScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const love1 = profile1.lovePhilosophy;
  const love2 = profile2.lovePhilosophy;

  // If either profile doesn't have love philosophy data, return neutral
  if (!love1 || !love2) return 0.5;

  let score = 0;
  let factors = 0;

  // Soulmate belief - similar is better (both believers or both skeptics)
  if (love1.believesInSoulmates === love2.believesInSoulmates) {
    score += 1;
  } else {
    score += 0.6; // Can still work if different
  }
  factors++;

  // Romantic gestures overlap
  if (love1.romanticGestures.length > 0 && love2.romanticGestures.length > 0) {
    score += calculateArrayOverlap(love1.romanticGestures, love2.romanticGestures);
    factors++;
  }

  // Love recognition signs overlap
  if (love1.loveRecognition.length > 0 && love2.loveRecognition.length > 0) {
    score += calculateArrayOverlap(love1.loveRecognition, love2.loveRecognition);
    factors++;
  }

  return factors > 0 ? score / factors : 0.5;
}

// Calculate partner preferences match (Phase 6)
// This checks if profile2 matches what profile1 is looking for (and vice versa)
function calculatePartnerPreferencesScore(
  profile1: Doc<"userProfiles">,
  profile2: Doc<"userProfiles">
): number {
  const prefs1 = profile1.partnerPreferences;
  const prefs2 = profile2.partnerPreferences;

  // If either profile doesn't have partner preferences, return neutral
  if (!prefs1 || !prefs2) return 0.5;

  let score = 0;
  let factors = 0;

  // Check if profile2's qualities match profile1's must-haves
  // This is a simplified check - in production you'd want semantic matching
  if (prefs1.mustHaves.length > 0 && profile2.values.length > 0) {
    const match = calculateArrayOverlap(prefs1.mustHaves, [...profile2.values, ...profile2.interests]);
    score += match;
    factors++;
  }

  // Check if profile1's qualities match profile2's must-haves
  if (prefs2.mustHaves.length > 0 && profile1.values.length > 0) {
    const match = calculateArrayOverlap(prefs2.mustHaves, [...profile1.values, ...profile1.interests]);
    score += match;
    factors++;
  }

  // Check for red flag conflicts (if profile1's traits appear in profile2's red flags)
  // This would need semantic matching in production
  
  return factors > 0 ? score / factors : 0.5;
}

// Main compatibility calculation function (expanded)
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
    socialCompatibility: number;
    intimacyCompatibility: number;
    lovePhilosophy: number;
    partnerPreferences: number;
  };
} {
  const breakdown = {
    values: calculateValuesScore(profile1, profile2),
    lifestyle: calculateLifestyleScore(profile1, profile2),
    relationshipStyle: calculateRelationshipStyleScore(profile1, profile2),
    familyPlans: calculateFamilyPlansScore(profile1, profile2),
    interests: calculateInterestsScore(profile1, profile2),
    personality: calculatePersonalityScore(profile1, profile2),
    socialCompatibility: calculateSocialCompatibilityScore(profile1, profile2),
    intimacyCompatibility: calculateIntimacyCompatibilityScore(profile1, profile2),
    lovePhilosophy: calculateLovePhilosophyScore(profile1, profile2),
    partnerPreferences: calculatePartnerPreferencesScore(profile1, profile2),
  };

  // Calculate weighted score
  const score =
    breakdown.values * WEIGHTS.values +
    breakdown.lifestyle * WEIGHTS.lifestyle +
    breakdown.relationshipStyle * WEIGHTS.relationshipStyle +
    breakdown.familyPlans * WEIGHTS.familyPlans +
    breakdown.interests * WEIGHTS.interests +
    breakdown.personality * WEIGHTS.personality +
    breakdown.socialCompatibility * WEIGHTS.socialCompatibility +
    breakdown.intimacyCompatibility * WEIGHTS.intimacyCompatibility +
    breakdown.lovePhilosophy * WEIGHTS.lovePhilosophy +
    breakdown.partnerPreferences * WEIGHTS.partnerPreferences;

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
      socialCompatibility: Math.round(breakdown.socialCompatibility * 100),
      intimacyCompatibility: Math.round(breakdown.intimacyCompatibility * 100),
      lovePhilosophy: Math.round(breakdown.lovePhilosophy * 100),
      partnerPreferences: Math.round(breakdown.partnerPreferences * 100),
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

// ── Gender/sexuality compatibility (shared logic) ───────────────────────

function attractedTo(sexuality: string, gender: string): string[] {
  const s = sexuality.toLowerCase();
  if (s === "women") return ["woman"];
  if (s === "men") return ["man"];
  if (s === "everyone") return ["man", "woman", "non-binary"];
  if (s === "bisexual" || s === "pansexual" || s === "queer")
    return ["man", "woman", "non-binary"];
  if (s === "straight" || s === "heterosexual")
    return gender.toLowerCase() === "man" ? ["woman"] : ["man"];
  if (s === "gay" || s === "lesbian" || s === "homosexual")
    return [gender.toLowerCase()];
  return ["man", "woman", "non-binary"];
}

function isGenderCompatible(
  me: { sexuality?: string; gender?: string },
  them: { sexuality?: string; gender?: string },
): boolean {
  if (!me.sexuality || !me.gender || !them.sexuality || !them.gender) return true;
  const iWant = attractedTo(me.sexuality, me.gender);
  const theyWant = attractedTo(them.sexuality, them.gender);
  return iWant.includes(them.gender.toLowerCase()) && theyWant.includes(me.gender.toLowerCase());
}

function isAgeCompatible(
  me: { ageRangeDealbreaker?: boolean; ageRangeMin?: number; ageRangeMax?: number },
  them: { birthdate?: string },
): boolean {
  if (!me.ageRangeDealbreaker) return true;
  if (!them.birthdate) return true;
  const theirAge = Math.floor(
    (Date.now() - new Date(them.birthdate).getTime()) / 31557600000,
  );
  return theirAge >= (me.ageRangeMin ?? 18) && theirAge <= (me.ageRangeMax ?? 99);
}

// ── Auth-gated matches query (replaces client-side listAll) ─────────────

/** Get the authenticated user from ctx.auth, or return null. */
async function getAuthUserOptional(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

// Returns fully-joined match data for the authenticated user.
// Filters by gender/sexuality/age server-side so no raw data leaks.
export const getMatchesForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getAuthUserOptional(ctx);
    if (!currentUser) return null;

    // Get AI analyses for this user
    const asUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", currentUser._id))
      .collect();
    const asUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", currentUser._id))
      .collect();
    const analyses = [...asUser1, ...asUser2];

    if (analyses.length === 0) return [];

    // Collect the other user IDs from analyses
    const otherUserIds = analyses.map((a) =>
      a.user1Id === currentUser._id ? a.user2Id : a.user1Id
    );

    // Fetch users, profiles, photos for matched users only
    const results = await Promise.all(
      otherUserIds.map(async (uid, i) => {
        const user = await ctx.db.get(uid);
        if (!user) return null;
        if (user.type !== "bot") return null; // Only show bot matches for now
        if (!isGenderCompatible(currentUser, user)) return null;
        if (!isAgeCompatible(currentUser, user)) return null;

        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", uid))
          .first();
        if (!profile) return null;

        const photos = await ctx.db
          .query("photos")
          .withIndex("by_user", (q) => q.eq("userId", uid))
          .collect();

        const sortedPhotos = photos.sort((a, b) => a.order - b.order);
        // Deduplicate by order slot
        const seen = new Set<number>();
        const photoUrls = sortedPhotos
          .filter((p) => {
            if (seen.has(p.order)) return false;
            seen.add(p.order);
            return true;
          })
          .map((p) => p.url);

        return {
          user,
          profile,
          photos: photoUrls,
          analysis: analyses[i],
        };
      })
    );

    // Filter nulls, sort by AI score descending
    return results
      .filter(Boolean)
      .sort((a, b) => (b!.analysis.overallScore) - (a!.analysis.overallScore));
  },
});
