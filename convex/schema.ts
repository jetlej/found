import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    phone: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    pushToken: v.optional(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
    reminderHour: v.optional(v.number()),
    reminderMinute: v.optional(v.number()),
    // Profile basics
    gender: v.optional(v.string()),
    location: v.optional(v.string()),
    sexuality: v.optional(v.string()),
    birthdate: v.optional(v.string()), // ISO date string
    heightInches: v.optional(v.number()),
    // Onboarding state
    onboardingComplete: v.optional(v.boolean()),
    waitlistPosition: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_phone", ["phone"]),

  photos: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    url: v.string(),
    order: v.number(), // 0-5, determines display order
  }).index("by_user", ["userId"]),

  questions: defineTable({
    order: v.number(), // 1-100
    text: v.string(),
    type: v.union(
      v.literal("multiple_choice"),
      v.literal("text"),
      v.literal("essay"),
      v.literal("scale")
    ),
    options: v.optional(v.array(v.string())), // For multiple_choice
    category: v.optional(v.string()), // e.g., "values", "lifestyle", "relationships"
    scaleMin: v.optional(v.number()), // For scale type, default 1
    scaleMax: v.optional(v.number()), // For scale type, default 10
    scaleMinLabel: v.optional(v.string()), // e.g., "Not at all"
    scaleMaxLabel: v.optional(v.string()), // e.g., "Extremely"
  }).index("by_order", ["order"]),

  answers: defineTable({
    userId: v.id("users"),
    questionId: v.id("questions"),
    value: v.string(), // JSON string for complex answers, plain string for simple
  })
    .index("by_user", ["userId"])
    .index("by_user_question", ["userId", "questionId"]),
});
