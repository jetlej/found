"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { 
  extractStructuredDataWithUsage, 
  DEFAULT_MODEL, 
  TokenUsage, 
  ApiCallResult,
  aggregateUsage,
  calculateCost,
  formatCost,
} from "../lib/openai";
import {
  VALUES_INTERESTS_PROMPT,
  PERSONALITY_TRAITS_PROMPT,
  FAMILY_PLANS_PROMPT,
  LIFESTYLE_PROMPT,
  KEYWORDS_PROMPT,
  CONFIDENCE_PROMPT,
  LIFE_STORY_PROMPT,
  SOCIAL_PROFILE_PROMPT,
  INTIMACY_PROFILE_PROMPT,
  LOVE_PHILOSOPHY_PROMPT,
  PARTNER_PREFERENCES_PROMPT,
  BIO_ELEMENTS_PROMPT,
  getBioGenerationPrompt,
  getShortBioPrompt,
  formatQAPairs,
  EXTRACTION_QUESTION_GROUPS,
} from "../lib/prompts";

// Cost tracking helper
interface ExtractionCost {
  name: string;
  usage: TokenUsage;
  cost: number;
}

// Types for extraction results
interface ValuesInterestsResult {
  values: string[];
  interests: string[];
  dealbreakers: string[];
}

interface PersonalityTraitsResult {
  introversion: number;
  adventurousness: number;
  ambition: number;
  emotionalOpenness: number;
  traditionalValues: number;
  independenceNeed: number;
  romanticStyle: number;
  socialEnergy: number;
  communicationStyle: number;
  attachmentStyle: number;
  planningStyle: number;
}

interface FamilyPlansResult {
  wantsKids: string;
  kidsTimeline: string | null;
  parentingStyle: string | null;
}

interface LifestyleResult {
  dietType: string | null;
  petPreference: string;
  locationPreference: string;
}

interface KeywordsResult {
  keywords: string[];
}

interface ConfidenceResult {
  confidence: number;
  reasoning: string;
}

interface LifeStoryResult {
  proudestAchievement: string | null;
  definingHardship: string | null;
  biggestRisk: string | null;
  dreams: string[];
  fears: string[];
  formativeExperiences: string[];
  favoriteStory: string | null;
}

interface SocialProfileResult {
  socialStyle: string;
  weekendStyle: string | null;
  idealFridayNight: string | null;
  goOutFrequency: number;
  friendApprovalImportance: number;
  socialCircleVision: string | null;
}

interface IntimacyProfileResult {
  physicalIntimacyImportance: number;
  physicalAttractionImportance: number;
  pdaComfort: string;
  emotionalIntimacyApproach: string | null;
  connectionTriggers: string[];
  healthyIntimacyVision: string | null;
}

interface LovePhilosophyResult {
  believesInSoulmates: boolean;
  loveDefinition: string | null;
  loveRecognition: string[];
  romanticGestures: string[];
  healthyRelationshipVision: string | null;
  bestAdviceReceived: string | null;
}

interface PartnerPreferencesResult {
  mustHaves: string[];
  niceToHaves: string[];
  redFlags: string[];
  importantQualities: string[];
  dealbreakersInPartner: string[];
}

interface BioElementsResult {
  conversationStarters: string[];
  interestingFacts: string[];
  uniqueQuirks: string[];
  passions: string[];
  whatTheySek: string | null;
}

interface BioGenerationResult {
  bio: string;
}

interface ShortBioResult {
  shortBio: string;
}

// Type for answer with question details
interface AnswerWithQuestion {
  questionText: string;
  questionOrder: number;
  questionType: string;
  value: string;
}

