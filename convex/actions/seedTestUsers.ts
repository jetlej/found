"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { extractStructuredData, generateImage } from "../lib/openai";
import { QUESTIONS } from "../seedQuestions";

// 10 extreme/interesting persona archetypes for testing
const PERSONAS = [
  {
    name: "Jade Monroe",
    gender: "Woman",
    description:
      "Lead singer of an indie rock band with a cult following. Lives on tour buses 8 months a year. Sleeps at 4am, wakes at noon. Passionate, intense, deeply romantic. Has seen every city but never stays long. Values creative freedom and emotional intensity above all. Past struggles with excess, now sober-curious. Looking for someone who can handle the chaos but also ground her.",
    traits: {
      introversion: 2,
      adventurousness: 9,
      ambition: 7,
      emotionalOpenness: 8,
      traditionalValues: 2,
      independenceNeed: 8,
      romanticStyle: 9,
      socialEnergy: 8,
      communicationStyle: 8,
      attachmentStyle: 6,
      planningStyle: 2,
    },
    imagePrompt:
      "Dating app photo of a 28 year old woman with dark wavy hair, casual selfie backstage at a concert venue, leather jacket, silver rings, warm genuine smile, moody ambient lighting, authentic vibe",
  },
  {
    name: "Silas Crane",
    gender: "Man",
    description:
      "Lives in a paint-splattered Brooklyn loft. Hasn't had a 'real job' in 12 years - sells paintings for $15K+ but sometimes can't afford groceries. Barely functional in normal society - forgets to eat when working on a piece. Art is his religion. Deeply romantic but struggles with being present. Needs a partner who understands creative chaos and values depth over stability.",
    traits: {
      introversion: 8,
      adventurousness: 6,
      ambition: 3,
      emotionalOpenness: 9,
      traditionalValues: 2,
      independenceNeed: 9,
      romanticStyle: 9,
      socialEnergy: 3,
      communicationStyle: 7,
      attachmentStyle: 7,
      planningStyle: 1,
    },
    imagePrompt:
      "Dating app photo of a 35 year old man with messy dark hair and stubble, casual portrait in bright art studio, paint-stained henley shirt, natural window light, intense but warm gaze, bohemian artist vibe",
  },
  {
    name: "Nina Vega",
    gender: "Woman",
    description:
      "Produces music festivals and runs a legendary underground club night. Knows every DJ, promoter, and artist in three cities. Works from 10pm-6am, sleeps until 3pm. Thrives in chaos and crowds. Built her empire from nothing through pure hustle. Looking for someone who can keep up with the energy but also be her calm in the storm.",
    traits: {
      introversion: 1,
      adventurousness: 8,
      ambition: 9,
      emotionalOpenness: 6,
      traditionalValues: 2,
      independenceNeed: 7,
      romanticStyle: 6,
      socialEnergy: 10,
      communicationStyle: 8,
      attachmentStyle: 4,
      planningStyle: 7,
    },
    imagePrompt:
      "Dating app photo of a 30 year old Latina woman, stylish streetwear outfit, rooftop bar at golden hour, city skyline behind, confident radiant smile, fashionable but approachable",
  },
  {
    name: "Wyatt Callahan",
    gender: "Man",
    description:
      "Third-generation cattle rancher in Montana. Wakes at 4:30am, asleep by 9pm. Hands rough from honest work. Deeply connected to land, animals, and the rhythm of seasons. Traditional values but a gentle soul. Nearest neighbor is 20 miles away. Looking for someone who'd trade city lights for starlight and build a life rooted in the earth.",
    traits: {
      introversion: 6,
      adventurousness: 5,
      ambition: 5,
      emotionalOpenness: 6,
      traditionalValues: 9,
      independenceNeed: 3,
      romanticStyle: 7,
      socialEnergy: 4,
      communicationStyle: 5,
      attachmentStyle: 5,
      planningStyle: 8,
    },
    imagePrompt:
      "Dating app photo of a 32 year old rugged man outdoors on a ranch, worn cowboy hat, flannel shirt, golden hour sunset light, friendly warm smile, mountains in background, authentic country feel",
  },
  {
    name: "Dex Park",
    gender: "Man",
    description:
      "Makes $400K/year playing high-stakes poker. Ice cold under pressure. Mathematical genius who reads people like books. No fixed schedule - flies to tournaments in Vegas, Macau, Monte Carlo. Emotionally guarded from years of reading deception, but deeply loyal once trust is earned. Looking for someone who doesn't need constant presence but treasures quality time.",
    traits: {
      introversion: 5,
      adventurousness: 7,
      ambition: 9,
      emotionalOpenness: 3,
      traditionalValues: 4,
      independenceNeed: 9,
      romanticStyle: 5,
      socialEnergy: 5,
      communicationStyle: 4,
      attachmentStyle: 3,
      planningStyle: 6,
    },
    imagePrompt:
      "Dating app photo of a 34 year old Korean-American man, well-tailored casual blazer, upscale hotel lounge setting, calm confident expression, clean and sophisticated look, subtle smile",
  },
  {
    name: "Elena Frost",
    gender: "Woman",
    description:
      "Climate scientist who spends 6-8 months per year at research stations in Antarctica. Loves extreme isolation and silence. Deeply passionate about saving the planet - it's not a job, it's a calling. Relationships have always suffered from her absences. Looking for someone fiercely independent who shares her sense of mission and can thrive with long-distance stretches.",
    traits: {
      introversion: 8,
      adventurousness: 9,
      ambition: 8,
      emotionalOpenness: 5,
      traditionalValues: 3,
      independenceNeed: 10,
      romanticStyle: 5,
      socialEnergy: 3,
      communicationStyle: 6,
      attachmentStyle: 3,
      planningStyle: 9,
    },
    imagePrompt:
      "Dating app photo of a 36 year old woman, outdoor expedition jacket, mountain or snowy research setting background, intelligent bright eyes, windswept hair, adventurous scientist vibe, genuine smile",
  },
  {
    name: "Marcus Cole",
    gender: "Man",
    description:
      "Headlines comedy clubs across the country. Turns trauma into punchlines - it's therapy and art combined. Sharp, quick-witted, always 'on' in public. Struggles to be serious and deflects with humor. Late nights, green rooms, road gigs, and airport lounges. Deeply observant about human nature. Looking for someone who can see past the jokes to the real person underneath.",
    traits: {
      introversion: 2,
      adventurousness: 7,
      ambition: 7,
      emotionalOpenness: 5,
      traditionalValues: 4,
      independenceNeed: 6,
      romanticStyle: 6,
      socialEnergy: 9,
      communicationStyle: 9,
      attachmentStyle: 5,
      planningStyle: 3,
    },
    imagePrompt:
      "Dating app photo of a 31 year old Black man, casual hoodie and jeans, coffee shop or comedy club green room setting, warm genuine laugh, charismatic and approachable, natural candid moment",
  },
  {
    name: "Tara Reyes",
    gender: "Woman",
    description:
      "CrossFit Games competitor. Trains 5+ hours daily. 4:30am wake-ups, 9pm bedtime, no exceptions. Body is a temple - strict diet, no alcohol. Incredibly disciplined but knows how to celebrate wins. Travels for competitions worldwide. Looking for someone who respects the grind, maybe joins her for workouts, and wants to build something strong together.",
    traits: {
      introversion: 3,
      adventurousness: 8,
      ambition: 9,
      emotionalOpenness: 6,
      traditionalValues: 5,
      independenceNeed: 6,
      romanticStyle: 6,
      socialEnergy: 7,
      communicationStyle: 7,
      attachmentStyle: 5,
      planningStyle: 10,
    },
    imagePrompt:
      "Dating app photo of a 29 year old athletic Latina woman, workout tank top, bright gym or outdoor fitness setting, strong confident posture, healthy glow, genuine motivating smile",
  },
  {
    name: "Velvet Divine",
    gender: "Non-binary",
    description:
      "Reigning queen of the downtown drag scene. Larger than life on stage - sequins, six-inch heels, and showstopping performances. Surprisingly introspective off stage. Built a chosen family in the LGBTQ+ community. Creative, flamboyant, fearless, and fiercely protective of loved ones. Looking for someone who loves both the glitter and the person underneath the wig.",
    traits: {
      introversion: 1,
      adventurousness: 9,
      ambition: 7,
      emotionalOpenness: 9,
      traditionalValues: 1,
      independenceNeed: 5,
      romanticStyle: 8,
      socialEnergy: 10,
      communicationStyle: 9,
      attachmentStyle: 6,
      planningStyle: 4,
    },
    imagePrompt:
      "Dating app photo of a 33 year old drag performer, glamorous but not over-the-top makeup, sequined top, backstage mirror lights, confident warm expression, approachable glamour, nightlife setting",
  },
  {
    name: "Ezra Holbrook",
    gender: "Man",
    description:
      "Former tech startup CTO who burned out spectacularly. Now lives on 40 acres in Vermont - no social media, grows 80% of his own food. Chickens, bees, a woodshop, and more peace than he's ever known. Wakes with the sun. Still sharp, still curious, just done with the noise. Looking for a partner to build a quiet, intentional life rooted in what actually matters.",
    traits: {
      introversion: 9,
      adventurousness: 5,
      ambition: 3,
      emotionalOpenness: 7,
      traditionalValues: 4,
      independenceNeed: 10,
      romanticStyle: 7,
      socialEnergy: 2,
      communicationStyle: 6,
      attachmentStyle: 4,
      planningStyle: 7,
    },
    imagePrompt:
      "Dating app photo of a 38 year old man with neat beard, flannel shirt, rustic cabin porch or garden background, peaceful genuine expression, morning golden light, wholesome homesteader vibe",
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
    const results: { name: string; userId: string; photoUrl?: string }[] = [];

    for (const persona of PERSONAS) {
      console.log(`\n========== ${persona.name} ==========`);
      console.log(`Generating answers...`);

      // Generate answers using OpenAI
      const prompt = GENERATE_ANSWERS_PROMPT.replace("{name}", persona.name)
        .replace("{description}", persona.description)
        .replace("{questions}", questionsFormatted);

      const answers = await extractStructuredData<Record<string, string>>(
        prompt,
        "Generate the answers now. Make sure to include ALL 100 questions in your response.",
        { maxTokens: 8000 }
      );

      console.log(`Generated ${Object.keys(answers).length} answers`);

      // Convert all values to strings (OpenAI may return numbers for scale questions)
      const stringAnswers: Record<string, string> = {};
      for (const [key, value] of Object.entries(answers)) {
        stringAnswers[key] = String(value);
      }

      // Create the user and save answers
      const userId = await ctx.runMutation(internal.seedTestUsers.createTestUser, {
        name: persona.name,
        gender: persona.gender,
        answers: stringAnswers,
      });

      console.log(`Created user with ID ${userId}`);

      // Generate profile photo
      let photoUrl: string | undefined;
      if (persona.imagePrompt) {
        console.log(`Generating profile photo...`);
        try {
          const imageData = await generateImage(persona.imagePrompt);
          const blob = new Blob([imageData], { type: "image/png" });
          const storageId = await ctx.storage.store(blob);
          const url = await ctx.storage.getUrl(storageId);
          if (!url) throw new Error("Failed to get storage URL");

          await ctx.runMutation(internal.seedTestUsers.saveTestUserPhoto, {
            userId,
            storageId,
            url,
          });
          photoUrl = url;
          console.log(`Photo uploaded: ${photoUrl}`);
        } catch (error) {
          console.error(`Failed to generate photo:`, error);
        }
      }

      // Run full profile parsing (generates bios, all optional fields)
      console.log(`Running full profile parsing...`);
      try {
        await ctx.runAction(internal.actions.parseProfile.parseUserProfile, {
          userId,
        });
        console.log(`Profile parsing complete`);
      } catch (error) {
        console.error(`Profile parsing failed, falling back to basic profile:`, error);
        
        // Fallback: create basic profile
        const answersText = Object.entries(stringAnswers)
          .map(([q, a]) => `Q${q}: ${a}`)
          .join("\n");

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
          {}
        );

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

        await ctx.runMutation(internal.seedTestUsers.createTestProfile, {
          userId,
          persona: {
            name: persona.name,
            description: persona.description,
            traits: persona.traits,
          },
          extractedData,
          structuredAnswers,
        });
      }

      results.push({ name: persona.name, userId: userId as string, photoUrl });
    }

    console.log("\n========== COMPLETE ==========");
    console.log(`Seeded ${results.length} test users!`);
    return results;
  },
});

