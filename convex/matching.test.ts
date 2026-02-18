import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import { setupTest } from "./test.setup";
import { Id } from "./_generated/dataModel";

const identity1 = { subject: "clerk_match_user1" };
const identity2 = { subject: "clerk_match_user2" };

const minProfile = {
  values: ["honesty"],
  interests: ["hiking"],
  dealbreakers: ["smoking"],
  traits: {
    introversion: 5, adventurousness: 7, ambition: 6,
    emotionalOpenness: 8, traditionalValues: 3, independenceNeed: 5,
    romanticStyle: 6, socialEnergy: 7, communicationStyle: 8,
    attachmentStyle: 5, planningStyle: 6,
  },
  relationshipStyle: {
    loveLanguage: "words", conflictStyle: "discuss",
    communicationFrequency: "daily", financialApproach: "split",
    aloneTimeNeed: 5,
  },
  familyPlans: { wantsKids: "yes", familyCloseness: 7 },
  lifestyle: {
    sleepSchedule: "normal", exerciseLevel: "moderate",
    alcoholUse: "social", drugUse: "none",
    petPreference: "dogs", locationPreference: "city",
  },
  keywords: ["honest"],
  processedAt: Date.now(),
  openaiModel: "test",
  confidence: 0.9,
};

const minAnalysis = {
  summary: "Great match",
  greenFlags: ["shared values"],
  yellowFlags: ["distance"],
  redFlags: [],
  categoryScores: {
    coreValues: 8, lifestyleAlignment: 7, relationshipGoals: 9,
    communicationStyle: 8, emotionalCompatibility: 7, familyPlanning: 8,
    socialLifestyle: 7, conflictResolution: 8, intimacyAlignment: 7,
    growthMindset: 8,
  },
  overallScore: 77,
  generatedAt: Date.now(),
  openaiModel: "test",
};

describe("getMatchesForCurrentUser", () => {
  it("returns empty array when no analyses exist", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity1);
    await as.mutation(api.users.getOrCreate, {});
    const matches = await as.query(api.matching.getMatchesForCurrentUser, {});
    expect(matches).toEqual([]);
  });

  it("returns matches sorted by overallScore descending", async () => {
    const t = setupTest();
    const as1 = t.withIdentity(identity1);
    const userId1 = await as1.mutation(api.users.getOrCreate, {});
    await t.run(async (ctx) => {
      await ctx.db.patch(userId1, { gender: "Man", sexuality: "Straight" });
    });

    // Create two other users with profiles and analyses
    const userId2 = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        clerkId: "clerk_other_1", gender: "Woman", sexuality: "Straight",
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: id });
      const ids = [userId1, id].sort();
      await ctx.db.insert("compatibilityAnalyses", {
        ...minAnalysis,
        overallScore: 60,
        userIdPair: `${ids[0]}_${ids[1]}`,
        user1Id: ids[0] as Id<"users">,
        user2Id: ids[1] as Id<"users">,
      });
      return id;
    });

    const userId3 = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        clerkId: "clerk_other_2", gender: "Woman", sexuality: "Straight",
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: id });
      const ids = [userId1, id].sort();
      await ctx.db.insert("compatibilityAnalyses", {
        ...minAnalysis,
        overallScore: 85,
        userIdPair: `${ids[0]}_${ids[1]}`,
        user1Id: ids[0] as Id<"users">,
        user2Id: ids[1] as Id<"users">,
      });
      return id;
    });

    const matches = await as1.query(api.matching.getMatchesForCurrentUser, {});
    expect(matches).toHaveLength(2);
    expect(matches![0].analysis.overallScore).toBe(85);
    expect(matches![1].analysis.overallScore).toBe(60);
  });

  it("filters out gender-incompatible users", async () => {
    const t = setupTest();
    const as1 = t.withIdentity(identity1);
    const userId1 = await as1.mutation(api.users.getOrCreate, {});
    await t.run(async (ctx) => {
      await ctx.db.patch(userId1, { gender: "Man", sexuality: "Straight" });
      // Same gender, same sexuality = incompatible
      const id = await ctx.db.insert("users", {
        clerkId: "clerk_same_gender", gender: "Man", sexuality: "Straight",
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: id });
      const ids = [userId1, id].sort();
      await ctx.db.insert("compatibilityAnalyses", {
        ...minAnalysis,
        userIdPair: `${ids[0]}_${ids[1]}`,
        user1Id: ids[0] as Id<"users">,
        user2Id: ids[1] as Id<"users">,
      });
    });

    const matches = await as1.query(api.matching.getMatchesForCurrentUser, {});
    expect(matches).toEqual([]);
  });

  it("filters out age-incompatible users (dealbreaker set)", async () => {
    const t = setupTest();
    const as1 = t.withIdentity(identity1);
    const userId1 = await as1.mutation(api.users.getOrCreate, {});
    await t.run(async (ctx) => {
      await ctx.db.patch(userId1, {
        gender: "Man", sexuality: "Straight",
        ageRangeDealbreaker: true, ageRangeMin: 25, ageRangeMax: 30,
      });
      // Create user who is 50 years old
      const birthdate50 = new Date(Date.now() - 50 * 365.25 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      const id = await ctx.db.insert("users", {
        clerkId: "clerk_old", gender: "Woman", sexuality: "Straight",
        birthdate: birthdate50,
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: id });
      const ids = [userId1, id].sort();
      await ctx.db.insert("compatibilityAnalyses", {
        ...minAnalysis,
        userIdPair: `${ids[0]}_${ids[1]}`,
        user1Id: ids[0] as Id<"users">,
        user2Id: ids[1] as Id<"users">,
      });
    });

    const matches = await as1.query(api.matching.getMatchesForCurrentUser, {});
    expect(matches).toEqual([]);
  });
});

