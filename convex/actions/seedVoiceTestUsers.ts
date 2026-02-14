"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { extractStructuredData } from "../lib/openai";
import { VOICE_QUESTIONS } from "./voiceQuestionDefinitions";

const TARGET_COUNT = 10;

type Persona = {
  name: string;
  gender: "Man" | "Woman" | "Non-binary";
  description: string;
};

const PERSONA_BATCH_PROMPT = `Create 10 totally unique fictional dating personas for test users.

Requirements:
- Return exactly 10 personas.
- Each must have a unique full name.
- Gender must be one of: "Man", "Woman", "Non-binary".
- Description should be 4-6 sentences, vivid and specific.
- Personas should differ strongly in lifestyle, values, relationship style, work, and background.
- Keep realistic and human (not fantasy/sci-fi).

Return JSON:
{
  "personas": [
    { "name": "Full Name", "gender": "Man|Woman|Non-binary", "description": "..." }
  ]
}`;

function getVoiceQuestionsForPrompt(): string {
  return VOICE_QUESTIONS.map((q, idx) => `${idx + 1}. ${q.text}`).join("\n");
}

function buildAnswersPrompt(persona: Persona): string {
  return `You are writing first-person voice-note answers for a dating app user.

Persona:
- Name: ${persona.name}
- Gender: ${persona.gender}
- Description: ${persona.description}

Write answers for all 8 questions below.
Requirements:
- Answer in first person, naturally, like spoken voice notes.
- Each answer must be one large paragraph (120-220 words).
- Be specific, personal, and consistent with the persona.
- Keep tone varied across answers.
- No bullet points.

Questions:
${getVoiceQuestionsForPrompt()}

Return JSON with EXACTLY 8 answers (one per question, no more, no less):
{
  "answers": [
    "answer for question 1",
    "answer for question 2",
    "answer for question 3",
    "answer for question 4",
    "answer for question 5",
    "answer for question 6",
    "answer for question 7",
    "answer for question 8"
  ]
}`;
}

export const seedVoiceProfilesForTestUsers = action({
  args: {},
  handler: async (ctx) => {
    console.log("Generating persona batch...");
    const personaBatch = await extractStructuredData<{ personas: Persona[] }>(
      PERSONA_BATCH_PROMPT,
      "Generate the 10 personas now.",
      { maxTokens: 8000 },
    );

    const personas = (personaBatch.personas || []).slice(0, TARGET_COUNT);
    if (personas.length !== TARGET_COUNT) {
      throw new Error(`Expected ${TARGET_COUNT} personas, got ${personas.length}`);
    }

    for (const [index, persona] of personas.entries()) {
      await ctx.scheduler.runAfter(
        index * 2000,
        internal.actions.seedVoiceTestUsers.seedSingleVoiceTestUser,
        { persona },
      );
    }

    return {
      totalRequested: TARGET_COUNT,
      scheduled: personas.length,
      personas: personas.map((p) => p.name),
    };
  },
});

// Backfill all missing bio fields for existing test users using GPT
// Schedules one action per user to avoid timeout
export const backfillTestUserBasics = action({
  args: {},
  handler: async (ctx) => {
    const testUsers = await ctx.runQuery(internal.seedTestUsers.getTestUsers);
    console.log(`Found ${testUsers.length} test users to backfill`);

    for (const [i, user] of testUsers.entries()) {
      await ctx.scheduler.runAfter(
        i * 3000, // stagger by 3s
        internal.actions.seedVoiceTestUsers.backfillSingleUser,
        { userId: user._id, name: user.name || "Unknown", gender: user.gender || "Unknown" },
      );
    }

    return { scheduled: testUsers.length, names: testUsers.map((u) => u.name) };
  },
});

type BackfillResult = {
  pronouns: string;
  sexuality: string;
  birthdate: string;
  heightInches: number;
  ethnicity: string;
  hometown: string;
  relationshipGoal: string;
  relationshipType: string;
  hasChildren: string;
  wantsChildren: string;
  religion: string;
  religionImportance: number;
  politicalLeaning: string;
  politicalImportance: number;
  drinking: string;
  smoking: string;
  marijuana: string;
  drugs: string;
  pets: string;
  ageRangeMin: number;
  ageRangeMax: number;
  ageRangeDealbreaker: boolean;
};

