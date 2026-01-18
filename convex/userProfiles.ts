import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Internal mutation to upsert a user profile (called by parseProfile action)
export const upsertProfile = internalMutation({
  args: {
    profile: v.object({
      userId: v.id("users"),
      values: v.array(v.string()),
      interests: v.array(v.string()),
      dealbreakers: v.array(v.string()),
      traits: v.object({
        introversion: v.number(),
        adventurousness: v.number(),
        ambition: v.number(),
        emotionalOpenness: v.number(),
        traditionalValues: v.number(),
        independenceNeed: v.number(),
      }),
      relationshipStyle: v.object({
        loveLanguage: v.string(),
        conflictStyle: v.string(),
        communicationFrequency: v.string(),
        financialApproach: v.string(),
        aloneTimeNeed: v.number(),
      }),
      familyPlans: v.object({
        wantsKids: v.string(),
        kidsTimeline: v.optional(v.string()),
        familyCloseness: v.number(),
        parentingStyle: v.optional(v.string()),
      }),
      lifestyle: v.object({
        sleepSchedule: v.string(),
        exerciseLevel: v.string(),
        dietType: v.optional(v.string()),
        alcoholUse: v.string(),
        drugUse: v.string(),
        petPreference: v.string(),
        locationPreference: v.string(),
      }),
      keywords: v.array(v.string()),
      processedAt: v.number(),
      openaiModel: v.string(),
      confidence: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { profile } = args;

    // Check if profile already exists
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", profile.userId))
      .first();

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, {
        values: profile.values,
        interests: profile.interests,
        dealbreakers: profile.dealbreakers,
        traits: profile.traits,
        relationshipStyle: profile.relationshipStyle,
        familyPlans: profile.familyPlans,
        lifestyle: profile.lifestyle,
        keywords: profile.keywords,
        processedAt: profile.processedAt,
        openaiModel: profile.openaiModel,
        confidence: profile.confidence,
      });
      return existing._id;
    } else {
      // Create new profile
      return await ctx.db.insert("userProfiles", profile);
    }
  },
});

// Query to get a user's profile
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Query to check if a user has a parsed profile
export const hasProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return !!profile;
  },
});

// Query to list all profiles (for compatibility screen)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});
