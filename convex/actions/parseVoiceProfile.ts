"use node";

import { v } from "convex/values";
import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  getOpenAIClient,
  extractStructuredDataWithUsage,
  DEFAULT_MODEL,
  TokenUsage,
  aggregateUsage,
  formatCost,
} from "../lib/openai";
import { CANONICAL_VALUES } from "../lib/canonicalValues";
import { VOICE_QUESTIONS } from "./voiceQuestionDefinitions";

// Cost tracking helper
interface ExtractionCost {
  name: string;
  usage: TokenUsage;
  cost: number;
}

// The 10 voice questions and what they capture
const VOICE_QUESTION_MAPPING = [
  { index: 0, captures: "values, identity, priorities" },
  { index: 1, captures: "love language, relationship style, attachment" },
  { index: 2, captures: "background, formative moments, life story" },
  { index: 3, captures: "lifestyle, career, daily routine, social life" },
  { index: 4, captures: "family closeness, kids, location, future plans" },
  { index: 5, captures: "partner preferences, dealbreakers" },
  { index: 6, captures: "communication style, conflict resolution, emotional needs" },
  { index: 7, captures: "interests, hobbies, passions" },
  { index: 8, captures: "self-awareness, growth, vulnerabilities" },
  { index: 9, captures: "authentic self-description, quirks" },
];

// Comprehensive extraction prompt for voice transcripts
const VOICE_PROFILE_EXTRACTION_PROMPT = `You are an AI assistant analyzing voice transcripts from a dating app where users answered 10 open-ended questions about themselves. The transcripts are raw speech-to-text, so expect natural speech patterns, filler words, and occasional transcription errors.

Your job is to extract a comprehensive dating profile from these transcripts.

CANONICAL VALUES LIST (only use these for canonicalValues field):
${CANONICAL_VALUES.join(", ")}

Extract the following information. Use null for fields where information is not provided or unclear.

Respond with JSON in this exact format:
{
  "canonicalValues": ["value1", "value2", ...],
  "rawValues": ["any", "other", "values", "mentioned"],
  "interests": ["interest1", "interest2", ...],
  "dealbreakers": ["dealbreaker1", ...],
  "traits": {
    "introversion": <1-10>,
    "adventurousness": <1-10>,
    "ambition": <1-10>,
    "emotionalOpenness": <1-10>,
    "traditionalValues": <1-10>,
    "independenceNeed": <1-10>,
    "romanticStyle": <1-10>,
    "socialEnergy": <1-10>,
    "communicationStyle": <1-10>,
    "attachmentStyle": <1-10>,
    "planningStyle": <1-10>
  },
  "relationshipStyle": {
    "loveLanguage": "<words_of_affirmation|quality_time|physical_touch|acts_of_service|receiving_gifts|unknown>",
    "conflictStyle": "<address_immediately|cool_off_first|write_thoughts|let_go|avoid|unknown>",
    "communicationFrequency": "<constant|regular|few_daily|minimal|calls|unknown>",
    "financialApproach": "<fully_shared|mostly_shared|split_50_50|mostly_separate|depends|unknown>",
    "aloneTimeNeed": <1-10>
  },
  "familyPlans": {
    "wantsKids": "<yes|no|maybe|already_has|open|unknown>",
    "kidsTimeline": "<string or null>",
    "familyCloseness": <1-10>,
    "parentingStyle": "<string or null>"
  },
  "lifestyle": {
    "sleepSchedule": "<early_bird|morning|flexible|night|night_owl|unknown>",
    "exerciseLevel": "<never|monthly|weekly|several_weekly|daily|unknown>",
    "dietType": "<string or null>",
    "alcoholUse": "<never|rarely|socially|regularly|daily|unknown>",
    "drugUse": "<never|rarely|occasionally|regularly|unknown>",
    "petPreference": "<string>",
    "locationPreference": "<city|suburb|rural|small_town|flexible|unknown>"
  },
  "lifeStory": {
    "proudestAchievement": "<string or null>",
    "definingHardship": "<string or null>",
    "biggestRisk": "<string or null>",
    "dreams": ["dream1", ...],
    "fears": ["fear1", ...],
    "formativeExperiences": ["experience1", ...]
  },
  "socialProfile": {
    "socialStyle": "<very_active|balanced|introverted|unknown>",
    "weekendStyle": "<string or null>",
    "goOutFrequency": <1-10>,
    "friendApprovalImportance": <1-10>
  },
  "intimacyProfile": {
    "physicalIntimacyImportance": <1-10>,
    "physicalAttractionImportance": <1-10>,
    "pdaComfort": "<love_it|fine|moderate|private|unknown>",
    "connectionTriggers": ["trigger1", ...]
  },
  "lovePhilosophy": {
    "believesInSoulmates": <true|false|null>,
    "loveDefinition": "<string or null>",
    "healthyRelationshipVision": "<string or null>"
  },
  "partnerPreferences": {
    "mustHaves": ["trait1", ...],
    "niceToHaves": ["trait1", ...],
    "redFlags": ["flag1", ...],
    "dealbreakersInPartner": ["dealbreaker1", ...]
  },
  "bioElements": {
    "conversationStarters": ["topic1", ...],
    "interestingFacts": ["fact1", ...],
    "uniqueQuirks": ["quirk1", ...],
    "passions": ["passion1", ...]
  },
  "keywords": ["keyword1", "keyword2", ...],
  "generatedBio": "<150-200 word bio paragraph>",
  "shortBio": "<single sentence bio>",
  "confidence": <0-1>
}

Trait scales explanation:
- introversion: 1=very extroverted, 10=very introverted
- adventurousness: 1=loves routine, 10=thrill-seeking
- ambition: 1=content, 10=highly driven
- emotionalOpenness: 1=very private, 10=open book
- traditionalValues: 1=progressive, 10=traditional
- independenceNeed: 1=togetherness, 10=needs space
- romanticStyle: 1=practical, 10=deeply romantic
- socialEnergy: 1=homebody, 10=social butterfly
- communicationStyle: 1=reserved, 10=expressive
- attachmentStyle: 1=avoidant, 10=anxious
- planningStyle: 1=spontaneous, 10=structured

Use 5 as default when information is insufficient.`;

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(audioUrl: string): Promise<{ text: string; cost: number }> {
  const client = getOpenAIClient();
  
  // Fetch the audio file
  const response = await fetch(audioUrl);
  const audioBuffer = await response.arrayBuffer();
  
  // Create a File object for the API
  const audioFile = new File([audioBuffer], "recording.m4a", { type: "audio/m4a" });
  
  // Transcribe with Whisper
  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    response_format: "text",
  });
  
  // Whisper pricing: $0.006 per minute
  // Estimate ~1 minute per recording on average
  const estimatedCost = 0.006;
  
  return { text: transcription, cost: estimatedCost };
}

