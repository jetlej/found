import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { DEFAULT_MODEL } from "./lib/openai";

// Internal query to find a user by name
export const findUserByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    return users.find((u) => u.name === args.name) || null;
  },
});

// Internal query to count photos for a user
export const countUserPhotos = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return photos.length;
  },
});

// Internal mutation to create a test user and their answers
export const createTestUser = internalMutation({
  args: {
    name: v.string(),
    gender: v.optional(v.string()),
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
      gender: args.gender || "Non-binary",
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

// Internal query to get all test users (waitlistPosition === 999)
export const getTestUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => u.waitlistPosition === 999);
  },
});

// Internal mutation to patch bio fields on a test user
export const patchTestUserBasics = internalMutation({
  args: {
    userId: v.id("users"),
    pronouns: v.optional(v.string()),
    sexuality: v.optional(v.string()),
    birthdate: v.optional(v.string()),
    heightInches: v.optional(v.number()),
    ethnicity: v.optional(v.string()),
    hometown: v.optional(v.string()),
    relationshipGoal: v.optional(v.string()),
    relationshipType: v.optional(v.string()),
    hasChildren: v.optional(v.string()),
    wantsChildren: v.optional(v.string()),
    religion: v.optional(v.string()),
    religionImportance: v.optional(v.number()),
    politicalLeaning: v.optional(v.string()),
    politicalImportance: v.optional(v.number()),
    drinking: v.optional(v.string()),
    smoking: v.optional(v.string()),
    marijuana: v.optional(v.string()),
    drugs: v.optional(v.string()),
    pets: v.optional(v.string()),
    drinkingVisible: v.optional(v.boolean()),
    smokingVisible: v.optional(v.boolean()),
    marijuanaVisible: v.optional(v.boolean()),
    drugsVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }
  },
});

// Internal mutation to save a photo record for a test user (called from action after storage)
export const saveTestUserPhoto = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete any existing photos for this user
    const existingPhotos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const photo of existingPhotos) {
      await ctx.db.delete(photo._id);
    }

    // Create the photo record
    await ctx.db.insert("photos", {
      userId: args.userId,
      storageId: args.storageId,
      url: args.url,
      order: 0,
    });

    // Also set as avatar
    await ctx.db.patch(args.userId, { avatarUrl: args.url });

    return args.url;
  },
});
