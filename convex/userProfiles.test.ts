import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import { setupTest } from "./test.setup";

const identity = { subject: "clerk_profile_user" };

const minProfile = (userId: any) => ({
  userId,
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
});

describe("upsertProfile", () => {
  it("creates profile on first call", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    const profileId = await t.mutation(internal.userProfiles.upsertProfile, {
      profile: minProfile(userId),
    });
    expect(profileId).toBeTruthy();
  });

  it("updates profile on second call (same userId)", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    const id1 = await t.mutation(internal.userProfiles.upsertProfile, {
      profile: minProfile(userId),
    });
    const id2 = await t.mutation(internal.userProfiles.upsertProfile, {
      profile: { ...minProfile(userId), values: ["loyalty", "growth"] },
    });
    expect(id1).toEqual(id2);

    const profile = await t.run(async (ctx) =>
      ctx.db.query("userProfiles").withIndex("by_user", (q) => q.eq("userId", userId)).first()
    );
    expect(profile?.values).toEqual(["loyalty", "growth"]);
  });
});

describe("hasProfile", () => {
  it("returns false before profile exists", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    const has = await as.query(api.userProfiles.hasProfile, { userId });
    expect(has).toBe(false);
  });

  it("returns true after profile created", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    await t.mutation(internal.userProfiles.upsertProfile, {
      profile: minProfile(userId),
    });
    const has = await as.query(api.userProfiles.hasProfile, { userId });
    expect(has).toBe(true);
  });
});

describe("updateHiddenFields", () => {
  it("saves hiddenFields array to profile doc", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    await t.mutation(internal.userProfiles.upsertProfile, {
      profile: minProfile(userId),
    });
    await as.mutation(api.userProfiles.updateHiddenFields, {
      hiddenFields: ["generatedBio", "values.0"],
    });
    const profile = await t.run(async (ctx) =>
      ctx.db.query("userProfiles").withIndex("by_user", (q) => q.eq("userId", userId)).first()
    );
    expect(profile?.hiddenFields).toEqual(["generatedBio", "values.0"]);
  });
});