// Internal action to parse voice recordings into a profile
export const parseVoiceProfile = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; confidence?: number }> => {
    console.log(`Starting voice profile parsing for user ${args.userId}`);

    // Get user info
    const user = await ctx.runQuery(internal.users.getById, { userId: args.userId });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get all voice recordings for this user
    const recordings = await ctx.runQuery(internal.voiceRecordings.getRecordingsForUserInternal, {
      userId: args.userId,
    });

    if (!recordings || recordings.length === 0) {
      return { success: false, error: "No voice recordings found" };
    }

    console.log(`Found ${recordings.length} voice recordings to process`);

    // Track costs
    const costs: ExtractionCost[] = [];
    let totalTranscriptionCost = 0;

    // Transcribe all recordings
    const transcripts: { questionIndex: number; text: string }[] = [];
    
    for (const recording of recordings) {
      try {
        // Get the audio URL from storage
        const audioUrl = await ctx.storage.getUrl(recording.storageId);
        if (!audioUrl) {
          console.error(`No URL for recording ${recording._id}`);
          continue;
        }

        const { text, cost } = await transcribeAudio(audioUrl);
        totalTranscriptionCost += cost;
        
        transcripts.push({
          questionIndex: recording.questionIndex,
          text,
        });

        // Save transcription back to the recording
        await ctx.runMutation(internal.voiceRecordings.updateTranscriptionInternal, {
          recordingId: recording._id,
          transcription: text,
        });

        console.log(`Transcribed Q${recording.questionIndex + 1}: ${text.substring(0, 100)}...`);
      } catch (err) {
        console.error(`Failed to transcribe recording ${recording._id}:`, err);
      }
    }

    costs.push({
      name: "Transcription (Whisper)",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cost: totalTranscriptionCost,
    });

    if (transcripts.length === 0) {
      return { success: false, error: "Failed to transcribe any recordings" };
    }

    // Format transcripts for the extraction prompt
    const formattedTranscripts = transcripts
      .sort((a, b) => a.questionIndex - b.questionIndex)
      .map((t) => {
        const question = VOICE_QUESTION_MAPPING[t.questionIndex];
        return `QUESTION ${t.questionIndex + 1} (captures: ${question?.captures || "general"}):\n"${VOICE_QUESTIONS[t.questionIndex]?.text || `Question ${t.questionIndex + 1}`}"\n\nRESPONSE:\n${t.text}`;
      })
      .join("\n\n---\n\n");

    // Run the comprehensive extraction
    console.log("Running profile extraction from transcripts...");
    
    const defaultUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    
    let extractedProfile: any;
    try {
      const result = await extractStructuredDataWithUsage<any>(
        VOICE_PROFILE_EXTRACTION_PROMPT,
        formattedTranscripts,
        { maxTokens: 4000 }
      );
      extractedProfile = result.data;
      costs.push({
        name: "Profile Extraction",
        usage: result.usage,
        cost: result.cost,
      });
    } catch (err) {
      console.error("Profile extraction failed:", err);
      return { success: false, error: "Profile extraction failed" };
    }

    // Log cost breakdown
    const totalUsage = aggregateUsage(costs.map((c) => c.usage));
    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);

    console.log("\n========== VOICE PROFILE PARSING COST BREAKDOWN ==========");
    console.log(`User ID: ${args.userId}`);
    console.log(`Recordings processed: ${transcripts.length}`);
    console.log("-----------------------------------------------------------");
    costs.forEach((c) => {
      console.log(
        `  ${c.name.padEnd(25)} | ${c.usage.totalTokens.toString().padStart(6)} tokens | ${formatCost(c.cost)}`
      );
    });
    console.log("-----------------------------------------------------------");
    console.log(
      `  ${"TOTAL".padEnd(25)} | ${totalUsage.totalTokens.toString().padStart(6)} tokens | ${formatCost(totalCost)}`
    );
    console.log("===========================================================\n");

    // Build the profile object matching the userProfiles schema
    const profile = {
      userId: args.userId,
      // Matching fields
      selectedInterests: [], // Voice doesn't use the interest picker
      canonicalValues: extractedProfile.canonicalValues || [],
      preferences: undefined, // Voice flow doesn't have structured checklists
      // Raw extractions
      values: [...(extractedProfile.canonicalValues || []), ...(extractedProfile.rawValues || [])],
      interests: extractedProfile.interests || [],
      dealbreakers: extractedProfile.dealbreakers || [],
      // Personality traits
      traits: {
        introversion: extractedProfile.traits?.introversion ?? 5,
        adventurousness: extractedProfile.traits?.adventurousness ?? 5,
        ambition: extractedProfile.traits?.ambition ?? 5,
        emotionalOpenness: extractedProfile.traits?.emotionalOpenness ?? 5,
        traditionalValues: extractedProfile.traits?.traditionalValues ?? 5,
        independenceNeed: extractedProfile.traits?.independenceNeed ?? 5,
        romanticStyle: extractedProfile.traits?.romanticStyle ?? 5,
        socialEnergy: extractedProfile.traits?.socialEnergy ?? 5,
        communicationStyle: extractedProfile.traits?.communicationStyle ?? 5,
        attachmentStyle: extractedProfile.traits?.attachmentStyle ?? 5,
        planningStyle: extractedProfile.traits?.planningStyle ?? 5,
      },
      // Relationship style
      relationshipStyle: {
        loveLanguage: extractedProfile.relationshipStyle?.loveLanguage || "unknown",
        conflictStyle: extractedProfile.relationshipStyle?.conflictStyle || "unknown",
        communicationFrequency: extractedProfile.relationshipStyle?.communicationFrequency || "unknown",
        financialApproach: extractedProfile.relationshipStyle?.financialApproach || "unknown",
        aloneTimeNeed: extractedProfile.relationshipStyle?.aloneTimeNeed ?? 5,
      },
      // Family plans
      familyPlans: {
        wantsKids: extractedProfile.familyPlans?.wantsKids || "unknown",
        kidsTimeline: extractedProfile.familyPlans?.kidsTimeline ?? undefined,
        familyCloseness: extractedProfile.familyPlans?.familyCloseness ?? 5,
        parentingStyle: extractedProfile.familyPlans?.parentingStyle ?? undefined,
      },
      // Lifestyle
      lifestyle: {
        sleepSchedule: extractedProfile.lifestyle?.sleepSchedule || "unknown",
        exerciseLevel: extractedProfile.lifestyle?.exerciseLevel || "unknown",
        dietType: extractedProfile.lifestyle?.dietType ?? undefined,
        alcoholUse: extractedProfile.lifestyle?.alcoholUse || "unknown",
        drugUse: extractedProfile.lifestyle?.drugUse || "unknown",
        petPreference: extractedProfile.lifestyle?.petPreference || "neutral",
        locationPreference: extractedProfile.lifestyle?.locationPreference || "flexible",
      },
      // Life story
      lifeStory: extractedProfile.lifeStory
        ? {
            proudestAchievement: extractedProfile.lifeStory.proudestAchievement ?? undefined,
            definingHardship: extractedProfile.lifeStory.definingHardship ?? undefined,
            biggestRisk: extractedProfile.lifeStory.biggestRisk ?? undefined,
            dreams: extractedProfile.lifeStory.dreams || [],
            fears: extractedProfile.lifeStory.fears || [],
            formativeExperiences: extractedProfile.lifeStory.formativeExperiences || [],
            favoriteStory: undefined,
          }
        : undefined,
      // Social profile
      socialProfile: extractedProfile.socialProfile
        ? {
            socialStyle: extractedProfile.socialProfile.socialStyle || "balanced",
            weekendStyle: extractedProfile.socialProfile.weekendStyle ?? undefined,
            idealFridayNight: undefined,
            goOutFrequency: extractedProfile.socialProfile.goOutFrequency ?? 5,
            friendApprovalImportance: extractedProfile.socialProfile.friendApprovalImportance ?? 5,
            socialCircleVision: undefined,
          }
        : undefined,
      // Intimacy profile
      intimacyProfile: extractedProfile.intimacyProfile
        ? {
            physicalIntimacyImportance: extractedProfile.intimacyProfile.physicalIntimacyImportance ?? 5,
            physicalAttractionImportance: extractedProfile.intimacyProfile.physicalAttractionImportance ?? 5,
            pdaComfort: extractedProfile.intimacyProfile.pdaComfort || "moderate",
            emotionalIntimacyApproach: undefined,
            connectionTriggers: extractedProfile.intimacyProfile.connectionTriggers || [],
            healthyIntimacyVision: undefined,
          }
        : undefined,
      // Love philosophy
      lovePhilosophy: extractedProfile.lovePhilosophy
        ? {
            believesInSoulmates: extractedProfile.lovePhilosophy.believesInSoulmates ?? false,
            loveDefinition: extractedProfile.lovePhilosophy.loveDefinition ?? undefined,
            loveRecognition: [],
            romanticGestures: [],
            healthyRelationshipVision: extractedProfile.lovePhilosophy.healthyRelationshipVision ?? undefined,
            bestAdviceReceived: undefined,
          }
        : undefined,
      // Partner preferences
      partnerPreferences: extractedProfile.partnerPreferences
        ? {
            mustHaves: extractedProfile.partnerPreferences.mustHaves || [],
            niceToHaves: extractedProfile.partnerPreferences.niceToHaves || [],
            redFlags: extractedProfile.partnerPreferences.redFlags || [],
            importantQualities: [],
            dealbreakersInPartner: extractedProfile.partnerPreferences.dealbreakersInPartner || [],
          }
        : undefined,
      // Bio elements
      bioElements: extractedProfile.bioElements
        ? {
            conversationStarters: extractedProfile.bioElements.conversationStarters || [],
            interestingFacts: extractedProfile.bioElements.interestingFacts || [],
            uniqueQuirks: extractedProfile.bioElements.uniqueQuirks || [],
            passions: extractedProfile.bioElements.passions || [],
            whatTheySek: undefined,
          }
        : undefined,
      // Generated content
      generatedBio: extractedProfile.generatedBio ?? undefined,
      shortBio: extractedProfile.shortBio ?? undefined,
      keywords: extractedProfile.keywords || [],
      // Metadata
      processedAt: Date.now(),
      openaiModel: DEFAULT_MODEL,
      confidence: extractedProfile.confidence ?? 0.5,
    };

    // Save the profile
    await ctx.runMutation(internal.userProfiles.upsertProfile, { profile });

    console.log(`Voice profile parsing complete for user ${args.userId}`);
    return { success: true, confidence: extractedProfile.confidence };
  },
});

// Public action to manually trigger voice profile parsing
export const triggerVoiceProfileParsing = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.actions.parseVoiceProfile.parseVoiceProfile, {
      userId: args.userId,
    });
    return { scheduled: true };
  },
});
