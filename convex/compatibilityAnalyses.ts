import { v } from 'convex/values';
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  QueryCtx,
  MutationCtx,
} from './_generated/server';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import { categoryScoresValidator, categorySummariesValidator } from './lib/compatibilityCategories';
import { requireAdmin, assertOwnerOrAdmin } from './lib/admin';

/** Get the authenticated user from ctx.auth, or throw. */
async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();
}

// Build a deterministic pair key from two user IDs
function makePairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join('_');
}

// Public query: get analysis for a pair
export const getForPair = query({
  args: { user1Id: v.id('users'), user2Id: v.id('users') },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error('User not found');
    if (user._id !== args.user1Id && user._id !== args.user2Id) {
      throw new Error('Forbidden');
    }

    const pairKey = makePairKey(args.user1Id, args.user2Id);
    return await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_pair', (q) => q.eq('userIdPair', pairKey))
      .first();
  },
});

// Public query: list all analyses for a user
export const listForUser = query({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error('User not found');
    assertOwnerOrAdmin(user, args.userId);
    const requestedLimit = args.limit ?? 500;
    const safeLimit = Math.max(1, Math.min(requestedLimit, 2000));
    const perSideLimit = Math.ceil(safeLimit / 2);

    const asUser1 = await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_user1', (q) => q.eq('user1Id', args.userId))
      .take(perSideLimit);
    const asUser2 = await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_user2', (q) => q.eq('user2Id', args.userId))
      .take(perSideLimit);
    return [...asUser1, ...asUser2].slice(0, safeLimit);
  },
});

// Internal query: list all analyses for a user
export const listForUserInternal = internalQuery({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const requestedLimit = args.limit ?? 500;
    const safeLimit = Math.max(1, Math.min(requestedLimit, 5000));
    const perSideLimit = Math.ceil(safeLimit / 2);
    const asUser1 = await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_user1', (q) => q.eq('user1Id', args.userId))
      .take(perSideLimit);
    const asUser2 = await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_user2', (q) => q.eq('user2Id', args.userId))
      .take(perSideLimit);
    return [...asUser1, ...asUser2].slice(0, safeLimit);
  },
});

// Internal query: list all analyses (for benchmark re-runs)
export const listAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('compatibilityAnalyses').collect();
  },
});

// Internal query: list just user ID pairs (for benchmark scripts)
export const listPairs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('compatibilityAnalyses').collect();
    return all.map((a) => ({ user1Id: a.user1Id, user2Id: a.user2Id }));
  },
});

// Internal query: count analyses by model (for benchmark progress tracking)
export const modelStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('compatibilityAnalyses').collect();
    const counts: Record<string, number> = {};
    for (const a of all) {
      counts[a.openaiModel] = (counts[a.openaiModel] || 0) + 1;
    }
    return { total: all.length, byModel: counts };
  },
});

// Internal query: check if analysis exists (for action dedup)
export const getForPairInternal = internalQuery({
  args: { user1Id: v.id('users'), user2Id: v.id('users') },
  handler: async (ctx, args) => {
    const pairKey = makePairKey(args.user1Id, args.user2Id);
    return await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_pair', (q) => q.eq('userIdPair', pairKey))
      .first();
  },
});

// Internal mutation: store analysis result
export const store = internalMutation({
  args: {
    user1Id: v.id('users'),
    user2Id: v.id('users'),
    summary: v.string(),
    greenFlags: v.array(v.string()),
    yellowFlags: v.array(v.string()),
    redFlags: v.array(v.string()),
    categoryScores: categoryScoresValidator,
    categorySummaries: v.optional(categorySummariesValidator),
    overallScore: v.number(),
    openaiModel: v.string(),
  },
  handler: async (ctx, args) => {
    const pairKey = makePairKey(args.user1Id, args.user2Id);

    // Upsert: replace if exists
    const existing = await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_pair', (q) => q.eq('userIdPair', pairKey))
      .first();

    const [sortedId1, sortedId2] = [args.user1Id, args.user2Id].sort() as [
      Id<'users'>,
      Id<'users'>,
    ];

    const doc = {
      userIdPair: pairKey,
      user1Id: sortedId1,
      user2Id: sortedId2,
      summary: args.summary,
      greenFlags: args.greenFlags,
      yellowFlags: args.yellowFlags,
      redFlags: args.redFlags,
      categoryScores: args.categoryScores,
      ...(args.categorySummaries ? { categorySummaries: args.categorySummaries } : {}),
      overallScore: args.overallScore,
      generatedAt: Date.now(),
      openaiModel: args.openaiModel,
    };

    if (existing) {
      await ctx.db.replace(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert('compatibilityAnalyses', doc);
  },
});

// Mutation to clear all analyses for the authenticated user (for re-generation)
export const clearForUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error('User not found');
    const userId = user._id;

    const asUser1 = await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_user1', (q) => q.eq('user1Id', userId))
      .collect();
    const asUser2 = await ctx.db
      .query('compatibilityAnalyses')
      .withIndex('by_user2', (q) => q.eq('user2Id', userId))
      .collect();
    const all = [...asUser1, ...asUser2];
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return all.length;
  },
});

// Admin: clear ALL analyses (useful after category changes)
export const clearAll = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);
    const all = await ctx.db.query('compatibilityAnalyses').collect();
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return all.length;
  },
});

// Internal: clear all analyses (used during category schema migrations)
export const clearAllInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('compatibilityAnalyses').collect();
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return all.length;
  },
});

// Admin: regenerate compatibility for all human users with profiles
export const regenerateAll = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);
    const allUsers = await ctx.db.query('users').collect();
    const humans = allUsers.filter((u) => u.type === 'human' && u.profileAuditCompletedAt);
    let scheduled = 0;
    for (const user of humans) {
      const profile = await ctx.db
        .query('userProfiles')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first();
      if (!profile) continue;
      await ctx.scheduler.runAfter(
        scheduled * 2000, // stagger to avoid rate limits
        internal.actions.analyzeCompatibility.analyzeAllForUser,
        { userId: user._id }
      );
      scheduled++;
    }
    return { scheduled, totalHumans: humans.length };
  },
});
