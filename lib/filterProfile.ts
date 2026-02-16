/**
 * Filters hidden items from a user profile.
 *
 * `hiddenFields` uses dot-paths:
 * - "values.2"              → hides values[2]
 * - "generatedBio"          → hides the generatedBio string
 * - "lifeStory.fears.1"     → hides lifeStory.fears[1]
 *
 * Returns a shallow-cloned profile with hidden items removed.
 */

type AnyProfile = Record<string, any>;

export function filterProfile<T extends AnyProfile>(
  profile: T,
  hiddenFields?: string[],
): T {
  if (!hiddenFields?.length) return profile;

  // Group hidden paths by top-level key
  // e.g. { values: ["2"], lifeStory: ["fears.1"], generatedBio: [] }
  const grouped = new Map<string, string[]>();
  for (const path of hiddenFields) {
    const dotIdx = path.indexOf(".");
    if (dotIdx === -1) {
      // Scalar hide: "generatedBio" -> key="generatedBio", rest=""
      grouped.set(path, []);
    } else {
      const key = path.slice(0, dotIdx);
      const rest = path.slice(dotIdx + 1);
      const arr = grouped.get(key) ?? [];
      arr.push(rest);
      grouped.set(key, arr);
    }
  }

  const result = { ...profile };

  for (const [key, subPaths] of grouped) {
    const val = result[key];

    // Scalar hide (e.g. "generatedBio", "shortBio")
    if (subPaths.length === 0) {
      result[key as keyof T] = undefined as any;
      continue;
    }

    // Array field (e.g. "values", "interests", "dealbreakers", "keywords")
    if (Array.isArray(val)) {
      const hideIndices = new Set(subPaths.map(Number).filter((n) => !isNaN(n)));
      result[key as keyof T] = val.filter((_, i) => !hideIndices.has(i)) as any;
      continue;
    }

    // Nested object (e.g. "lifeStory", "partnerPreferences", "bioElements")
    if (val && typeof val === "object") {
      result[key as keyof T] = filterNestedObject(val, subPaths) as any;
    }
  }

  return result;
}

function filterNestedObject(obj: Record<string, any>, subPaths: string[]): Record<string, any> {
  const grouped = new Map<string, string[]>();
  for (const path of subPaths) {
    const dotIdx = path.indexOf(".");
    if (dotIdx === -1) {
      grouped.set(path, []);
    } else {
      const key = path.slice(0, dotIdx);
      const rest = path.slice(dotIdx + 1);
      const arr = grouped.get(key) ?? [];
      arr.push(rest);
      grouped.set(key, arr);
    }
  }

  const result = { ...obj };
  for (const [key, rest] of grouped) {
    const val = result[key];
    if (rest.length === 0) {
      // Hide the scalar field
      result[key] = undefined;
    } else if (Array.isArray(val)) {
      const hideIndices = new Set(rest.map(Number).filter((n) => !isNaN(n)));
      result[key] = val.filter((_, i) => !hideIndices.has(i));
    }
  }
  return result;
}

/**
 * Returns the set of auditable field paths for the profile audit screen.
 * Each entry is { path, label, value } for display.
 */
export interface AuditItem {
  path: string;   // dot-path, e.g. "values.2"
  label: string;  // display text, e.g. the value itself
  section: string; // section header, e.g. "Values"
}

export function getAuditableItems(profile: AnyProfile): AuditItem[] {
  const items: AuditItem[] = [];

  // Top-level arrays
  const arrayFields: { key: string; section: string }[] = [
    { key: "values", section: "Values" },
    { key: "interests", section: "Interests" },
    { key: "dealbreakers", section: "Dealbreakers" },
    { key: "keywords", section: "Keywords" },
  ];
  for (const { key, section } of arrayFields) {
    const arr = profile[key];
    if (Array.isArray(arr)) {
      arr.forEach((val: string, i: number) => {
        items.push({ path: `${key}.${i}`, label: val, section });
      });
    }
  }

  // Nested object arrays
  const nestedFields: { key: string; subKey: string; section: string }[] = [
    { key: "lifeStory", subKey: "dreams", section: "Life Story" },
    { key: "lifeStory", subKey: "fears", section: "Life Story" },
    { key: "lifeStory", subKey: "formativeExperiences", section: "Life Story" },
    { key: "partnerPreferences", subKey: "mustHaves", section: "Partner Preferences" },
    { key: "partnerPreferences", subKey: "niceToHaves", section: "Partner Preferences" },
    { key: "partnerPreferences", subKey: "redFlags", section: "Partner Preferences" },
    { key: "partnerPreferences", subKey: "importantQualities", section: "Partner Preferences" },
    { key: "partnerPreferences", subKey: "dealbreakersInPartner", section: "Partner Preferences" },
    { key: "bioElements", subKey: "conversationStarters", section: "Fun Facts" },
    { key: "bioElements", subKey: "interestingFacts", section: "Fun Facts" },
    { key: "bioElements", subKey: "uniqueQuirks", section: "Fun Facts" },
    { key: "bioElements", subKey: "passions", section: "Fun Facts" },
  ];
  for (const { key, subKey, section } of nestedFields) {
    const nested = profile[key];
    if (nested && Array.isArray(nested[subKey])) {
      nested[subKey].forEach((val: string, i: number) => {
        items.push({ path: `${key}.${subKey}.${i}`, label: val, section });
      });
    }
  }

  // Nested scalar strings
  const nestedScalars: { key: string; subKey: string; section: string }[] = [
    { key: "lifeStory", subKey: "proudestAchievement", section: "Life Story" },
    { key: "lifeStory", subKey: "definingHardship", section: "Life Story" },
    { key: "lifeStory", subKey: "biggestRisk", section: "Life Story" },
    { key: "lifeStory", subKey: "favoriteStory", section: "Life Story" },
    { key: "bioElements", subKey: "whatTheySek", section: "Fun Facts" },
  ];
  for (const { key, subKey, section } of nestedScalars) {
    const nested = profile[key];
    if (nested?.[subKey]) {
      items.push({ path: `${key}.${subKey}`, label: nested[subKey], section });
    }
  }

  return items;
}
