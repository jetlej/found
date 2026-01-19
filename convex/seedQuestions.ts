import { mutation } from "./_generated/server";

// ~89 Questions for Found - organized by 6 categories
// Restructured with Hinge-style filters front-loaded and checklist type for partner preferences

export const QUESTIONS = [
  // ============================================
  // CATEGORY 1: The Basics (Questions 1-32)
  // Hinge-style filters + demographic compatibility + substances
  // ============================================
  
  // Relationship Goals
  {
    order: 1,
    text: "What are you looking for?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: [
      "Life partner",
      "Long-term relationship",
      "Figuring it out",
      "Something casual",
    ],
  },
  {
    order: 2,
    text: "What are you open to in a partner?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 1,
    options: [
      "Open to any",
      "Life partner",
      "Long-term relationship",
      "Figuring it out",
      "Something casual",
    ],
  },
  
  // Relationship Style
  {
    order: 3,
    text: "What's your relationship style?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: [
      "Monogamy",
      "Open to non-monogamy",
      "Non-monogamous",
      "Figuring it out",
    ],
  },
  {
    order: 4,
    text: "What are you open to in a partner?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 3,
    options: [
      "Open to any",
      "Monogamy",
      "Open to non-monogamy",
      "Non-monogamous",
      "Figuring it out",
    ],
  },
  
  // Children - Has
  {
    order: 5,
    text: "Do you have children?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: ["Yes", "No"],
  },
  {
    order: 6,
    text: "Are you open to partners with children?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 5,
    options: ["Open to any", "Yes", "No"],
  },
  
  // Children - Wants
  {
    order: 7,
    text: "Do you want children?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: [
      "Want children",
      "Don't want children",
      "Open to children",
      "Have children, want more",
      "Have children, don't want more",
    ],
  },
  {
    order: 8,
    text: "What are you open to in a partner?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 7,
    options: [
      "Open to any",
      "Want children",
      "Don't want children",
      "Open to children",
      "Have children, want more",
      "Have children, don't want more",
    ],
  },
  {
    order: 9,
    text: "What's your ideal timeline for kids?",
    type: "multiple_choice" as const,
    category: "The Basics",
    hasDealbreaker: true,
    options: [
      "ASAP",
      "1-2 years",
      "3-5 years",
      "5+ years",
      "Not sure",
      "N/A",
    ],
  },
  
  // Height
  {
    order: 10,
    text: "How tall are you?",
    type: "scale" as const,
    category: "The Basics",
    scaleMin: 48, // 4'0"
    scaleMax: 84, // 7'0"
    scaleMinLabel: "4'0\"",
    scaleMaxLabel: "7'0\"",
  },
  {
    order: 11,
    text: "What height range are you attracted to?",
    type: "text" as const, // Will be range slider in UI, stored as "60-72"
    category: "The Basics",
    hasDealbreaker: true,
  },
  
  // Location
  {
    order: 12,
    text: "Where do you live?",
    type: "text" as const, // Location auto-detect
    category: "The Basics",
  },
  {
    order: 13,
    text: "How far are you willing to travel for a match?",
    type: "multiple_choice" as const,
    category: "The Basics",
    hasDealbreaker: true,
    options: [
      "5 miles",
      "15 miles",
      "30 miles",
      "50 miles",
      "100+ miles",
      "Willing to relocate",
    ],
  },
  
  // Ethnicity
  {
    order: 14,
    text: "What's your ethnicity?",
    type: "multiple_choice" as const, // In UI will be multi-select
    category: "The Basics",
    options: [
      "Asian",
      "Black / African Descent",
      "Hispanic / Latino",
      "Middle Eastern",
      "Native American / Indigenous",
      "Pacific Islander",
      "South Asian",
      "White / Caucasian",
      "Mixed / Multiracial",
      "Other",
      "Prefer not to say",
    ],
  },
  {
    order: 15,
    text: "What ethnicities are you open to?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 14,
    options: [
      "Open to any",
      "Asian",
      "Black / African Descent",
      "Hispanic / Latino",
      "Middle Eastern",
      "Native American / Indigenous",
      "Pacific Islander",
      "South Asian",
      "White / Caucasian",
      "Mixed / Multiracial",
      "Other",
    ],
  },
  
  // Religion
  {
    order: 16,
    text: "What religion do you practice?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: [
      "Christian",
      "Catholic",
      "Jewish",
      "Muslim",
      "Hindu",
      "Buddhist",
      "Spiritual",
      "Agnostic",
      "Atheist",
      "Other",
      "None",
    ],
  },
  {
    order: 17,
    text: "What religions are you open to?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 16,
    options: [
      "Open to any",
      "Christian",
      "Catholic",
      "Jewish",
      "Muslim",
      "Hindu",
      "Buddhist",
      "Spiritual",
      "Agnostic",
      "Atheist",
      "Other",
      "None",
    ],
  },
  {
    order: 18,
    text: "How important is religion in your life?",
    type: "scale" as const,
    category: "The Basics",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not at all",
    scaleMaxLabel: "Central to my life",
  },
  
  // Politics
  {
    order: 19,
    text: "What's your political leaning?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: [
      "Very liberal",
      "Liberal",
      "Moderate",
      "Conservative",
      "Very conservative",
      "Libertarian",
      "Apolitical",
    ],
  },
  {
    order: 20,
    text: "What political views are you open to?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 19,
    options: [
      "Open to any",
      "Very liberal",
      "Liberal",
      "Moderate",
      "Conservative",
      "Very conservative",
      "Libertarian",
      "Apolitical",
    ],
  },
  {
    order: 21,
    text: "How important is politics in your life?",
    type: "scale" as const,
    category: "The Basics",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not at all",
    scaleMaxLabel: "It's my life",
  },
  
  // Education
  {
    order: 22,
    text: "What's your highest education level?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: [
      "High school",
      "Some college",
      "Bachelor's degree",
      "Master's degree",
      "Doctorate",
      "Trade school",
    ],
  },
  {
    order: 23,
    text: "What education levels are you open to?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 22,
    options: [
      "Open to any",
      "High school",
      "Some college",
      "Bachelor's degree",
      "Master's degree",
      "Doctorate",
      "Trade school",
    ],
  },
  {
    order: 24,
    text: "Anything else we should know to find your match?",
    type: "essay" as const,
    category: "The Basics",
  },
  
  // Substances
  {
    order: 25,
    text: "How often do you drink alcohol?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: ["Never", "Rarely", "Socially", "Regularly", "Daily"],
  },
  {
    order: 26,
    text: "What are you open to in a partner?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 25,
    options: ["Open to any", "Never", "Rarely", "Socially", "Regularly", "Daily"],
  },
  {
    order: 27,
    text: "Do you smoke cigarettes or vape?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: ["Never", "Socially", "Regularly", "Daily"],
  },
  {
    order: 28,
    text: "What are you open to in a partner?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 27,
    options: ["Open to any", "Never", "Socially", "Regularly", "Daily"],
  },
  {
    order: 29,
    text: "Do you use marijuana?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: ["Never", "Rarely", "Sometimes", "Regularly"],
  },
  {
    order: 30,
    text: "What are you open to in a partner?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 29,
    options: ["Open to any", "Never", "Rarely", "Sometimes", "Regularly"],
  },
  {
    order: 31,
    text: "Do you use other recreational drugs?",
    type: "multiple_choice" as const,
    category: "The Basics",
    options: ["Never", "Very rarely", "Occasionally", "Regularly"],
  },
  {
    order: 32,
    text: "What are you open to in a partner?",
    type: "checklist" as const,
    category: "The Basics",
    linkedQuestionOrder: 31,
    options: ["Open to any", "Never", "Very rarely", "Occasionally", "Regularly"],
  },

  // ============================================
  // CATEGORY 2: Who You Are (Questions 33-45)
  // Personality, values, openness
  // ============================================
  {
    order: 33,
    text: "How would you describe yourself socially?",
    type: "multiple_choice" as const,
    category: "Who You Are",
    options: [
      "Very introverted",
      "Introverted",
      "Ambivert",
      "Extroverted",
      "Very extroverted",
    ],
  },
  {
    order: 34,
    text: "How open are you to new experiences?",
    type: "scale" as const,
    category: "Who You Are",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Creature of habit",
    scaleMaxLabel: "Always seeking novelty",
  },
  {
    order: 35,
    text: "How do you handle change?",
    type: "multiple_choice" as const,
    category: "Who You Are",
    options: [
      "Love it",
      "Adapt well",
      "Need time to adjust",
      "Prefer stability",
    ],
  },
  {
    order: 36,
    text: "How would you describe your ambition?",
    type: "scale" as const,
    category: "Who You Are",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Content with simple life",
    scaleMaxLabel: "Highly driven",
  },
  {
    order: 37,
    text: "How emotionally expressive are you?",
    type: "scale" as const,
    category: "Who You Are",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very private",
    scaleMaxLabel: "Open book",
  },
  {
    order: 38,
    text: "How important is personal growth to you?",
    type: "scale" as const,
    category: "Who You Are",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not a focus",
    scaleMaxLabel: "Top priority",
  },
  {
    order: 39,
    text: "How would you describe your communication style?",
    type: "multiple_choice" as const,
    category: "Who You Are",
    options: [
      "Direct and blunt",
      "Diplomatic",
      "Passive",
      "Depends on context",
    ],
  },
  {
    order: 40,
    text: "How competitive are you?",
    type: "scale" as const,
    category: "Who You Are",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not competitive",
    scaleMaxLabel: "Very competitive",
  },
  {
    order: 41,
    text: "How spontaneous vs. planned are you?",
    type: "scale" as const,
    category: "Who You Are",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very spontaneous",
    scaleMaxLabel: "Very structured",
  },
  {
    order: 42,
    text: "How important is alone time to you?",
    type: "scale" as const,
    category: "Who You Are",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Rarely need it",
    scaleMaxLabel: "Essential daily",
  },
  {
    order: 43,
    text: "What's most important to you in life right now?",
    type: "multiple_choice" as const,
    category: "Who You Are",
    options: [
      "Career",
      "Relationships",
      "Family",
      "Personal growth",
      "Health",
      "Having fun",
      "Balance",
    ],
  },
  {
    order: 44,
    text: "What are your core values?",
    type: "essay" as const,
    category: "Who You Are",
  },
  {
    order: 45,
    text: "What's something you'd never compromise on?",
    type: "essay" as const,
    category: "Who You Are",
  },

  // ============================================
  // CATEGORY 3: Relationship Style (Questions 46-59)
  // Communication, attachment, expectations
  // ============================================
  {
    order: 46,
    text: "How do you prefer to handle conflict?",
    type: "multiple_choice" as const,
    category: "Relationship Style",
    options: [
      "Address it immediately",
      "Cool off first, then discuss",
      "Write out my thoughts",
      "Let small things go",
      "Avoid conflict when possible",
    ],
  },
  {
    order: 47,
    text: "What's your attachment style?",
    type: "multiple_choice" as const,
    category: "Relationship Style",
    options: [
      "Secure",
      "Anxious",
      "Avoidant",
      "Disorganized",
      "Not sure",
    ],
  },
  {
    order: 48,
    text: "How much together time do you need in a relationship?",
    type: "scale" as const,
    category: "Relationship Style",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Lots of independence",
    scaleMaxLabel: "Constant togetherness",
  },
  {
    order: 49,
    text: "What's your love language?",
    type: "multiple_choice" as const,
    category: "Relationship Style",
    options: [
      "Words of affirmation",
      "Quality time",
      "Physical touch",
      "Acts of service",
      "Receiving gifts",
    ],
  },
  {
    order: 50,
    text: "What's your texting style in a relationship?",
    type: "multiple_choice" as const,
    category: "Relationship Style",
    options: [
      "Constant communication",
      "Regular check-ins",
      "A few messages a day",
      "Minimal texting",
      "Prefer calls",
    ],
  },
  {
    order: 51,
    text: "How comfortable are you discussing difficult emotions?",
    type: "scale" as const,
    category: "Relationship Style",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very uncomfortable",
    scaleMaxLabel: "Very comfortable",
  },
  {
    order: 52,
    text: "How jealous do you tend to be?",
    type: "scale" as const,
    category: "Relationship Style",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not at all",
    scaleMaxLabel: "Very jealous",
  },
  {
    order: 53,
    text: "How important is physical intimacy to you?",
    type: "scale" as const,
    category: "Relationship Style",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Very important",
  },
  {
    order: 54,
    text: "How important is physical attraction to you?",
    type: "scale" as const,
    category: "Relationship Style",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Very important",
  },
  {
    order: 55,
    text: "How do you feel about PDA?",
    type: "multiple_choice" as const,
    category: "Relationship Style",
    options: [
      "Love it",
      "Fine with it",
      "Okay in moderation",
      "Prefer to keep it private",
    ],
  },
  {
    order: 56,
    text: "How do you handle finances in a relationship?",
    type: "multiple_choice" as const,
    category: "Relationship Style",
    hasDealbreaker: true,
    options: [
      "Fully shared",
      "Mostly shared",
      "Split 50/50",
      "Mostly separate",
      "Depends on the situation",
    ],
  },
  {
    order: 57,
    text: "How important is similar income/financial status?",
    type: "scale" as const,
    category: "Relationship Style",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Very important",
  },
  {
    order: 58,
    text: "What does a healthy relationship look like to you?",
    type: "essay" as const,
    category: "Relationship Style",
  },
  {
    order: 59,
    text: "What's your biggest relationship dealbreaker?",
    type: "essay" as const,
    category: "Relationship Style",
  },

  // ============================================
  // CATEGORY 4: Lifestyle (Questions 60-71)
  // Daily life, health, social patterns
  // ============================================
  {
    order: 60,
    text: "Are you a morning person or night owl?",
    type: "multiple_choice" as const,
    category: "Lifestyle",
    options: [
      "Early bird",
      "Morning-leaning",
      "Flexible",
      "Night-leaning",
      "Night owl",
    ],
  },
  {
    order: 61,
    text: "How often do you exercise?",
    type: "multiple_choice" as const,
    category: "Lifestyle",
    options: [
      "Never",
      "Monthly",
      "Weekly",
      "Several times a week",
      "Daily",
    ],
  },
  {
    order: 62,
    text: "How strict is your diet?",
    type: "scale" as const,
    category: "Lifestyle",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Eat anything",
    scaleMaxLabel: "Very strict",
  },
  {
    order: 63,
    text: "How would you rate your physical health?",
    type: "scale" as const,
    category: "Lifestyle",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Poor",
    scaleMaxLabel: "Excellent",
  },
  {
    order: 64,
    text: "How would you rate your mental health?",
    type: "scale" as const,
    category: "Lifestyle",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Struggling",
    scaleMaxLabel: "Thriving",
  },
  {
    order: 65,
    text: "Do you have pets?",
    type: "multiple_choice" as const,
    category: "Lifestyle",
    options: [
      "Yes, dogs",
      "Yes, cats",
      "Yes, other",
      "No, but want them",
      "No, don't want them",
    ],
  },
  {
    order: 66,
    text: "How do you feel about pets?",
    type: "multiple_choice" as const,
    category: "Lifestyle",
    options: [
      "Love them",
      "Like them",
      "Neutral",
      "Allergic",
      "Prefer none",
    ],
  },
  {
    order: 67,
    text: "How often do you go out vs. stay in?",
    type: "scale" as const,
    category: "Lifestyle",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Homebody",
    scaleMaxLabel: "Always out",
  },
  {
    order: 68,
    text: "How would you describe your social life?",
    type: "multiple_choice" as const,
    category: "Lifestyle",
    options: [
      "Very active",
      "Moderately active",
      "Balanced",
      "Quiet",
      "Mostly solo",
    ],
  },
  {
    order: 69,
    text: "How important is it that your partner gets along with your friends?",
    type: "scale" as const,
    category: "Lifestyle",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Essential",
  },
  {
    order: 70,
    text: "How do you typically spend weekends?",
    type: "essay" as const,
    category: "Lifestyle",
  },
  {
    order: 71,
    text: "Is there anything about your health or lifestyle a partner should know?",
    type: "essay" as const,
    category: "Lifestyle",
  },

  // ============================================
  // CATEGORY 5: Life & Future (Questions 72-81)
  // Goals, family, where you're headed
  // ============================================
  {
    order: 72,
    text: "How close are you with your family?",
    type: "scale" as const,
    category: "Life & Future",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not close",
    scaleMaxLabel: "Very close",
  },
  {
    order: 73,
    text: "How often do you see or talk to family?",
    type: "multiple_choice" as const,
    category: "Life & Future",
    options: [
      "Daily",
      "Weekly",
      "Monthly",
      "A few times a year",
      "Rarely",
    ],
  },
  {
    order: 74,
    text: "How important is it that your partner gets along with your family?",
    type: "scale" as const,
    category: "Life & Future",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Essential",
  },
  {
    order: 75,
    text: "Where do you see yourself settling down?",
    type: "multiple_choice" as const,
    category: "Life & Future",
    options: [
      "Big city",
      "Small city",
      "Suburb",
      "Small town",
      "Rural area",
      "Flexible",
    ],
  },
  {
    order: 76,
    text: "How flexible are you about where you live?",
    type: "scale" as const,
    category: "Life & Future",
    hasDealbreaker: true,
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not flexible",
    scaleMaxLabel: "Very flexible",
  },
  {
    order: 77,
    text: "What are your career ambitions?",
    type: "multiple_choice" as const,
    category: "Life & Future",
    options: [
      "Highly ambitious",
      "Moderately driven",
      "Content where I am",
      "Prioritizing other things",
    ],
  },
  {
    order: 78,
    text: "What's your ideal work-life balance?",
    type: "scale" as const,
    category: "Life & Future",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Work-focused",
    scaleMaxLabel: "Life-focused",
  },
  {
    order: 79,
    text: "Describe your relationship with your parents.",
    type: "essay" as const,
    category: "Life & Future",
  },
  {
    order: 80,
    text: "What kind of parent do you want to be?",
    type: "essay" as const,
    category: "Life & Future",
  },
  {
    order: 81,
    text: "What are your hopes and dreams?",
    type: "essay" as const,
    category: "Life & Future",
  },

  // ============================================
  // CATEGORY 6: The Deeper Stuff (Questions 82-89)
  // Philosophy, stories, what makes you you
  // ============================================
  {
    order: 82,
    text: "Do you believe in soulmates?",
    type: "multiple_choice" as const,
    category: "The Deeper Stuff",
    options: [
      "Yes, absolutely",
      "I think there are many compatible people",
      "Skeptical but open",
      "No, I don't",
    ],
  },
  {
    order: 83,
    text: "What does love mean to you?",
    type: "essay" as const,
    category: "The Deeper Stuff",
  },
  {
    order: 84,
    text: "What's the biggest risk you've ever taken?",
    type: "essay" as const,
    category: "The Deeper Stuff",
  },
  {
    order: 85,
    text: "What shaped who you are today?",
    type: "essay" as const,
    category: "The Deeper Stuff",
  },
  {
    order: 86,
    text: "What are your main hobbies?",
    type: "text" as const,
    category: "The Deeper Stuff",
  },
  {
    order: 87,
    text: "What's a quirk a partner should know about?",
    type: "text" as const,
    category: "The Deeper Stuff",
  },
  {
    order: 88,
    text: "Why are you on this app?",
    type: "essay" as const,
    category: "The Deeper Stuff",
  },
  {
    order: 89,
    text: "Anything else a match should know about you?",
    type: "essay" as const,
    category: "The Deeper Stuff",
  },
];

// Category order for UI display
export const CATEGORIES = [
  "The Basics",
  "Who You Are",
  "Relationship Style",
  "Lifestyle",
  "Life & Future",
  "The Deeper Stuff",
] as const;

// Seed mutation - call this to populate the questions table
export const seedQuestions = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing questions
    const existing = await ctx.db.query("questions").collect();
    for (const q of existing) {
      await ctx.db.delete(q._id);
    }

    // Insert all questions
    for (const question of QUESTIONS) {
      await ctx.db.insert("questions", question);
    }

    return { seeded: QUESTIONS.length };
  },
});