// Action to seed a single test user by name
export const seedSingleUser = action({
  args: { personaName: v.string() },
  handler: async (ctx, args) => {
    const persona = PERSONAS.find((p) => p.name === args.personaName);
    if (!persona) {
      throw new Error(`Persona "${args.personaName}" not found`);
    }

    console.log(`\n========== ${persona.name} ==========`);
    console.log(`Generating answers...`);

    const questionsFormatted = formatQuestionsForPrompt();
    const prompt = GENERATE_ANSWERS_PROMPT.replace("{name}", persona.name)
      .replace("{description}", persona.description)
      .replace("{questions}", questionsFormatted);

    const answers = await extractStructuredData<Record<string, string>>(
      prompt,
      "Generate the answers now. Make sure to include ALL 100 questions in your response.",
      { maxTokens: 8000 }
    );

    console.log(`Generated ${Object.keys(answers).length} answers`);

    const stringAnswers: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      stringAnswers[key] = String(value);
    }

    const userId = await ctx.runMutation(internal.seedTestUsers.createTestUser, {
      name: persona.name,
      gender: persona.gender,
      answers: stringAnswers,
    });

    console.log(`Created user with ID ${userId}`);

    // Generate profile photo
    let photoUrl: string | undefined;
    if (persona.imagePrompt) {
      console.log(`Generating profile photo...`);
      try {
        const imageData = await generateImage(persona.imagePrompt);
        const blob = new Blob([imageData], { type: "image/png" });
        const storageId = await ctx.storage.store(blob);
        const url = await ctx.storage.getUrl(storageId);
        if (!url) throw new Error("Failed to get storage URL");

        await ctx.runMutation(internal.seedTestUsers.saveTestUserPhoto, {
          userId,
          storageId,
          url,
        });
        photoUrl = url;
        console.log(`Photo uploaded: ${photoUrl}`);
      } catch (error) {
        console.error(`Failed to generate photo:`, error);
      }
    }

    // Run full profile parsing
    console.log(`Running full profile parsing...`);
    await ctx.runAction(internal.actions.parseProfile.parseUserProfile, { userId });
    console.log(`Profile parsing complete`);

    return { name: persona.name, userId: userId as string, photoUrl };
  },
});