// Internal action to parse a user's profile (called by scheduler)
export const parseUserProfile = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; confidence?: number }> => {
    console.log(`Starting profile parsing for user ${args.userId}`);

    // Get user to access their gender for pronoun-aware bio generation
    const user = await ctx.runQuery(internal.users.getById, { userId: args.userId });
    const userGender = user?.gender;

    // Get all answers for this user with question details
    const answersWithQuestions: AnswerWithQuestion[] | null = await ctx.runQuery(
      internal.answers.getAnswersWithQuestions,
      { userId: args.userId }
    );

    if (!answersWithQuestions || answersWithQuestions.length === 0) {
      console.log(`No answers found for user ${args.userId}`);
      return { success: false, error: "No answers found" };
    }

    console.log(`Found ${answersWithQuestions.length} answers to process`);

    // Get structured answers (multiple choice, scale) for direct mapping
    const structuredAnswers = answersWithQuestions.filter(
      (a: AnswerWithQuestion) => a.questionType === "multiple_choice" || a.questionType === "scale"
    );

    // Get open-ended answers for AI extraction
    const openEndedAnswers = answersWithQuestions.filter(
      (a: AnswerWithQuestion) => a.questionType === "essay" || a.questionType === "text"
    );

    // Format answers for prompts (includes both structured and open-ended)
    const formatAnswersForGroup = (questionOrders: number[]): string => {
      const relevantAnswers = answersWithQuestions
        .filter((a: AnswerWithQuestion) => questionOrders.includes(a.questionOrder))
        .map((a: AnswerWithQuestion) => ({
          questionText: a.questionText,
          answer: a.value,
          questionOrder: a.questionOrder,
        }));
      return formatQAPairs(relevantAnswers);
    };

    // Format all answers for bio generation
    const allAnswersFormatted = formatQAPairs(
      answersWithQuestions.map((a: AnswerWithQuestion) => ({
        questionText: a.questionText,
        answer: a.value,
        questionOrder: a.questionOrder,
      }))
    );

    // Track all costs
    const costs: ExtractionCost[] = [];
    const defaultUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    // Helper to run extraction with cost tracking
    async function trackedExtract<T>(
      name: string,
      prompt: string,
      content: string,
      fallback: T
    ): Promise<T> {
      try {
        const result = await extractStructuredDataWithUsage<T>(prompt, content);
        costs.push({ name, usage: result.usage, cost: result.cost });
        return result.data;
      } catch (e) {
        console.error(`${name} extraction failed:`, e);
        costs.push({ name, usage: defaultUsage, cost: 0 });
        return fallback;
      }
    }

    // Run all extractions in parallel (batch 1 - core extractions)
    const [
      valuesInterests,
      personalityTraits,
      familyPlans,
      lifestyle,
      keywords,
    ] = await Promise.all([
      trackedExtract<ValuesInterestsResult>(
        "Values/Interests",
        VALUES_INTERESTS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.valuesInterests),
        { values: [], interests: [], dealbreakers: [] }
      ),
      trackedExtract<PersonalityTraitsResult>(
        "Personality",
        PERSONALITY_TRAITS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.personalityTraits),
        {
          introversion: 5,
          adventurousness: 5,
          ambition: 5,
          emotionalOpenness: 5,
          traditionalValues: 5,
          independenceNeed: 5,
          romanticStyle: 5,
          socialEnergy: 5,
          communicationStyle: 5,
          attachmentStyle: 5,
          planningStyle: 5,
        }
      ),
      trackedExtract<FamilyPlansResult>(
        "Family Plans",
        FAMILY_PLANS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.familyPlans),
        { wantsKids: "unknown", kidsTimeline: null, parentingStyle: null }
      ),
      trackedExtract<LifestyleResult>(
        "Lifestyle",
        LIFESTYLE_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.lifestyle),
        { dietType: null, petPreference: "neutral", locationPreference: "flexible" }
      ),
      trackedExtract<KeywordsResult>(
        "Keywords",
        KEYWORDS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.allOpenEnded),
        { keywords: [] }
      ),
    ]);

    // Run batch 2 - new extractions (Phases 2-7)
    const [
      lifeStory,
      socialProfile,
      intimacyProfile,
      lovePhilosophy,
      partnerPreferences,
      bioElements,
    ] = await Promise.all([
      trackedExtract<LifeStoryResult>(
        "Life Story",
        LIFE_STORY_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.lifeStory),
        {
          proudestAchievement: null,
          definingHardship: null,
          biggestRisk: null,
          dreams: [],
          fears: [],
          formativeExperiences: [],
          favoriteStory: null,
        }
      ),
      trackedExtract<SocialProfileResult>(
        "Social Profile",
        SOCIAL_PROFILE_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.socialProfile),
        {
          socialStyle: "balanced",
          weekendStyle: null,
          idealFridayNight: null,
          goOutFrequency: 5,
          friendApprovalImportance: 5,
          socialCircleVision: null,
        }
      ),
      trackedExtract<IntimacyProfileResult>(
        "Intimacy Profile",
        INTIMACY_PROFILE_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.intimacyProfile),
        {
          physicalIntimacyImportance: 5,
          physicalAttractionImportance: 5,
          pdaComfort: "moderate",
          emotionalIntimacyApproach: null,
          connectionTriggers: [],
          healthyIntimacyVision: null,
        }
      ),
      trackedExtract<LovePhilosophyResult>(
        "Love Philosophy",
        LOVE_PHILOSOPHY_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.lovePhilosophy),
        {
          believesInSoulmates: false,
          loveDefinition: null,
          loveRecognition: [],
          romanticGestures: [],
          healthyRelationshipVision: null,
          bestAdviceReceived: null,
        }
      ),
      trackedExtract<PartnerPreferencesResult>(
        "Partner Preferences",
        PARTNER_PREFERENCES_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.partnerPreferences),
        {
          mustHaves: [],
          niceToHaves: [],
          redFlags: [],
          importantQualities: [],
          dealbreakersInPartner: [],
        }
      ),
      trackedExtract<BioElementsResult>(
        "Bio Elements",
        BIO_ELEMENTS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.bioElements),
        {
          conversationStarters: [],
          interestingFacts: [],
          uniqueQuirks: [],
          passions: [],
          whatTheySek: null,
        }
      ),
    ]);

    // Run batch 3 - confidence and bio generation
    const [confidenceResult, bioResult, shortBioResult] = await Promise.all([
      trackedExtract<ConfidenceResult>(
        "Confidence",
        CONFIDENCE_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.allOpenEnded),
        { confidence: 0.5, reasoning: "Default confidence" }
      ),
      trackedExtract<BioGenerationResult>(
        "Bio Generation",
        getBioGenerationPrompt(userGender),
        allAnswersFormatted,
        { bio: "" }
      ),
      trackedExtract<ShortBioResult>(
        "Short Bio",
        getShortBioPrompt(),
        allAnswersFormatted,
        { shortBio: "" }
      ),
    ]);

    // Log cost breakdown
    const totalUsage = aggregateUsage(costs.map(c => c.usage));
    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    
    console.log("\n========== PROFILE PARSING COST BREAKDOWN ==========");
    console.log(`User ID: ${args.userId}`);
    console.log("-----------------------------------------------------");
    costs.forEach(c => {
      console.log(`  ${c.name.padEnd(20)} | ${c.usage.totalTokens.toString().padStart(6)} tokens | ${formatCost(c.cost)}`);
    });
    console.log("-----------------------------------------------------");
    console.log(`  ${"TOTAL".padEnd(20)} | ${totalUsage.totalTokens.toString().padStart(6)} tokens | ${formatCost(totalCost)}`);
    console.log(`  Input tokens:  ${totalUsage.promptTokens}`);
    console.log(`  Output tokens: ${totalUsage.completionTokens}`);
    console.log("=====================================================\n");

    // Extract structured data from multiple choice/scale questions
    const getAnswerByOrder = (order: number): string => {
      const answer = structuredAnswers.find((a: AnswerWithQuestion) => a.questionOrder === order);
      return answer?.value || "";
    };

    const getScaleAnswer = (order: number, defaultValue: number = 5) => {
      const value = parseInt(getAnswerByOrder(order), 10);
      return isNaN(value) ? defaultValue : value;
    };

    // Build the complete profile
    const profile = {
      userId: args.userId,
      values: valuesInterests.values,
      interests: valuesInterests.interests,
      dealbreakers: valuesInterests.dealbreakers,
      traits: {
        introversion: personalityTraits.introversion,
        adventurousness: personalityTraits.adventurousness,
        ambition: personalityTraits.ambition,
        emotionalOpenness: personalityTraits.emotionalOpenness,
        traditionalValues: personalityTraits.traditionalValues,
        independenceNeed: personalityTraits.independenceNeed,
        romanticStyle: personalityTraits.romanticStyle,
        socialEnergy: personalityTraits.socialEnergy,
        communicationStyle: personalityTraits.communicationStyle,
        attachmentStyle: personalityTraits.attachmentStyle,
        planningStyle: personalityTraits.planningStyle,
      },
      relationshipStyle: {
        loveLanguage: getAnswerByOrder(64) || "unknown",
        conflictStyle: getAnswerByOrder(53) || "unknown",
        communicationFrequency: getAnswerByOrder(57) || "unknown",
        financialApproach: getAnswerByOrder(67) || "unknown",
        aloneTimeNeed: getScaleAnswer(63),
      },
      familyPlans: {
        wantsKids: familyPlans.wantsKids,
        kidsTimeline: familyPlans.kidsTimeline ?? undefined,
        familyCloseness: getScaleAnswer(71),
        parentingStyle: familyPlans.parentingStyle ?? undefined,
      },
      lifestyle: {
        sleepSchedule: getAnswerByOrder(32) || "unknown",
        exerciseLevel: getAnswerByOrder(24) || "unknown",
        dietType: lifestyle.dietType ?? undefined,
        alcoholUse: getAnswerByOrder(29) || "unknown",
        drugUse: getAnswerByOrder(31) || "unknown",
        petPreference: lifestyle.petPreference,
        locationPreference: lifestyle.locationPreference,
      },
      // New fields (Phases 2-10) - convert null to undefined for Convex compatibility
      lifeStory: {
        proudestAchievement: lifeStory.proudestAchievement ?? undefined,
        definingHardship: lifeStory.definingHardship ?? undefined,
        biggestRisk: lifeStory.biggestRisk ?? undefined,
        dreams: lifeStory.dreams,
        fears: lifeStory.fears,
        formativeExperiences: lifeStory.formativeExperiences,
        favoriteStory: lifeStory.favoriteStory ?? undefined,
      },
      socialProfile: {
        socialStyle: socialProfile.socialStyle,
        weekendStyle: socialProfile.weekendStyle ?? undefined,
        idealFridayNight: socialProfile.idealFridayNight ?? undefined,
        goOutFrequency: socialProfile.goOutFrequency,
        friendApprovalImportance: socialProfile.friendApprovalImportance,
        socialCircleVision: socialProfile.socialCircleVision ?? undefined,
      },
      intimacyProfile: {
        physicalIntimacyImportance: intimacyProfile.physicalIntimacyImportance,
        physicalAttractionImportance: intimacyProfile.physicalAttractionImportance,
        pdaComfort: intimacyProfile.pdaComfort,
        emotionalIntimacyApproach: intimacyProfile.emotionalIntimacyApproach ?? undefined,
        connectionTriggers: intimacyProfile.connectionTriggers,
        healthyIntimacyVision: intimacyProfile.healthyIntimacyVision ?? undefined,
      },
      lovePhilosophy: {
        believesInSoulmates: lovePhilosophy.believesInSoulmates,
        loveDefinition: lovePhilosophy.loveDefinition ?? undefined,
        loveRecognition: lovePhilosophy.loveRecognition,
        romanticGestures: lovePhilosophy.romanticGestures,
        healthyRelationshipVision: lovePhilosophy.healthyRelationshipVision ?? undefined,
        bestAdviceReceived: lovePhilosophy.bestAdviceReceived ?? undefined,
      },
      partnerPreferences: {
        mustHaves: partnerPreferences.mustHaves,
        niceToHaves: partnerPreferences.niceToHaves,
        redFlags: partnerPreferences.redFlags,
        importantQualities: partnerPreferences.importantQualities,
        dealbreakersInPartner: partnerPreferences.dealbreakersInPartner,
      },
      bioElements: {
        conversationStarters: bioElements.conversationStarters,
        interestingFacts: bioElements.interestingFacts,
        uniqueQuirks: bioElements.uniqueQuirks,
        passions: bioElements.passions,
        whatTheySek: bioElements.whatTheySek ?? undefined,
      },
      // Demographics from structured answers (Phase 8)
      demographics: {
        ethnicity: getAnswerByOrder(2) || undefined,
        religion: getAnswerByOrder(11) || undefined,
        religiosity: getScaleAnswer(10),
        politicalLeaning: getAnswerByOrder(9) || undefined,
        politicalIntensity: getScaleAnswer(8),
        hasKids: getScaleAnswer(5, 0) > 0,
      },
      // Health from structured answers (Phase 9)
      health: {
        physicalHealthRating: getScaleAnswer(33),
        mentalHealthRating: getScaleAnswer(34),
        healthNotes: openEndedAnswers.find((a: AnswerWithQuestion) => a.questionOrder === 35)?.value ?? undefined,
        smokingStatus: getAnswerByOrder(30) || "unknown",
        drinkingFrequency: getAnswerByOrder(29) || "unknown",
        drugUse: getAnswerByOrder(31) || "unknown",
      },
      // Generated bio (Phase 10)
      generatedBio: bioResult.bio || undefined,
      shortBio: shortBioResult.shortBio || undefined,
      keywords: keywords.keywords,
      processedAt: Date.now(),
      openaiModel: DEFAULT_MODEL,
      confidence: confidenceResult.confidence,
    };

    // Save the profile
    await ctx.runMutation(internal.userProfiles.upsertProfile, { profile });

    console.log(`Profile parsing complete for user ${args.userId}`);
    return { success: true, confidence: confidenceResult.confidence };
  },
});

