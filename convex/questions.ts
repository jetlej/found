import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("questions")
      .withIndex("by_order")
      .collect();
  },
});

export const getByOrder = query({
  args: { order: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("questions")
      .withIndex("by_order", (q) => q.eq("order", args.order))
      .first();
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    return questions.length;
  },
});

// Seed questions - call this to populate the questions table
export const seed = mutation({
  args: {
    questions: v.array(
      v.object({
        order: v.number(),
        text: v.string(),
        type: v.union(
          v.literal("multiple_choice"),
          v.literal("text"),
          v.literal("essay"),
          v.literal("scale")
        ),
        options: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
        scaleMin: v.optional(v.number()),
        scaleMax: v.optional(v.number()),
        scaleMinLabel: v.optional(v.string()),
        scaleMaxLabel: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Clear existing questions
    const existing = await ctx.db.query("questions").collect();
    for (const q of existing) {
      await ctx.db.delete(q._id);
    }

    // Insert new questions
    for (const question of args.questions) {
      await ctx.db.insert("questions", question);
    }

    return args.questions.length;
  },
});