// Action to add photos to existing test users
export const addPhotosToTestUsers = action({
  args: {},
  handler: async (ctx) => {
    console.log("Adding photos to test users...");
    const results: { name: string; photoUrl?: string }[] = [];

    for (const persona of PERSONAS) {
      if (!persona.imagePrompt) continue;

      // Find user by name
      const user = await ctx.runQuery(internal.seedTestUsers.findUserByName, {
        name: persona.name,
      });

      if (!user) {
        console.log(`User ${persona.name} not found, skipping`);
        continue;
      }

      // Check if user already has a photo
      const photoCount = await ctx.runQuery(internal.seedTestUsers.countUserPhotos, {
        userId: user._id,
      });

      if (photoCount > 0) {
        console.log(`${persona.name} already has ${photoCount} photo(s), skipping`);
        results.push({ name: persona.name, photoUrl: "already has photo" });
        continue;
      }

      console.log(`Generating photo for ${persona.name}...`);
      try {
        const imageData = await generateImage(persona.imagePrompt);
        
        // Store the image in Convex storage (actions can use ctx.storage)
        const blob = new Blob([imageData], { type: "image/png" });
        const storageId = await ctx.storage.store(blob);
        const url = await ctx.storage.getUrl(storageId);
        if (!url) throw new Error("Failed to get storage URL");

        // Save the photo record via mutation
        await ctx.runMutation(internal.seedTestUsers.saveTestUserPhoto, {
          userId: user._id,
          storageId,
          url,
        });

        console.log(`Photo uploaded for ${persona.name}: ${url}`);
        results.push({ name: persona.name, photoUrl: url });
      } catch (error) {
        console.error(`Failed to generate photo for ${persona.name}:`, error);
        results.push({ name: persona.name });
      }
    }

    console.log("Done adding photos!");
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
      { maxTokens: 8000 }
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
