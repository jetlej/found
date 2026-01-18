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

  // Structured profile data extracted from answers via AI
  userProfiles: defineTable({
    userId: v.id("users"),

    // Extracted from essays - stored as structured data
    values: v.array(v.string()), // ["honesty", "family", "growth", "adventure"]
    interests: v.array(v.string()), // ["hiking", "cooking", "reading", "travel"]
    dealbreakers: v.array(v.string()), // ["smoking", "no kids", "long distance"]

    // Personality traits (1-10 scales derived from answers)
    traits: v.object({
      introversion: v.number(), // 1=extrovert, 10=introvert
      adventurousness: v.number(),
      ambition: v.number(),
      emotionalOpenness: v.number(),
      traditionalValues: v.number(),
      independenceNeed: v.number(),
    }),

    // Relationship style
    relationshipStyle: v.object({
      loveLanguage: v.string(), // from Q64
      conflictStyle: v.string(), // from Q53
      communicationFrequency: v.string(), // from Q57
      financialApproach: v.string(), // from Q67
      aloneTimeNeed: v.number(), // from Q63
    }),

    // Family & Future
    familyPlans: v.object({
      wantsKids: v.string(), // "yes", "no", "maybe", "already has"
      kidsTimeline: v.optional(v.string()),
      familyCloseness: v.number(), // from Q71
      parentingStyle: v.optional(v.string()),
    }),

    // Lifestyle compatibility factors
    lifestyle: v.object({
      sleepSchedule: v.string(), // from Q32
      exerciseLevel: v.string(), // from Q24
      dietType: v.optional(v.string()), // extracted from Q28
      alcoholUse: v.string(), // from Q29
      drugUse: v.string(), // from Q31
      petPreference: v.string(), // extracted from Q23
      locationPreference: v.string(), // "city", "suburb", "rural", "flexible"
    }),

    // Keywords for search/display
    keywords: v.array(v.string()), // All extracted keywords combined

    // Processing metadata
    processedAt: v.number(),
    openaiModel: v.string(),
    confidence: v.number(), // 0-1 confidence score
  }).index("by_user", ["userId"]),
});