// Public action to manually trigger profile parsing
export const triggerProfileParsing = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Schedule the internal action
    await ctx.scheduler.runAfter(0, internal.actions.parseProfile.parseUserProfile, {
      userId: args.userId,
    });
    return { scheduled: true };
  },
});

// Flexible action to regenerate specific sections of a profile
// Usage: bunx convex run actions/parseProfile:regenerateSections '{"userId": "...", "sections": ["bio", "shortBio"]}'
// Available sections: values, personality, lifestyle, family, keywords, lifeStory, social, intimacy, 
//                     lovePhilosophy, partnerPrefs, bioElements, confidence, bio, shortBio
export const regenerateSections = action({
  args: {
    userId: v.id("users"),
    sections: v.array(v.string()), // Which sections to regenerate
  },
  handler: async (ctx, args) => {
    const { userId, sections } = args;
    
    // Get user info
    const user = await ctx.runQuery(internal.users.getById, { userId });
    const userGender = user?.gender || "Non-binary";
    
    // Get existing profile
    const existingProfile = await ctx.runQuery(internal.userProfiles.getByUserInternal, { userId });
    if (!existingProfile) {
      throw new Error("No existing profile found - run full parse first");
    }
    
    // Get all answers
    const answersWithQuestions = await ctx.runQuery(
      internal.answers.getAnswersWithQuestions,
      { userId }
    );

    if (answersWithQuestions.length === 0) {
      throw new Error("No answers found for user");
    }

    // Helper to format answers for specific question groups
    const formatAnswersForGroup = (questionOrders: number[]): string => {
      const filtered = answersWithQuestions.filter((a) =>
        questionOrders.includes(a.questionOrder)
      );
      return formatQAPairs(
        filtered.map((a) => ({
          questionText: a.questionText,
          answer: a.value,
          questionOrder: a.questionOrder,
        }))
      );
    };

    // Format all answers
    const allAnswersFormatted = formatQAPairs(
      answersWithQuestions.map((a) => ({
        questionText: a.questionText,
        answer: a.value,
        questionOrder: a.questionOrder,
      }))
    );

    // Cost tracking
    const costs: ExtractionCost[] = [];
    
    const trackedExtract = async <T>(
      name: string,
      prompt: string,
      userContent: string,
      defaultValue: T
    ): Promise<T> => {
      try {
        const result: ApiCallResult<T> = await extractStructuredDataWithUsage<T>(
          prompt,
          userContent
        );
        const cost = calculateCost(result.usage);
        costs.push({ name, usage: result.usage, cost });
        return result.data;
      } catch (e) {
        console.error(`${name} extraction failed:`, e);
        costs.push({ name, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0 });
        return defaultValue;
      }
    };

    // Build updates object based on requested sections
    const updates: Record<string, unknown> = {};
    const results: Record<string, unknown> = {};

    // Run requested extractions
    const extractions: Promise<void>[] = [];

    if (sections.includes("values")) {
      extractions.push((async () => {
        const result = await trackedExtract<ValuesInterestsResult>(
          "Values/Interests",
          VALUES_INTERESTS_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.valuesInterests),
          { values: [], interests: [], dealbreakers: [] }
        );
        updates.values = result.values;
        updates.interests = result.interests;
        updates.dealbreakers = result.dealbreakers;
        results.values = result;
      })());
    }

    if (sections.includes("personality")) {
      extractions.push((async () => {
        const result = await trackedExtract<PersonalityTraitsResult>(
          "Personality",
          PERSONALITY_TRAITS_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.personalityTraits),
          { introversion: 5, adventurousness: 5, ambition: 5, emotionalOpenness: 5,
            traditionalValues: 5, independenceNeed: 5, romanticStyle: 5, socialEnergy: 5,
            communicationStyle: 5, attachmentStyle: 5, planningStyle: 5 }
        );
        updates.traits = result;
        results.personality = result;
      })());
    }

    if (sections.includes("lifestyle")) {
      extractions.push((async () => {
        const result = await trackedExtract<LifestyleResult>(
          "Lifestyle",
          LIFESTYLE_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.lifestyle),
          { dietType: null, petPreference: "neutral", locationPreference: "flexible" }
        );
        results.lifestyle = result;
        // Note: lifestyle has many fields from direct answers too, only updating AI-extracted ones
        updates.lifestyle = {
          ...existingProfile.lifestyle,
          dietType: result.dietType ?? undefined,
          petPreference: result.petPreference,
          locationPreference: result.locationPreference,
        };
      })());
    }

    if (sections.includes("family")) {
      extractions.push((async () => {
        const result = await trackedExtract<FamilyPlansResult>(
          "Family Plans",
          FAMILY_PLANS_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.familyPlans),
          { wantsKids: "unknown", kidsTimeline: null, parentingStyle: null }
        );
        results.family = result;
        updates.familyPlans = {
          ...existingProfile.familyPlans,
          wantsKids: result.wantsKids,
          kidsTimeline: result.kidsTimeline ?? undefined,
          parentingStyle: result.parentingStyle ?? undefined,
        };
      })());
    }

    if (sections.includes("keywords")) {
      extractions.push((async () => {
        const result = await trackedExtract<KeywordsResult>(
          "Keywords",
          KEYWORDS_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.allOpenEnded),
          { keywords: [] }
        );
        updates.keywords = result.keywords;
        results.keywords = result.keywords;
      })());
    }

    if (sections.includes("lifeStory")) {
      extractions.push((async () => {
        const result = await trackedExtract<LifeStoryResult>(
          "Life Story",
          LIFE_STORY_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.lifeStory),
          { proudestAchievement: null, definingHardship: null, biggestRisk: null,
            dreams: [], fears: [], formativeExperiences: [], favoriteStory: null }
        );
        updates.lifeStory = {
          proudestAchievement: result.proudestAchievement ?? undefined,
          definingHardship: result.definingHardship ?? undefined,
          biggestRisk: result.biggestRisk ?? undefined,
          dreams: result.dreams,
          fears: result.fears,
          formativeExperiences: result.formativeExperiences,
          favoriteStory: result.favoriteStory ?? undefined,
        };
        results.lifeStory = result;
      })());
    }

    if (sections.includes("social")) {
      extractions.push((async () => {
        const result = await trackedExtract<SocialProfileResult>(
          "Social Profile",
          SOCIAL_PROFILE_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.socialProfile),
          { socialStyle: "balanced", weekendStyle: null, idealFridayNight: null,
            goOutFrequency: 5, friendApprovalImportance: 5, socialCircleVision: null }
        );
        updates.socialProfile = {
          socialStyle: result.socialStyle,
          weekendStyle: result.weekendStyle ?? undefined,
          idealFridayNight: result.idealFridayNight ?? undefined,
          goOutFrequency: result.goOutFrequency,
          friendApprovalImportance: result.friendApprovalImportance,
          socialCircleVision: result.socialCircleVision ?? undefined,
        };
        results.social = result;
      })());
    }

    if (sections.includes("intimacy")) {
      extractions.push((async () => {
        const result = await trackedExtract<IntimacyProfileResult>(
          "Intimacy Profile",
          INTIMACY_PROFILE_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.intimacyProfile),
          { physicalIntimacyImportance: 5, physicalAttractionImportance: 5,
            pdaComfort: "moderate", emotionalIntimacyApproach: null,
            connectionTriggers: [], healthyIntimacyVision: null }
        );
        updates.intimacyProfile = {
          physicalIntimacyImportance: result.physicalIntimacyImportance,
          physicalAttractionImportance: result.physicalAttractionImportance,
          pdaComfort: result.pdaComfort,
          emotionalIntimacyApproach: result.emotionalIntimacyApproach ?? undefined,
          connectionTriggers: result.connectionTriggers,
          healthyIntimacyVision: result.healthyIntimacyVision ?? undefined,
        };
        results.intimacy = result;
      })());
    }

    if (sections.includes("lovePhilosophy")) {
      extractions.push((async () => {
        const result = await trackedExtract<LovePhilosophyResult>(
          "Love Philosophy",
          LOVE_PHILOSOPHY_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.lovePhilosophy),
          { believesInSoulmates: false, loveDefinition: null, loveRecognition: [],
            romanticGestures: [], healthyRelationshipVision: null, bestAdviceReceived: null }
        );
        updates.lovePhilosophy = {
          believesInSoulmates: result.believesInSoulmates,
          loveDefinition: result.loveDefinition ?? undefined,
          loveRecognition: result.loveRecognition,
          romanticGestures: result.romanticGestures,
          healthyRelationshipVision: result.healthyRelationshipVision ?? undefined,
          bestAdviceReceived: result.bestAdviceReceived ?? undefined,
        };
        results.lovePhilosophy = result;
      })());
    }

    if (sections.includes("partnerPrefs")) {
      extractions.push((async () => {
        const result = await trackedExtract<PartnerPreferencesResult>(
          "Partner Preferences",
          PARTNER_PREFERENCES_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.partnerPreferences),
          { mustHaves: [], niceToHaves: [], redFlags: [], importantQualities: [], dealbreakersInPartner: [] }
        );
        updates.partnerPreferences = result;
        results.partnerPrefs = result;
      })());
    }

    if (sections.includes("bioElements")) {
      extractions.push((async () => {
        const result = await trackedExtract<BioElementsResult>(
          "Bio Elements",
          BIO_ELEMENTS_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.bioElements),
          { conversationStarters: [], interestingFacts: [], uniqueQuirks: [], passions: [], whatTheySek: null }
        );
        updates.bioElements = {
          conversationStarters: result.conversationStarters,
          interestingFacts: result.interestingFacts,
          uniqueQuirks: result.uniqueQuirks,
          passions: result.passions,
          whatTheySek: result.whatTheySek ?? undefined,
        };
        results.bioElements = result;
      })());
    }

    if (sections.includes("confidence")) {
      extractions.push((async () => {
        const result = await trackedExtract<ConfidenceResult>(
          "Confidence",
          CONFIDENCE_PROMPT,
          formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.allOpenEnded),
          { confidence: 0.5, reasoning: "Default" }
        );
        updates.confidence = result.confidence;
        results.confidence = result;
      })());
    }

    if (sections.includes("bio")) {
      extractions.push((async () => {
        const result = await trackedExtract<BioGenerationResult>(
          "Bio Generation",
          getBioGenerationPrompt(userGender),
          allAnswersFormatted,
          { bio: "" }
        );
        updates.generatedBio = result.bio || undefined;
        results.bio = result.bio;
      })());
    }

    if (sections.includes("shortBio")) {
      extractions.push((async () => {
        const result = await trackedExtract<ShortBioResult>(
          "Short Bio",
          getShortBioPrompt(),
          allAnswersFormatted,
          { shortBio: "" }
        );
        updates.shortBio = result.shortBio || undefined;
        results.shortBio = result.shortBio;
      })());
    }

    // Wait for all extractions
    await Promise.all(extractions);

    // Log cost
    const totalUsage = aggregateUsage(costs.map(c => c.usage));
    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    
    console.log("\n========== SECTION REGENERATION COST ==========");
    console.log(`User: ${user?.name || userId}`);
    console.log(`Sections: ${sections.join(", ")}`);
    console.log("------------------------------------------------");
    costs.forEach(c => {
      console.log(`  ${c.name.padEnd(20)} | ${c.usage.totalTokens.toString().padStart(6)} tokens | ${formatCost(c.cost)}`);
    });
    console.log("------------------------------------------------");
    console.log(`  ${"TOTAL".padEnd(20)} | ${totalUsage.totalTokens.toString().padStart(6)} tokens | ${formatCost(totalCost)}`);
    console.log("================================================\n");

    // Update profile with new data
    if (Object.keys(updates).length > 0) {
      updates.processedAt = Date.now();
      await ctx.runMutation(internal.userProfiles.patchProfile, { userId, updates });
    }

    console.log(`Sections regenerated for ${user?.name || userId}`);
    if (results.shortBio) {
      console.log(`  Short bio: ${results.shortBio}`);
    }
    
    return { success: true, results };
  },
});
