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
    onboardingStep: v.optional(v.string()), // "basics", "photos"
    onboardingComplete: v.optional(v.boolean()),
    waitlistPosition: v.optional(v.number()),
    // Level system
    level: v.optional(v.number()), // 1-12
    completedCategories: v.optional(v.array(v.string())), // ["basic_traits", "core_values", ...]
    // Status & Referrals
    status: v.optional(v.string()), // "waitlist", "active", "inactive", "paid", etc.
    referralCode: v.optional(v.string()), // unique 6-char code to share
    referredBy: v.optional(v.id("users")), // who referred this user
    referralCount: v.optional(v.number()), // number of successful referrals
    waitlistEndsAt: v.optional(v.number()), // timestamp when 7-day wait ends
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_phone", ["phone"])
    .index("by_referral_code", ["referralCode"]),

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
    source: v.optional(v.union(v.literal("ai"), v.literal("manual"))), // Who provided this answer
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

    // Personality traits (1-10 scales derived from answers) - 11 dimensions
    traits: v.object({
      introversion: v.number(), // 1=extrovert, 10=introvert
      adventurousness: v.number(),
      ambition: v.number(),
      emotionalOpenness: v.number(),
      traditionalValues: v.number(),
      independenceNeed: v.number(),
      // New dimensions (Phase 1) - optional for backwards compatibility
      romanticStyle: v.optional(v.number()), // 1=practical, 10=romantic
      socialEnergy: v.optional(v.number()), // 1=homebody, 10=social butterfly
      communicationStyle: v.optional(v.number()), // 1=reserved, 10=expressive
      attachmentStyle: v.optional(v.number()), // 1=avoidant, 10=anxious
      planningStyle: v.optional(v.number()), // 1=spontaneous, 10=structured
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

    // Life story - narrative elements (Phase 2)
    lifeStory: v.optional(v.object({
      proudestAchievement: v.optional(v.string()),
      definingHardship: v.optional(v.string()),
      biggestRisk: v.optional(v.string()),
      dreams: v.array(v.string()),
      fears: v.array(v.string()),
      formativeExperiences: v.array(v.string()),
      favoriteStory: v.optional(v.string()),
    })),

    // Social profile (Phase 3)
    socialProfile: v.optional(v.object({
      socialStyle: v.string(), // "very active" | "balanced" | "introverted"
      weekendStyle: v.optional(v.string()),
      idealFridayNight: v.optional(v.string()),
      goOutFrequency: v.number(), // 1-10
      friendApprovalImportance: v.number(), // 1-10
      socialCircleVision: v.optional(v.string()),
    })),

    // Intimacy profile (Phase 4)
    intimacyProfile: v.optional(v.object({
      physicalIntimacyImportance: v.number(), // 1-10
      physicalAttractionImportance: v.number(), // 1-10
      pdaComfort: v.string(),
      emotionalIntimacyApproach: v.optional(v.string()),
      connectionTriggers: v.array(v.string()),
      healthyIntimacyVision: v.optional(v.string()),
    })),

    // Love philosophy (Phase 5)
    lovePhilosophy: v.optional(v.object({
      believesInSoulmates: v.boolean(),
      loveDefinition: v.optional(v.string()),
      loveRecognition: v.array(v.string()), // signs they're in love
      romanticGestures: v.array(v.string()),
      healthyRelationshipVision: v.optional(v.string()),
      bestAdviceReceived: v.optional(v.string()),
    })),

    // Partner preferences (Phase 6)
    partnerPreferences: v.optional(v.object({
      mustHaves: v.array(v.string()),
      niceToHaves: v.array(v.string()),
      redFlags: v.array(v.string()),
      importantQualities: v.array(v.string()),
      dealbreakersInPartner: v.array(v.string()),
    })),

    // Bio elements for AI descriptions (Phase 7)
    bioElements: v.optional(v.object({
      conversationStarters: v.array(v.string()),
      interestingFacts: v.array(v.string()),
      uniqueQuirks: v.array(v.string()),
      passions: v.array(v.string()),
      whatTheySek: v.optional(v.string()),
    })),

    // Demographics snapshot (Phase 8)
    demographics: v.optional(v.object({
      ethnicity: v.optional(v.string()),
      religion: v.optional(v.string()),
      religiosity: v.number(), // 1-10
      politicalLeaning: v.optional(v.string()),
      politicalIntensity: v.number(), // 1-10
      hasKids: v.boolean(),
    })),

    // Health snapshot (Phase 9)
    health: v.optional(v.object({
      physicalHealthRating: v.number(), // 1-10
      mentalHealthRating: v.number(), // 1-10
      healthNotes: v.optional(v.string()),
      smokingStatus: v.string(),
      drinkingFrequency: v.string(),
      drugUse: v.string(),
    })),

    // Generated bio (Phase 10)
    generatedBio: v.optional(v.string()),
    shortBio: v.optional(v.string()), // One-sentence bio for match cards

    // Keywords for search/display
    keywords: v.array(v.string()), // All extracted keywords combined

    // Processing metadata
    processedAt: v.number(),
    openaiModel: v.string(),
    confidence: v.number(), // 0-1 confidence score
  }).index("by_user", ["userId"]),
});
