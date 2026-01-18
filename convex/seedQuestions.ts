import { mutation } from "./_generated/server";

// 100 Questions for Mila - organized by category
// Based on Keeper quiz structure with additions for undocumented categories

export const QUESTIONS = [
  // ============================================
  // CATEGORY 1: Basic Traits (Questions 1-12)
  // ============================================
  {
    order: 1,
    text: "How committed are you to finding your life partner right now?",
    type: "multiple_choice" as const,
    category: "Basic Traits",
    options: [
      "My top priority",
      "Ready to settle down",
      "Actively looking",
      "Open to the right person",
      "Not a priority",
    ],
  },
  {
    order: 2,
    text: "What is your ethnic background?",
    type: "multiple_choice" as const,
    category: "Basic Traits",
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
    order: 3,
    text: "What do you do for work?",
    type: "text" as const,
    category: "Basic Traits",
  },
  {
    order: 4,
    text: "What are your career ambitions?",
    type: "essay" as const,
    category: "Basic Traits",
  },
  {
    order: 5,
    text: "How many children do you currently have?",
    type: "scale" as const,
    category: "Basic Traits",
    scaleMin: 0,
    scaleMax: 6,
    scaleMinLabel: "None",
    scaleMaxLabel: "6+",
  },
  {
    order: 6,
    text: "How many total kids would you like to have?",
    type: "scale" as const,
    category: "Basic Traits",
    scaleMin: 0,
    scaleMax: 6,
    scaleMinLabel: "None",
    scaleMaxLabel: "6+",
  },
  {
    order: 7,
    text: "Are you open to matches who already have children?",
    type: "multiple_choice" as const,
    category: "Basic Traits",
    options: ["Yes", "No", "Depends on the situation"],
  },
  {
    order: 8,
    text: "How much do you care about politics?",
    type: "scale" as const,
    category: "Basic Traits",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not at all",
    scaleMaxLabel: "It's my life",
  },
  {
    order: 9,
    text: "Which label best describes your politics?",
    type: "multiple_choice" as const,
    category: "Basic Traits",
    options: ["Very liberal", "Liberal", "Moderate", "Conservative", "Very conservative", "Libertarian", "Apolitical"],
  },
  {
    order: 10,
    text: "How religious are you?",
    type: "scale" as const,
    category: "Basic Traits",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not at all",
    scaleMaxLabel: "Devout",
  },
  {
    order: 11,
    text: "What religion do you identify with, if any?",
    type: "text" as const,
    category: "Basic Traits",
  },
  {
    order: 12,
    text: "What sets you apart? What must we know to find your perfect match?",
    type: "essay" as const,
    category: "Basic Traits",
  },

  // ============================================
  // CATEGORY 2: Core Values (Questions 13-20)
  // ============================================
  {
    order: 13,
    text: "What are your core values?",
    type: "essay" as const,
    category: "Core Values",
  },
  {
    order: 14,
    text: "How significantly have your personal values changed since you were sixteen?",
    type: "multiple_choice" as const,
    category: "Core Values",
    options: [
      "They're completely different",
      "They've changed very substantially",
      "They've changed a lot",
      "They've changed somewhat",
      "They've changed slightly",
      "They haven't changed at all",
    ],
  },
  {
    order: 15,
    text: "What's changed about your values and what hasn't?",
    type: "essay" as const,
    category: "Core Values",
  },
  {
    order: 16,
    text: "What is the one accomplishment you are most proud of?",
    type: "essay" as const,
    category: "Core Values",
  },
  {
    order: 17,
    text: "How are you actively working to improve yourself?",
    type: "essay" as const,
    category: "Core Values",
  },
  {
    order: 18,
    text: "What does integrity mean to you?",
    type: "essay" as const,
    category: "Core Values",
  },
  {
    order: 19,
    text: "What would you never compromise on?",
    type: "essay" as const,
    category: "Core Values",
  },
  {
    order: 20,
    text: "How important is honesty to you, even when it's uncomfortable?",
    type: "scale" as const,
    category: "Core Values",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Prefer kindness",
    scaleMaxLabel: "Always honest",
  },

  // ============================================
  // CATEGORY 3: Lifestyle & Health (Questions 21-35)
  // ============================================
  {
    order: 21,
    text: "How many cats do you own?",
    type: "scale" as const,
    category: "Lifestyle & Health",
    scaleMin: 0,
    scaleMax: 5,
    scaleMinLabel: "None",
    scaleMaxLabel: "5+",
  },
  {
    order: 22,
    text: "How many dogs do you own?",
    type: "scale" as const,
    category: "Lifestyle & Health",
    scaleMin: 0,
    scaleMax: 5,
    scaleMinLabel: "None",
    scaleMaxLabel: "5+",
  },
  {
    order: 23,
    text: "What are your general feelings about pets?",
    type: "essay" as const,
    category: "Lifestyle & Health",
  },
  {
    order: 24,
    text: "How often do you exercise?",
    type: "multiple_choice" as const,
    category: "Lifestyle & Health",
    options: [
      "Never",
      "A few times per year",
      "1-3 times per month",
      "1-2 times per week",
      "3-4 times per week",
      "5-6 times per week",
      "Daily or more",
    ],
  },
  {
    order: 25,
    text: "What's your exercise routine like?",
    type: "essay" as const,
    category: "Lifestyle & Health",
  },
  {
    order: 26,
    text: "How many times per week do you home cook a meal?",
    type: "scale" as const,
    category: "Lifestyle & Health",
    scaleMin: 0,
    scaleMax: 14,
    scaleMinLabel: "Never",
    scaleMaxLabel: "14+",
  },
  {
    order: 27,
    text: "How strict is your diet?",
    type: "scale" as const,
    category: "Lifestyle & Health",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not at all",
    scaleMaxLabel: "Very strict",
  },
  {
    order: 28,
    text: "What's your diet like?",
    type: "essay" as const,
    category: "Lifestyle & Health",
  },
  {
    order: 29,
    text: "How often do you drink alcohol?",
    type: "multiple_choice" as const,
    category: "Lifestyle & Health",
    options: [
      "Never",
      "Less than once a month",
      "1-3 times per month",
      "1-2 times per week",
      "3-4 times per week",
      "5-6 times per week",
      "Daily",
    ],
  },
  {
    order: 30,
    text: "Do you use nicotine products?",
    type: "multiple_choice" as const,
    category: "Lifestyle & Health",
    options: ["Never", "Rarely", "Occasionally", "Regularly", "Daily"],
  },
  {
    order: 31,
    text: "Do you use any recreational drugs?",
    type: "multiple_choice" as const,
    category: "Lifestyle & Health",
    options: ["Never", "Very rarely", "Occasionally", "Regularly"],
  },
  {
    order: 32,
    text: "What are your sleeping habits like?",
    type: "multiple_choice" as const,
    category: "Lifestyle & Health",
    options: [
      "I'm a consistent early-riser",
      "I tend to prefer mornings",
      "Inconsistent/A mix of both",
      "I tend to prefer nights",
      "I'm a consistent night owl",
    ],
  },
  {
    order: 33,
    text: "How would you rate your overall physical health?",
    type: "scale" as const,
    category: "Lifestyle & Health",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very poor",
    scaleMaxLabel: "Amazing",
  },
  {
    order: 34,
    text: "How would you rate your overall mental health?",
    type: "scale" as const,
    category: "Lifestyle & Health",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very poor",
    scaleMaxLabel: "Amazing",
  },
  {
    order: 35,
    text: "Is there anything about your health you'd like to share?",
    type: "essay" as const,
    category: "Lifestyle & Health",
  },

  // ============================================
  // CATEGORY 4: Your Life Story (Questions 36-45)
  // ============================================
  {
    order: 36,
    text: "How do you feel about settling down in a big city?",
    type: "scale" as const,
    category: "Your Life Story",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very unappealing",
    scaleMaxLabel: "Very appealing",
  },
  {
    order: 37,
    text: "How do you feel about settling down in a suburb?",
    type: "scale" as const,
    category: "Your Life Story",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very unappealing",
    scaleMaxLabel: "Very appealing",
  },
  {
    order: 38,
    text: "How do you feel about settling down somewhere rural?",
    type: "scale" as const,
    category: "Your Life Story",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very unappealing",
    scaleMaxLabel: "Very appealing",
  },
  {
    order: 39,
    text: "Where do you see yourself settling down?",
    type: "essay" as const,
    category: "Your Life Story",
  },
  {
    order: 40,
    text: "Describe your hopes and dreams for the future.",
    type: "essay" as const,
    category: "Your Life Story",
  },
  {
    order: 41,
    text: "Describe your fears and anxieties about the future.",
    type: "essay" as const,
    category: "Your Life Story",
  },
  {
    order: 42,
    text: "What is your favorite story from your life to tell new people?",
    type: "essay" as const,
    category: "Your Life Story",
  },
  {
    order: 43,
    text: "Describe a hardship you've experienced and overcome.",
    type: "essay" as const,
    category: "Your Life Story",
  },
  {
    order: 44,
    text: "What's the biggest risk you've ever taken?",
    type: "essay" as const,
    category: "Your Life Story",
  },
  {
    order: 45,
    text: "What shaped who you are today?",
    type: "essay" as const,
    category: "Your Life Story",
  },

  // ============================================
  // CATEGORY 5: Social Life (Questions 46-52)
  // ============================================
  {
    order: 46,
    text: "How would you describe your social life?",
    type: "multiple_choice" as const,
    category: "Social Life",
    options: [
      "Very active - I'm always out with friends",
      "Moderately active - I socialize regularly",
      "Balanced - Mix of social time and alone time",
      "Quieter - I prefer smaller gatherings",
      "Mostly introverted - I value my alone time",
    ],
  },
  {
    order: 47,
    text: "How important is it that your partner gets along with your friends?",
    type: "scale" as const,
    category: "Social Life",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Essential",
  },
  {
    order: 48,
    text: "How do you typically spend your weekends?",
    type: "essay" as const,
    category: "Social Life",
  },
  {
    order: 49,
    text: "What's your ideal Friday night?",
    type: "essay" as const,
    category: "Social Life",
  },
  {
    order: 50,
    text: "How do you feel about your partner having close friends of the opposite sex?",
    type: "essay" as const,
    category: "Social Life",
  },
  {
    order: 51,
    text: "How often do you like to go out vs. stay in?",
    type: "scale" as const,
    category: "Social Life",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Always stay in",
    scaleMaxLabel: "Always go out",
  },
  {
    order: 52,
    text: "What does your ideal social circle look like?",
    type: "essay" as const,
    category: "Social Life",
  },

  // ============================================
  // CATEGORY 6: Communication Style (Questions 53-60)
  // ============================================
  {
    order: 53,
    text: "How do you prefer to handle conflict in a relationship?",
    type: "multiple_choice" as const,
    category: "Communication Style",
    options: [
      "Address it immediately and directly",
      "Take some time to cool off, then discuss",
      "Write out my thoughts first",
      "Prefer to let small things go",
      "Need a mediator or third party",
    ],
  },
  {
    order: 54,
    text: "How do you express affection?",
    type: "essay" as const,
    category: "Communication Style",
  },
  {
    order: 55,
    text: "How do you prefer to receive affection?",
    type: "essay" as const,
    category: "Communication Style",
  },
  {
    order: 56,
    text: "How comfortable are you discussing difficult emotions?",
    type: "scale" as const,
    category: "Communication Style",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very uncomfortable",
    scaleMaxLabel: "Very comfortable",
  },
  {
    order: 57,
    text: "What's your texting style in a relationship?",
    type: "multiple_choice" as const,
    category: "Communication Style",
    options: [
      "Constant communication throughout the day",
      "Regular check-ins a few times a day",
      "A few meaningful messages",
      "Prefer calls over texting",
      "Minimal texting - save it for in person",
    ],
  },
  {
    order: 58,
    text: "How do you apologize when you've done something wrong?",
    type: "essay" as const,
    category: "Communication Style",
  },
  {
    order: 59,
    text: "What makes you feel heard and understood?",
    type: "essay" as const,
    category: "Communication Style",
  },
  {
    order: 60,
    text: "How do you handle disagreements about important decisions?",
    type: "essay" as const,
    category: "Communication Style",
  },

  // ============================================
  // CATEGORY 7: Relationship Expectations (Questions 61-70)
  // ============================================
  {
    order: 61,
    text: "What are you ultimately looking for?",
    type: "multiple_choice" as const,
    category: "Relationship Expectations",
    options: [
      "Marriage",
      "Long-term partnership",
      "Serious relationship, open to marriage",
      "Taking it slow, seeing where it goes",
    ],
  },
  {
    order: 62,
    text: "What does your ideal relationship look like day-to-day?",
    type: "essay" as const,
    category: "Relationship Expectations",
  },
  {
    order: 63,
    text: "How much alone time do you need in a relationship?",
    type: "scale" as const,
    category: "Relationship Expectations",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Very little",
    scaleMaxLabel: "A lot",
  },
  {
    order: 64,
    text: "What's your love language?",
    type: "multiple_choice" as const,
    category: "Relationship Expectations",
    options: [
      "Words of affirmation",
      "Quality time",
      "Physical touch",
      "Acts of service",
      "Receiving gifts",
    ],
  },
  {
    order: 65,
    text: "What's a dealbreaker for you in a relationship?",
    type: "essay" as const,
    category: "Relationship Expectations",
  },
  {
    order: 66,
    text: "What's the most important lesson you've learned from past relationships?",
    type: "essay" as const,
    category: "Relationship Expectations",
  },
  {
    order: 67,
    text: "How do you handle finances in a relationship?",
    type: "multiple_choice" as const,
    category: "Relationship Expectations",
    options: [
      "Completely shared",
      "Mostly shared with some separate",
      "Split 50/50",
      "Mostly separate",
      "Depends on the situation",
    ],
  },
  {
    order: 68,
    text: "What do you need to feel secure in a relationship?",
    type: "essay" as const,
    category: "Relationship Expectations",
  },
  {
    order: 69,
    text: "How do you handle jealousy?",
    type: "essay" as const,
    category: "Relationship Expectations",
  },
  {
    order: 70,
    text: "What does commitment mean to you?",
    type: "essay" as const,
    category: "Relationship Expectations",
  },

  // ============================================
  // CATEGORY 8: Family & Kids (Questions 71-78)
  // ============================================
  {
    order: 71,
    text: "How close are you with your family?",
    type: "scale" as const,
    category: "Family & Kids",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not close",
    scaleMaxLabel: "Very close",
  },
  {
    order: 72,
    text: "Describe your relationship with your parents.",
    type: "essay" as const,
    category: "Family & Kids",
  },
  {
    order: 73,
    text: "How often do you see or talk to your family?",
    type: "multiple_choice" as const,
    category: "Family & Kids",
    options: ["Daily", "Weekly", "Monthly", "A few times a year", "Rarely"],
  },
  {
    order: 74,
    text: "How important is it that your partner gets along with your family?",
    type: "scale" as const,
    category: "Family & Kids",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Essential",
  },
  {
    order: 75,
    text: "What traditions from your family would you want to continue?",
    type: "essay" as const,
    category: "Family & Kids",
  },
  {
    order: 76,
    text: "If you want kids, what's your ideal timeline?",
    type: "essay" as const,
    category: "Family & Kids",
  },
  {
    order: 77,
    text: "What kind of parent do you want to be?",
    type: "essay" as const,
    category: "Family & Kids",
  },
  {
    order: 78,
    text: "How would you want to raise children differently from how you were raised?",
    type: "essay" as const,
    category: "Family & Kids",
  },

  // ============================================
  // CATEGORY 9: Intimacy (Questions 79-84)
  // ============================================
  {
    order: 79,
    text: "How important is physical intimacy to you in a relationship?",
    type: "scale" as const,
    category: "Intimacy",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Very important",
  },
  {
    order: 80,
    text: "How important is physical attraction to you?",
    type: "scale" as const,
    category: "Intimacy",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Very important",
  },
  {
    order: 81,
    text: "What does a healthy intimate relationship look like to you?",
    type: "essay" as const,
    category: "Intimacy",
  },
  {
    order: 82,
    text: "How do you feel about public displays of affection?",
    type: "multiple_choice" as const,
    category: "Intimacy",
    options: [
      "Love them",
      "Comfortable with them",
      "Okay in moderation",
      "Prefer to keep it private",
      "Not comfortable with them",
    ],
  },
  {
    order: 83,
    text: "How do you build emotional intimacy?",
    type: "essay" as const,
    category: "Intimacy",
  },
  {
    order: 84,
    text: "What makes you feel most connected to a partner?",
    type: "essay" as const,
    category: "Intimacy",
  },

  // ============================================
  // CATEGORY 10: Love Philosophy (Questions 85-90)
  // ============================================
  {
    order: 85,
    text: "Do you believe in soulmates?",
    type: "multiple_choice" as const,
    category: "Love Philosophy",
    options: [
      "Yes, absolutely",
      "I think there are many compatible people",
      "I'm skeptical but open",
      "No, I don't believe in soulmates",
    ],
  },
  {
    order: 86,
    text: "What does love mean to you?",
    type: "essay" as const,
    category: "Love Philosophy",
  },
  {
    order: 87,
    text: "How do you know when you're in love?",
    type: "essay" as const,
    category: "Love Philosophy",
  },
  {
    order: 88,
    text: "What's the best relationship advice you've ever received?",
    type: "essay" as const,
    category: "Love Philosophy",
  },
  {
    order: 89,
    text: "What's the most romantic thing someone could do for you?",
    type: "essay" as const,
    category: "Love Philosophy",
  },
  {
    order: 90,
    text: "What does a healthy relationship look like to you?",
    type: "essay" as const,
    category: "Love Philosophy",
  },

  // ============================================
  // CATEGORY 11: Leisure & Quirks (Questions 91-95)
  // ============================================
  {
    order: 91,
    text: "What are your main hobbies?",
    type: "essay" as const,
    category: "Leisure & Quirks",
  },
  {
    order: 92,
    text: "What kind of music do you enjoy?",
    type: "text" as const,
    category: "Leisure & Quirks",
  },
  {
    order: 93,
    text: "What are your favorite movies or TV shows?",
    type: "text" as const,
    category: "Leisure & Quirks",
  },
  {
    order: 94,
    text: "What's a quirk or habit you have that a partner should know about?",
    type: "essay" as const,
    category: "Leisure & Quirks",
  },
  {
    order: 95,
    text: "How important is it to share hobbies with your partner?",
    type: "scale" as const,
    category: "Leisure & Quirks",
    scaleMin: 1,
    scaleMax: 10,
    scaleMinLabel: "Not important",
    scaleMaxLabel: "Very important",
  },

  // ============================================
  // CATEGORY 12: Final Thoughts (Questions 96-100)
  // ============================================
  {
    order: 96,
    text: "What's non-negotiable for you in a partner?",
    type: "essay" as const,
    category: "Final Thoughts",
  },
  {
    order: 97,
    text: "What are you most excited to share with a partner?",
    type: "essay" as const,
    category: "Final Thoughts",
  },
  {
    order: 98,
    text: "What makes you feel most alive?",
    type: "essay" as const,
    category: "Final Thoughts",
  },
  {
    order: 99,
    text: "Why are you on this app?",
    type: "essay" as const,
    category: "Final Thoughts",
  },
  {
    order: 100,
    text: "Is there anything else you want a potential match to know about you?",
    type: "essay" as const,
    category: "Final Thoughts",
  },
];

// Category order for UI display
export const CATEGORIES = [
  "Basic Traits",
  "Core Values",
  "Lifestyle & Health",
  "Your Life Story",
  "Social Life",
  "Communication Style",
  "Relationship Expectations",
  "Family & Kids",
  "Intimacy",
  "Love Philosophy",
  "Leisure & Quirks",
  "Final Thoughts",
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
