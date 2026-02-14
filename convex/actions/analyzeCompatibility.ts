"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import {
  extractStructuredDataWithUsage,
  DEFAULT_MODEL,
  formatCost,
} from "../lib/openai";

// Build profile summary string for the prompt
function formatProfile(
  name: string,
  user: any,
  profile: any,
): string {
  const age = user.birthdate
    ? Math.floor((Date.now() - new Date(user.birthdate).getTime()) / 31557600000)
    : "unknown";

  const lines: string[] = [];
  lines.push(`## ${name}`);
  lines.push(`**Demographics:** ${age} years old, ${user.gender || "unknown"}, ${user.location || "unknown location"}`);
  if (user.ageRangeMin && user.ageRangeMax) {
    lines.push(`**Preferred Partner Age Range:** ${user.ageRangeMin}-${user.ageRangeMax} (dealbreaker: ${user.ageRangeDealbreaker ? "yes" : "no"})`);
  }
  lines.push(`**Relationship Goal:** ${user.relationshipGoal || "not specified"}`);
  lines.push(`**Wants Children:** ${user.wantsChildren || "not specified"}`);
  lines.push(`**Relationship Type:** ${user.relationshipType || "not specified"}`);

  // Personality traits
  lines.push(`\n**Personality Traits (1-10):**`);
  const traitLabels: Record<string, string> = {
    introversion: "Introversion (1=extrovert, 10=introvert)",
    adventurousness: "Adventurousness",
    ambition: "Ambition",
    emotionalOpenness: "Emotional Openness",
    traditionalValues: "Traditional Values (1=progressive, 10=traditional)",
    independenceNeed: "Independence Need",
    romanticStyle: "Romantic Style (1=practical, 10=romantic)",
    socialEnergy: "Social Energy (1=homebody, 10=social butterfly)",
    communicationStyle: "Communication (1=reserved, 10=expressive)",
    attachmentStyle: "Attachment (1=avoidant, 10=anxious)",
    planningStyle: "Planning (1=spontaneous, 10=structured)",
  };
  for (const [key, label] of Object.entries(traitLabels)) {
    const val = profile.traits[key];
    if (val !== undefined) lines.push(`- ${label}: ${val}`);
  }

  // Values & interests
  if (profile.canonicalValues?.length) lines.push(`\n**Core Values:** ${profile.canonicalValues.join(", ")}`);
  if (profile.values?.length) lines.push(`**Values:** ${profile.values.join(", ")}`);
  if (profile.interests?.length) lines.push(`**Interests:** ${profile.interests.join(", ")}`);
  if (profile.dealbreakers?.length) lines.push(`**Dealbreakers:** ${profile.dealbreakers.join(", ")}`);

  // Relationship style
  const rs = profile.relationshipStyle;
  lines.push(`\n**Relationship Style:**`);
  lines.push(`- Love Language: ${rs.loveLanguage}`);
  lines.push(`- Conflict Style: ${rs.conflictStyle}`);
  lines.push(`- Communication Frequency: ${rs.communicationFrequency}`);
  lines.push(`- Financial Approach: ${rs.financialApproach}`);
  lines.push(`- Alone Time Need: ${rs.aloneTimeNeed}/10`);

  // Lifestyle
  const ls = profile.lifestyle;
  lines.push(`\n**Lifestyle:**`);
  lines.push(`- Sleep: ${ls.sleepSchedule}, Exercise: ${ls.exerciseLevel}`);
  lines.push(`- Alcohol: ${ls.alcoholUse}, Drugs: ${ls.drugUse}`);
  lines.push(`- Location: ${ls.locationPreference}, Pets: ${ls.petPreference}`);

  // Family
  const fp = profile.familyPlans;
  lines.push(`\n**Family Plans:**`);
  lines.push(`- Wants Kids: ${fp.wantsKids}${fp.kidsTimeline ? `, Timeline: ${fp.kidsTimeline}` : ""}`);
  lines.push(`- Family Closeness: ${fp.familyCloseness}/10`);

  // Partner preferences
  if (profile.partnerPreferences) {
    const pp = profile.partnerPreferences;
    lines.push(`\n**Partner Preferences:**`);
    if (pp.mustHaves?.length) lines.push(`- Must Haves: ${pp.mustHaves.join(", ")}`);
    if (pp.dealbreakersInPartner?.length) lines.push(`- Dealbreakers in Partner: ${pp.dealbreakersInPartner.join(", ")}`);
    if (pp.redFlags?.length) lines.push(`- Red Flags: ${pp.redFlags.join(", ")}`);
    if (pp.niceToHaves?.length) lines.push(`- Nice to Haves: ${pp.niceToHaves.join(", ")}`);
  }

  // Life story
  if (profile.lifeStory) {
    const ls = profile.lifeStory;
    lines.push(`\n**Life Story:**`);
    if (ls.proudestAchievement) lines.push(`- Proudest Achievement: ${ls.proudestAchievement}`);
    if (ls.definingHardship) lines.push(`- Defining Challenge: ${ls.definingHardship}`);
    if (ls.dreams?.length) lines.push(`- Dreams: ${ls.dreams.join(", ")}`);
    if (ls.fears?.length) lines.push(`- Fears: ${ls.fears.join(", ")}`);
  }

  // Love philosophy
  if (profile.lovePhilosophy) {
    const lp = profile.lovePhilosophy;
    lines.push(`\n**Love Philosophy:**`);
    if (lp.loveDefinition) lines.push(`- Love Definition: ${lp.loveDefinition}`);
    lines.push(`- Believes in Soulmates: ${lp.believesInSoulmates}`);
    if (lp.healthyRelationshipVision) lines.push(`- Healthy Relationship: ${lp.healthyRelationshipVision}`);
  }

  // Intimacy
  if (profile.intimacyProfile) {
    const ip = profile.intimacyProfile;
    lines.push(`\n**Intimacy:**`);
    lines.push(`- Physical Intimacy Importance: ${ip.physicalIntimacyImportance}/10`);
    lines.push(`- PDA Comfort: ${ip.pdaComfort}`);
    if (ip.connectionTriggers?.length) lines.push(`- Connection Triggers: ${ip.connectionTriggers.join(", ")}`);
  }

  // Social
  if (profile.socialProfile) {
    const sp = profile.socialProfile;
    lines.push(`\n**Social:**`);
    lines.push(`- Style: ${sp.socialStyle}, Go Out: ${sp.goOutFrequency}/10`);
  }

  // Bio
  if (profile.generatedBio) {
    lines.push(`\n**Bio:** ${profile.generatedBio}`);
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a relationship compatibility analyst for a dating app. You will be given two user profiles extracted from voice interviews. Analyze their compatibility thoroughly and honestly.

Return a JSON object with this exact structure:
{
  "summary": "A 3-4 sentence paragraph summarizing how good of a match these two would be. Highlight their strongest points of connection and mention any significant risks. Be specific to THEIR profiles, not generic. Use their first names.",
  "greenFlags": ["Each item: a specific shared value, uncommon similarity, or strong alignment. 3-6 items."],
  "yellowFlags": ["Things not perfectly aligned but not dealbreakers. Differences requiring compromise. 2-4 items."],
  "redFlags": ["Genuine dealbreakers or serious misalignments where one person cares deeply about something the other contradicts. 0-3 items. Only include if truly significant."],
  "categoryScores": {
    "coreValues": <0-10>,
    "lifestyleAlignment": <0-10>,
    "relationshipGoals": <0-10>,
    "communicationStyle": <0-10>,
    "emotionalCompatibility": <0-10>,
    "familyPlanning": <0-10>,
    "socialLifestyle": <0-10>,
    "conflictResolution": <0-10>,
    "intimacyAlignment": <0-10>,
    "growthMindset": <0-10>
  }
}

Scoring guidelines per category:
- 9-10: Exceptional alignment, rare compatibility
- 7-8: Strong match, minor complementary differences
- 5-6: Moderate compatibility, meaningful differences to navigate
- 3-4: Significant misalignment, substantial compromise needed
- 1-2: Fundamental incompatibility

Be honest and calibrated. Don't inflate scores. A total of 70/100 is a genuinely good match. 50/100 is mediocre. 85+ is exceptional and rare. The overall score is the sum of all 10 category scores.`;

interface AnalysisResult {
  summary: string;
  greenFlags: string[];
  yellowFlags: string[];
  redFlags: string[];
  categoryScores: {
    coreValues: number;
    lifestyleAlignment: number;
    relationshipGoals: number;
    communicationStyle: number;
    emotionalCompatibility: number;
    familyPlanning: number;
    socialLifestyle: number;
    conflictResolution: number;
    intimacyAlignment: number;
    growthMindset: number;
  };
}

export const analyzeCompatibility = action({
  args: {
    user1Id: v.id("users"),
    user2Id: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.runQuery(
      internal.compatibilityAnalyses.getForPairInternal,
      { user1Id: args.user1Id, user2Id: args.user2Id },
    );
    if (existing) {
      console.log(`Analysis already exists for pair, skipping`);
      return existing._id;
    }

    // Fetch both profiles and users
    const [user1, user2, profile1, profile2] = await Promise.all([
      ctx.runQuery(internal.users.getById, { userId: args.user1Id }),
      ctx.runQuery(internal.users.getById, { userId: args.user2Id }),
      ctx.runQuery(internal.userProfiles.getByUserInternal, { userId: args.user1Id }),
      ctx.runQuery(internal.userProfiles.getByUserInternal, { userId: args.user2Id }),
    ]);

    if (!user1 || !user2 || !profile1 || !profile2) {
      throw new Error("Missing user or profile data");
    }

    const name1 = user1.name?.split(" ")[0] || "Person A";
    const name2 = user2.name?.split(" ")[0] || "Person B";

    // Build prompt
    const userContent = [
      formatProfile(name1, user1, profile1),
      "\n---\n",
      formatProfile(name2, user2, profile2),
    ].join("\n");

    console.log(`Analyzing compatibility: ${name1} <-> ${name2}`);

    // Call GPT
    const result = await extractStructuredDataWithUsage<AnalysisResult>(
      SYSTEM_PROMPT,
      userContent,
      { maxTokens: 4000 },
    );

    const analysis = result.data;
    console.log(`Compatibility analysis complete (${formatCost(result.cost)})`);

    // Calculate overall score
    const scores = analysis.categoryScores;
    let overallScore =
      scores.coreValues +
      scores.lifestyleAlignment +
      scores.relationshipGoals +
      scores.communicationStyle +
      scores.emotionalCompatibility +
      scores.familyPlanning +
      scores.socialLifestyle +
      scores.conflictResolution +
      scores.intimacyAlignment +
      scores.growthMindset;

    // Dealbreaker penalty: red flags tank the score
    // First red flag: x0.6, each additional: x0.75
    const redFlagCount = analysis.redFlags.length;
    if (redFlagCount > 0) {
      overallScore *= 0.6; // first red flag
      for (let i = 1; i < redFlagCount; i++) {
        overallScore *= 0.75; // each additional
      }
    }
    overallScore = Math.round(overallScore);

    // Store result
    const docId = await ctx.runMutation(
      internal.compatibilityAnalyses.store,
      {
        user1Id: args.user1Id,
        user2Id: args.user2Id,
        summary: analysis.summary,
        greenFlags: analysis.greenFlags,
        yellowFlags: analysis.yellowFlags,
        redFlags: analysis.redFlags,
        categoryScores: analysis.categoryScores,
        overallScore,
        openaiModel: DEFAULT_MODEL,
      },
    );

    console.log(`Stored analysis: score=${overallScore}, green=${analysis.greenFlags.length}, yellow=${analysis.yellowFlags.length}, red=${analysis.redFlags.length}`);
    return docId;
  },
});

// Gender/sexuality compatibility check (server-side version)
function isGenderCompatible(
  me: { sexuality?: string; gender?: string },
  them: { sexuality?: string; gender?: string },
): boolean {
  if (!me.sexuality || !me.gender || !them.sexuality || !them.gender) return true;
  const attractedTo = (sexuality: string, gender: string): string[] => {
    const s = sexuality.toLowerCase();
    if (s === "women") return ["woman"];
    if (s === "men") return ["man"];
    if (s === "everyone") return ["man", "woman", "non-binary"];
    if (s === "bisexual" || s === "pansexual" || s === "queer") return ["man", "woman", "non-binary"];
    if (s === "straight" || s === "heterosexual") return gender.toLowerCase() === "man" ? ["woman"] : ["man"];
    if (s === "gay" || s === "lesbian" || s === "homosexual") return [gender.toLowerCase()];
    return ["man", "woman", "non-binary"];
  };
  const iWant = attractedTo(me.sexuality, me.gender);
  const theyWant = attractedTo(them.sexuality, them.gender);
  return iWant.includes(them.gender.toLowerCase()) && theyWant.includes(me.gender.toLowerCase());
}

// Run compatibility analyses for a newly-profiled user against all eligible users
export const analyzeAllForUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [newUser, allUsers, allProfiles] = await Promise.all([
      ctx.runQuery(internal.users.getById, { userId: args.userId }),
      ctx.runQuery(api.users.listAll),
      ctx.runQuery(api.userProfiles.listAll),
    ]);

    if (!newUser) {
      console.error(`analyzeAllForUser: user ${args.userId} not found`);
      return;
    }

    // Build set of user IDs that have profiles
    const usersWithProfiles = new Set(allProfiles.map((p) => p.userId));

    // Filter eligible users: has profile, not self, gender-compatible
    const eligible = allUsers.filter(
      (u) =>
        u._id !== args.userId &&
        usersWithProfiles.has(u._id) &&
        isGenderCompatible(newUser, u),
    );

    console.log(`analyzeAllForUser: ${newUser.name} — ${eligible.length} eligible matches`);

    let analyzed = 0;
    for (const user of eligible) {
      try {
        await ctx.runAction(
          api.actions.analyzeCompatibility.analyzeCompatibility,
          { user1Id: args.userId, user2Id: user._id },
        );
        analyzed++;
      } catch (err) {
        console.error(`Failed to analyze ${newUser.name} <-> ${user.name}:`, err);
      }
    }

    console.log(`analyzeAllForUser: completed ${analyzed}/${eligible.length} analyses for ${newUser.name}`);
    return { analyzed, total: eligible.length };
  },
});
