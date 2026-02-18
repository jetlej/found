import { describe, it, expect, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { setupTest } from "./test.setup";

// Auth uses identity.subject as clerkId
const identity = { subject: "clerk_user_1", name: "Test User" };

describe("getOrCreate", () => {
  it("creates user on first call, returns ID", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const id = await as.mutation(api.users.getOrCreate, {});
    expect(id).toBeTruthy();
  });

  it("returns same ID on second call (idempotent)", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const id1 = await as.mutation(api.users.getOrCreate, {});
    const id2 = await as.mutation(api.users.getOrCreate, {});
    expect(id1).toEqual(id2);
  });
});

describe("updateBasics", () => {
  async function setupUser(t: ReturnType<typeof setupTest>) {
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    return { as, userId };
  }

  async function getUser(t: ReturnType<typeof setupTest>, userId: string) {
    return await t.run(async (ctx) => ctx.db.get(userId as any));
  }

  const fields: [string, Record<string, any>][] = [
    ["name", { name: "Jordan" }],
    ["pronouns", { pronouns: "he/him" }],
    ["gender", { gender: "Man" }],
    ["sexuality", { sexuality: "Straight" }],
    ["location", { location: "New York, NY" }],
    ["birthdate", { birthdate: "1995-06-15" }],
    ["ageRange", { ageRangeMin: 25, ageRangeMax: 35, ageRangeDealbreaker: true }],
    ["heightInches", { heightInches: 72 }],
    ["relationshipGoal", { relationshipGoal: "marriage" }],
    ["relationshipType", { relationshipType: "Monogamy" }],
    ["hasChildren", { hasChildren: "no" }],
    ["wantsChildren", { wantsChildren: "yes" }],
    ["ethnicity", { ethnicity: "White" }],
    ["hometown", { hometown: "Boston, MA" }],
    ["religion + importance", { religion: "Agnostic", religionImportance: 3 }],
    ["political + importance", { politicalLeaning: "moderate", politicalImportance: 4 }],
    ["pets", { pets: "Dog" }],
    ["drinking + visible", { drinking: "Sometimes", drinkingVisible: true }],
    ["smoking + visible", { smoking: "No", smokingVisible: false }],
    ["marijuana + visible", { marijuana: "No", marijuanaVisible: false }],
    ["drugs + visible", { drugs: "No", drugsVisible: false }],
    ["tattoos", { tattoos: "Yes" }],
  ];

  for (const [label, updates] of fields) {
    it(`saves ${label} correctly and sets lastProfileEditedAt`, async () => {
      const t = setupTest();
      const { as, userId } = await setupUser(t);
      await as.mutation(api.users.updateBasics, updates);
      const user = await getUser(t, userId as string);
      for (const [key, value] of Object.entries(updates)) {
        expect((user as any)[key]).toEqual(value);
      }
      expect((user as any).lastProfileEditedAt).toBeTypeOf("number");
    });
  }
});

describe("completeOnboarding", () => {
  it("sets onboardingComplete and generates referralCode", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    const result = await as.mutation(api.users.completeOnboarding, {});
    expect(result?.referralCode).toBeTypeOf("string");
    expect(result?.referralCode).toHaveLength(6);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.onboardingComplete).toBe(true);
  });

  it("referral credit: referrer's referralCount increments", async () => {
    const t = setupTest();

    // Create referrer
    const asReferrer = t.withIdentity({ subject: "clerk_referrer" });
    const referrerId = await asReferrer.mutation(api.users.getOrCreate, {});
    await asReferrer.mutation(api.users.completeOnboarding, {});

    const referrer = await t.run(async (ctx) => ctx.db.get(referrerId));
    const referralCode = referrer?.referralCode;

    // Create referred user and apply code
    const asReferred = t.withIdentity({ subject: "clerk_referred" });
    await asReferred.mutation(api.users.getOrCreate, {});
    await asReferred.mutation(api.users.applyReferralCode, { code: referralCode! });
    await asReferred.mutation(api.users.completeOnboarding, {});

    const updatedReferrer = await t.run(async (ctx) => ctx.db.get(referrerId));
    expect(updatedReferrer?.referralCount).toBe(1);
  });
});

