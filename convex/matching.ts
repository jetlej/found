import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { isGenderCompatible, isAgeCompatible } from "./lib/compatibility";

/** Get the authenticated user from ctx.auth, or return null. */
async function getAuthUserOptional(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

// Returns fully-joined match data for the authenticated user.
// Filters by gender/sexuality/age server-side so no raw data leaks.
export const getMatchesForCurrentUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const DEFAULT_LIMIT = 30;
    const MAX_LIMIT = 100;
    const requestedLimit = args.limit ?? DEFAULT_LIMIT;
    const safeLimit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));
    const perSideScanLimit = Math.min(Math.max(safeLimit * 3, 100), 500);

    const currentUser = await getAuthUserOptional(ctx);
    if (!currentUser) return null;

    // Get AI analyses for this user
    const asUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", currentUser._id))
      .take(perSideScanLimit);
    const asUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", currentUser._id))
      .take(perSideScanLimit);
    const analyses = [...asUser1, ...asUser2].sort(
      (a, b) => b.overallScore - a.overallScore,
    );

    if (analyses.length === 0) return [];

    const limitedAnalyses = analyses.slice(0, safeLimit);

    // Collect the other user IDs from analyses
    const otherUserIds = limitedAnalyses.map((a) =>
      a.user1Id === currentUser._id ? a.user2Id : a.user1Id,
    );

    // Fetch users, profiles, photos for matched users only
    const results = await Promise.all(
      otherUserIds.map(async (uid, i) => {
        const user = await ctx.db.get(uid);
        if (!user) return null;
        if (!isGenderCompatible(currentUser, user)) return null;
        if (!isAgeCompatible(currentUser, user)) return null;

        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", uid))
          .first();
        if (!profile) return null;

        const photos = await ctx.db
          .query("photos")
          .withIndex("by_user", (q) => q.eq("userId", uid))
          .collect();

        const sortedPhotos = photos.sort((a, b) => a.order - b.order);
        // Deduplicate by order slot
        const seen = new Set<number>();
        const photoUrls = sortedPhotos
          .filter((p) => {
            if (seen.has(p.order)) return false;
            seen.add(p.order);
            return true;
          })
          .map((p) => p.url);

        return {
          user,
          profile,
          photos: photoUrls,
          analysis: limitedAnalyses[i],
        };
      })
    );

    // Filter nulls, sort by AI score descending
    return results
      .filter(Boolean)
      .sort((a, b) => (b!.analysis.overallScore) - (a!.analysis.overallScore));
  },
});

// Returns whether the first match set is still being generated.
export const getMatchGenerationStatusForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getAuthUserOptional(ctx);
    if (!currentUser) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .first();

    const auditCompleted = !!currentUser.profileAuditCompletedAt;
    const hasProfile = !!profile;

    const asUser1 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user1", (q) => q.eq("user1Id", currentUser._id))
      .take(1);
    const asUser2 = await ctx.db
      .query("compatibilityAnalyses")
      .withIndex("by_user2", (q) => q.eq("user2Id", currentUser._id))
      .take(1);
    const hasAnyAnalyses = asUser1.length > 0 || asUser2.length > 0;

    let hasEligibleCandidates = false;
    if (auditCompleted && hasProfile && !hasAnyAnalyses) {
      const users = await ctx.db.query("users").collect();
      for (const user of users) {
        if (user._id === currentUser._id) continue;
        if (!isGenderCompatible(currentUser, user)) continue;
        if (!isAgeCompatible(currentUser, user)) continue;

        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        if (!userProfile) continue;

        hasEligibleCandidates = true;
        break;
      }
    }

    return {
      isAnalyzing: auditCompleted && hasProfile && !hasAnyAnalyses && hasEligibleCandidates,
      auditCompleted,
      hasProfile,
      hasAnyAnalyses,
    };
  },
});
