'use node';

import { v } from 'convex/values';
import { action, internalAction } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import {
  extractStructuredDataWithUsage,
  DEFAULT_MODEL,
  formatCost,
  calculateCost,
  type TokenUsage,
} from '../lib/openai';
import { isGenderCompatible } from '../lib/compatibility';
import { filterProfile as applyHiddenFilter } from '../lib/filterProfile';
import { requireAdmin } from '../lib/admin';
import {
  type CategoryScores,
  type CategorySummaries,
  type CategoryKey,
  CATEGORY_KEYS,
  categoryScoresPromptJson,
  categoryDescriptionsPrompt,
  sumCategoryScores,
} from '../lib/compatibilityCategories';

// Build profile summary string for the prompt
function formatProfile(name: string, user: any, rawProfile: any): string {
  // Strip hidden fields before building the compatibility prompt
  const profile = applyHiddenFilter(rawProfile, rawProfile.hiddenFields ?? undefined);
  const age = user.birthdate
    ? Math.floor((Date.now() - new Date(user.birthdate).getTime()) / 31557600000)
    : 'unknown';

  const lines: string[] = [];
  lines.push(`## ${name}`);
  const demoParts = [
    `${age} years old`,
    user.gender || 'unknown',
    user.location || 'unknown location',
  ];
  if (user.heightInches)
    demoParts.push(`${Math.floor(user.heightInches / 12)}'${user.heightInches % 12}" tall`);
  if (user.ethnicity) demoParts.push(user.ethnicity);
  lines.push(`**Demographics:** ${demoParts.join(', ')}`);
  if (user.ageRangeMin && user.ageRangeMax) {
    lines.push(
      `**Preferred Partner Age Range:** ${user.ageRangeMin}-${user.ageRangeMax} (dealbreaker: ${user.ageRangeDealbreaker ? 'yes' : 'no'})`
    );
  }
  lines.push(`**Relationship Goal:** ${user.relationshipGoal || 'not specified'}`);
  lines.push(`**Wants Children:** ${user.wantsChildren || 'not specified'}`);
  lines.push(`**Relationship Type:** ${user.relationshipType || 'not specified'}`);

  // Personality traits — only include traits that have values
  const traitLabels: Record<string, string> = {
    introversion: 'Introversion (1=extrovert, 10=introvert)',
    adventurousness: 'Adventurousness',
    ambition: 'Ambition',
    emotionalOpenness: 'Emotional Openness',
    traditionalValues: 'Traditional Values (1=progressive, 10=traditional)',
    independenceNeed: 'Independence Need',
    romanticStyle: 'Romantic Style (1=practical, 10=romantic)',
    socialEnergy: 'Social Energy (1=homebody, 10=social butterfly)',
    attachmentStyle: 'Attachment (1=avoidant, 10=anxious)',
    planningStyle: 'Planning (1=spontaneous, 10=structured)',
  };
  const traitLines: string[] = [];
  for (const [key, label] of Object.entries(traitLabels)) {
    const val = profile.traits?.[key];
    if (val != null) traitLines.push(`- ${label}: ${val}`);
  }
  if (traitLines.length) {
    lines.push(`\n**Personality Traits (1-10):**`);
    lines.push(...traitLines);
  }

  // Values & interests
  if (profile.canonicalValues?.length)
    lines.push(`\n**Core Values:** ${profile.canonicalValues.join(', ')}`);
  if (profile.values?.length) lines.push(`**Values:** ${profile.values.join(', ')}`);
  if (profile.interests?.length) lines.push(`**Interests:** ${profile.interests.join(', ')}`);
  if (profile.dealbreakers?.length)
    lines.push(`**Dealbreakers:** ${profile.dealbreakers.join(', ')}`);

  // Relationship style — only include fields that have values
  const rs = profile.relationshipStyle;
  if (rs) {
    const rsLines: string[] = [];
    if (rs.loveLanguage) rsLines.push(`- Love Language: ${rs.loveLanguage}`);
    if (rs.financialApproach) rsLines.push(`- Financial Approach: ${rs.financialApproach}`);
    if (rs.aloneTimeNeed != null) rsLines.push(`- Alone Time Need: ${rs.aloneTimeNeed}/10`);
    if (rsLines.length) {
      lines.push(`\n**Relationship Style:**`);
      lines.push(...rsLines);
    }
  }

  // Lifestyle — only include fields that have values
  const ls = profile.lifestyle;
  if (ls) {
    const lsLines: string[] = [];
    if (ls.sleepSchedule) lsLines.push(`- Sleep: ${ls.sleepSchedule}`);
    if (ls.exerciseLevel) lsLines.push(`- Exercise: ${ls.exerciseLevel}`);
    if (ls.alcoholUse) lsLines.push(`- Alcohol: ${ls.alcoholUse}`);
    if (ls.drugUse) lsLines.push(`- Drugs: ${ls.drugUse}`);
    if (ls.locationPreference) lsLines.push(`- Location: ${ls.locationPreference}`);
    if (ls.petPreference) lsLines.push(`- Pets: ${ls.petPreference}`);
    if (lsLines.length) {
      lines.push(`\n**Lifestyle:**`);
      lines.push(...lsLines);
    }
  }

  // Family
  const fp = profile.familyPlans;
  lines.push(`\n**Family Plans:**`);
  lines.push(
    `- Wants Kids: ${fp.wantsKids}${fp.kidsTimeline ? `, Timeline: ${fp.kidsTimeline}` : ''}`
  );
  if (fp.familyCloseness != null) lines.push(`- Family Closeness: ${fp.familyCloseness}/10`);

  // Partner preferences
  if (profile.partnerPreferences) {
    const pp = profile.partnerPreferences;
    lines.push(`\n**Partner Preferences:**`);
    if (pp.mustHaves?.length) lines.push(`- Must Haves: ${pp.mustHaves.join(', ')}`);
    if (pp.dealbreakersInPartner?.length)
      lines.push(`- Dealbreakers in Partner: ${pp.dealbreakersInPartner.join(', ')}`);
    if (pp.redFlags?.length) lines.push(`- Red Flags: ${pp.redFlags.join(', ')}`);
    if (pp.niceToHaves?.length) lines.push(`- Nice to Haves: ${pp.niceToHaves.join(', ')}`);
  }

  // Life story
  if (profile.lifeStory) {
    const story = profile.lifeStory;
    lines.push(`\n**Life Story:**`);
    if (story.proudestAchievement)
      lines.push(`- Proudest Achievement: ${story.proudestAchievement}`);
    if (story.definingHardship) lines.push(`- Defining Challenge: ${story.definingHardship}`);
    if (story.dreams?.length) lines.push(`- Dreams: ${story.dreams.join(', ')}`);
    if (story.fears?.length) lines.push(`- Fears: ${story.fears.join(', ')}`);
  }

  // Love philosophy
  if (profile.lovePhilosophy) {
    const lp = profile.lovePhilosophy;
    lines.push(`\n**Love Philosophy:**`);
    if (lp.loveDefinition) lines.push(`- Love Definition: ${lp.loveDefinition}`);
    if (lp.healthyRelationshipVision)
      lines.push(`- Healthy Relationship: ${lp.healthyRelationshipVision}`);
  }

  // Intimacy — only include fields that have values
  if (profile.intimacyProfile) {
    const ip = profile.intimacyProfile;
    const ipLines: string[] = [];
    if (ip.physicalIntimacyImportance != null)
      ipLines.push(`- Physical Intimacy Importance: ${ip.physicalIntimacyImportance}/10`);
    if (ip.pdaComfort) ipLines.push(`- PDA Comfort: ${ip.pdaComfort}`);
    if (ip.connectionTriggers?.length)
      ipLines.push(`- Connection Triggers: ${ip.connectionTriggers.join(', ')}`);
    if (ipLines.length) {
      lines.push(`\n**Intimacy:**`);
      lines.push(...ipLines);
    }
  }

  // Attraction profile
  if (profile.attractionProfile) {
    const ap = profile.attractionProfile;
    const apLines: string[] = [];
    if (ap.physicalPreferences?.length)
      apLines.push(`- Physically attracted to: ${ap.physicalPreferences.join(', ')}`);
    if (ap.nonPhysicalPreferences?.length)
      apLines.push(`- Non-physical attraction: ${ap.nonPhysicalPreferences.join(', ')}`);
    if (ap.attractionStyle) apLines.push(`- Attraction style: ${ap.attractionStyle}`);
    if (ap.physicalSelfDescription)
      apLines.push(`- Physical self-description: ${ap.physicalSelfDescription}`);
    if (apLines.length) {
      lines.push(`\n**Attraction:**`);
      lines.push(...apLines);
    }
  }

  // Social — only include fields that have values
  if (profile.socialProfile) {
    const sp = profile.socialProfile;
    const spLines: string[] = [];
    if (sp.socialStyle) spLines.push(`- Style: ${sp.socialStyle}`);
    if (sp.goOutFrequency != null) spLines.push(`- Go Out: ${sp.goOutFrequency}/10`);
    if (spLines.length) {
      lines.push(`\n**Social:**`);
      lines.push(...spLines);
    }
  }

  // Bio
  if (profile.generatedBio) {
    lines.push(`\n**Bio:** ${profile.generatedBio}`);
  }

  return lines.join('\n');
}

