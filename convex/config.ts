import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/admin";

export const getMinBuildNumber = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "minBuildNumber"))
      .unique();
    return config?.value ? parseInt(config.value, 10) : null;
  },
});

export const setMinBuildNumber = mutation({
  args: { build: v.number(), adminSecret: v.optional(v.string()) },
  handler: async (ctx, { build, adminSecret }) => {
    await requireAdmin(ctx, adminSecret);

    const existing = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "minBuildNumber"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: String(build) });
    } else {
      await ctx.db.insert("config", {
        key: "minBuildNumber",
        value: String(build),
      });
    }
  },
});
