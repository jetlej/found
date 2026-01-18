"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { extractStructuredData } from "../lib/openai";
import { QUESTIONS } from "../seedQuestions";

// 5 distinct persona archetypes for testing
const PERSONAS = [
  {
    name: "Alex Chen",
    description:
      "Adventurous tech entrepreneur in their late 20s. Loves travel, spontaneity, and trying new things. Works hard but plays harder. Values freedom and experiences over material things. Moderately extroverted, progressive values, wants kids someday but not soon.",
    traits: {
      introversion: 3,
      adventurousness: 9,
      ambition: 8,
      emotionalOpenness: 7,
      traditionalValues: 3,
      independenceNeed: 8,
    },
  },
  {
    name: "Jordan Taylor",
    description:
      "Cozy homebody who works as a librarian. Loves reading, cooking, and quiet evenings. Introverted but deeply loyal to close friends. Values stability, routine, and deep conversations. Traditional about relationships, wants a family.",
    traits: {
      introversion: 8,
      adventurousness: 3,
      ambition: 5,
      emotionalOpenness: 6,
      traditionalValues: 7,
      independenceNeed: 4,
    },
  },
  {
    name: "Morgan Rivera",
    description:
      "Ambitious corporate lawyer climbing the ranks. Career-focused and driven. Values success, intelligence, and sophistication. Enjoys fine dining, travel, and networking. Moderate on most things, practical about relationships.",
    traits: {
      introversion: 4,
      adventurousness: 5,
      ambition: 10,
      emotionalOpenness: 5,
      traditionalValues: 6,
      independenceNeed: 7,
    },
  },
  {
    name: "Riley Quinn",
    description:
      "Free-spirited artist and yoga instructor. Spiritual, creative, and non-traditional. Values authenticity, creativity, and mindfulness. Vegetarian, into meditation and alternative lifestyles. Open-minded about everything.",
    traits: {
      introversion: 5,
      adventurousness: 7,
      ambition: 4,
      emotionalOpenness: 9,
      traditionalValues: 2,
      independenceNeed: 6,
    },
  },
  {
    name: "Casey Brooks",
    description:
      "Warm elementary school teacher who loves kids. Family-oriented and nurturing. Close to their parents and siblings. Values community, tradition, and building a home. Ready to settle down and start a family soon.",
    traits: {
      introversion: 4,
      adventurousness: 4,
      ambition: 5,
      emotionalOpenness: 8,
      traditionalValues: 8,
      independenceNeed: 3,
    },
  },
];

// Prompt to generate answers for a persona
const GENERATE_ANSWERS_PROMPT = `You are generating realistic dating profile answers for a fictional person.

PERSONA:
Name: {name}
Description: {description}

Generate answers for ALL of the following questions. The answers should be:
1. Consistent with the persona's personality and values
2. Realistic and detailed (2-4 sentences for essay questions)
3. Varied in tone and style (not robotic)

For multiple_choice questions, respond with EXACTLY one of the provided options.
For scale questions, respond with a number within the given range.
For text questions, respond with a short phrase or sentence.
For essay questions, respond with 2-4 thoughtful sentences.

QUESTIONS:
{questions}

Respond with a JSON object where keys are question numbers (1-100) and values are the answers.
Example: {"1": "Ready to settle down", "2": "Mixed Asian-American", "3": "Software engineer", ...}`;

// Format questions for the prompt
function formatQuestionsForPrompt(): string {
  return QUESTIONS.map((q) => {
    let questionText = `Q${q.order}: ${q.text} (${q.type})`;
    if (q.type === "multiple_choice" && q.options) {
      questionText += `\n   Options: ${q.options.join(", ")}`;
    }
    if (q.type === "scale") {
      questionText += `\n   Range: ${q.scaleMin ?? 1}-${q.scaleMax ?? 10}`;
    }
    return questionText;
  }).join("\n\n");
}

// Prompt to extract structured data from generated answers
const EXTRACT_DATA_PROMPT = `Based on these answers from a dating profile, extract the following structured data.

ANSWERS:
{answers}

Extract and return JSON with:
{
  "values": ["value1", "value2", ...],  // 5-10 core values (lowercase)
  "interests": ["interest1", ...],  // 10-15 hobbies/interests (lowercase)
  "dealbreakers": ["dealbreaker1", ...],  // 3-5 dealbreakers (lowercase)
  "keywords": ["keyword1", ...],  // 15-20 descriptive keywords (lowercase)
  "familyPlans": {
    "wantsKids": "yes|no|maybe|open",
    "kidsTimeline": "string or null",
    "parentingStyle": "string or null"
  },
  "lifestyle": {
    "dietType": "string or null",
    "petPreference": "string",
    "locationPreference": "city|suburb|rural|flexible"
  }
}`;