const SYSTEM_PROMPT = `You are a relationship compatibility analyst for a dating app. You will be given two user profiles extracted from voice interviews. Analyze their compatibility thoroughly and honestly.

Return a JSON object with this exact structure:
{
  "summary": "A 3-4 sentence paragraph summarizing how good of a match these two would be. Highlight their strongest points of connection and mention any significant risks. Be specific to THEIR profiles, not generic. Use their first names.",
  "greenFlags": ["Each item: a specific shared value, uncommon similarity, or strong alignment. 3-6 items."],
  "yellowFlags": ["Things not perfectly aligned but not dealbreakers. Differences requiring compromise. 2-4 items."],
  "redFlags": ["Genuine dealbreakers or serious misalignments where one person cares deeply about something the other contradicts. 0-3 items. Only include if truly significant."],
  "categoryScores": {
${categoryScoresPromptJson}
  }
}

Category definitions:
${categoryDescriptionsPrompt}

Scoring guidelines per category:
- 10: Clear compatibility. They don't need to be identical — aligned, complementary, or compatible counts.
- 8-9: Good match with minor differences
- 6-7: Moderate compatibility, some meaningful gaps
- 4-5: Notable misalignment, would require real compromise
- 1-3: Fundamental incompatibility or contradictory values

IMPORTANT: Compatibility does NOT mean identical. Two people who are clearly compatible on paper should score near 100. 10/10 in a category means "these two are compatible here" — not "they are clones." Overlapping worlds, complementary energy, and shared direction all count. Do NOT apply an artificial curve or hold back high scores. If the profiles align, score high. The overall score is the sum of all 10 category scores.

IMPORTANT: These profiles were extracted from open-ended voice interviews, not structured questionnaires. Some fields may be sparse or missing — this is expected. Only base your analysis on the data that is actually present. Do not penalize profiles for missing fields, and do not speculate about fields that aren't provided.`;

