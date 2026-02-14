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
    // Structured onboarding answers (collected before voice questions)
    relationshipGoal: v.optional(v.string()), // "marriage", "long_term", "life_partner", "figuring_out"
    hasChildren: v.optional(v.string()), // "yes", "no"
    wantsChildren: v.optional(v.string()), // "yes", "no", "open", "not_sure"
    religion: v.optional(v.string()), // "christian", "catholic", etc.
    religionImportance: v.optional(v.number()), // 1-10
    politicalLeaning: v.optional(v.string()), // "liberal", "moderate", "conservative", etc.
    politicalImportance: v.optional(v.number()), // 1-10
    drinking: v.optional(v.string()), // "Yes", "Sometimes", "No", "Prefer not to say"
    smoking: v.optional(v.string()), // "Yes", "Sometimes", "No", "Prefer not to say"
    marijuana: v.optional(v.string()), // "Yes", "Sometimes", "No", "Prefer not to say"
    drugs: v.optional(v.string()), // "Yes", "Sometimes", "No", "Prefer not to say"
    // Substance visibility
    drinkingVisible: v.optional(v.boolean()),
    smokingVisible: v.optional(v.boolean()),
    marijuanaVisible: v.optional(v.boolean()),
    drugsVisible: v.optional(v.boolean()),
    // Additional profile fields
    pronouns: v.optional(v.string()), // "he/him", "she/her", "they/them", etc.
    ethnicity: v.optional(v.string()),
    hometown: v.optional(v.string()),
    relationshipType: v.optional(v.string()), // "Monogamy", "Non-monogamy", etc.
    pets: v.optional(v.string()), // "Dog", "Cat", "Both", etc.
    // Onboarding state
    onboardingStep: v.optional(v.string()), // "basics", "photos"
    onboardingComplete: v.optional(v.boolean()),
    waitlistPosition: v.optional(v.number()),
    // Level system
    level: v.optional(v.number()), // 1-6
    completedCategories: v.optional(v.array(v.string())), // ["the_basics", "who_you_are", ...]
    // Status & Referrals
    status: v.optional(v.string()), // "waitlist", "active", "inactive", "paid", etc.
    referralCode: v.optional(v.string()), // unique 6-char code to share
    referredBy: v.optional(v.id("users")), // who referred this user
    referralCount: v.optional(v.number()), // number of successful referrals
    waitlistEndsAt: v.optional(v.number()), // timestamp when 7-day wait ends
    // A/B test: onboarding type
    onboardingType: v.optional(v.union(v.literal("journey"), v.literal("voice"))),
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

  // Voice recordings for voice-based onboarding experiment
  voiceRecordings: defineTable({
    userId: v.id("users"),
    questionIndex: v.number(), // 0-9 for the 10 voice questions
    storageId: v.id("_storage"),
    durationSeconds: v.number(),
    transcription: v.optional(v.string()), // Populated after AI transcription
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_question", ["userId", "questionIndex"]),

  questions: defineTable({
    order: v.number(), // 1-91, determines display sequence
    questionKey: v.optional(v.string()), // Stable identifier (e.g., "relationship_goals_self")
    text: v.string(),
    type: v.union(
      v.literal("multiple_choice"),
      v.literal("text"),
      v.literal("essay"),
      v.literal("scale"),
      v.literal("range"), // Double-ended slider for min/max values
      v.literal("checklist"), // Multi-select with "Open to any" option
      v.literal("interest_picker") // Interest selection from library
    ),
    options: v.optional(v.array(v.string())), // For multiple_choice and checklist
    category: v.optional(v.string()), // e.g., "The Basics", "Who You Are"
    scaleMin: v.optional(v.number()), // For scale type, default 1
    scaleMax: v.optional(v.number()), // For scale type, default 10
    scaleMinLabel: v.optional(v.string()), // e.g., "Not at all"
    scaleMaxLabel: v.optional(v.string()), // e.g., "Extremely"
    // For checklist type: links to the source question by key
    linkedQuestionKey: v.optional(v.string()), // e.g., "relationship_goals_self"
    linkedQuestionOrder: v.optional(v.number()), // DEPRECATED: kept for migration, use linkedQuestionKey
    // Whether this question can have a dealbreaker toggle (non-checklist questions)
    hasDealbreaker: v.optional(v.boolean()),
  }).index("by_order", ["order"])
    .index("by_key", ["questionKey"]),

  answers: defineTable({
    userId: v.id("users"),
    questionId: v.id("questions"),
    value: v.string(), // JSON string for complex answers (checklist = JSON array), plain string for simple
    source: v.optional(v.union(v.literal("ai"), v.literal("manual"))), // Who provided this answer
    isDealbreaker: v.optional(v.boolean()), // Whether user marked this preference as a dealbreaker
  })
    .index("by_user", ["userId"])
    .index("by_user_question", ["userId", "questionId"]),

  // Structured profile data extracted from answers via AI
  userProfiles: defineTable({
    userId: v.id("users"),

    // User-selected interests from picker (IDs from interest library)
    selectedInterests: v.optional(v.array(v.string())),

    // Canonical values (AI-extracted from essays, matched to ~30 item library)
    canonicalValues: v.optional(v.array(v.string())),

    // Structured preferences from checklist questions (The Basics)
    preferences: v.optional(v.object({
      relationshipGoals: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      relationshipStyle: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      hasChildren: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      wantsChildren: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      ethnicity: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      religion: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      politics: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      education: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      alcohol: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      smoking: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      marijuana: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
      drugs: v.optional(v.object({
        self: v.string(),
        openTo: v.array(v.string()),
        isDealbreaker: v.boolean(),
      })),
    })),

    // Raw AI extractions (kept for display, NOT used for matching)
    values: v.array(v.string()), // Raw values from essays
    interests: v.array(v.string()), // Raw interests from essays (legacy)
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
      loveLanguage: v.string(), // from Q49
      conflictStyle: v.string(), // from Q46
      communicationFrequency: v.string(), // from Q50
      financialApproach: v.string(), // from Q56
      aloneTimeNeed: v.number(), // from Q48
    }),

    // Family & Future
    familyPlans: v.object({
      wantsKids: v.string(), // "yes", "no", "maybe", "already has"
      kidsTimeline: v.optional(v.string()),
      familyCloseness: v.number(), // from Q72
      parentingStyle: v.optional(v.string()),
    }),

    // Lifestyle compatibility factors
    lifestyle: v.object({
      sleepSchedule: v.string(), // from Q60
      exerciseLevel: v.string(), // from Q61
      dietType: v.optional(v.string()), // extracted from Q62
      alcoholUse: v.string(), // from Q25
      drugUse: v.string(), // from Q31
      petPreference: v.string(), // extracted from Q65-66
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

  // AI-generated compatibility analyses (secondary score)
  compatibilityAnalyses: defineTable({
    userIdPair: v.string(), // sorted "id1_id2" for dedup
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    // AI-generated content
    summary: v.string(),
    greenFlags: v.array(v.string()),
    yellowFlags: v.array(v.string()),
    redFlags: v.array(v.string()),
    // 10 scored categories (0-10 each, summed for overall score)
    categoryScores: v.object({
      coreValues: v.number(),
      lifestyleAlignment: v.number(),
      relationshipGoals: v.number(),
      communicationStyle: v.number(),
      emotionalCompatibility: v.number(),
      familyPlanning: v.number(),
      socialLifestyle: v.number(),
      conflictResolution: v.number(),
      intimacyAlignment: v.number(),
      growthMindset: v.number(),
    }),
    overallScore: v.number(),
    // Metadata
    generatedAt: v.number(),
    openaiModel: v.string(),
  })
    .index("by_pair", ["userIdPair"])
    .index("by_user1", ["user1Id"])
    .index("by_user2", ["user2Id"]),

  config: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
