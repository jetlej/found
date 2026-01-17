import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: {
    userId: v.id("users"),
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("answers")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", args.userId).eq("questionId", args.questionId)
      )
      .first();
  },
});

export const countByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return answers.length;
  },
});

export const upsert = mutation({
  args: {
    userId: v.id("users"),
    questionId: v.id("questions"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("answers")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", args.userId).eq("questionId", args.questionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
      return existing._id;
    }

    return await ctx.db.insert("answers", {
      userId: args.userId,
      questionId: args.questionId,
      value: args.value,
    });
  },
});

export const remove = mutation({
  args: { answerId: v.id("answers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.answerId);
  },
});