// Raw shape from AI — each category has score + summary bundled together
interface RawAnalysisResult {
  summary: string;
  greenFlags: string[];
  yellowFlags: string[];
  redFlags: string[];
  categoryScores: Record<CategoryKey, { score: number; summary: string }>;
}

function splitCategoryScores(raw: RawAnalysisResult['categoryScores']): {
  scores: CategoryScores;
  summaries: CategorySummaries;
} {
  const scores = {} as CategoryScores;
  const summaries = {} as CategorySummaries;
  for (const k of CATEGORY_KEYS) {
    const entry = raw[k as CategoryKey];
    scores[k as CategoryKey] = entry?.score ?? 5;
    summaries[k as CategoryKey] = entry?.summary ?? '';
  }
  return { scores, summaries };
}

type AnalyzeArgs = {
  user1Id: Id<'users'>;
  user2Id: Id<'users'>;
  model?: string;
};

async function runCompatibilityAnalysis(
  ctx: {
    runQuery: any;
    runMutation: any;
  },
  args: AnalyzeArgs
) {
  const model = args.model ?? DEFAULT_MODEL;

  // Check if already exists (skip unless model override = forced re-run)
  if (!args.model) {
    const existing = await ctx.runQuery(internal.compatibilityAnalyses.getForPairInternal, {
      user1Id: args.user1Id,
      user2Id: args.user2Id,
    });
    if (existing) {
      console.log(`Analysis already exists for pair, skipping`);
      return { docId: existing._id, usage: null, cost: 0 };
    }
  }

  // Fetch both profiles and users
  const [user1, user2, profile1, profile2] = await Promise.all([
    ctx.runQuery(internal.users.getById, { userId: args.user1Id }),
    ctx.runQuery(internal.users.getById, { userId: args.user2Id }),
    ctx.runQuery(internal.userProfiles.getByUserInternal, { userId: args.user1Id }),
    ctx.runQuery(internal.userProfiles.getByUserInternal, { userId: args.user2Id }),
  ]);

  if (!user1 || !user2 || !profile1 || !profile2) {
    throw new Error('Missing user or profile data');
  }

  const name1 = user1.name?.split(' ')[0] || 'Person A';
  const name2 = user2.name?.split(' ')[0] || 'Person B';

  // Build prompt
  const userContent = [
    formatProfile(name1, user1, profile1),
    '\n---\n',
    formatProfile(name2, user2, profile2),
  ].join('\n');

  console.log(`Analyzing compatibility [${model}]: ${name1} <-> ${name2}`);

  // Call LLM via OpenRouter
  const result = await extractStructuredDataWithUsage<RawAnalysisResult>(
    SYSTEM_PROMPT,
    userContent,
    {
      model,
    }
  );

  const raw = result.data;
  const { scores: categoryScores, summaries: categorySummaries } = splitCategoryScores(
    raw.categoryScores
  );
  console.log(`Compatibility analysis complete [${model}] (${formatCost(result.cost)})`);

  // Calculate overall score
  let overallScore = sumCategoryScores(categoryScores);

  // Dealbreaker penalty: red flags tank the score
  // First red flag: x0.6, each additional: x0.75
  const redFlagCount = raw.redFlags.length;
  if (redFlagCount > 0) {
    overallScore *= 0.6; // first red flag
    for (let i = 1; i < redFlagCount; i++) {
      overallScore *= 0.75; // each additional
    }
  }
  overallScore = Math.round(overallScore);

  // Store result (upserts — replaces existing for same pair)
  const docId = await ctx.runMutation(internal.compatibilityAnalyses.store, {
    user1Id: args.user1Id,
    user2Id: args.user2Id,
    summary: raw.summary,
    greenFlags: raw.greenFlags,
    yellowFlags: raw.yellowFlags,
    redFlags: raw.redFlags,
    categoryScores,
    categorySummaries,
    overallScore,
    openaiModel: model,
  });

  console.log(
    `Stored analysis: score=${overallScore}, green=${raw.greenFlags.length}, yellow=${raw.yellowFlags.length}, red=${raw.redFlags.length}`
  );
  return { docId, usage: result.usage, cost: result.cost };
}

