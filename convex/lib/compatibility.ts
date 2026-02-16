// Shared gender/sexuality/age compatibility helpers.
// Used by convex/matching.ts and convex/actions/analyzeCompatibility.ts.

/** Returns which genders a person is attracted to based on sexuality + own gender. */
export function attractedTo(sexuality: string, gender: string): string[] {
  const s = sexuality.toLowerCase();
  if (s === "women") return ["woman"];
  if (s === "men") return ["man"];
  if (s === "everyone") return ["man", "woman", "non-binary"];
  if (s === "bisexual" || s === "pansexual" || s === "queer")
    return ["man", "woman", "non-binary"];
  if (s === "straight" || s === "heterosexual")
    return gender.toLowerCase() === "man" ? ["woman"] : ["man"];
  if (s === "gay" || s === "lesbian" || s === "homosexual")
    return [gender.toLowerCase()];
  return ["man", "woman", "non-binary"];
}

/** Both-directions gender/sexuality check. Incomplete profiles pass through. */
export function isGenderCompatible(
  me: { sexuality?: string; gender?: string },
  them: { sexuality?: string; gender?: string },
): boolean {
  if (!me.sexuality || !me.gender || !them.sexuality || !them.gender) return true;
  const iWant = attractedTo(me.sexuality, me.gender);
  const theyWant = attractedTo(them.sexuality, them.gender);
  return iWant.includes(them.gender.toLowerCase()) && theyWant.includes(me.gender.toLowerCase());
}

/** Age range hard filter (only applied when dealbreaker is set). */
export function isAgeCompatible(
  me: { ageRangeDealbreaker?: boolean; ageRangeMin?: number; ageRangeMax?: number },
  them: { birthdate?: string },
): boolean {
  if (!me.ageRangeDealbreaker) return true;
  if (!them.birthdate) return true;
  const theirAge = Math.floor(
    (Date.now() - new Date(them.birthdate).getTime()) / 31557600000,
  );
  return theirAge >= (me.ageRangeMin ?? 18) && theirAge <= (me.ageRangeMax ?? 99);
}
