import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";

/** Get the authenticated user from ctx.auth, or throw. */
async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

// Preference object validator (reusable)
const preferenceValidator = v.optional(v.object({
  self: v.string(),
  openTo: v.array(v.string()),
  isDealbreaker: v.boolean(),
}));

// Internal mutation to upsert a user profile (called by parseProfile action)
export const upsertProfile = internalMutation({
  args: {
    profile: v.object({
      userId: v.id("users"),
      // New canonical matching fields
      selectedInterests: v.optional(v.array(v.string())),
      canonicalValues: v.optional(v.array(v.string())),
      preferences: v.optional(v.object({
        relationshipGoals: preferenceValidator,
        relationshipStyle: preferenceValidator,
        hasChildren: preferenceValidator,
        wantsChildren: preferenceValidator,
        ethnicity: preferenceValidator,
        religion: preferenceValidator,
        politics: preferenceValidator,
        education: preferenceValidator,
        alcohol: preferenceValidator,
        smoking: preferenceValidator,
        marijuana: preferenceValidator,
        drugs: preferenceValidator,
      })),
      // Legacy raw values (for display)
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
        romanticStyle: v.number(),
        socialEnergy: v.number(),
        communicationStyle: v.number(),
        attachmentStyle: v.number(),
        planningStyle: v.number(),
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
      // New fields (Phases 2-10)
      lifeStory: v.optional(v.object({
        proudestAchievement: v.optional(v.string()),
        definingHardship: v.optional(v.string()),
        biggestRisk: v.optional(v.string()),
        dreams: v.array(v.string()),
        fears: v.array(v.string()),
        formativeExperiences: v.array(v.string()),
        favoriteStory: v.optional(v.string()),
      })),
      socialProfile: v.optional(v.object({
        socialStyle: v.string(),
        weekendStyle: v.optional(v.string()),
        idealFridayNight: v.optional(v.string()),
        goOutFrequency: v.number(),
        friendApprovalImportance: v.number(),
        socialCircleVision: v.optional(v.string()),
      })),
      intimacyProfile: v.optional(v.object({
        physicalIntimacyImportance: v.number(),
        physicalAttractionImportance: v.number(),
        pdaComfort: v.string(),
        emotionalIntimacyApproach: v.optional(v.string()),
        connectionTriggers: v.array(v.string()),
        healthyIntimacyVision: v.optional(v.string()),
      })),
      lovePhilosophy: v.optional(v.object({
        believesInSoulmates: v.boolean(),
        loveDefinition: v.optional(v.string()),
        loveRecognition: v.array(v.string()),
        romanticGestures: v.array(v.string()),
        healthyRelationshipVision: v.optional(v.string()),
        bestAdviceReceived: v.optional(v.string()),
      })),
      partnerPreferences: v.optional(v.object({
        mustHaves: v.array(v.string()),
        niceToHaves: v.array(v.string()),
        redFlags: v.array(v.string()),
        importantQualities: v.array(v.string()),
        dealbreakersInPartner: v.array(v.string()),
      })),
      bioElements: v.optional(v.object({
        conversationStarters: v.array(v.string()),
        interestingFacts: v.array(v.string()),
        uniqueQuirks: v.array(v.string()),
        passions: v.array(v.string()),
        whatTheySek: v.optional(v.string()),
      })),
      demographics: v.optional(v.object({
        ethnicity: v.optional(v.string()),
        religion: v.optional(v.string()),
        religiosity: v.number(),
        politicalLeaning: v.optional(v.string()),
        politicalIntensity: v.number(),
        hasKids: v.boolean(),
      })),
      health: v.optional(v.object({
        physicalHealthRating: v.number(),
        mentalHealthRating: v.number(),
        healthNotes: v.optional(v.string()),
        smokingStatus: v.string(),
        drinkingFrequency: v.string(),
        drugUse: v.string(),
      })),
      generatedBio: v.optional(v.string()),
      shortBio: v.optional(v.string()),
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
        selectedInterests: profile.selectedInterests,
        canonicalValues: profile.canonicalValues,
        preferences: profile.preferences,
        values: profile.values,
        interests: profile.interests,
        dealbreakers: profile.dealbreakers,
        traits: profile.traits,
        relationshipStyle: profile.relationshipStyle,
        familyPlans: profile.familyPlans,
        lifestyle: profile.lifestyle,
        lifeStory: profile.lifeStory,
        socialProfile: profile.socialProfile,
        intimacyProfile: profile.intimacyProfile,
        lovePhilosophy: profile.lovePhilosophy,
        partnerPreferences: profile.partnerPreferences,
        bioElements: profile.bioElements,
        demographics: profile.demographics,
        health: profile.health,
        generatedBio: profile.generatedBio,
        shortBio: profile.shortBio,
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
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    if (user._id !== args.userId) throw new Error("Forbidden");

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
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    if (user._id !== args.userId) throw new Error("Forbidden");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return !!profile;
  },
});

// Internal query to list all profiles (for server-side actions only)
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});

// Internal query to get a user's profile (for actions)
export const getByUserInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Internal query: check if a user has a profile
export const hasProfileInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return !!profile;
  },
});

// Client-callable mutation to update hidden fields
export const updateHiddenFields = mutation({
  args: { hiddenFields: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, { hiddenFields: args.hiddenFields });
  },
});

// Internal mutation to update just the bios
export const updateBios = internalMutation({
  args: {
    userId: v.id("users"),
    generatedBio: v.optional(v.string()),
    shortBio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existing) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(existing._id, {
      generatedBio: args.generatedBio,
      shortBio: args.shortBio,
      processedAt: Date.now(),
    });

    return existing._id;
  },
});

// Internal mutation to patch any fields on a profile
export const patchProfile = internalMutation({
  args: {
    userId: v.id("users"),
    updates: v.any(), // Flexible updates object
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existing) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(existing._id, args.updates);
    return existing._id;
  },
});