export const analyzeCompatibility = action({
  args: {
    user1Id: v.id('users'),
    user2Id: v.id('users'),
    model: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    docId: Id<'compatibilityAnalyses'> | null;
    usage: null;
    cost: number;
    queued: boolean;
  }> => {
    const currentUser = await ctx.runQuery(api.users.current, {});
    if (!currentUser) throw new Error('Not authenticated');
    if (currentUser._id !== args.user1Id && currentUser._id !== args.user2Id) {
      throw new Error('Forbidden');
    }
    // DEPRECATED: Public trigger is intentionally disabled to prevent abuse.
    // Compatibility generation is backend-triggered on profile parse/update.
    const existing: { _id: Id<'compatibilityAnalyses'> } | null = await ctx.runQuery(
      internal.compatibilityAnalyses.getForPairInternal,
      { user1Id: args.user1Id, user2Id: args.user2Id }
    );
    return {
      docId: existing?._id ?? null,
      usage: null,
      cost: 0,
      queued: false,
    };
  },
});

export const analyzeCompatibilityInternal = internalAction({
  args: {
    user1Id: v.id('users'),
    user2Id: v.id('users'),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await runCompatibilityAnalysis(ctx, args);
  },
});

// Gender/sexuality compatibility imported from shared lib

// Run compatibility analyses for a newly-profiled user against all eligible users
export const analyzeAllForUser = internalAction({
  args: { userId: v.id('users'), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const MAX_ELIGIBLE_PER_RUN = 20;
    const USERS_PAGE_SIZE = 100;
    const ANALYSIS_BATCH_SIZE = 4;
    const newUser = await ctx.runQuery(internal.users.getById, {
      userId: args.userId,
    });

    if (!newUser) {
      console.error(`analyzeAllForUser: user ${args.userId} not found`);
      return;
    }

    const existingAnalyses = await ctx.runQuery(
      internal.compatibilityAnalyses.listForUserInternal,
      { userId: args.userId, limit: 2000 }
    );
    const existingOtherUserIds = new Set(
      existingAnalyses.map((a) => (a.user1Id === args.userId ? a.user2Id : a.user1Id))
    );

    const eligible: Id<'users'>[] = [];
    let cursor = args.cursor ?? null;
    let isDone = false;

    while (!isDone && eligible.length < MAX_ELIGIBLE_PER_RUN) {
      const page = await ctx.runQuery(internal.users.listPaginated, {
        paginationOpts: { numItems: USERS_PAGE_SIZE, cursor },
      });

      cursor = page.continueCursor;
      isDone = page.isDone;

      for (const user of page.page) {
        if (eligible.length >= MAX_ELIGIBLE_PER_RUN) break;
        if (user._id === args.userId) continue;
        if (existingOtherUserIds.has(user._id)) continue;
        if (!isGenderCompatible(newUser, user)) continue;

        const hasProfile = await ctx.runQuery(internal.userProfiles.hasProfileInternal, {
          userId: user._id,
        });
        if (!hasProfile) continue;

        eligible.push(user._id);
      }
    }

    console.log(`analyzeAllForUser: ${newUser.name} — ${eligible.length} eligible matches`);

    let analyzed = 0;
    for (let i = 0; i < eligible.length; i += ANALYSIS_BATCH_SIZE) {
      const batch = eligible.slice(i, i + ANALYSIS_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((otherUserId) =>
          ctx.runAction(internal.actions.analyzeCompatibility.analyzeCompatibilityInternal, {
            user1Id: args.userId,
            user2Id: otherUserId,
          })
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          analyzed++;
        } else {
          console.error(`Failed to analyze ${newUser.name} compatibility pair:`, result.reason);
        }
      }
    }

    const shouldContinue = !isDone && !!cursor;
    if (shouldContinue) {
      await ctx.scheduler.runAfter(0, internal.actions.analyzeCompatibility.analyzeAllForUser, {
        userId: args.userId,
        cursor: cursor!,
      });
    }

    console.log(
      `analyzeAllForUser: completed ${analyzed}/${eligible.length} analyses for ${newUser.name}`
    );
    return {
      analyzed,
      total: eligible.length,
      continuationScheduled: shouldContinue,
    };
  },
});

