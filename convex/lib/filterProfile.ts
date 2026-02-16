/**
 * Server-side version of filterProfile for use in Convex actions.
 * Strips hidden items from a profile before feeding into compatibility prompts.
 */

type AnyProfile = Record<string, any>;

export function filterProfile<T extends AnyProfile>(
  profile: T,
  hiddenFields?: string[],
): T {
  if (!hiddenFields?.length) return profile;

  const grouped = new Map<string, string[]>();
  for (const path of hiddenFields) {
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

  const result = { ...profile };

  for (const [key, subPaths] of grouped) {
    const val = result[key];

    if (subPaths.length === 0) {
      result[key as keyof T] = undefined as any;
      continue;
    }

    if (Array.isArray(val)) {
      const hideIndices = new Set(subPaths.map(Number).filter((n) => !isNaN(n)));
      result[key as keyof T] = val.filter((_: any, i: number) => !hideIndices.has(i)) as any;
      continue;
    }

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
      result[key] = undefined;
    } else if (Array.isArray(val)) {
      const hideIndices = new Set(rest.map(Number).filter((n: number) => !isNaN(n)));
      result[key] = val.filter((_: any, i: number) => !hideIndices.has(i));
    }
  }
  return result;
}
