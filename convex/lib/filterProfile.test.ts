import { describe, it, expect } from "vitest";
import { filterProfile } from "./filterProfile";

describe("filterProfile", () => {
  const baseProfile = {
    generatedBio: "A great person",
    shortBio: "Great",
    values: ["honesty", "loyalty", "growth", "adventure"],
    interests: ["hiking", "cooking"],
    lifeStory: {
      proudestAchievement: "Climbed a mountain",
      fears: ["spiders", "heights", "failure"],
      dreams: ["travel"],
      formativeExperiences: [],
    },
  };

  it("no hiddenFields = passthrough", () => {
    expect(filterProfile(baseProfile)).toEqual(baseProfile);
  });

  it("empty array = passthrough", () => {
    expect(filterProfile(baseProfile, [])).toEqual(baseProfile);
  });

  it("hides scalar field", () => {
    const result = filterProfile(baseProfile, ["generatedBio"]);
    expect(result.generatedBio).toBeUndefined();
    expect(result.shortBio).toBe("Great");
  });

  it("hides array item by index", () => {
    const result = filterProfile(baseProfile, ["values.2"]);
    expect(result.values).toEqual(["honesty", "loyalty", "adventure"]);
  });

  it("hides nested array item", () => {
    const result = filterProfile(baseProfile, ["lifeStory.fears.1"]);
    expect(result.lifeStory.fears).toEqual(["spiders", "failure"]);
  });

  it("multiple hidden paths at once", () => {
    const result = filterProfile(baseProfile, [
      "generatedBio",
      "values.0",
      "lifeStory.fears.2",
    ]);
    expect(result.generatedBio).toBeUndefined();
    expect(result.values).toEqual(["loyalty", "growth", "adventure"]);
    expect(result.lifeStory.fears).toEqual(["spiders", "heights"]);
  });
});

// getAuditableItems is in the client-side lib/filterProfile.ts, tested here
// since it's a pure function
import { getAuditableItems } from "../../lib/filterProfile";

describe("getAuditableItems", () => {
  it("top-level arrays produce correct paths", () => {
    const profile = {
      values: ["honesty", "loyalty"],
      interests: ["hiking"],
      dealbreakers: [],
      keywords: [],
    };
    const items = getAuditableItems(profile);
    expect(items).toContainEqual({
      path: "values.0",
      label: "honesty",
      section: "Values",
    });
    expect(items).toContainEqual({
      path: "values.1",
      label: "loyalty",
      section: "Values",
    });
    expect(items).toContainEqual({
      path: "interests.0",
      label: "hiking",
      section: "Interests",
    });
  });

  it("nested arrays produce correct paths", () => {
    const profile = {
      values: [],
      interests: [],
      dealbreakers: [],
      keywords: [],
      partnerPreferences: {
        mustHaves: ["kindness", "humor"],
        niceToHaves: [],
        redFlags: [],
        importantQualities: [],
        dealbreakersInPartner: [],
      },
    };
    const items = getAuditableItems(profile);
    expect(items).toContainEqual({
      path: "partnerPreferences.mustHaves.0",
      label: "kindness",
      section: "Partner Preferences",
    });
    expect(items).toContainEqual({
      path: "partnerPreferences.mustHaves.1",
      label: "humor",
      section: "Partner Preferences",
    });
  });

  it("nested scalars produce correct paths", () => {
    const profile = {
      values: [],
      interests: [],
      dealbreakers: [],
      keywords: [],
      lifeStory: {
        proudestAchievement: "Built a company",
        dreams: [],
        fears: [],
        formativeExperiences: [],
      },
    };
    const items = getAuditableItems(profile);
    expect(items).toContainEqual({
      path: "lifeStory.proudestAchievement",
      label: "Built a company",
      section: "Life Story",
    });
  });
});