// Benchmark: re-run ALL existing analyses with a specific model.
// Runs each pair inline (no nested actions) to avoid overhead, batched to stay under timeout.
export const rerunAllAnalyses = action({
  args: { model: v.string(), adminSecret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);

    const allAnalyses = await ctx.runQuery(internal.compatibilityAnalyses.listAllInternal, {});

    console.log(`\n========================================`);
    console.log(`BENCHMARK: Re-running ${allAnalyses.length} analyses with ${args.model}`);
    console.log(`========================================\n`);

    const stats: {
      pair: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    }[] = [];

    // Process in parallel batches of 5 to stay under timeout
    const BATCH_SIZE = 5;
    for (let i = 0; i < allAnalyses.length; i += BATCH_SIZE) {
      const batch = allAnalyses.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (analysis) => {
          const [user1, user2, profile1, profile2] = await Promise.all([
            ctx.runQuery(internal.users.getById, { userId: analysis.user1Id }),
            ctx.runQuery(internal.users.getById, { userId: analysis.user2Id }),
            ctx.runQuery(internal.userProfiles.getByUserInternal, { userId: analysis.user1Id }),
            ctx.runQuery(internal.userProfiles.getByUserInternal, { userId: analysis.user2Id }),
          ]);

          if (!user1 || !user2 || !profile1 || !profile2) {
            throw new Error(`Missing data for pair ${analysis.userIdPair}`);
          }

          const name1 = user1.name?.split(' ')[0] || 'Person A';
          const name2 = user2.name?.split(' ')[0] || 'Person B';

          const userContent = [
            formatProfile(name1, user1, profile1),
            '\n---\n',
            formatProfile(name2, user2, profile2),
          ].join('\n');

          const result = await extractStructuredDataWithUsage<RawAnalysisResult>(
            SYSTEM_PROMPT,
            userContent,
            { model: args.model }
          );

          const a = result.data;
          const { scores, summaries } = splitCategoryScores(a.categoryScores);
          let overallScore = sumCategoryScores(scores);

          const redFlagCount = a.redFlags.length;
          if (redFlagCount > 0) {
            overallScore *= 0.6;
            for (let i = 1; i < redFlagCount; i++) overallScore *= 0.75;
          }
          overallScore = Math.round(overallScore);

          await ctx.runMutation(internal.compatibilityAnalyses.store, {
            user1Id: analysis.user1Id,
            user2Id: analysis.user2Id,
            summary: a.summary,
            greenFlags: a.greenFlags,
            yellowFlags: a.yellowFlags,
            redFlags: a.redFlags,
            categoryScores: scores,
            categorySummaries: summaries,
            overallScore,
            openaiModel: args.model,
          });

          console.log(
            `[${args.model}] ${name1}<->${name2}: score=${overallScore}, cost=${formatCost(result.cost)}, tokens=${result.usage.totalTokens}`
          );

          return {
            pair: `${name1}<->${name2}`,
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
            cost: result.cost,
          };
        })
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled') stats.push(r.value);
        else console.error(`Failed:`, r.reason);
      }
    }

    // Report
    const totalCost = stats.reduce((s, r) => s + r.cost, 0);
    const totalPrompt = stats.reduce((s, r) => s + r.promptTokens, 0);
    const totalCompletion = stats.reduce((s, r) => s + r.completionTokens, 0);
    const totalTokens = stats.reduce((s, r) => s + r.totalTokens, 0);
    const n = stats.length;

    console.log(`\n========================================`);
    console.log(`BENCHMARK RESULTS: ${args.model}`);
    console.log(`========================================`);
    console.log(`Pairs analyzed: ${n}`);
    console.log(
      `Total tokens: ${totalTokens} (prompt: ${totalPrompt}, completion: ${totalCompletion})`
    );
    console.log(`Total cost: ${formatCost(totalCost)}`);
    if (n > 0) {
      console.log(
        `Avg tokens/run: ${Math.round(totalTokens / n)} (prompt: ${Math.round(totalPrompt / n)}, completion: ${Math.round(totalCompletion / n)})`
      );
      console.log(`Avg cost/run: ${formatCost(totalCost / n)}`);
    }
    console.log(`========================================\n`);

    return {
      model: args.model,
      pairsAnalyzed: n,
      totalTokens,
      totalPromptTokens: totalPrompt,
      totalCompletionTokens: totalCompletion,
      totalCost,
      avgTokensPerRun: n > 0 ? Math.round(totalTokens / n) : 0,
      avgCostPerRun: n > 0 ? totalCost / n : 0,
    };
  },
});

// Schedule analyzeAllForUser for every user that has a parsed profile
export const regenerateAllCompatibility = action({
  args: { adminSecret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);
    const allProfiles = await ctx.runQuery(internal.userProfiles.listAllUserIds);
    console.log(`Scheduling compatibility for ${allProfiles.length} users`);
    for (let i = 0; i < allProfiles.length; i++) {
      await ctx.scheduler.runAfter(
        i * 2000,
        internal.actions.analyzeCompatibility.analyzeAllForUser,
        { userId: allProfiles[i] }
      );
      console.log(`Scheduled ${allProfiles[i]} (delay: ${i * 2}s)`);
    }
    return { scheduled: allProfiles.length };
  },
});
