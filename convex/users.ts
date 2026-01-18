import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

export const getOrCreate = mutation({
  args: {
    clerkId: v.string(),
    phone: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      phone: args.phone,
      name: args.name,
    });
  },
});

export const current = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const updatePushToken = mutation({
  args: {
    clerkId: v.string(),
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { pushToken: args.pushToken });
    }
  },
});

export const updateProfile = mutation({
  args: {
    clerkId: v.string(),
    name: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    const updates: { name?: string; avatarUrl?: string } = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.avatarStorageId) {
      const url = await ctx.storage.getUrl(args.avatarStorageId);
      if (url) {
        updates.avatarUrl = url;
      }
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }
  },
});

export const updateBasics = mutation({
  args: {
    clerkId: v.string(),
    name: v.optional(v.string()),
    gender: v.optional(v.string()),
    location: v.optional(v.string()),
    sexuality: v.optional(v.string()),
    birthdate: v.optional(v.string()),
    heightInches: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    const updates: {
      name?: string;
      gender?: string;
      location?: string;
      sexuality?: string;
      birthdate?: string;
      heightInches?: number;
    } = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.location !== undefined) updates.location = args.location;
    if (args.sexuality !== undefined) updates.sexuality = args.sexuality;
    if (args.birthdate !== undefined) updates.birthdate = args.birthdate;
    if (args.heightInches !== undefined) updates.heightInches = args.heightInches;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }
  },
});

export const completeOnboarding = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    // Calculate waitlist position (count of users who completed before + 1)
    const completedUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("onboardingComplete"), true))
      .collect();

    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      waitlistPosition: completedUsers.length + 1,
    });

    // Schedule AI profile parsing in the background
    await ctx.scheduler.runAfter(
      0, // Run immediately
      internal.actions.parseProfile.parseUserProfile,
      { userId: user._id }
    );

    return completedUsers.length + 1;
  },
});

export const setOnboardingStep = mutation({
  args: {
    clerkId: v.string(),
    step: v.string(), // "basics", "photos", "ai-import", "questions", "complete"
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    await ctx.db.patch(user._id, { onboardingStep: args.step });
  },
});

export const updateNotificationSettings = mutation({
  args: {
    clerkId: v.string(),
    notificationsEnabled: v.optional(v.boolean()),
    pushToken: v.optional(v.string()),
    reminderHour: v.optional(v.number()),
    reminderMinute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    const updates: {
      notificationsEnabled?: boolean;
      pushToken?: string;
      reminderHour?: number;
      reminderMinute?: number;
    } = {};

    if (args.notificationsEnabled !== undefined) {
      updates.notificationsEnabled = args.notificationsEnabled;
    }
    if (args.pushToken !== undefined) {
      updates.pushToken = args.pushToken;
    }
    if (args.reminderHour !== undefined) {
      updates.reminderHour = args.reminderHour;
    }
    if (args.reminderMinute !== undefined) {
      updates.reminderMinute = args.reminderMinute;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }
  },
});

// Query to list all users (for compatibility screen)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});
