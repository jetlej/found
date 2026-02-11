import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const countByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return photos.length;
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Failed to get storage URL");

    // Find ALL existing photos at this order (handles duplicates from concurrent uploads)
    const existing = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("order"), args.order))
      .collect();

    if (existing.length > 0) {
      // Patch the first one, delete any extras
      await ctx.db.patch(existing[0]._id, { storageId: args.storageId, url });
      for (let i = 1; i < existing.length; i++) {
        await ctx.db.delete(existing[i]._id);
      }
      return existing[0]._id;
    }

    return await ctx.db.insert("photos", {
      userId: args.userId,
      storageId: args.storageId,
      url,
      order: args.order,
    });
  },
});

export const remove = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.photoId);
  },
});

export const reorder = mutation({
  args: {
    userId: v.id("users"),
    orders: v.array(v.object({ photoId: v.id("photos"), order: v.number() })),
  },
  handler: async (ctx, args) => {
    for (const { photoId, order } of args.orders) {
      await ctx.db.patch(photoId, { order });
    }
  },
});

// Get all photos (for batch loading on matches screen)
export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("photos").collect();
  },
});

// Internal mutation for seeding photos from actions (bypasses auth)
export const addDirect = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Failed to get storage URL");

    const existing = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("order"), args.order))
      .collect();

    if (existing.length > 0) {
      await ctx.db.patch(existing[0]._id, { storageId: args.storageId, url });
      for (let i = 1; i < existing.length; i++) {
        await ctx.db.delete(existing[i]._id);
      }
      return existing[0]._id;
    }

    return await ctx.db.insert("photos", {
      userId: args.userId,
      storageId: args.storageId,
      url,
      order: args.order,
    });
  },
});

// Remove duplicate photos per user (keeps earliest record per order slot)
export const deduplicateByUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const seen = new Map<number, string>();
    let removed = 0;
    for (const photo of photos) {
      if (seen.has(photo.order)) {
        await ctx.db.delete(photo._id);
        removed++;
      } else {
        seen.set(photo.order, photo._id);
      }
    }
    return { kept: seen.size, removed };
  },
});
