import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { DEFAULT_MODEL } from "./lib/openai";

// Internal mutation to create a test user and their answers
export const createTestUser = internalMutation({
  args: {
    name: v.string(),
    answers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    // Create fake user
    const clerkId = `test_${args.name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    const userId = await ctx.db.insert("users", {
      clerkId,
      phone: `+1555${Math.floor(Math.random() * 10000000)
        .toString()
        .padStart(7, "0")}`,
      name: args.name,
      gender: "Non-binary",
      sexuality: "Everyone",
      location: "San Francisco, CA",
      birthdate: "1995-06-15",
      heightInches: 68,
      onboardingComplete: true,
      waitlistPosition: 999,
    });

    // Get all questions to map order -> id
    const questions = await ctx.db.query("questions").collect();
    const questionMap = new Map(questions.map((q) => [q.order.toString(), q._id]));

    // Insert answers
    for (const [orderStr, value] of Object.entries(args.answers)) {
      const questionId = questionMap.get(orderStr);
      if (questionId) {
        await ctx.db.insert("answers", {
          userId,
          questionId,
          value: value.toString(),
          source: "manual",
        });
      }
    }

    return userId;
  },
});

// Internal mutation to replace all answers for an existing user
export const replaceUserAnswers = internalMutation({
  args: {
    userId: v.id("users"),
    answers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    // Delete existing answers
    const existingAnswers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const answer of existingAnswers) {
      await ctx.db.delete(answer._id);
    }

    // Get all questions to map order -> id
    const questions = await ctx.db.query("questions").collect();
    const questionMap = new Map(questions.map((q) => [q.order.toString(), q._id]));

    // Insert new answers
    for (const [orderStr, value] of Object.entries(args.answers)) {
      const questionId = questionMap.get(orderStr);
      if (questionId) {
        await ctx.db.insert("answers", {
          userId: args.userId,
          questionId,
          value: value.toString(),
          source: "ai",
        });
      }
    }

    // Mark onboarding as complete
    const user = await ctx.db.get(args.userId);
    if (user && !user.onboardingComplete) {
      await ctx.db.patch(args.userId, {
        onboardingComplete: true,
        onboardingStep: "complete",
      });
    }
  },
});

// Internal mutation to create a user profile directly (skip AI parsing for test users)
export const createTestProfile = internalMutation({
  args: {
    userId: v.id("users"),
    persona: v.object({
      name: v.string(),
      description: v.string(),
      traits: v.object({
        introversion: v.number(),
        adventurousness: v.number(),
        ambition: v.number(),
        emotionalOpenness: v.number(),
        traditionalValues: v.number(),
        independenceNeed: v.number(),
        // New traits (Phase 1)
        romanticStyle: v.optional(v.number()),
        socialEnergy: v.optional(v.number()),
        communicationStyle: v.optional(v.number()),
        attachmentStyle: v.optional(v.number()),
        planningStyle: v.optional(v.number()),
      }),
    }),
    extractedData: v.object({
      values: v.array(v.string()),
      interests: v.array(v.string()),
      dealbreakers: v.array(v.string()),
      keywords: v.array(v.string()),
      familyPlans: v.object({
        wantsKids: v.string(),
        kidsTimeline: v.optional(v.string()),
        parentingStyle: v.optional(v.string()),
      }),
      lifestyle: v.object({
        dietType: v.optional(v.string()),
        petPreference: v.string(),
        locationPreference: v.string(),
      }),
    }),
    structuredAnswers: v.object({
      loveLanguage: v.string(),
      conflictStyle: v.string(),
      communicationFrequency: v.string(),
      financialApproach: v.string(),
      aloneTimeNeed: v.number(),
      familyCloseness: v.number(),
      sleepSchedule: v.string(),
      exerciseLevel: v.string(),
      alcoholUse: v.string(),
      drugUse: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("userProfiles", {
      userId: args.userId,
      values: args.extractedData.values,
      interests: args.extractedData.interests,
      dealbreakers: args.extractedData.dealbreakers,
      traits: {
        introversion: args.persona.traits.introversion,
        adventurousness: args.persona.traits.adventurousness,
        ambition: args.persona.traits.ambition,
        emotionalOpenness: args.persona.traits.emotionalOpenness,
        traditionalValues: args.persona.traits.traditionalValues,
        independenceNeed: args.persona.traits.independenceNeed,
        // New traits with defaults
        romanticStyle: args.persona.traits.romanticStyle ?? 5,
        socialEnergy: args.persona.traits.socialEnergy ?? 5,
        communicationStyle: args.persona.traits.communicationStyle ?? 5,
        attachmentStyle: args.persona.traits.attachmentStyle ?? 5,
        planningStyle: args.persona.traits.planningStyle ?? 5,
      },
      relationshipStyle: {
        loveLanguage: args.structuredAnswers.loveLanguage,
        conflictStyle: args.structuredAnswers.conflictStyle,
        communicationFrequency: args.structuredAnswers.communicationFrequency,
        financialApproach: args.structuredAnswers.financialApproach,
        aloneTimeNeed: args.structuredAnswers.aloneTimeNeed,
      },
      familyPlans: {
        wantsKids: args.extractedData.familyPlans.wantsKids,
        kidsTimeline: args.extractedData.familyPlans.kidsTimeline,
        familyCloseness: args.structuredAnswers.familyCloseness,
        parentingStyle: args.extractedData.familyPlans.parentingStyle,
      },
      lifestyle: {
        sleepSchedule: args.structuredAnswers.sleepSchedule,
        exerciseLevel: args.structuredAnswers.exerciseLevel,
        dietType: args.extractedData.lifestyle.dietType,
        alcoholUse: args.structuredAnswers.alcoholUse,
        drugUse: args.structuredAnswers.drugUse,
        petPreference: args.extractedData.lifestyle.petPreference,
        locationPreference: args.extractedData.lifestyle.locationPreference,
      },
      keywords: args.extractedData.keywords,
      processedAt: Date.now(),
      openaiModel: DEFAULT_MODEL,
      confidence: 0.95,
    });
  },
});