// Main action to seed all test users
export const seedTestUsers = action({
  args: {},
  handler: async (ctx) => {
    console.log("Starting to seed test users...");
    const questionsFormatted = formatQuestionsForPrompt();
    const results: { name: string; userId: string }[] = [];

    for (const persona of PERSONAS) {
      console.log(`Generating answers for ${persona.name}...`);

      // Generate answers using OpenAI
      const prompt = GENERATE_ANSWERS_PROMPT.replace("{name}", persona.name)
        .replace("{description}", persona.description)
        .replace("{questions}", questionsFormatted);

      const answers = await extractStructuredData<Record<string, string>>(
        prompt,
        "Generate the answers now. Make sure to include ALL 100 questions in your response.",
        { temperature: 0.8, maxTokens: 8000 }
      );

      console.log(`Generated ${Object.keys(answers).length} answers for ${persona.name}`);

      // Convert all values to strings (OpenAI may return numbers for scale questions)
      const stringAnswers: Record<string, string> = {};
      for (const [key, value] of Object.entries(answers)) {
        stringAnswers[key] = String(value);
      }

      // Create the user and save answers
      const userId = await ctx.runMutation(internal.seedTestUsers.createTestUser, {
        name: persona.name,
        answers: stringAnswers,
      });

      console.log(`Created user ${persona.name} with ID ${userId}`);

      // Format answers for extraction
      const answersText = Object.entries(stringAnswers)
        .map(([q, a]) => `Q${q}: ${a}`)
        .join("\n");

      // Extract structured data
      const extractedData = await extractStructuredData<{
        values: string[];
        interests: string[];
        dealbreakers: string[];
        keywords: string[];
        familyPlans: {
          wantsKids: string;
          kidsTimeline?: string;
          parentingStyle?: string;
        };
        lifestyle: {
          dietType?: string;
          petPreference: string;
          locationPreference: string;
        };
      }>(
        EXTRACT_DATA_PROMPT.replace("{answers}", answersText),
        "Extract the data now.",
        { temperature: 0.3 }
      );

      // Get structured answers from the generated data
      const structuredAnswers = {
        loveLanguage: stringAnswers["64"] || "Quality time",
        conflictStyle: stringAnswers["53"] || "Address it immediately and directly",
        communicationFrequency: stringAnswers["57"] || "Regular check-ins a few times a day",
        financialApproach: stringAnswers["67"] || "Depends on the situation",
        aloneTimeNeed: parseInt(stringAnswers["63"]) || 5,
        familyCloseness: parseInt(stringAnswers["71"]) || 5,
        sleepSchedule: stringAnswers["32"] || "Inconsistent/A mix of both",
        exerciseLevel: stringAnswers["24"] || "3-4 times per week",
        alcoholUse: stringAnswers["29"] || "1-2 times per week",
        drugUse: stringAnswers["31"] || "Never",
      };

      // Create the profile
      await ctx.runMutation(internal.seedTestUsers.createTestProfile, {
        userId,
        persona,
        extractedData,
        structuredAnswers,
      });

      console.log(`Created profile for ${persona.name}`);
      results.push({ name: persona.name, userId: userId as string });
    }

    console.log("Finished seeding test users!");
    return results;
  },
});

// Action to seed answers for an existing user
export const seedMyAnswers = action({
  args: {
    userId: v.id("users"),
    persona: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const personaDescription = args.persona || 
      "A thoughtful, curious person in their early 30s. Values deep connections, personal growth, and authenticity. Enjoys a mix of adventure and cozy nights in. Career-driven but prioritizes work-life balance. Open-minded, emotionally intelligent, and looking for a genuine partnership.";

    console.log(`Generating answers for user ${args.userId}...`);
    const questionsFormatted = formatQuestionsForPrompt();

    // Generate answers using OpenAI
    const prompt = GENERATE_ANSWERS_PROMPT.replace("{name}", "User")
      .replace("{description}", personaDescription)
      .replace("{questions}", questionsFormatted);

    const answers = await extractStructuredData<Record<string, string>>(
      prompt,
      "Generate the answers now. Make sure to include ALL 100 questions in your response.",
      { temperature: 0.8, maxTokens: 8000 }
    );

    console.log(`Generated ${Object.keys(answers).length} answers`);

    // Convert all values to strings
    const stringAnswers: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      stringAnswers[key] = String(value);
    }

    // Replace answers for the user
    await ctx.runMutation(internal.seedTestUsers.replaceUserAnswers, {
      userId: args.userId,
      answers: stringAnswers,
    });

    console.log(`Saved answers for user ${args.userId}`);

    // Trigger profile parsing
    await ctx.runAction(internal.actions.parseProfile.parseUserProfile, {
      userId: args.userId,
    });

    console.log(`Profile parsing triggered for user ${args.userId}`);
    return { success: true, answerCount: Object.keys(stringAnswers).length };
  },
});
