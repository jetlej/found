"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { extractStructuredData, DEFAULT_MODEL } from "../lib/openai";
import {
  VALUES_INTERESTS_PROMPT,
  PERSONALITY_TRAITS_PROMPT,
  FAMILY_PLANS_PROMPT,
  LIFESTYLE_PROMPT,
  KEYWORDS_PROMPT,
  CONFIDENCE_PROMPT,
  formatQAPairs,
  EXTRACTION_QUESTION_GROUPS,
} from "../lib/prompts";

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

// Internal action to parse a user's profile (called by scheduler)
export const parseUserProfile = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log(`Starting profile parsing for user ${args.userId}`);

    // Get all answers for this user with question details
    const answersWithQuestions = await ctx.runQuery(
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
      (a) => a.questionType === "multiple_choice" || a.questionType === "scale"
    );

    // Get open-ended answers for AI extraction
    const openEndedAnswers = answersWithQuestions.filter(
      (a) => a.questionType === "essay" || a.questionType === "text"
    );

    // Format answers for prompts
    const formatAnswersForGroup = (questionOrders: number[]) => {
      const relevantAnswers = openEndedAnswers
        .filter((a) => questionOrders.includes(a.questionOrder))
        .map((a) => ({
          questionText: a.questionText,
          answer: a.value,
          questionOrder: a.questionOrder,
        }));
      return formatQAPairs(relevantAnswers);
    };

    // Run all extractions in parallel
    const [
      valuesInterests,
      personalityTraits,
      familyPlans,
      lifestyle,
      keywords,
    ] = await Promise.all([
      // Values and interests extraction
      extractStructuredData<ValuesInterestsResult>(
        VALUES_INTERESTS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.valuesInterests)
      ).catch((e) => {
        console.error("Values extraction failed:", e);
        return { values: [], interests: [], dealbreakers: [] };
      }),

      // Personality traits extraction
      extractStructuredData<PersonalityTraitsResult>(
        PERSONALITY_TRAITS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.personalityTraits)
      ).catch((e) => {
        console.error("Personality extraction failed:", e);
        return {
          introversion: 5,
          adventurousness: 5,
          ambition: 5,
          emotionalOpenness: 5,
          traditionalValues: 5,
          independenceNeed: 5,
        };
      }),

      // Family plans extraction
      extractStructuredData<FamilyPlansResult>(
        FAMILY_PLANS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.familyPlans)
      ).catch((e) => {
        console.error("Family plans extraction failed:", e);
        return { wantsKids: "unknown", kidsTimeline: null, parentingStyle: null };
      }),

      // Lifestyle extraction
      extractStructuredData<LifestyleResult>(
        LIFESTYLE_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.lifestyle)
      ).catch((e) => {
        console.error("Lifestyle extraction failed:", e);
        return { dietType: null, petPreference: "neutral", locationPreference: "flexible" };
      }),

      // Keywords extraction
      extractStructuredData<KeywordsResult>(
        KEYWORDS_PROMPT,
        formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.allOpenEnded)
      ).catch((e) => {
        console.error("Keywords extraction failed:", e);
        return { keywords: [] };
      }),
    ]);

    // Get confidence score
    const confidenceResult = await extractStructuredData<ConfidenceResult>(
      CONFIDENCE_PROMPT,
      formatAnswersForGroup(EXTRACTION_QUESTION_GROUPS.allOpenEnded)
    ).catch(() => ({ confidence: 0.5, reasoning: "Default confidence" }));

    // Extract structured data from multiple choice/scale questions
    const getAnswerByOrder = (order: number) => {
      const answer = structuredAnswers.find((a) => a.questionOrder === order);
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
        kidsTimeline: familyPlans.kidsTimeline,
        familyCloseness: getScaleAnswer(71),
        parentingStyle: familyPlans.parentingStyle,
      },
      lifestyle: {
        sleepSchedule: getAnswerByOrder(32) || "unknown",
        exerciseLevel: getAnswerByOrder(24) || "unknown",
        dietType: lifestyle.dietType,
        alcoholUse: getAnswerByOrder(29) || "unknown",
        drugUse: getAnswerByOrder(31) || "unknown",
        petPreference: lifestyle.petPreference,
        locationPreference: lifestyle.locationPreference,
      },
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