export const backfillSingleUser = internalAction({
  args: {
    userId: v.id("users"),
    name: v.string(),
    gender: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(
      internal.userProfiles.getByUserInternal,
      { userId: args.userId },
    );

    const bio = profile?.generatedBio || "";
    const values = profile?.values?.join(", ") || "";
    const interests = profile?.interests?.join(", ") || "";
    const lifestyle = profile?.lifestyle
      ? `Sleep: ${profile.lifestyle.sleepSchedule}, Exercise: ${profile.lifestyle.exerciseLevel}, Alcohol: ${profile.lifestyle.alcoholUse}, Drugs: ${profile.lifestyle.drugUse}, Pets: ${profile.lifestyle.petPreference}, Location: ${profile.lifestyle.locationPreference}`
      : "";
    const wantsKids = profile?.familyPlans?.wantsKids || "unknown";

    const prompt = `You are generating realistic dating profile data for a test user.

User info:
- Name: ${args.name}
- Gender: ${args.gender}
- Bio: ${bio}
- Values: ${values}
- Interests: ${interests}
- Lifestyle: ${lifestyle}
- Wants kids (from voice profile): ${wantsKids}

Generate realistic, varied profile fields for this person. Be consistent with their bio and personality. Make each user feel distinct.

IMPORTANT: You MUST include ALL 22 fields listed below. Do not omit any field. Every single field is required.

Return JSON with EXACTLY these 22 fields and allowed values:
{
  "pronouns": "he/him" | "she/her" | "they/them",
  "sexuality": "Straight" | "Gay" | "Lesbian" | "Bisexual" | "Queer" | "Pansexual",
  "birthdate": "YYYY-MM-DD" (between 1990-01-01 and 2000-12-31, varied),
  "ageRangeMin": number (18-60, typically their age minus 3-8),
  "ageRangeMax": number (20-99, typically their age plus 3-8),
  "ageRangeDealbreaker": true or false (true ~40% of the time),
  "heightInches": number (58-78, realistic for gender),
  "ethnicity": "White" | "Black" | "Hispanic/Latino" | "Asian" | "Middle Eastern" | "South Asian" | "Mixed" | "Other",
  "hometown": "City, State" (a real US city),
  "relationshipGoal": "marriage" | "long_term" | "life_partner" | "figuring_out",
  "relationshipType": "Monogamy" | "Non-monogamy" | "Open to either",
  "hasChildren": "yes" | "no",
  "wantsChildren": "yes" | "no" | "open" | "not_sure",
  "religion": "Christian" | "Catholic" | "Jewish" | "Muslim" | "Hindu" | "Buddhist" | "Agnostic" | "Atheist" | "Spiritual" | "None",
  "religionImportance": number (1-10),
  "politicalLeaning": "Liberal" | "Moderate" | "Conservative" | "Apolitical",
  "politicalImportance": number (1-10),
  "drinking": "Yes" | "Sometimes" | "No" | "Prefer not to say",
  "smoking": "Yes" | "Sometimes" | "No" | "Prefer not to say",
  "marijuana": "Yes" | "Sometimes" | "No" | "Prefer not to say",
  "drugs": "Yes" | "Sometimes" | "No" | "Prefer not to say",
  "pets": "Dog" | "Cat" | "Both" | "Fish" | "None" | "Other"
}`;

    const data = await extractStructuredData<BackfillResult>(
      prompt,
      `Generate the profile fields for ${args.name} now. Return ALL 22 fields.`,
      { maxTokens: 1500 },
    );

    // Ensure age range fields are always present (fallback if GPT omits them)
    if (!data.ageRangeMin || !data.ageRangeMax) {
      const birthYear = parseInt(data.birthdate?.split("-")[0] || "1995");
      const age = new Date().getFullYear() - birthYear;
      data.ageRangeMin = Math.max(18, age - 5);
      data.ageRangeMax = Math.min(99, age + 5);
    }
    if (data.ageRangeDealbreaker === undefined) {
      data.ageRangeDealbreaker = Math.random() < 0.4;
    }

    await ctx.runMutation(internal.seedTestUsers.patchTestUserBasics, {
      userId: args.userId,
      pronouns: data.pronouns,
      sexuality: data.sexuality,
      birthdate: data.birthdate,
      heightInches: data.heightInches,
      ethnicity: data.ethnicity,
      hometown: data.hometown,
      relationshipGoal: data.relationshipGoal,
      relationshipType: data.relationshipType,
      hasChildren: data.hasChildren,
      wantsChildren: data.wantsChildren,
      religion: data.religion,
      religionImportance: data.religionImportance,
      politicalLeaning: data.politicalLeaning,
      politicalImportance: data.politicalImportance,
      drinking: data.drinking,
      smoking: data.smoking,
      marijuana: data.marijuana,
      drugs: data.drugs,
      pets: data.pets,
      ageRangeMin: data.ageRangeMin,
      ageRangeMax: data.ageRangeMax,
      ageRangeDealbreaker: data.ageRangeDealbreaker,
      drinkingVisible: true,
      smokingVisible: true,
      marijuanaVisible: true,
      drugsVisible: true,
    });

    console.log(`✓ ${args.name} backfilled`);
    return { success: true, name: args.name };
  },
});

