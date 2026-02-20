import { v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "./lib/admin";
import { internal } from "./_generated/api";
import { TOTAL_VOICE_QUESTIONS } from "./lib/voiceConfig";

const REGENERATE_PROFILE_COOLDOWN_MS = 30 * 1000; // 30s for dev, raise to 60*60*1000 for prod
const analyzeAllForUserInternal = (internal as any).actions.analyzeCompatibility
  .analyzeAllForUser;

/** Get the authenticated user from ctx.auth, or throw. */
async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

/** Get the authenticated Clerk ID from ctx.auth, or throw. */
async function getAuthClerkId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

export const getOrCreate = mutation({
  args: {
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkId = await getAuthClerkId(ctx);

    // First check by clerkId
    const existingByClerk = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingByClerk) {
      return existingByClerk._id;
    }

    // No existing user - create new
    return await ctx.db.insert("users", {
      clerkId,
      phone: args.phone,
      name: args.name,
      type: "human",
    });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

export const updatePushToken = mutation({
  args: {
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (user) {
      await ctx.db.patch(user._id, { pushToken: args.pushToken });
    }
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
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

    if (Object.keys(updates).length === 0) return;

    await ctx.db.patch(user._id, {
      ...updates,
      lastProfileEditedAt: Date.now(),
    });

    // Keep compatibility analyses fresh after profile edits.
    if (user.onboardingComplete) {
      await ctx.scheduler.runAfter(
        0,
        analyzeAllForUserInternal,
        { userId: user._id },
      );
    }
  },
});

export const updateBasics = mutation({
  args: {
    name: v.optional(v.string()),
    gender: v.optional(v.string()),
    location: v.optional(v.string()),
    sexuality: v.optional(v.string()),
    birthdate: v.optional(v.string()),
    ageRangeMin: v.optional(v.number()),
    ageRangeMax: v.optional(v.number()),
    ageRangeDealbreaker: v.optional(v.boolean()),
    heightInches: v.optional(v.number()),
    relationshipGoal: v.optional(v.string()),
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
    drinkingVisible: v.optional(v.boolean()),
    smokingVisible: v.optional(v.boolean()),
    marijuanaVisible: v.optional(v.boolean()),
    drugsVisible: v.optional(v.boolean()),
    pronouns: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    hometown: v.optional(v.string()),
    relationshipType: v.optional(v.string()),
    pets: v.optional(v.string()),
    tattoos: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) return;

    const updates: Record<string, string | number | boolean | undefined> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) return;

    await ctx.db.patch(user._id, {
      ...updates,
      lastProfileEditedAt: Date.now(),
    });

    // Keep compatibility analyses fresh after profile edits.
    if (user.onboardingComplete) {
      await ctx.scheduler.runAfter(
        0,
        analyzeAllForUserInternal,
        { userId: user._id },
      );
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
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
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

    return { referralCode, waitlistEndsAt };
  },
});

export const applyReferralCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
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

// First-time profile audit confirmation gate for voice onboarding.
// Marks audit complete, clears old analyses, and triggers fresh compatibility generation.
export const completeProfileAudit = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profile not ready");

    if (!user.profileAuditCompletedAt) {
      await ctx.db.patch(user._id, { profileAuditCompletedAt: Date.now() });
    }

    // Clear existing analyses so they get regenerated fresh
    const asUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
      .collect();
    const asUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", user._id))
      .collect();
    for (const doc of [...asUser1, ...asUser2]) {
      await ctx.db.delete(doc._id);
    }

    await ctx.scheduler.runAfter(
      0,
      analyzeAllForUserInternal,
      { userId: user._id },
    );

    return { started: true };
  },
});

export const regenerateProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    const lastRegeneratedAt = user.lastProfileRegeneratedAt ?? 0;
    const elapsedMs = Date.now() - lastRegeneratedAt;
    if (elapsedMs < REGENERATE_PROFILE_COOLDOWN_MS) {
      const retryInMinutes = Math.ceil(
        (REGENERATE_PROFILE_COOLDOWN_MS - elapsedMs) / (60 * 1000),
      );
      throw new Error(
        `You can regenerate once per hour. Try again in ${retryInMinutes}m.`,
      );
    }

    const recordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (recordings.length < TOTAL_VOICE_QUESTIONS) {
      throw new Error("Complete all voice answers before regenerating.");
    }

    await ctx.db.patch(user._id, { lastProfileRegeneratedAt: Date.now() });
    await ctx.scheduler.runAfter(
      0,
      internal.actions.parseVoiceProfile.parseVoiceProfile,
      { userId: user._id },
    );

    return { scheduled: true };
  },
});

export const setOnboardingStep = mutation({
  args: {
    step: v.string(), // "basics", "photos", "ai-import", "questions", "complete"
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) return;

    await ctx.db.patch(user._id, { onboardingStep: args.step });
  },
});

export const updateNotificationSettings = mutation({
  args: {
    notificationsEnabled: v.optional(v.boolean()),
    pushToken: v.optional(v.string()),
    reminderHour: v.optional(v.number()),
    reminderMinute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
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

// Internal query to list all users (for server-side actions only)
export const listAll = internalQuery({
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
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
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


// ============ Dev Admin Panel ============

// Search users by name or phone (for dev admin)
export const searchUsers = query({
  args: { query: v.string(), adminSecret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);

    const allUsers = await ctx.db.query("users").collect();
    const q = args.query.toLowerCase();
    return allUsers
      .filter(
        (u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q)
      )
      .slice(0, 20);
  },
});

// Create fresh test user for onboarding testing
export const createDevTestUser = mutation({
  args: { adminSecret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);

    const clerkId = `dev_test_${Date.now()}`;
    await ctx.db.insert("users", {
      clerkId,
      phone: `+1555${Math.floor(Math.random() * 10000000)
        .toString()
        .padStart(7, "0")}`,
    });
    return clerkId;
  },
});

// Delete user and all related data (for dev/testing)
export const deleteUserByPhone = mutation({
  args: { phone: v.string(), adminSecret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Delete related photos
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const photo of photos) {
      await ctx.db.delete(photo._id);
    }

    // Delete related voice recordings
    const recordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const recording of recordings) {
      await ctx.db.delete(recording._id);
    }

    // Delete related answers
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const answer of answers) {
      await ctx.db.delete(answer._id);
    }

    // Delete user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (profile) {
      await ctx.db.delete(profile._id);
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return { success: true, deletedUserId: user._id };
  },
});

export const deleteCurrentUserAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) {
      return { success: false };
    }

    // Delete related photos.
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const photo of photos) {
      await ctx.db.delete(photo._id);
    }

    // Delete related voice recordings.
    const recordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const recording of recordings) {
      await ctx.db.delete(recording._id);
    }

    // Delete related answers.
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const answer of answers) {
      await ctx.db.delete(answer._id);
    }

    // Delete related user profile rows.
    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const profile of profiles) {
      await ctx.db.delete(profile._id);
    }

    // Delete compatibility analyses where this user appears in either side.
    const analysesAsUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
      .collect();
    const analysesAsUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", user._id))
      .collect();
    const analysisIds = new Set(
      [...analysesAsUser1, ...analysesAsUser2].map((analysis) => analysis._id),
    );
    for (const analysisId of analysisIds) {
      await ctx.db.delete(analysisId);
    }

    // Delete the user account.
    await ctx.db.delete(user._id);

    return { success: true };
  },
});

// Internal paginated users list for bounded background processing.
export const listPaginated = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db.query("users").paginate(args.paginationOpts);
  },
});