describe("getMatchGenerationStatusForCurrentUser", () => {
  it("isAnalyzing true when audit complete + profile + no analyses + eligible candidates", async () => {
    const t = setupTest();
    const as1 = t.withIdentity(identity1);
    const userId1 = await as1.mutation(api.users.getOrCreate, {});
    await t.run(async (ctx) => {
      await ctx.db.patch(userId1, {
        gender: "Man", sexuality: "Straight",
        profileAuditCompletedAt: Date.now(),
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: userId1 });
      // Create an eligible candidate
      const id = await ctx.db.insert("users", {
        clerkId: "clerk_candidate", gender: "Woman", sexuality: "Straight",
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: id });
    });

    const status = await as1.query(api.matching.getMatchGenerationStatusForCurrentUser, {});
    expect(status?.isAnalyzing).toBe(true);
  });

  it("isAnalyzing false when analyses already exist", async () => {
    const t = setupTest();
    const as1 = t.withIdentity(identity1);
    const userId1 = await as1.mutation(api.users.getOrCreate, {});
    await t.run(async (ctx) => {
      await ctx.db.patch(userId1, {
        gender: "Man", sexuality: "Straight",
        profileAuditCompletedAt: Date.now(),
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: userId1 });
      const id = await ctx.db.insert("users", {
        clerkId: "clerk_candidate2", gender: "Woman", sexuality: "Straight",
      });
      await ctx.db.insert("userProfiles", { ...minProfile, userId: id });
      const ids = [userId1, id].sort();
      await ctx.db.insert("compatibilityAnalyses", {
        ...minAnalysis,
        userIdPair: `${ids[0]}_${ids[1]}`,
        user1Id: ids[0] as Id<"users">,
        user2Id: ids[1] as Id<"users">,
      });
    });

    const status = await as1.query(api.matching.getMatchGenerationStatusForCurrentUser, {});
    expect(status?.isAnalyzing).toBe(false);
  });

  it("isAnalyzing false when audit not completed", async () => {
    const t = setupTest();
    const as1 = t.withIdentity(identity1);
    await as1.mutation(api.users.getOrCreate, {});
    const status = await as1.query(api.matching.getMatchGenerationStatusForCurrentUser, {});
    expect(status?.isAnalyzing).toBe(false);
  });
});
