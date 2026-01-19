import { AppHeader } from "@/components/AppHeader";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Types for compatibility calculation
type UserProfile = Doc<"userProfiles">;

// Weights for different compatibility factors (11 categories)
const WEIGHTS = {
  values: 0.15,
  personality: 0.15,
  lifestyle: 0.12,
  relationshipStyle: 0.12,
  familyPlans: 0.12,
  social: 0.10,
  intimacy: 0.08,
  lovePhilosophy: 0.06,
  interests: 0.05,
  attachment: 0.03,
  demographics: 0.02,
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

// Calculate similarity between two numeric values
function calculateNumericSimilarity(
  val1: number,
  val2: number,
  max: number = 10
): number {
  const diff = Math.abs(val1 - val2);
  return 1 - diff / max;
}

// Calculate values compatibility
function calculateValuesScore(p1: UserProfile, p2: UserProfile): number {
  return calculateArrayOverlap(p1.values, p2.values);
}

// Calculate lifestyle compatibility
function calculateLifestyleScore(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let factors = 0;

  // Sleep schedule
  if (p1.lifestyle.sleepSchedule === p2.lifestyle.sleepSchedule) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Exercise level
  if (p1.lifestyle.exerciseLevel === p2.lifestyle.exerciseLevel) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Alcohol use
  if (p1.lifestyle.alcoholUse === p2.lifestyle.alcoholUse) {
    score += 1;
  } else if (
    p1.lifestyle.alcoholUse === "Never" ||
    p2.lifestyle.alcoholUse === "Never"
  ) {
    score += 0.4;
  } else {
    score += 0.7;
  }
  factors++;

  // Drug use
  if (p1.lifestyle.drugUse === p2.lifestyle.drugUse) {
    score += 1;
  } else if (
    p1.lifestyle.drugUse === "Never" ||
    p2.lifestyle.drugUse === "Never"
  ) {
    score += 0.3;
  } else {
    score += 0.6;
  }
  factors++;

  // Location preference
  if (p1.lifestyle.locationPreference === p2.lifestyle.locationPreference) {
    score += 1;
  } else if (
    p1.lifestyle.locationPreference === "flexible" ||
    p2.lifestyle.locationPreference === "flexible"
  ) {
    score += 0.8;
  } else {
    score += 0.4;
  }
  factors++;

  return score / factors;
}

// Calculate relationship style compatibility
function calculateRelationshipStyleScore(
  p1: UserProfile,
  p2: UserProfile
): number {
  let score = 0;
  let factors = 0;

  // Love language
  if (p1.relationshipStyle.loveLanguage === p2.relationshipStyle.loveLanguage) {
    score += 1;
  } else {
    score += 0.6;
  }
  factors++;

  // Communication frequency
  if (
    p1.relationshipStyle.communicationFrequency ===
    p2.relationshipStyle.communicationFrequency
  ) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Conflict style
  if (p1.relationshipStyle.conflictStyle === p2.relationshipStyle.conflictStyle) {
    score += 1;
  } else {
    score += 0.6;
  }
  factors++;

  // Financial approach
  if (
    p1.relationshipStyle.financialApproach ===
    p2.relationshipStyle.financialApproach
  ) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Alone time need
  score += calculateNumericSimilarity(
    p1.relationshipStyle.aloneTimeNeed,
    p2.relationshipStyle.aloneTimeNeed
  );
  factors++;

  return score / factors;
}

// Calculate family plans compatibility
function calculateFamilyPlansScore(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let factors = 0;

  // Kids preference
  const kidsCompatibility: Record<string, Record<string, number>> = {
    yes: {
      yes: 1,
      maybe: 0.7,
      open: 0.8,
      no: 0.1,
      already_has: 0.8,
      unknown: 0.5,
    },
    no: {
      no: 1,
      maybe: 0.4,
      open: 0.5,
      yes: 0.1,
      already_has: 0.2,
      unknown: 0.5,
    },
    maybe: {
      maybe: 0.8,
      yes: 0.7,
      no: 0.4,
      open: 0.8,
      already_has: 0.6,
      unknown: 0.6,
    },
    open: {
      open: 0.9,
      yes: 0.8,
      no: 0.5,
      maybe: 0.8,
      already_has: 0.7,
      unknown: 0.7,
    },
    already_has: {
      already_has: 0.9,
      yes: 0.8,
      open: 0.7,
      maybe: 0.6,
      no: 0.2,
      unknown: 0.5,
    },
    unknown: {
      unknown: 0.5,
      yes: 0.5,
      no: 0.5,
      maybe: 0.6,
      open: 0.7,
      already_has: 0.5,
    },
  };

  const kids1 = p1.familyPlans.wantsKids.toLowerCase().replace(" ", "_");
  const kids2 = p2.familyPlans.wantsKids.toLowerCase().replace(" ", "_");
  score += kidsCompatibility[kids1]?.[kids2] ?? 0.5;
  factors++;

  // Family closeness
  score += calculateNumericSimilarity(
    p1.familyPlans.familyCloseness,
    p2.familyPlans.familyCloseness
  );
  factors++;

  return score / factors;
}

// Calculate interests overlap
function calculateInterestsScore(p1: UserProfile, p2: UserProfile): number {
  return calculateArrayOverlap(p1.interests, p2.interests);
}

// NEW: Calculate social compatibility
function calculateSocialScore(p1: UserProfile, p2: UserProfile): number {
  if (!p1.socialProfile || !p2.socialProfile) return 0.5; // neutral if no data

  let score = 0;
  let factors = 0;

  // Go out frequency similarity (most important)
  score += calculateNumericSimilarity(
    p1.socialProfile.goOutFrequency,
    p2.socialProfile.goOutFrequency
  ) * 1.5; // weighted higher
  factors += 1.5;

  // Social style match
  if (p1.socialProfile.socialStyle === p2.socialProfile.socialStyle) {
    score += 1;
  } else if (
    (p1.socialProfile.socialStyle === "balanced") ||
    (p2.socialProfile.socialStyle === "balanced")
  ) {
    score += 0.7; // balanced people adapt
  } else {
    score += 0.3; // introvert vs very active = low
  }
  factors++;

  // Friend approval importance similarity
  score += calculateNumericSimilarity(
    p1.socialProfile.friendApprovalImportance,
    p2.socialProfile.friendApprovalImportance
  );
  factors++;

  return score / factors;
}

// NEW: Calculate intimacy alignment
function calculateIntimacyScore(p1: UserProfile, p2: UserProfile): number {
  if (!p1.intimacyProfile || !p2.intimacyProfile) return 0.5;

  let score = 0;
  let factors = 0;

  // Physical intimacy importance alignment
  score += calculateNumericSimilarity(
    p1.intimacyProfile.physicalIntimacyImportance,
    p2.intimacyProfile.physicalIntimacyImportance
  );
  factors++;

  // Physical attraction importance
  score += calculateNumericSimilarity(
    p1.intimacyProfile.physicalAttractionImportance,
    p2.intimacyProfile.physicalAttractionImportance
  );
  factors++;

  // PDA comfort level
  const pdaLevels: Record<string, number> = {
    "none": 1, "minimal": 2, "moderate": 3, "comfortable": 4, "very comfortable": 5
  };
  const pda1 = pdaLevels[p1.intimacyProfile.pdaComfort.toLowerCase()] || 3;
  const pda2 = pdaLevels[p2.intimacyProfile.pdaComfort.toLowerCase()] || 3;
  score += calculateNumericSimilarity(pda1, pda2, 5);
  factors++;

  // Connection triggers overlap
  if (p1.intimacyProfile.connectionTriggers.length > 0 && p2.intimacyProfile.connectionTriggers.length > 0) {
    score += calculateArrayOverlap(p1.intimacyProfile.connectionTriggers, p2.intimacyProfile.connectionTriggers);
    factors++;
  }

  return score / factors;
}

// NEW: Calculate love philosophy alignment
function calculateLovePhilosophyScore(p1: UserProfile, p2: UserProfile): number {
  if (!p1.lovePhilosophy || !p2.lovePhilosophy) return 0.5;

  let score = 0;
  let factors = 0;

  // Soulmates belief alignment
  if (p1.lovePhilosophy.believesInSoulmates === p2.lovePhilosophy.believesInSoulmates) {
    score += 1;
  } else {
    score += 0.5; // different but not incompatible
  }
  factors++;

  // Romantic gestures overlap - do they appreciate similar things?
  if (p1.lovePhilosophy.romanticGestures.length > 0 && p2.lovePhilosophy.romanticGestures.length > 0) {
    score += calculateArrayOverlap(p1.lovePhilosophy.romanticGestures, p2.lovePhilosophy.romanticGestures);
    factors++;
  }

  // Love recognition signs overlap
  if (p1.lovePhilosophy.loveRecognition.length > 0 && p2.lovePhilosophy.loveRecognition.length > 0) {
    score += calculateArrayOverlap(p1.lovePhilosophy.loveRecognition, p2.lovePhilosophy.loveRecognition);
    factors++;
  }

  return factors > 0 ? score / factors : 0.5;
}

// NEW: Calculate attachment style fit (research-based)
function calculateAttachmentScore(p1: UserProfile, p2: UserProfile): number {
  const a1 = p1.traits.attachmentStyle;
  const a2 = p2.traits.attachmentStyle;
  
  if (a1 === undefined || a2 === undefined) return 0.5;

  // Attachment style: 1 = avoidant, 5 = secure, 10 = anxious
  // Research shows:
  // - Secure (4-6) + Secure = best (1.0)
  // - Secure + Anxious/Avoidant = okay (0.7)
  // - Avoidant + Anxious = challenging (0.3)
  // - Same extreme + same extreme = okay (0.6)
  
  const isSecure1 = a1 >= 4 && a1 <= 6;
  const isSecure2 = a2 >= 4 && a2 <= 6;
  const isAvoidant1 = a1 < 4;
  const isAvoidant2 = a2 < 4;
  const isAnxious1 = a1 > 6;
  const isAnxious2 = a2 > 6;

  if (isSecure1 && isSecure2) return 1.0; // Both secure
  if (isSecure1 || isSecure2) return 0.75; // One secure can stabilize
  if ((isAvoidant1 && isAnxious2) || (isAnxious1 && isAvoidant2)) return 0.35; // Classic problematic pairing
  if ((isAvoidant1 && isAvoidant2) || (isAnxious1 && isAnxious2)) return 0.55; // Same style
  
  return 0.5; // Default
}

// NEW: Calculate demographics match (weighted by importance)
function calculateDemographicsScore(p1: UserProfile, p2: UserProfile): number {
  if (!p1.demographics || !p2.demographics) return 0.5;

  let score = 0;
  let weightSum = 0;

  // Religion match - weighted by how much each person cares
  const religionImportance = Math.max(p1.demographics.religiosity, p2.demographics.religiosity) / 10;
  if (religionImportance > 0.2) { // Only count if someone cares
    const religionMatch = p1.demographics.religion?.toLowerCase() === p2.demographics.religion?.toLowerCase() ? 1 : 0.3;
    score += religionMatch * religionImportance;
    weightSum += religionImportance;
  }

  // Politics match - weighted by intensity
  const politicsImportance = Math.max(p1.demographics.politicalIntensity, p2.demographics.politicalIntensity) / 10;
  if (politicsImportance > 0.2) { // Only count if someone cares
    const politicsMatch = p1.demographics.politicalLeaning?.toLowerCase() === p2.demographics.politicalLeaning?.toLowerCase() ? 1 : 0.3;
    score += politicsMatch * politicsImportance;
    weightSum += politicsImportance;
  }

  // Kids status (already have kids vs don't)
  if (p1.demographics.hasKids !== p2.demographics.hasKids) {
    score += 0.5 * 0.3; // slight penalty
    weightSum += 0.3;
  } else {
    score += 1 * 0.3;
    weightSum += 0.3;
  }

  return weightSum > 0 ? score / weightSum : 0.5;
}

// Calculate personality complementarity
function calculatePersonalityScore(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let count = 0;

  // Original 6 traits
  score += calculateNumericSimilarity(p1.traits.introversion, p2.traits.introversion);
  score += calculateNumericSimilarity(p1.traits.adventurousness, p2.traits.adventurousness);
  score += calculateNumericSimilarity(p1.traits.ambition, p2.traits.ambition);
  score += calculateNumericSimilarity(p1.traits.emotionalOpenness, p2.traits.emotionalOpenness);
  score += calculateNumericSimilarity(p1.traits.traditionalValues, p2.traits.traditionalValues);
  score += calculateNumericSimilarity(p1.traits.independenceNeed, p2.traits.independenceNeed);
  count = 6;

  // New traits (if available)
  if (p1.traits.romanticStyle !== undefined && p2.traits.romanticStyle !== undefined) {
    score += calculateNumericSimilarity(p1.traits.romanticStyle, p2.traits.romanticStyle);
    count++;
  }
  if (p1.traits.socialEnergy !== undefined && p2.traits.socialEnergy !== undefined) {
    score += calculateNumericSimilarity(p1.traits.socialEnergy, p2.traits.socialEnergy);
    count++;
  }
  if (p1.traits.communicationStyle !== undefined && p2.traits.communicationStyle !== undefined) {
    score += calculateNumericSimilarity(p1.traits.communicationStyle, p2.traits.communicationStyle);
    count++;
  }
  if (p1.traits.attachmentStyle !== undefined && p2.traits.attachmentStyle !== undefined) {
    score += calculateNumericSimilarity(p1.traits.attachmentStyle, p2.traits.attachmentStyle);
    count++;
  }
  if (p1.traits.planningStyle !== undefined && p2.traits.planningStyle !== undefined) {
    score += calculateNumericSimilarity(p1.traits.planningStyle, p2.traits.planningStyle);
    count++;
  }

  return score / count;
}

// Breakdown type for all 11 categories
type CompatibilityBreakdown = {
  values: number;
  personality: number;
  lifestyle: number;
  relationshipStyle: number;
  familyPlans: number;
  social: number;
  intimacy: number;
  lovePhilosophy: number;
  interests: number;
  attachment: number;
  demographics: number;
};

// Main compatibility calculation
function calculateCompatibility(
  p1: UserProfile,
  p2: UserProfile
): {
  score: number;
  breakdown: CompatibilityBreakdown;
} {
  const rawBreakdown = {
    values: calculateValuesScore(p1, p2),
    personality: calculatePersonalityScore(p1, p2),
    lifestyle: calculateLifestyleScore(p1, p2),
    relationshipStyle: calculateRelationshipStyleScore(p1, p2),
    familyPlans: calculateFamilyPlansScore(p1, p2),
    social: calculateSocialScore(p1, p2),
    intimacy: calculateIntimacyScore(p1, p2),
    lovePhilosophy: calculateLovePhilosophyScore(p1, p2),
    interests: calculateInterestsScore(p1, p2),
    attachment: calculateAttachmentScore(p1, p2),
    demographics: calculateDemographicsScore(p1, p2),
  };

  const score =
    rawBreakdown.values * WEIGHTS.values +
    rawBreakdown.personality * WEIGHTS.personality +
    rawBreakdown.lifestyle * WEIGHTS.lifestyle +
    rawBreakdown.relationshipStyle * WEIGHTS.relationshipStyle +
    rawBreakdown.familyPlans * WEIGHTS.familyPlans +
    rawBreakdown.social * WEIGHTS.social +
    rawBreakdown.intimacy * WEIGHTS.intimacy +
    rawBreakdown.lovePhilosophy * WEIGHTS.lovePhilosophy +
    rawBreakdown.interests * WEIGHTS.interests +
    rawBreakdown.attachment * WEIGHTS.attachment +
    rawBreakdown.demographics * WEIGHTS.demographics;

  return {
    score: Math.round(score * 100),
    breakdown: {
      values: Math.round(rawBreakdown.values * 100),
      personality: Math.round(rawBreakdown.personality * 100),
      lifestyle: Math.round(rawBreakdown.lifestyle * 100),
      relationshipStyle: Math.round(rawBreakdown.relationshipStyle * 100),
      familyPlans: Math.round(rawBreakdown.familyPlans * 100),
      social: Math.round(rawBreakdown.social * 100),
      intimacy: Math.round(rawBreakdown.intimacy * 100),
      lovePhilosophy: Math.round(rawBreakdown.lovePhilosophy * 100),
      interests: Math.round(rawBreakdown.interests * 100),
      attachment: Math.round(rawBreakdown.attachment * 100),
      demographics: Math.round(rawBreakdown.demographics * 100),
    },
  };
}

// ===== MUST-HAVE AND DEALBREAKER MATCHING =====

// Keywords that map to profile traits/values
const KEYWORD_MAPPINGS: Record<string, (profile: UserProfile) => boolean> = {
  // Family/Kids related
  "wants kids": (p) => p.familyPlans.wantsKids === "yes" || p.familyPlans.wantsKids === "open",
  "doesn't want kids": (p) => p.familyPlans.wantsKids === "no",
  "has kids": (p) => p.demographics?.hasKids === true,
  "no kids": (p) => p.demographics?.hasKids !== true,
  "family-oriented": (p) => p.familyPlans.familyCloseness >= 7,
  
  // Personality traits
  "ambitious": (p) => p.traits.ambition >= 7,
  "driven": (p) => p.traits.ambition >= 7,
  "adventurous": (p) => p.traits.adventurousness >= 7,
  "spontaneous": (p) => (p.traits.planningStyle ?? 5) <= 4,
  "emotionally available": (p) => p.traits.emotionalOpenness >= 6,
  "emotionally open": (p) => p.traits.emotionalOpenness >= 6,
  "independent": (p) => p.traits.independenceNeed >= 7,
  "traditional": (p) => p.traits.traditionalValues >= 7,
  "progressive": (p) => p.traits.traditionalValues <= 4,
  "romantic": (p) => (p.traits.romanticStyle ?? 5) >= 7,
  "introverted": (p) => p.traits.introversion >= 7,
  "extroverted": (p) => p.traits.introversion <= 4,
  "social": (p) => (p.traits.socialEnergy ?? 5) >= 6,
  "homebody": (p) => (p.traits.socialEnergy ?? 5) <= 4,
  "secure attachment": (p) => (p.traits.attachmentStyle ?? 5) >= 4 && (p.traits.attachmentStyle ?? 5) <= 6,
  
  // Lifestyle
  "active": (p) => p.lifestyle.exerciseLevel.toLowerCase().includes("daily") || p.lifestyle.exerciseLevel.toLowerCase().includes("5+"),
  "fit": (p) => p.lifestyle.exerciseLevel.toLowerCase().includes("daily") || p.lifestyle.exerciseLevel.toLowerCase().includes("5+"),
  "healthy": (p) => (p.health?.physicalHealthRating ?? 5) >= 7,
  "non-smoker": (p) => p.health?.smokingStatus?.toLowerCase() === "never" || p.health?.smokingStatus?.toLowerCase() === "no",
  "doesn't smoke": (p) => p.health?.smokingStatus?.toLowerCase() === "never" || p.health?.smokingStatus?.toLowerCase() === "no",
  "doesn't drink": (p) => p.lifestyle.alcoholUse.toLowerCase() === "never",
  "drinks socially": (p) => p.lifestyle.alcoholUse.toLowerCase().includes("social") || p.lifestyle.alcoholUse.toLowerCase().includes("occasionally"),
  "no drugs": (p) => p.lifestyle.drugUse.toLowerCase() === "never",
  "early bird": (p) => p.lifestyle.sleepSchedule.toLowerCase().includes("early"),
  "night owl": (p) => p.lifestyle.sleepSchedule.toLowerCase().includes("late") || p.lifestyle.sleepSchedule.toLowerCase().includes("night"),
  "dog person": (p) => p.lifestyle.petPreference.toLowerCase().includes("dog"),
  "cat person": (p) => p.lifestyle.petPreference.toLowerCase().includes("cat"),
  "pet-friendly": (p) => !p.lifestyle.petPreference.toLowerCase().includes("no pet"),
  
  // Relationship style
  "good communicator": (p) => (p.traits.communicationStyle ?? 5) >= 6,
  "quality time": (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes("quality time"),
  "physical touch": (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes("physical"),
  "words of affirmation": (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes("words"),
  "acts of service": (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes("acts"),
  "gifts": (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes("gift"),
  
  // Demographics
  "religious": (p) => (p.demographics?.religiosity ?? 0) >= 6,
  "spiritual": (p) => (p.demographics?.religiosity ?? 0) >= 4,
  "not religious": (p) => (p.demographics?.religiosity ?? 0) <= 3,
  "politically active": (p) => (p.demographics?.politicalIntensity ?? 0) >= 6,
};

// Check if a must-have is met
type MustHaveResult = {
  mustHave: string;
  met: boolean;
  reason?: string;
};

function checkMustHaves(
  mustHaves: string[],
  targetProfile: UserProfile
): MustHaveResult[] {
  return mustHaves.map((mustHave) => {
    const lowerMustHave = mustHave.toLowerCase();
    
    // Check direct keyword mappings
    for (const [keyword, checker] of Object.entries(KEYWORD_MAPPINGS)) {
      if (lowerMustHave.includes(keyword)) {
        const met = checker(targetProfile);
        return { mustHave, met, reason: met ? "Profile matches" : "Profile doesn't match" };
      }
    }
    
    // Check against values array
    const matchesValue = targetProfile.values.some(v => 
      v.toLowerCase().includes(lowerMustHave) || lowerMustHave.includes(v.toLowerCase())
    );
    if (matchesValue) {
      return { mustHave, met: true, reason: "Matches their values" };
    }
    
    // Check against interests array
    const matchesInterest = targetProfile.interests.some(i => 
      i.toLowerCase().includes(lowerMustHave) || lowerMustHave.includes(i.toLowerCase())
    );
    if (matchesInterest) {
      return { mustHave, met: true, reason: "Matches their interests" };
    }
    
    // Check against keywords
    const matchesKeyword = targetProfile.keywords.some(k => 
      k.toLowerCase().includes(lowerMustHave) || lowerMustHave.includes(k.toLowerCase())
    );
    if (matchesKeyword) {
      return { mustHave, met: true, reason: "Found in profile" };
    }
    
    // Can't determine - mark as unknown (neutral)
    return { mustHave, met: true, reason: "Unable to verify" };
  });
}

// Dealbreaker detection
type DealbreakeResult = {
  dealbreaker: string;
  triggered: boolean;
  severity: "clear" | "warning" | "triggered";
  reason?: string;
};

// Specific dealbreaker checks
const DEALBREAKER_CHECKS: Record<string, (profile: UserProfile) => { triggered: boolean; severity: "clear" | "warning" | "triggered"; reason: string }> = {
  // Substance-related
  "smoking": (p) => {
    const status = p.health?.smokingStatus?.toLowerCase() || "";
    if (status === "never" || status === "no") return { triggered: false, severity: "clear", reason: "They don't smoke" };
    if (status.includes("quit") || status.includes("former")) return { triggered: false, severity: "warning", reason: "Former smoker" };
    return { triggered: true, severity: "triggered", reason: "They smoke" };
  },
  "drugs": (p) => {
    const usage = p.lifestyle.drugUse.toLowerCase();
    if (usage === "never") return { triggered: false, severity: "clear", reason: "No drug use" };
    if (usage.includes("rarely") || usage.includes("occasionally")) return { triggered: false, severity: "warning", reason: "Occasional use" };
    return { triggered: true, severity: "triggered", reason: "Uses drugs" };
  },
  "heavy drinking": (p) => {
    const usage = p.lifestyle.alcoholUse.toLowerCase();
    if (usage === "never" || usage.includes("rarely") || usage.includes("social")) return { triggered: false, severity: "clear", reason: "Light/no drinking" };
    if (usage.includes("weekly") || usage.includes("moderate")) return { triggered: false, severity: "warning", reason: "Moderate drinking" };
    return { triggered: true, severity: "triggered", reason: "Heavy drinker" };
  },
  "alcohol": (p) => {
    const usage = p.lifestyle.alcoholUse.toLowerCase();
    if (usage === "never") return { triggered: false, severity: "clear", reason: "Doesn't drink" };
    return { triggered: true, severity: "triggered", reason: "Drinks alcohol" };
  },
  
  // Family
  "wants kids": (p) => {
    if (p.familyPlans.wantsKids === "no") return { triggered: false, severity: "clear", reason: "Doesn't want kids" };
    if (p.familyPlans.wantsKids === "maybe" || p.familyPlans.wantsKids === "open") return { triggered: false, severity: "warning", reason: "Open to kids" };
    return { triggered: true, severity: "triggered", reason: "Wants kids" };
  },
  "doesn't want kids": (p) => {
    if (p.familyPlans.wantsKids === "yes") return { triggered: false, severity: "clear", reason: "Wants kids" };
    if (p.familyPlans.wantsKids === "maybe" || p.familyPlans.wantsKids === "open") return { triggered: false, severity: "warning", reason: "Undecided" };
    return { triggered: true, severity: "triggered", reason: "Doesn't want kids" };
  },
  "has kids": (p) => {
    if (!p.demographics?.hasKids) return { triggered: false, severity: "clear", reason: "No kids" };
    return { triggered: true, severity: "triggered", reason: "Has kids" };
  },
  
  // Religion/Politics
  "religious": (p) => {
    if ((p.demographics?.religiosity ?? 0) <= 3) return { triggered: false, severity: "clear", reason: "Not religious" };
    if ((p.demographics?.religiosity ?? 0) <= 5) return { triggered: false, severity: "warning", reason: "Somewhat spiritual" };
    return { triggered: true, severity: "triggered", reason: "Religious" };
  },
  "not religious": (p) => {
    if ((p.demographics?.religiosity ?? 0) >= 6) return { triggered: false, severity: "clear", reason: "Religious" };
    return { triggered: true, severity: "triggered", reason: "Not religious" };
  },
  
  // Personality extremes
  "too introverted": (p) => {
    if (p.traits.introversion <= 7) return { triggered: false, severity: "clear", reason: "Balanced social style" };
    return { triggered: true, severity: "triggered", reason: "Very introverted" };
  },
  "too extroverted": (p) => {
    if (p.traits.introversion >= 3) return { triggered: false, severity: "clear", reason: "Balanced social style" };
    return { triggered: true, severity: "triggered", reason: "Very extroverted" };
  },
};

function checkDealbreakers(
  dealbreakers: string[],
  targetProfile: UserProfile
): DealbreakeResult[] {
  return dealbreakers.map((dealbreaker) => {
    const lowerDealbreaker = dealbreaker.toLowerCase();
    
    // Check specific dealbreaker handlers
    for (const [keyword, checker] of Object.entries(DEALBREAKER_CHECKS)) {
      if (lowerDealbreaker.includes(keyword)) {
        const result = checker(targetProfile);
        return { dealbreaker, ...result };
      }
    }
    
    // Check if dealbreaker appears in their dealbreakers (compatible if different)
    const theyHaveToo = targetProfile.dealbreakers.some(d => 
      d.toLowerCase().includes(lowerDealbreaker)
    );
    if (theyHaveToo) {
      return { dealbreaker, triggered: false, severity: "clear" as const, reason: "They share this dealbreaker" };
    }
    
    // Check against their values/interests (if matches, it's a problem)
    const inTheirValues = targetProfile.values.some(v => 
      lowerDealbreaker.includes(v.toLowerCase())
    );
    if (inTheirValues) {
      return { dealbreaker, triggered: true, severity: "triggered" as const, reason: "Part of their core values" };
    }
    
    // Default to clear if we can't determine
    return { dealbreaker, triggered: false, severity: "clear" as const, reason: "No conflict detected" };
  });
}

// Get friction points (low-scoring areas)
function getFrictionPoints(
  p1: UserProfile,
  p2: UserProfile,
  breakdown: CompatibilityBreakdown
): string[] {
  const frictions: string[] = [];
  
  // Check for significant score differences in key areas
  if (breakdown.social < 50) {
    const goOut1 = p1.socialProfile?.goOutFrequency ?? 5;
    const goOut2 = p2.socialProfile?.goOutFrequency ?? 5;
    if (Math.abs(goOut1 - goOut2) >= 4) {
      frictions.push(goOut1 > goOut2 
        ? "You go out more than they prefer" 
        : "They go out more than you prefer");
    }
  }
  
  if (breakdown.intimacy < 50) {
    const intimacy1 = p1.intimacyProfile?.physicalIntimacyImportance ?? 5;
    const intimacy2 = p2.intimacyProfile?.physicalIntimacyImportance ?? 5;
    if (Math.abs(intimacy1 - intimacy2) >= 3) {
      frictions.push("Different views on physical intimacy importance");
    }
  }
  
  if (breakdown.relationshipStyle < 60) {
    if (p1.relationshipStyle.conflictStyle !== p2.relationshipStyle.conflictStyle) {
      frictions.push(`Different conflict styles (${p1.relationshipStyle.conflictStyle} vs ${p2.relationshipStyle.conflictStyle})`);
    }
  }
  
  if (breakdown.familyPlans < 60) {
    if (p1.familyPlans.wantsKids !== p2.familyPlans.wantsKids) {
      frictions.push("Different views on having kids");
    }
  }
  
  if (breakdown.attachment < 50) {
    const a1 = p1.traits.attachmentStyle ?? 5;
    const a2 = p2.traits.attachmentStyle ?? 5;
    const isAvoidant1 = a1 < 4;
    const isAnxious2 = a2 > 6;
    const isAnxious1 = a1 > 6;
    const isAvoidant2 = a2 < 4;
    if ((isAvoidant1 && isAnxious2) || (isAnxious1 && isAvoidant2)) {
      frictions.push("Potentially challenging attachment style pairing");
    }
  }
  
  if (breakdown.lifestyle < 60) {
    if (p1.lifestyle.sleepSchedule !== p2.lifestyle.sleepSchedule) {
      frictions.push(`Different sleep schedules (${p1.lifestyle.sleepSchedule} vs ${p2.lifestyle.sleepSchedule})`);
    }
  }
  
  // Independence mismatch
  if (Math.abs(p1.traits.independenceNeed - p2.traits.independenceNeed) >= 4) {
    frictions.push("Different needs for independence/togetherness");
  }
  
  return frictions.slice(0, 4); // Limit to 4 friction points
}

// Score color based on value
function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

// Trait label helper
// Convention: LEFT = conservative/structured/reserved, RIGHT = liberal/open/spontaneous
// "inverted" means the database value is backwards from our display convention
function getTraitLabel(trait: string): { name: string; low: string; high: string; inverted?: boolean } {
  const labels: Record<string, { name: string; low: string; high: string; inverted?: boolean }> = {
    // Inverted: DB has 1=extrovert, 10=introvert, but we want introvert on LEFT
    introversion: { name: "Social Style", low: "Introvert", high: "Extrovert", inverted: true },
    adventurousness: { name: "Adventure", low: "Routine-lover", high: "Thrill-seeker" },
    ambition: { name: "Ambition", low: "Content", high: "Driven" },
    emotionalOpenness: { name: "Emotional Openness", low: "Private", high: "Open book" },
    // Inverted: DB has 1=progressive, 10=traditional, but we want traditional on LEFT
    traditionalValues: { name: "Values", low: "Traditional", high: "Progressive", inverted: true },
    independenceNeed: { name: "Independence", low: "Together", high: "Space needed" },
    romanticStyle: { name: "Romance Style", low: "Practical", high: "Deeply romantic" },
    socialEnergy: { name: "Social Energy", low: "Homebody", high: "Social butterfly" },
    communicationStyle: { name: "Communication", low: "Reserved", high: "Expressive" },
    attachmentStyle: { name: "Attachment", low: "Avoidant", high: "Anxious" },
    // Inverted: DB has 1=spontaneous, 10=structured, but we want structured on LEFT
    planningStyle: { name: "Planning", low: "Structured", high: "Spontaneous", inverted: true },
  };
  return labels[trait] || { name: trait, low: "Low", high: "High" };
}

// Profile detail section component
function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.profileSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Must-Haves Section Component
function MustHavesSection({ 
  myProfile, 
  theirProfile, 
  myName, 
  theirName 
}: { 
  myProfile: UserProfile; 
  theirProfile: UserProfile; 
  myName: string; 
  theirName: string;
}) {
  const myMustHaves = myProfile.partnerPreferences?.mustHaves || [];
  const theirMustHaves = theirProfile.partnerPreferences?.mustHaves || [];
  
  const theyMeetMine = checkMustHaves(myMustHaves, theirProfile);
  const iMeetTheirs = checkMustHaves(theirMustHaves, myProfile);
  
  const myMetCount = theyMeetMine.filter(r => r.met).length;
  const theirMetCount = iMeetTheirs.filter(r => r.met).length;
  
  if (myMustHaves.length === 0 && theirMustHaves.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.checkSection}>
      <Text style={styles.checkSectionTitle}>✓ Must-Haves Check</Text>
      
      {myMustHaves.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            Does {theirName} meet yours? {myMetCount}/{myMustHaves.length}
          </Text>
          <View style={styles.checkItems}>
            {theyMeetMine.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text style={[styles.checkIcon, result.met ? styles.checkMet : styles.checkMissed]}>
                  {result.met ? "✓" : "✗"}
                </Text>
                <Text style={[styles.checkText, !result.met && styles.checkTextMissed]}>
                  {result.mustHave}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {theirMustHaves.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            Do you meet {theirName}'s? {theirMetCount}/{theirMustHaves.length}
          </Text>
          <View style={styles.checkItems}>
            {iMeetTheirs.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text style={[styles.checkIcon, result.met ? styles.checkMet : styles.checkMissed]}>
                  {result.met ? "✓" : "✗"}
                </Text>
                <Text style={[styles.checkText, !result.met && styles.checkTextMissed]}>
                  {result.mustHave}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Dealbreakers Section Component
function DealbreakersSection({ 
  myProfile, 
  theirProfile, 
  myName, 
  theirName 
}: { 
  myProfile: UserProfile; 
  theirProfile: UserProfile; 
  myName: string; 
  theirName: string;
}) {
  // Combine dealbreakers from both sources
  const myDealbreakers = [
    ...(myProfile.dealbreakers || []),
    ...(myProfile.partnerPreferences?.dealbreakersInPartner || []),
    ...(myProfile.partnerPreferences?.redFlags || []),
  ];
  const theirDealbreakers = [
    ...(theirProfile.dealbreakers || []),
    ...(theirProfile.partnerPreferences?.dealbreakersInPartner || []),
    ...(theirProfile.partnerPreferences?.redFlags || []),
  ];
  
  // Remove duplicates
  const uniqueMyDealbreakers = [...new Set(myDealbreakers)];
  const uniqueTheirDealbreakers = [...new Set(theirDealbreakers)];
  
  const theyTriggerMine = checkDealbreakers(uniqueMyDealbreakers, theirProfile);
  const iTriggerTheirs = checkDealbreakers(uniqueTheirDealbreakers, myProfile);
  
  const myTriggeredCount = theyTriggerMine.filter(r => r.triggered).length;
  const myWarningCount = theyTriggerMine.filter(r => r.severity === "warning").length;
  const theirTriggeredCount = iTriggerTheirs.filter(r => r.triggered).length;
  const theirWarningCount = iTriggerTheirs.filter(r => r.severity === "warning").length;
  
  if (uniqueMyDealbreakers.length === 0 && uniqueTheirDealbreakers.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.checkSection}>
      <Text style={styles.checkSectionTitle}>⚠️ Dealbreakers Check</Text>
      
      {uniqueMyDealbreakers.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            Your dealbreakers: {myTriggeredCount === 0 && myWarningCount === 0 
              ? "All clear ✓" 
              : myTriggeredCount > 0 
                ? `${myTriggeredCount} triggered` 
                : `${myWarningCount} warnings`}
          </Text>
          <View style={styles.checkItems}>
            {theyTriggerMine.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text style={[
                  styles.checkIcon, 
                  result.severity === "clear" ? styles.checkMet : 
                  result.severity === "warning" ? styles.checkWarning : 
                  styles.checkMissed
                ]}>
                  {result.severity === "clear" ? "✓" : result.severity === "warning" ? "⚠" : "✗"}
                </Text>
                <Text style={[
                  styles.checkText, 
                  result.severity === "triggered" && styles.checkTextMissed,
                  result.severity === "warning" && styles.checkTextWarning
                ]}>
                  {result.dealbreaker}
                  {result.reason && result.severity !== "clear" && (
                    <Text style={styles.checkReason}> ({result.reason})</Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {uniqueTheirDealbreakers.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            {theirName}'s dealbreakers: {theirTriggeredCount === 0 && theirWarningCount === 0 
              ? "All clear ✓" 
              : theirTriggeredCount > 0 
                ? `${theirTriggeredCount} triggered` 
                : `${theirWarningCount} warnings`}
          </Text>
          <View style={styles.checkItems}>
            {iTriggerTheirs.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text style={[
                  styles.checkIcon, 
                  result.severity === "clear" ? styles.checkMet : 
                  result.severity === "warning" ? styles.checkWarning : 
                  styles.checkMissed
                ]}>
                  {result.severity === "clear" ? "✓" : result.severity === "warning" ? "⚠" : "✗"}
                </Text>
                <Text style={[
                  styles.checkText, 
                  result.severity === "triggered" && styles.checkTextMissed,
                  result.severity === "warning" && styles.checkTextWarning
                ]}>
                  {result.dealbreaker}
                  {result.reason && result.severity !== "clear" && (
                    <Text style={styles.checkReason}> ({result.reason})</Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Watch Out For Section Component
function WatchOutSection({ 
  frictions 
}: { 
  frictions: string[];
}) {
  if (frictions.length === 0) return null;
  
  return (
    <View style={styles.watchOutSection}>
      <Text style={styles.watchOutTitle}>👀 Watch Out For</Text>
      {frictions.map((friction, i) => (
        <View key={i} style={styles.watchOutItem}>
          <Text style={styles.watchOutBullet}>•</Text>
          <Text style={styles.watchOutText}>{friction}</Text>
        </View>
      ))}
    </View>
  );
}

// Trait bar component
function TraitBar({ name, value, lowLabel, highLabel, inverted }: { name: string; value: number; lowLabel: string; highLabel: string; inverted?: boolean }) {
  // If inverted, flip the percentage (10 becomes 0, 1 becomes 90, etc.)
  const displayValue = inverted ? (10 - value) : value;
  const percentage = (displayValue / 10) * 100;
  return (
    <View style={styles.traitRow}>
      <Text style={styles.traitName}>{name}</Text>
      <View style={styles.traitBarContainer}>
        <Text style={styles.traitLabelLeft}>{lowLabel}</Text>
        <View style={styles.traitBar}>
          <View style={[styles.traitBarFill, { width: `${percentage}%` }]} />
          <View style={[styles.traitIndicator, { left: `${percentage}%` }]} />
        </View>
        <Text style={styles.traitLabelRight}>{highLabel}</Text>
      </View>
    </View>
  );
}

// Full profile view component
function FullProfileView({ profile, userName }: { profile: UserProfile; userName?: string }) {
  return (
    <View style={styles.fullProfileContainer}>
      {/* Generated Bio - no border/padding for first section */}
      {profile.generatedBio && (
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profile.generatedBio}</Text>
        </View>
      )}

      {/* Values & Interests */}
      <ProfileSection title="Values">
        <View style={styles.tagsRow}>
          {profile.values.map((v, i) => (
            <View key={i} style={styles.tagValue}>
              <Text style={styles.tagValueText}>{v}</Text>
            </View>
          ))}
        </View>
      </ProfileSection>

      <ProfileSection title="Interests">
        <View style={styles.tagsRow}>
          {profile.interests.map((v, i) => (
            <View key={i} style={styles.tagInterest}>
              <Text style={styles.tagInterestText}>{v}</Text>
            </View>
          ))}
        </View>
      </ProfileSection>

      {/* Dealbreakers */}
      {profile.dealbreakers.length > 0 && (
        <ProfileSection title="Dealbreakers">
          <View style={styles.tagsRow}>
            {profile.dealbreakers.map((v, i) => (
              <View key={i} style={styles.tagDealbreaker}>
                <Text style={styles.tagDealbreakerText}>{v}</Text>
              </View>
            ))}
          </View>
        </ProfileSection>
      )}

      {/* Personality Traits */}
      <ProfileSection title="Personality">
        {Object.entries(profile.traits).map(([key, value]) => {
          if (value === undefined) return null;
          const label = getTraitLabel(key);
          return (
            <TraitBar
              key={key}
              name={label.name}
              value={value}
              lowLabel={label.low}
              highLabel={label.high}
              inverted={label.inverted}
            />
          );
        })}
      </ProfileSection>

      {/* Life Story */}
      {profile.lifeStory && (
        <ProfileSection title="Life Story">
          {profile.lifeStory.proudestAchievement && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🏆 Proudest Achievement</Text>
              <Text style={styles.storyText}>{profile.lifeStory.proudestAchievement}</Text>
            </View>
          )}
          {profile.lifeStory.definingHardship && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>💪 Defining Challenge</Text>
              <Text style={styles.storyText}>{profile.lifeStory.definingHardship}</Text>
            </View>
          )}
          {profile.lifeStory.biggestRisk && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🎲 Biggest Risk Taken</Text>
              <Text style={styles.storyText}>{profile.lifeStory.biggestRisk}</Text>
            </View>
          )}
          {profile.lifeStory.dreams.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>✨ Dreams</Text>
              <View style={styles.tagsRow}>
                {profile.lifeStory.dreams.map((d, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.lifeStory.fears.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>😰 Fears</Text>
              <View style={styles.tagsRow}>
                {profile.lifeStory.fears.map((f, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Social Profile */}
      {profile.socialProfile && (
        <ProfileSection title="Social Life">
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Social Style</Text>
              <Text style={styles.infoValue}>{profile.socialProfile.socialStyle}</Text>
            </View>
            {profile.socialProfile.weekendStyle && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Weekend Style</Text>
                <Text style={styles.infoValue}>{profile.socialProfile.weekendStyle}</Text>
              </View>
            )}
            {profile.socialProfile.idealFridayNight && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Ideal Friday Night</Text>
                <Text style={styles.infoValue}>{profile.socialProfile.idealFridayNight}</Text>
              </View>
            )}
          </View>
          <TraitBar
            name="Goes Out"
            value={profile.socialProfile.goOutFrequency}
            lowLabel="Rarely"
            highLabel="Always"
          />
          <TraitBar
            name="Friend Approval"
            value={profile.socialProfile.friendApprovalImportance}
            lowLabel="Not important"
            highLabel="Very important"
          />
        </ProfileSection>
      )}

      {/* Love Philosophy */}
      {profile.lovePhilosophy && (
        <ProfileSection title="Love Philosophy">
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Believes in Soulmates</Text>
            <Text style={styles.infoValue}>{profile.lovePhilosophy.believesInSoulmates ? "Yes 💕" : "No"}</Text>
          </View>
          {profile.lovePhilosophy.loveDefinition && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>What is Love?</Text>
              <Text style={styles.storyText}>{profile.lovePhilosophy.loveDefinition}</Text>
            </View>
          )}
          {profile.lovePhilosophy.romanticGestures.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>Romantic Gestures They Love</Text>
              <View style={styles.tagsRow}>
                {profile.lovePhilosophy.romanticGestures.map((g, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.lovePhilosophy.bestAdviceReceived && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>Best Relationship Advice</Text>
              <Text style={styles.storyText}>"{profile.lovePhilosophy.bestAdviceReceived}"</Text>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Intimacy Profile */}
      {profile.intimacyProfile && (
        <ProfileSection title="Intimacy">
          <TraitBar
            name="Physical Intimacy Importance"
            value={profile.intimacyProfile.physicalIntimacyImportance}
            lowLabel="Less important"
            highLabel="Very important"
          />
          <TraitBar
            name="Physical Attraction Importance"
            value={profile.intimacyProfile.physicalAttractionImportance}
            lowLabel="Less important"
            highLabel="Very important"
          />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PDA Comfort</Text>
            <Text style={styles.infoValue}>{profile.intimacyProfile.pdaComfort}</Text>
          </View>
          {profile.intimacyProfile.connectionTriggers.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>What Creates Connection</Text>
              <View style={styles.tagsRow}>
                {profile.intimacyProfile.connectionTriggers.map((t, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Partner Preferences */}
      {profile.partnerPreferences && (
        <ProfileSection title="Partner Preferences">
          {profile.partnerPreferences.mustHaves.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>✅ Must Haves</Text>
              <View style={styles.tagsRow}>
                {profile.partnerPreferences.mustHaves.map((m, i) => (
                  <View key={i} style={styles.tagMustHave}>
                    <Text style={styles.tagMustHaveText}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.partnerPreferences.niceToHaves.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>💫 Nice to Have</Text>
              <View style={styles.tagsRow}>
                {profile.partnerPreferences.niceToHaves.map((n, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{n}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.partnerPreferences.redFlags.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🚩 Red Flags</Text>
              <View style={styles.tagsRow}>
                {profile.partnerPreferences.redFlags.map((r, i) => (
                  <View key={i} style={styles.tagRedFlag}>
                    <Text style={styles.tagRedFlagText}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Bio Elements */}
      {profile.bioElements && (
        <ProfileSection title="Fun Facts">
          {profile.bioElements.conversationStarters.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>💬 Conversation Starters</Text>
              {profile.bioElements.conversationStarters.map((c, i) => (
                <Text key={i} style={styles.bulletText}>• {c}</Text>
              ))}
            </View>
          )}
          {profile.bioElements.uniqueQuirks.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🎭 Quirks</Text>
              <View style={styles.tagsRow}>
                {profile.bioElements.uniqueQuirks.map((q, i) => (
                  <View key={i} style={styles.tagQuirk}>
                    <Text style={styles.tagQuirkText}>{q}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.bioElements.passions.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🔥 Passions</Text>
              <View style={styles.tagsRow}>
                {profile.bioElements.passions.map((p, i) => (
                  <View key={i} style={styles.tagPassion}>
                    <Text style={styles.tagPassionText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Relationship Style */}
      <ProfileSection title="Relationship Style">
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Love Language</Text>
            <Text style={styles.infoValue}>{profile.relationshipStyle.loveLanguage}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Conflict Style</Text>
            <Text style={styles.infoValue}>{profile.relationshipStyle.conflictStyle}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Communication</Text>
            <Text style={styles.infoValue}>{profile.relationshipStyle.communicationFrequency}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Financial Approach</Text>
            <Text style={styles.infoValue}>{profile.relationshipStyle.financialApproach}</Text>
          </View>
        </View>
        <TraitBar
          name="Alone Time Need"
          value={profile.relationshipStyle.aloneTimeNeed}
          lowLabel="Together always"
          highLabel="Lots of space"
        />
      </ProfileSection>

      {/* Family Plans */}
      <ProfileSection title="Family & Future">
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Wants Kids</Text>
            <Text style={styles.infoValue}>{profile.familyPlans.wantsKids}</Text>
          </View>
          {profile.familyPlans.kidsTimeline && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Timeline</Text>
              <Text style={styles.infoValue}>{profile.familyPlans.kidsTimeline}</Text>
            </View>
          )}
          {profile.familyPlans.parentingStyle && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Parenting Style</Text>
              <Text style={styles.infoValue}>{profile.familyPlans.parentingStyle}</Text>
            </View>
          )}
        </View>
        <TraitBar
          name="Family Closeness"
          value={profile.familyPlans.familyCloseness}
          lowLabel="Independent"
          highLabel="Very close"
        />
      </ProfileSection>

      {/* Lifestyle */}
      <ProfileSection title="Lifestyle">
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Sleep</Text>
            <Text style={styles.infoValue}>{profile.lifestyle.sleepSchedule}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Exercise</Text>
            <Text style={styles.infoValue}>{profile.lifestyle.exerciseLevel}</Text>
          </View>
          {profile.lifestyle.dietType && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Diet</Text>
              <Text style={styles.infoValue}>{profile.lifestyle.dietType}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Alcohol</Text>
            <Text style={styles.infoValue}>{profile.lifestyle.alcoholUse}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Drugs</Text>
            <Text style={styles.infoValue}>{profile.lifestyle.drugUse}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Pets</Text>
            <Text style={styles.infoValue}>{profile.lifestyle.petPreference}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{profile.lifestyle.locationPreference}</Text>
          </View>
        </View>
      </ProfileSection>

      {/* Health (if available) */}
      {profile.health && (
        <ProfileSection title="Health & Wellness">
          <TraitBar
            name="Physical Health"
            value={profile.health.physicalHealthRating}
            lowLabel="Working on it"
            highLabel="Excellent"
          />
          <TraitBar
            name="Mental Health"
            value={profile.health.mentalHealthRating}
            lowLabel="Working on it"
            highLabel="Excellent"
          />
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Smoking</Text>
              <Text style={styles.infoValue}>{profile.health.smokingStatus}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Drinking</Text>
              <Text style={styles.infoValue}>{profile.health.drinkingFrequency}</Text>
            </View>
          </View>
        </ProfileSection>
      )}

      {/* Demographics (if available) */}
      {profile.demographics && (
        <ProfileSection title="Background">
          <View style={styles.infoGrid}>
            {profile.demographics.ethnicity && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Ethnicity</Text>
                <Text style={styles.infoValue}>{profile.demographics.ethnicity}</Text>
              </View>
            )}
            {profile.demographics.religion && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Religion</Text>
                <Text style={styles.infoValue}>{profile.demographics.religion}</Text>
              </View>
            )}
            {profile.demographics.politicalLeaning && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Political</Text>
                <Text style={styles.infoValue}>{profile.demographics.politicalLeaning}</Text>
              </View>
            )}
          </View>
          {profile.demographics.religiosity > 0 && (
            <TraitBar
              name="Religiosity"
              value={profile.demographics.religiosity}
              lowLabel="Not religious"
              highLabel="Very religious"
            />
          )}
        </ProfileSection>
      )}

      {/* Keywords */}
      {profile.keywords.length > 0 && (
        <ProfileSection title="Keywords">
          <View style={styles.tagsRow}>
            {profile.keywords.map((k, i) => (
              <View key={i} style={styles.tagKeyword}>
                <Text style={styles.tagKeywordText}>{k}</Text>
              </View>
            ))}
          </View>
        </ProfileSection>
      )}

      {/* Confidence Score */}
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceText}>
          Profile Confidence: {Math.round(profile.confidence * 100)}%
        </Text>
      </View>
    </View>
  );
}

export default function MatchesScreen() {
  const { userId } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showMyProfile, setShowMyProfile] = useState(false);
  // Track which tab is active per user: "compatibility" (default) or "profile"
  const [activeTab, setActiveTab] = useState<Record<string, "compatibility" | "profile">>({});

  // Get current user
  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip"
  );

  // Get current user's profile
  const myProfile = useQuery(
    api.userProfiles.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  // Get all profiles (we'll filter to test users)
  const allProfiles = useQuery(api.userProfiles.listAll);

  // Get all users to get names
  const allUsers = useQuery(api.users.listAll);

  // Get all photos to show profile pics
  const allPhotos = useQuery(api.photos.listAll);

  // Helper to get first photo URL for a user
  const getFirstPhotoUrl = (uId: string): string | null => {
    if (!allPhotos) return null;
    const userPhotos = allPhotos
      .filter((p) => p.userId === uId)
      .sort((a, b) => a.order - b.order);
    return userPhotos[0]?.url || null;
  };

  // Filter to test users (waitlistPosition === 999) and calculate compatibility
  const testUserMatches = (() => {
    if (!myProfile || !allProfiles || !allUsers) return null;

    const testUsers = allUsers.filter(
      (u) => u.waitlistPosition === 999 && u._id !== currentUser?._id
    );

    return testUsers
      .map((user) => {
        const profile = allProfiles.find((p) => p.userId === user._id);
        if (!profile) return null;

        const compatibility = calculateCompatibility(myProfile, profile);
        return {
          user,
          profile,
          photoUrl: getFirstPhotoUrl(user._id),
          ...compatibility,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));
  })();

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!myProfile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader />
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Profile Not Ready</Text>
          <Text style={styles.emptyText}>
            Complete the 100 questions to see your compatibility scores.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!testUserMatches || testUserMatches.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader />
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🧪</Text>
          <Text style={styles.emptyTitle}>No Test Users</Text>
          <Text style={styles.emptyText}>
            Run the seed command to create test profiles:{"\n\n"}
            <Text style={styles.codeText}>
              bunx convex run seedTestUsers:seedTestUsers
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader />

      <ScrollView style={styles.scrollView}>
        {/* Your profile card - expandable */}
        <Pressable
          style={styles.myProfileCard}
          onPress={() => setShowMyProfile(!showMyProfile)}
        >
          <View style={styles.myProfileHeader}>
            {getFirstPhotoUrl(currentUser._id) ? (
              <Image
                source={{ uri: getFirstPhotoUrl(currentUser._id)! }}
                style={styles.myProfilePhoto}
              />
            ) : (
              <View style={styles.myProfilePhotoPlaceholder}>
                <Text style={styles.myProfilePhotoInitial}>
                  {currentUser.name?.charAt(0) || "?"}
                </Text>
              </View>
            )}
            <View style={styles.myProfileInfo}>
              <Text style={styles.myProfileLabel}>YOUR PROFILE</Text>
              <Text style={styles.myProfileName}>{currentUser.name || "You"}</Text>
            </View>
            <Text style={styles.expandArrow}>{showMyProfile ? "▼" : "▶"}</Text>
          </View>

          {!showMyProfile && myProfile.shortBio && (
            <Text style={styles.shortBio}>{myProfile.shortBio}</Text>
          )}

          {showMyProfile && (
            <FullProfileView profile={myProfile} userName={currentUser.name || "You"} />
          )}

          <Text style={styles.expandHint}>
            {showMyProfile ? "Tap to collapse" : "Tap to see full profile"}
          </Text>
        </Pressable>

        {/* Match list */}
        {testUserMatches.map((match) => {
          if (!match) return null;
          const isExpanded = expandedUser === match.user._id;

          return (
            <Pressable
              key={match.user._id}
              style={styles.matchCard}
              onPress={() =>
                setExpandedUser(isExpanded ? null : match.user._id)
              }
            >
              <View style={styles.matchHeader}>
                {match.photoUrl ? (
                  <Image
                    source={{ uri: match.photoUrl }}
                    style={styles.matchPhoto}
                  />
                ) : (
                  <View style={styles.matchPhotoPlaceholder}>
                    <Text style={styles.matchPhotoInitial}>
                      {match.user.name?.charAt(0) || "?"}
                    </Text>
                  </View>
                )}
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{match.user.name}</Text>
                  <Text style={styles.matchLocation}>
                    {match.user.location || "Unknown location"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreColor(match.score) },
                  ]}
                >
                  <Text style={styles.scoreText}>{match.score}</Text>
                </View>
              </View>

              {/* Short bio - always visible */}
              {match.profile.shortBio && (
                <Text style={styles.shortBio}>{match.profile.shortBio}</Text>
              )}

              {/* Expanded view with tabs */}
              {isExpanded && (
                <View style={styles.breakdown}>
                  {/* Toggle tabs */}
                  <View style={styles.toggleContainer}>
                    <View style={styles.toggleTrack}>
                      <Pressable
                        style={[
                          styles.toggleOption,
                          (activeTab[match.user._id] || "compatibility") === "compatibility" && styles.toggleOptionActive,
                        ]}
                        onPress={() => setActiveTab({ ...activeTab, [match.user._id]: "compatibility" })}
                      >
                        <Text style={[
                          styles.toggleText,
                          (activeTab[match.user._id] || "compatibility") === "compatibility" && styles.toggleTextActive,
                        ]}>Compatibility</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.toggleOption,
                          activeTab[match.user._id] === "profile" && styles.toggleOptionActive,
                        ]}
                        onPress={() => setActiveTab({ ...activeTab, [match.user._id]: "profile" })}
                      >
                        <Text style={[
                          styles.toggleText,
                          activeTab[match.user._id] === "profile" && styles.toggleTextActive,
                        ]}>Full Profile</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Compatibility Tab */}
                  {(activeTab[match.user._id] || "compatibility") === "compatibility" && (
                    <View>
                      {/* All 11 categories */}
                      {[
                        { key: "values", label: "Values" },
                        { key: "personality", label: "Personality" },
                        { key: "lifestyle", label: "Lifestyle" },
                        { key: "relationshipStyle", label: "Relationship" },
                        { key: "familyPlans", label: "Family" },
                        { key: "social", label: "Social" },
                        { key: "intimacy", label: "Intimacy" },
                        { key: "lovePhilosophy", label: "Love Philosophy" },
                        { key: "interests", label: "Interests" },
                        { key: "attachment", label: "Attachment" },
                        { key: "demographics", label: "Demographics" },
                      ].map(({ key, label }) => (
                        <View key={key} style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>
                            {label}
                          </Text>
                          <View style={styles.breakdownBar}>
                            <View
                              style={[
                                styles.breakdownBarFill,
                                {
                                  width: `${match.breakdown[key as keyof typeof match.breakdown]}%`,
                                  backgroundColor: getScoreColor(match.breakdown[key as keyof typeof match.breakdown]),
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.breakdownValue}>
                            {match.breakdown[key as keyof typeof match.breakdown]}%
                          </Text>
                        </View>
                      ))}

                      {/* Shared values */}
                      {(() => {
                        const shared = myProfile.values.filter((v) =>
                          match.profile.values
                            .map((x) => x.toLowerCase())
                            .includes(v.toLowerCase())
                        );
                        if (shared.length === 0) return null;
                        return (
                          <View style={styles.sharedSection}>
                            <Text style={styles.sharedTitleBold}>Shared Values</Text>
                            <View style={styles.tagsRow}>
                              {shared.map((v, i) => (
                                <View key={i} style={styles.tagShared}>
                                  <Text style={styles.tagSharedText}>{v}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })()}

                      {/* Shared interests */}
                      {(() => {
                        const shared = myProfile.interests.filter((v) =>
                          match.profile.interests
                            .map((x) => x.toLowerCase())
                            .includes(v.toLowerCase())
                        );
                        if (shared.length === 0) return null;
                        return (
                          <View style={styles.sharedSection}>
                            <Text style={styles.sharedTitleBold}>Shared Interests</Text>
                            <View style={styles.tagsRow}>
                              {shared.map((v, i) => (
                                <View key={i} style={styles.tagShared}>
                                  <Text style={styles.tagSharedText}>{v}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })()}

                      {/* TODO: Must-Haves and Dealbreakers sections are temporarily hidden.
                          These need to be refactored to use a predefined list of structured
                          dealbreakers (not free-form text) so we can reliably determine
                          yes/no/maybe for each one. See plan: Structured Dealbreakers System */}
                      {/* <MustHavesSection
                        myProfile={myProfile}
                        theirProfile={match.profile}
                        myName="You"
                        theirName={match.user.name?.split(" ")[0] || "Them"}
                      />
                      <DealbreakersSection
                        myProfile={myProfile}
                        theirProfile={match.profile}
                        myName="You"
                        theirName={match.user.name?.split(" ")[0] || "Them"}
                      /> */}

                      {/* Watch Out For */}
                      <WatchOutSection
                        frictions={getFrictionPoints(myProfile, match.profile, match.breakdown)}
                      />
                    </View>
                  )}

                  {/* Full Profile Tab */}
                  {activeTab[match.user._id] === "profile" && (
                    <FullProfileView profile={match.profile} userName={match.user.name || "User"} />
                  )}
                </View>
              )}

              <Text style={styles.expandHint}>
                {isExpanded ? "Tap to collapse" : "Tap for details"}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: fontSizes.sm,
    backgroundColor: colors.surface,
  },
  myProfileCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text,
  },
  myProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  myProfilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  myProfilePhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  myProfilePhotoInitial: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  myProfileInfo: {
    flex: 1,
  },
  myProfileLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  myProfileName: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  expandArrow: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  matchCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  matchPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  matchPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  matchPhotoInitial: {
    fontSize: fontSizes.xl,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  matchLocation: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  shortBio: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
    fontStyle: "italic",
  },
  scoreText: {
    fontSize: fontSizes.base,
    fontWeight: "700",
    color: "#fff",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tagSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  tagSmallText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    alignSelf: "center",
    marginLeft: spacing.xs,
  },
  expandHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  breakdown: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  breakdownLabel: {
    width: 120,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: "hidden",
  },
  breakdownBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownValue: {
    width: 40,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlign: "right",
  },
  sharedSection: {
    marginTop: spacing.md,
  },
  sharedTitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sharedTitleBold: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  tagShared: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
  },
  tagSharedText: {
    fontSize: fontSizes.xs,
    color: "#166534",
  },
  // Must-Haves & Dealbreakers styles
  checkSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkSectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  checkGroup: {
    marginTop: spacing.sm,
  },
  checkGroupTitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  checkItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkIcon: {
    fontSize: fontSizes.xs,
    marginRight: 4,
  },
  checkMet: {
    color: "#22c55e",
  },
  checkMissed: {
    color: "#ef4444",
  },
  checkWarning: {
    color: "#f59e0b",
  },
  checkText: {
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  checkTextMissed: {
    color: "#ef4444",
  },
  checkTextWarning: {
    color: "#b45309",
  },
  checkReason: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  // Watch Out For styles
  watchOutSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  watchOutTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  watchOutItem: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  watchOutBullet: {
    fontSize: fontSizes.sm,
    color: "#f59e0b",
    marginRight: spacing.xs,
  },
  watchOutText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: spacing["3xl"],
  },
  // Full profile styles
  fullProfileContainer: {
    marginTop: spacing.md,
  },
  aboutSection: {
    marginBottom: spacing.sm,
  },
  profileSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.base,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bioText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 22,
    fontStyle: "italic",
  },
  tagValue: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#dbeafe",
    borderRadius: 12,
  },
  tagValueText: {
    fontSize: fontSizes.xs,
    color: "#1e40af",
  },
  tagInterest: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
  },
  tagInterestText: {
    fontSize: fontSizes.xs,
    color: "#92400e",
  },
  tagDealbreaker: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
  },
  tagDealbreakerText: {
    fontSize: fontSizes.xs,
    color: "#991b1b",
  },
  tagMustHave: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
  },
  tagMustHaveText: {
    fontSize: fontSizes.xs,
    color: "#166534",
  },
  tagRedFlag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
  },
  tagRedFlagText: {
    fontSize: fontSizes.xs,
    color: "#991b1b",
  },
  tagQuirk: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#f3e8ff",
    borderRadius: 12,
  },
  tagQuirkText: {
    fontSize: fontSizes.xs,
    color: "#7c3aed",
  },
  tagPassion: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#fce7f3",
    borderRadius: 12,
  },
  tagPassionText: {
    fontSize: fontSizes.xs,
    color: "#be185d",
  },
  tagKeyword: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagKeywordText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  traitRow: {
    marginBottom: spacing.sm,
  },
  traitName: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  traitBarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  traitLabelLeft: {
    fontSize: 10,
    color: colors.textMuted,
    width: 70,
  },
  traitLabelRight: {
    fontSize: 10,
    color: colors.textMuted,
    width: 70,
    textAlign: "right",
  },
  traitBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.xs,
    position: "relative",
  },
  traitBarFill: {
    height: "100%",
    backgroundColor: colors.text,
    borderRadius: 4,
  },
  traitIndicator: {
    position: "absolute",
    top: -2,
    width: 12,
    height: 12,
    backgroundColor: colors.text,
    borderRadius: 6,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  infoItem: {
    minWidth: 100,
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginTop: 2,
  },
  storyItem: {
    marginBottom: spacing.sm,
  },
  storyLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  storyText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
    marginLeft: spacing.sm,
  },
  confidenceContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  confidenceText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  // Toggle styles
  toggleContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  toggleTrack: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: 20,
    padding: 3,
  },
  toggleOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 17,
  },
  toggleOptionActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: colors.text,
    fontWeight: "600",
  },
});