describe("applyReferralCode", () => {
  it("valid code sets referredBy", async () => {
    const t = setupTest();

    const asReferrer = t.withIdentity({ subject: "clerk_referrer" });
    const referrerId = await asReferrer.mutation(api.users.getOrCreate, {});
    await asReferrer.mutation(api.users.completeOnboarding, {});
    const referrer = await t.run(async (ctx) => ctx.db.get(referrerId));

    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    const result = await as.mutation(api.users.applyReferralCode, {
      code: referrer!.referralCode!,
    });
    expect(result?.success).toBe(true);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.referredBy).toEqual(referrerId);
  });

  it("own code rejected", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    await as.mutation(api.users.getOrCreate, {});
    await as.mutation(api.users.completeOnboarding, {});
    const user = await t.run(async (ctx) =>
      ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first()
    );
    const result = await as.mutation(api.users.applyReferralCode, {
      code: user!.referralCode!,
    });
    expect(result?.success).toBe(false);
  });

  it("already-used rejected", async () => {
    const t = setupTest();

    // Create referrer
    const asReferrer = t.withIdentity({ subject: "clerk_referrer" });
    const referrerId = await asReferrer.mutation(api.users.getOrCreate, {});
    await asReferrer.mutation(api.users.completeOnboarding, {});
    const referrer = await t.run(async (ctx) => ctx.db.get(referrerId));

    // Apply once
    const as = t.withIdentity(identity);
    await as.mutation(api.users.getOrCreate, {});
    await as.mutation(api.users.applyReferralCode, { code: referrer!.referralCode! });

    // Apply again
    const result = await as.mutation(api.users.applyReferralCode, {
      code: referrer!.referralCode!,
    });
    expect(result?.success).toBe(false);
  });
});

describe("completeProfileAudit", () => {
  async function setupAuditUser(t: ReturnType<typeof setupTest>) {
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    // Insert a profile so audit can proceed
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
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
    });
    return { as, userId };
  }

  it("sets profileAuditCompletedAt on first call", async () => {
    const t = setupTest();
    const { as, userId } = await setupAuditUser(t);
    await as.mutation(api.users.completeProfileAudit, {});
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.profileAuditCompletedAt).toBeTypeOf("number");
  });

  it("does not overwrite timestamp on second call", async () => {
    const t = setupTest();
    const { as, userId } = await setupAuditUser(t);
    await as.mutation(api.users.completeProfileAudit, {});
    const user1 = await t.run(async (ctx) => ctx.db.get(userId));
    const ts1 = user1?.profileAuditCompletedAt;

    await as.mutation(api.users.completeProfileAudit, {});
    const user2 = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user2?.profileAuditCompletedAt).toEqual(ts1);
  });

  it("schedules analyzeAllForUser action", async () => {
    vi.useFakeTimers();
    const t = setupTest();
    const { as } = await setupAuditUser(t);
    await as.mutation(api.users.completeProfileAudit, {});

    // Verify a scheduled function exists
    const scheduled = await t.run(async (ctx) => {
      return await ctx.db.system.query("_scheduled_functions").collect();
    });
    expect(scheduled.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});

describe("regenerateProfile", () => {
  async function setupRegenUser(t: ReturnType<typeof setupTest>) {
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    // Insert 8 voice recordings
    await t.run(async (ctx) => {
      for (let i = 0; i < 8; i++) {
        const storageId = await ctx.storage.store(new Blob(["audio"]));
        await ctx.db.insert("voiceRecordings", {
          userId,
          questionIndex: i,
          storageId,
          durationSeconds: 30,
          createdAt: Date.now(),
        });
      }
    });
    return { as, userId };
  }

  it("succeeds with completed recordings", async () => {
    const t = setupTest();
    const { as } = await setupRegenUser(t);
    const result = await as.mutation(api.users.regenerateProfile, {});
    expect(result?.scheduled).toBe(true);
  });

  it("throws cooldown error within window", async () => {
    const t = setupTest();
    const { as } = await setupRegenUser(t);
    await as.mutation(api.users.regenerateProfile, {});
    await expect(
      as.mutation(api.users.regenerateProfile, {}),
    ).rejects.toThrowError(/regenerate/i);
  });

  it("throws when recordings incomplete", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    await as.mutation(api.users.getOrCreate, {});
    await expect(
      as.mutation(api.users.regenerateProfile, {}),
    ).rejects.toThrowError(/voice answers/i);
  });
});

describe("setOnboardingStep", () => {
  it("saves step string to user doc", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    await as.mutation(api.users.setOnboardingStep, { step: "photos" });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.onboardingStep).toBe("photos");
  });
});

describe("completeCategory", () => {
  it("adds category and increments level", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    await as.mutation(api.users.getOrCreate, {});
    const result = await as.mutation(api.users.completeCategory, {
      categoryId: "who_you_are",
    });
    expect(result?.level).toBe(1);
    expect(result?.completedCategories).toContain("who_you_are");
  });

  it("the_basics triggers onboarding completion", async () => {
    const t = setupTest();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.getOrCreate, {});
    await as.mutation(api.users.completeCategory, { categoryId: "the_basics" });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.onboardingComplete).toBe(true);
    expect(user?.referralCode).toBeTypeOf("string");
  });
});
