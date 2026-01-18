import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

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
    source: v.optional(v.union(v.literal("ai"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("answers")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", args.userId).eq("questionId", args.questionId)
      )
      .first();

    if (existing) {
      // When updating, also update source if provided (manual edit of AI answer)
      const updates: { value: string; source?: "ai" | "manual" } = { value: args.value };
      if (args.source) {
        updates.source = args.source;
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("answers", {
      userId: args.userId,
      questionId: args.questionId,
      value: args.value,
      source: args.source ?? "manual",
    });
  },
});

export const remove = mutation({
  args: { answerId: v.id("answers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.answerId);
  },
});

export const clearAiAnswers = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Delete all AI-sourced answers
    for (const answer of answers) {
      if (answer.source === "ai") {
        await ctx.db.delete(answer._id);
      }
    }
  },
});

// Internal query to get answers with question details (for AI parsing)
export const getAnswersWithQuestions = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get all questions
    const questions = await ctx.db.query("questions").collect();
    const questionMap = new Map(questions.map((q) => [q._id, q]));

    // Join answers with questions
    return answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      return {
        answerId: answer._id,
        questionId: answer.questionId,
        value: answer.value,
        questionText: question?.text || "",
        questionType: question?.type || "text",
        questionOrder: question?.order || 0,
        questionCategory: question?.category || "",
      };
    });
  },
});
