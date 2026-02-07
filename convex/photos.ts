import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    // Check if photo at this order already exists
    const existing = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("order"), args.order))
      .first();

    if (existing) {
      // Replace existing photo
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        url,
      });
      return existing._id;
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
