import { describe, it, expect, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { setupTest } from "./test.setup";
import { Id } from "./_generated/dataModel";

const identity = { subject: "clerk_e2e_user" };

const minProfile = (userId: Id<"users">) => ({
  userId,
  values: ["honesty", "loyalty"],
  interests: ["hiking", "cooking"],
  dealbreakers: ["smoking"],
  traits: {
    introversion: 5, adventurousness: 7, ambition: 6,
    emotionalOpenness: 8, traditionalValues: 3, independenceNeed: 5,
    romanticStyle: 6, socialEnergy: 7, communicationStyle: 8,
    attachmentStyle: 5, planningStyle: 6,
  },
  relationshipStyle: {
    loveLanguage: "words of affirmation", conflictStyle: "discuss calmly",
    communicationFrequency: "daily", financialApproach: "split",
    aloneTimeNeed: 5,
  },
  familyPlans: { wantsKids: "yes", familyCloseness: 7 },
  lifestyle: {
    sleepSchedule: "normal", exerciseLevel: "moderate",
    alcoholUse: "social", drugUse: "none",
    petPreference: "dogs", locationPreference: "city",
  },
  keywords: ["honest", "loyal"],
  processedAt: Date.now(),
  openaiModel: "test",
  confidence: 0.9,
});

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

describe("full user journey", () => {
  it("complete flow from account creation to matches", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);

    // 1. Create account
    const userId = await as.mutation(api.users.getOrCreate, {});
    expect(userId).toBeTruthy();

    // 2. Set each basics field
    await as.mutation(api.users.updateBasics, { name: "Jordan" });
    await as.mutation(api.users.updateBasics, { gender: "Man" });
    await as.mutation(api.users.updateBasics, { sexuality: "Straight" });
    await as.mutation(api.users.updateBasics, { location: "New York, NY" });
    await as.mutation(api.users.updateBasics, { birthdate: "1995-06-15" });
    await as.mutation(api.users.updateBasics, {
      ageRangeMin: 25, ageRangeMax: 35, ageRangeDealbreaker: true,
    });
    await as.mutation(api.users.updateBasics, { heightInches: 72 });
    await as.mutation(api.users.updateBasics, { relationshipGoal: "marriage" });
    await as.mutation(api.users.updateBasics, { relationshipType: "Monogamy" });
    await as.mutation(api.users.updateBasics, { hasChildren: "no" });
    await as.mutation(api.users.updateBasics, { wantsChildren: "yes" });
    await as.mutation(api.users.updateBasics, { ethnicity: "White" });
    await as.mutation(api.users.updateBasics, { hometown: "Boston, MA" });
    await as.mutation(api.users.updateBasics, { religion: "Agnostic", religionImportance: 3 });
    await as.mutation(api.users.updateBasics, { politicalLeaning: "moderate", politicalImportance: 4 });
    await as.mutation(api.users.updateBasics, { pets: "Dog" });
    await as.mutation(api.users.updateBasics, { drinking: "Sometimes", drinkingVisible: true });
    await as.mutation(api.users.updateBasics, { smoking: "No", smokingVisible: false });
    await as.mutation(api.users.updateBasics, { marijuana: "No", marijuanaVisible: false });
    await as.mutation(api.users.updateBasics, { drugs: "No", drugsVisible: false });
    await as.mutation(api.users.updateBasics, { tattoos: "No" });
    await as.mutation(api.users.updateBasics, { pronouns: "he/him" });

    let user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.name).toBe("Jordan");
    expect(user?.gender).toBe("Man");
    expect(user?.lastProfileEditedAt).toBeTypeOf("number");

    // 3. Complete onboarding via completeCategory("the_basics")
    const catResult = await as.mutation(api.users.completeCategory, {
      categoryId: "the_basics",
    });
    expect(catResult?.completedCategories).toContain("the_basics");

    user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.onboardingComplete).toBe(true);
    expect(user?.referralCode).toBeTypeOf("string");
    expect(user?.referralCode).toHaveLength(6);

    // 4. Save 8 voice recordings
    for (let i = 0; i < 8; i++) {
      const storageId = await t.run(async (ctx) =>
        ctx.storage.store(new Blob(["audio"]))
      );
      await as.mutation(api.voiceRecordings.saveRecording, {
        questionIndex: i,
        storageId,
        durationSeconds: 30 + i,
      });
    }

    // Verify 8th triggers scheduled action
    const scheduled = await t.run(async (ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    );
    expect(scheduled.length).toBeGreaterThanOrEqual(9);

    // 5. Verify profile exists (insert via t.run to simulate parse completion)
    await t.mutation(internal.userProfiles.upsertProfile, {
      profile: minProfile(userId),
    });
    const hasProfile = await as.query(api.userProfiles.hasProfile, { userId });
    expect(hasProfile).toBe(true);

    // 6. Verify audit gate
    user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.profileAuditCompletedAt).toBeUndefined();

    // 7. Complete audit
    await as.mutation(api.users.completeProfileAudit, {});
    user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.profileAuditCompletedAt).toBeTypeOf("number");

    // 8. Create second user (opposite gender) with profile
    const user2Id = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        clerkId: "clerk_e2e_user2",
        gender: "Woman",
        sexuality: "Straight",
        name: "Sarah",
        birthdate: "1996-03-20",
      });
      await ctx.db.insert("userProfiles", { ...minProfile(id) });
      return id;
    });

    // 9. Insert compatibility analysis
    const ids = [userId, user2Id].sort();
    await t.run(async (ctx) => {
      await ctx.db.insert("compatibilityAnalyses", {
        ...minAnalysis,
        userIdPair: `${ids[0]}_${ids[1]}`,
        user1Id: ids[0] as Id<"users">,
        user2Id: ids[1] as Id<"users">,
      });
    });

    // 10. Verify matches
    const matches = await as.query(api.matching.getMatchesForCurrentUser, {});
    expect(matches).toHaveLength(1);
    expect(matches![0].user.name).toBe("Sarah");
    expect(matches![0].analysis.overallScore).toBe(77);

    // 11. Verify match generation status
    const status = await as.query(
      api.matching.getMatchGenerationStatusForCurrentUser,
      {},
    );
    expect(status?.isAnalyzing).toBe(false);
    expect(status?.hasAnyAnalyses).toBe(true);

    // 12. Update a basics field
    const prevEditedAt = user?.lastProfileEditedAt;
    await as.mutation(api.users.updateBasics, { location: "Brooklyn, NY" });
    user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.location).toBe("Brooklyn, NY");
    expect(user?.lastProfileEditedAt).toBeGreaterThanOrEqual(prevEditedAt ?? 0);

    // 13. Regenerate profile
    const regenResult = await as.mutation(api.users.regenerateProfile, {});
    expect(regenResult?.scheduled).toBe(true);
    user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.lastProfileRegeneratedAt).toBeTypeOf("number");

    // 14. Verify cooldown
    await expect(
      as.mutation(api.users.regenerateProfile, {}),
    ).rejects.toThrowError(/regenerate/i);
  });
});
