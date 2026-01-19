import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";

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

// Generate a unique 6-character referral code
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const completeOnboarding = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let existingCode = await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
      .first();
    while (existingCode) {
      referralCode = generateReferralCode();
      existingCode = await ctx.db
        .query("users")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
        .first();
    }

    // Set waitlist end time to 7 days from now
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const waitlistEndsAt = Date.now() + sevenDaysMs;

    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      status: "waitlist",
      referralCode,
      waitlistEndsAt,
      referralCount: user.referralCount ?? 0,
    });

    // If this user was referred by someone, credit the referrer now
    if (user.referredBy) {
      const referrer = await ctx.db.get(user.referredBy);
      if (referrer) {
        const newReferralCount = (referrer.referralCount ?? 0) + 1;
        await ctx.db.patch(referrer._id, {
          referralCount: newReferralCount,
          status: "active", // Referrer gets in immediately
        });
      }
    }

    // Schedule AI profile parsing in the background
    await ctx.scheduler.runAfter(
      0, // Run immediately
      internal.actions.parseProfile.parseUserProfile,
      { userId: user._id }
    );

    return { referralCode, waitlistEndsAt };
  },
});

export const applyReferralCode = mutation({
  args: {
    clerkId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return { success: false, error: "User not found" };

    // Can't use your own code
    if (user.referralCode === args.code.toUpperCase()) {
      return { success: false, error: "You can't use your own referral code" };
    }

    // Already has a referrer
    if (user.referredBy) {
      return { success: false, error: "You've already used a referral code" };
    }

    // Find the referrer
    const referrer = await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.code.toUpperCase()))
      .first();

    if (!referrer) {
      return { success: false, error: "Invalid referral code" };
    }

    // Update the current user with referredBy (referrer gets credit when this user completes onboarding)
    await ctx.db.patch(user._id, {
      referredBy: referrer._id,
    });

    return { success: true, referrerName: referrer.name };
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

// Internal query to get user by ID (for profile parsing)
export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Complete a category and level up
export const completeCategory = mutation({
  args: {
    clerkId: v.string(),
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    const completedCategories = user.completedCategories ?? [];
    
    // Don't add if already completed
    if (completedCategories.includes(args.categoryId)) {
      return { level: user.level ?? 1, completedCategories };
    }

    const newCompletedCategories = [...completedCategories, args.categoryId];
    const newLevel = newCompletedCategories.length;

    await ctx.db.patch(user._id, {
      completedCategories: newCompletedCategories,
      level: newLevel,
    });

    // If this is the first category (the_basics), also mark onboarding complete
    if (args.categoryId === "the_basics" && !user.onboardingComplete) {
      // Generate unique referral code
      let referralCode = generateReferralCode();
      let existingCode = await ctx.db
        .query("users")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
        .first();
      while (existingCode) {
        referralCode = generateReferralCode();
        existingCode = await ctx.db
          .query("users")
          .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
          .first();
      }

      // Set waitlist end time to 7 days from now
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const waitlistEndsAt = Date.now() + sevenDaysMs;

      await ctx.db.patch(user._id, {
        onboardingComplete: true,
        status: "waitlist",
        referralCode,
        waitlistEndsAt,
        referralCount: user.referralCount ?? 0,
      });

      // If this user was referred by someone, credit the referrer now
      if (user.referredBy) {
        const referrer = await ctx.db.get(user.referredBy);
        if (referrer) {
          const newReferralCount = (referrer.referralCount ?? 0) + 1;
          await ctx.db.patch(referrer._id, {
            referralCount: newReferralCount,
            status: "active", // Referrer gets in immediately
          });
        }
      }
    }

    return { level: newLevel, completedCategories: newCompletedCategories };
  },
});

// Uncomplete a category (for testing)
export const uncompleteCategory = mutation({
  args: {
    clerkId: v.string(),
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    const completedCategories = user.completedCategories ?? [];
    const newCompletedCategories = completedCategories.filter(
      (id) => id !== args.categoryId
    );
    const newLevel = Math.max(1, newCompletedCategories.length);

    await ctx.db.patch(user._id, {
      completedCategories: newCompletedCategories,
      level: newLevel,
    });

    return { level: newLevel, completedCategories: newCompletedCategories };
  },
});

// Reset journey progress (for testing)
export const resetJourney = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return;

    await ctx.db.patch(user._id, {
      completedCategories: [],
      level: 1,
    });

    return { level: 1, completedCategories: [] };
  },
});
