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

Write answers for all 10 questions below.
Requirements:
- Answer in first person, naturally, like spoken voice notes.
- Each answer must be one large paragraph (120-220 words).
- Be specific, personal, and consistent with the persona.
- Keep tone varied across answers.
- No bullet points.

Questions:
${getVoiceQuestionsForPrompt()}

Return JSON:
{
  "answers": [
    "answer for question 1",
    "answer for question 2",
    "answer for question 3",
    "answer for question 4",
    "answer for question 5",
    "answer for question 6",
    "answer for question 7",
    "answer for question 8",
    "answer for question 9",
    "answer for question 10"
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
      "Generate the 10 voice answers now.",
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
