import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/** Get the authenticated user from ctx.auth, or throw. */
async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

// Build a deterministic pair key from two user IDs
function makePairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("_");
}

// Public query: get analysis for a pair
export const getForPair = query({
  args: { user1Id: v.id("users"), user2Id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    if (user._id !== args.user1Id && user._id !== args.user2Id) {
      throw new Error("Forbidden");
    }

    const pairKey = makePairKey(args.user1Id, args.user2Id);
    return await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_pair", (q) => q.eq("userIdPair", pairKey))
      .first();
  },
});

// Public query: list all analyses for a user
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    if (user._id !== args.userId) throw new Error("Forbidden");

    const asUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", args.userId))
      .collect();
    const asUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", args.userId))
      .collect();
    return [...asUser1, ...asUser2];
  },
});

// Internal query: list all analyses for a user
export const listForUserInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const asUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", args.userId))
      .collect();
    const asUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", args.userId))
      .collect();
    return [...asUser1, ...asUser2];
  },
});

// Internal query: list all analyses (for benchmark re-runs)
export const listAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("compatibilityAnalyses").collect();
  },
});

// Internal query: list just user ID pairs (for benchmark scripts)
export const listPairs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("compatibilityAnalyses").collect();
    return all.map((a) => ({ user1Id: a.user1Id, user2Id: a.user2Id }));
  },
});

// Internal query: count analyses by model (for benchmark progress tracking)
export const modelStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("compatibilityAnalyses").collect();
    const counts: Record<string, number> = {};
    for (const a of all) {
      counts[a.openaiModel] = (counts[a.openaiModel] || 0) + 1;
    }
    return { total: all.length, byModel: counts };
  },
});

// Internal query: check if analysis exists (for action dedup)
export const getForPairInternal = internalQuery({
  args: { user1Id: v.id("users"), user2Id: v.id("users") },
  handler: async (ctx, args) => {
    const pairKey = makePairKey(args.user1Id, args.user2Id);
    return await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_pair", (q) => q.eq("userIdPair", pairKey))
      .first();
  },
});

// Internal mutation: store analysis result
export const store = internalMutation({
  args: {
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    summary: v.string(),
    greenFlags: v.array(v.string()),
    yellowFlags: v.array(v.string()),
    redFlags: v.array(v.string()),
    categoryScores: v.object({
      coreValues: v.number(),
      lifestyleAlignment: v.number(),
      relationshipGoals: v.number(),
      communicationStyle: v.number(),
      emotionalCompatibility: v.number(),
      familyPlanning: v.number(),
      socialLifestyle: v.number(),
      conflictResolution: v.number(),
      intimacyAlignment: v.number(),
      growthMindset: v.number(),
    }),
    overallScore: v.number(),
    openaiModel: v.string(),
  },
  handler: async (ctx, args) => {
    const pairKey = makePairKey(args.user1Id, args.user2Id);

    // Upsert: replace if exists
    const existing = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_pair", (q) => q.eq("userIdPair", pairKey))
      .first();

    const [sortedId1, sortedId2] = [args.user1Id, args.user2Id].sort() as [Id<"users">, Id<"users">];

    const doc = {
      userIdPair: pairKey,
      user1Id: sortedId1,
      user2Id: sortedId2,
      summary: args.summary,
      greenFlags: args.greenFlags,
      yellowFlags: args.yellowFlags,
      redFlags: args.redFlags,
      categoryScores: args.categoryScores,
      overallScore: args.overallScore,
      generatedAt: Date.now(),
      openaiModel: args.openaiModel,
    };

    if (existing) {
      await ctx.db.replace(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert("compatibilityAnalyses", doc);
  },
});

// Mutation to clear all analyses for the authenticated user (for re-generation)
export const clearForUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    const userId = user._id;

    const asUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", userId))
      .collect();
    const asUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", userId))
      .collect();
    const all = [...asUser1, ...asUser2];
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return all.length;
  },
});