export const seedSingleVoiceTestUser = internalAction({
  args: {
    persona: v.object({
      name: v.string(),
      gender: v.union(v.literal("Man"), v.literal("Woman"), v.literal("Non-binary")),
      description: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const persona: Persona = args.persona;
    console.log(`\n=== ${persona.name} ===`);

    const answerPayload = await extractStructuredData<{ answers: string[] }>(
      buildAnswersPrompt(persona),
      "Generate exactly 8 voice answers now, one per question.",
      { maxTokens: 12000 },
    );

    const answers = answerPayload.answers || [];
    if (answers.length !== VOICE_QUESTIONS.length) {
      throw new Error(
        `Expected ${VOICE_QUESTIONS.length} answers, got ${answers.length}`,
      );
    }

    const recordings = await Promise.all(
      answers.map(async (transcription, questionIndex) => {
        const wordCount = transcription.trim().split(/\s+/).filter(Boolean).length;
        const durationSeconds = Math.max(30, Math.round(wordCount / 2.5));
        const storageId = await ctx.storage.store(
          new Blob([`seed voice answer ${questionIndex}`], {
            type: "text/plain",
          }),
        );
        return {
          questionIndex,
          storageId,
          durationSeconds,
          transcription,
        };
      }),
    );

    const userId = await ctx.runMutation(internal.seedTestUsers.createTestUser, {
      name: persona.name,
      gender: persona.gender,
      answers: {},
    });

    await ctx.runMutation(internal.voiceRecordings.replaceSeedRecordings, {
      userId,
      recordings,
    });

    await ctx.runAction(internal.actions.parseVoiceProfile.parseVoiceProfile, {
      userId,
    });

    return { success: true, userId, name: persona.name };
  },
});

// 3 female personas designed for high compatibility with Jordan (dev user)
const HIGH_COMPAT_PERSONAS: Persona[] = [
  {
    name: "Mia Torres",
    gender: "Woman",
    description:
      "Latina entrepreneur in her early 30s running a wellness-tech startup that combines meditation tools with gamification. Former yoga teacher who still teaches one class a week. Morning person — up at 6:30 for journaling and a workout before diving into founder life. Has traveled to 20+ countries including multiple ayahuasca retreats in Peru that profoundly shaped her worldview. Deeply values creativity, family, growth, and authenticity. Politically liberal, spiritually curious, doesn't smoke, drinks socially, and is openly supportive of psychedelic-assisted therapy. Loves karaoke nights, board game marathons, and building side projects. Wants marriage, 2-3 kids, and a monogamous partnership where both people push each other to be great. Very close with her big family — Sunday dinners are non-negotiable. Fiercely independent and confident but deeply affectionate and romantic at her core.",
  },
  {
    name: "Sasha Kim",
    gender: "Woman",
    description:
      "Korean-American product designer at a mission-driven ed-tech company, with a side project building educational games for underserved communities. Grew up in the Bay Area, has lived in Seoul and Berlin. Intensely curious — reads voraciously about behavioral economics, game theory, and social policy. Passionate advocate for UBI and wealth redistribution. Exercises 5 days a week (mix of climbing and lifting), morning person, liberal, agnostic but spiritually open. Has done years of therapy and maintains a daily meditation practice. Values honesty, curiosity, ambition, independence, and adventure above all. Loves game nights, improv comedy, and spontaneous travel. Open-minded about psychedelics and consciousness exploration. Wants marriage and kids someday — envisions a power-couple dynamic built on mutual respect, deep conversation, and shared ambition. Addresses conflict head-on with radical honesty.",
  },
  {
    name: "Ava Chen",
    gender: "Woman",
    description:
      "Chinese-American startup COO who previously founded a youth mentorship nonprofit. Lifts weights 4-5 times a week and treats fitness as a cornerstone of her mental health. Morning person — 6am gym sessions followed by focused deep work. Has traveled extensively through Southeast Asia and South America. Deeply family-oriented — oldest of three siblings and the glue of her family. Politically liberal, spiritually grounded (meditation + occasional psychedelic journeys), doesn't smoke. Values family, ambition, honesty, growth, generosity, and equality. Loves musicals, karaoke, Pokémon, and hosting dinner parties. Has done extensive inner work through therapy, meditation, and plant medicine. Wants marriage, 2-3 kids, and a monogamous relationship that feels like a true partnership — romantic, honest, and building something meaningful together. Love language is physical touch and words of affirmation.",
  },
];

const CELEB_PERSONAS: Persona[] = [
  // Female
  {
    name: "Dolly Parton",
    gender: "Woman",
    description:
      "Warm, generous, deeply loyal. Small-town Tennessee roots, self-made businesswoman and legendary musician. Christian faith is central to her life. Values authenticity, humor, and kindness above all. Philanthropist who started the Imagination Library to give books to children. Would prioritize loyalty, humor, and someone comfortable letting her shine.",
  },
  {
    name: "Oprah Winfrey",
    gender: "Woman",
    description:
      "Spiritual but not traditionally religious. Overcame severe childhood trauma to become a media mogul and one of the most influential people in the world. Values personal growth, deep conversation, and emotional intelligence. Prioritizes independence, intellectual connection, and someone secure in themselves. Believes in the power of vulnerability and lifelong learning.",
  },
  {
    name: "Zendaya",
    gender: "Woman",
    description:
      "Grounded, private, ambitious Gen-Z icon and acclaimed actress. Very close to her family. Health-conscious — doesn't drink or do drugs. Values creativity, loyalty, and keeping life low-key despite fame. Would want someone who respects her privacy, shares her work ethic, and has a playful side.",
  },
  {
    name: "Alexandria Ocasio-Cortez",
    gender: "Woman",
    description:
      "Passionate progressive activist and congresswoman from the Bronx. Puerto Rican heritage is central to her identity. Values community, justice, and direct communication. Would prioritize shared values, intellectual sparring, emotional vulnerability, and someone who can handle public scrutiny.",
  },
  {
    name: "Rihanna",
    gender: "Woman",
    description:
      "Bold, independent, unapologetically herself. Barbadian roots. Built a beauty and fashion empire from the ground up. Values confidence, humor, and loyalty. Would want someone creative, secure in themselves, who matches her energy and doesn't try to tame her.",
  },
  // Male
  {
    name: "Keanu Reeves",
    gender: "Man",
    description:
      "Quiet, introspective, deeply kind. Has experienced profound personal loss that shaped his worldview. Values simplicity, loyalty, and genuine human connection. Buddhist-leaning philosophy. Not materialistic despite wealth. Would want someone grounded, emotionally present, who appreciates quiet moments together.",
  },
  {
    name: "Dwayne Johnson",
    gender: "Man",
    description:
      "Family-first, disciplined, optimistic. Samoan heritage is central to his identity. Overcame depression and a difficult early life through sheer determination. Extremely driven work ethic — up at 4am every day. Values humor, loyalty, and showing up consistently. Would want someone who values family, can handle his schedule, and keeps things fun.",
  },
  {
    name: "Harry Styles",
    gender: "Man",
    description:
      "Open-minded, emotionally expressive, gender-fluid in style. British charm and warmth. Values kindness, creativity, and treating people with respect. Comfortable with vulnerability and breaking traditional masculine norms. Would want someone who is open-minded, creative, emotionally available, and doesn't take life too seriously.",
  },
  {
    name: "Barack Obama",
    gender: "Man",
    description:
      "Intellectual, measured, deeply principled. Values community service, family, and partnership as equals. Former president who believes in the power of empathy and civic engagement. Prioritizes emotional intelligence, shared purpose, humor, and someone who challenges him intellectually.",
  },
  {
    name: "Bad Bunny",
    gender: "Man",
    description:
      "Puerto Rican pride, boundary-breaking artist who challenges traditional masculinity in Latin culture. Values authenticity, cultural roots, and creative freedom. Deeply connected to his community and homeland. Would want someone who respects his culture, is confident and independent, and doesn't need the spotlight.",
  },
];

export const seedCelebProfiles = action({
  args: {},
  handler: async (ctx) => {
    console.log("Seeding 10 celebrity personas...");

    for (const [index, persona] of CELEB_PERSONAS.entries()) {
      await ctx.scheduler.runAfter(
        index * 2000,
        internal.actions.seedVoiceTestUsers.seedSingleVoiceTestUser,
        { persona },
      );
    }

    return {
      scheduled: CELEB_PERSONAS.length,
      personas: CELEB_PERSONAS.map((p) => p.name),
    };
  },
});

// Seed the 3 high-compatibility test users
export const seedHighCompatUsers = action({
  args: {},
  handler: async (ctx) => {
    console.log("Seeding 3 high-compatibility female personas...");

    for (const [index, persona] of HIGH_COMPAT_PERSONAS.entries()) {
      await ctx.scheduler.runAfter(
        index * 2000,
        internal.actions.seedVoiceTestUsers.seedSingleVoiceTestUser,
        { persona },
      );
    }

    return {
      scheduled: HIGH_COMPAT_PERSONAS.length,
      personas: HIGH_COMPAT_PERSONAS.map((p) => p.name),
    };
  },
});
