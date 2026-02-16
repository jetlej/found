"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { requireAdmin } from "../lib/admin";

// ---------------------------------------------------------------------------
// DuckDuckGo image search (raw fetch, no npm dependency)
// Step 1: GET duckduckgo.com/?q=... to extract vqd token
// Step 2: GET duckduckgo.com/i.js?q=...&vqd=... for image results
// ---------------------------------------------------------------------------

const DDG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function getVqd(query: string): Promise<string> {
  const resp = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    { headers: DDG_HEADERS },
  );
  const text = await resp.text();
  // Extract vqd="..." from the page
  const match = text.match(/vqd="([^"]+)"/);
  if (!match) throw new Error(`Failed to get DDG vqd token for "${query}"`);
  return match[1];
}

async function searchPhotos(
  query: string,
  count: number = 3,
): Promise<string[]> {
  const vqd = await getVqd(query);
  const params = new URLSearchParams({
    q: query,
    vqd,
    l: "us-en",
    o: "json",
    f: ",,,,,",
    p: "1", // safe search on
  });
  const resp = await fetch(`https://duckduckgo.com/i.js?${params}`, {
    headers: { ...DDG_HEADERS, Referer: "https://duckduckgo.com/" },
  });
  if (!resp.ok) throw new Error(`DDG image search failed: ${resp.status}`);
  const data = await resp.json();
  const results: string[] = (data.results || [])
    .slice(0, count)
    .map((r: any) => r.image);
  return results;
}

// ---------------------------------------------------------------------------
// Persona -> image search query mapping
// For celebrities the query is just their name.
// For fictional personas the query is the celebrity lookalike.
// ---------------------------------------------------------------------------

const PHOTO_QUERIES: Record<string, string> = {
  // Fictional personas -> celebrity lookalike
  "Marcus Hale": "Michael B. Jordan actor",
  "Mateo Alvarez": "Oscar Isaac actor",
  "Lucas Carter": "Chris Evans actor",
  "Jonah Reed": "Paul Mescal actor",
  "Daniel Okoye": "Idris Elba actor",
  "Leo Gutierrez": "Pedro Pascal actor",
  "Aisha Thompson": "Zendaya actress",
  "Priya Nair": "Deepika Padukone actress",
  "Mei Lin Chen": "Gemma Chan actress",
  "Nora Gallagher": "Florence Pugh actress",
  "Priya Menon": "Priyanka Chopra actress",
  "Simone Laurent": "Janelle Monae",
  "Ravi Patel": "Lil Nas X",
  // Celebrity personas -> themselves
  "Dolly Parton": "Dolly Parton",
  "Oprah Winfrey": "Oprah Winfrey",
  "Zendaya": "Zendaya actress",
  "Alexandria Ocasio-Cortez": "Alexandria Ocasio-Cortez",
  "Rihanna": "Rihanna singer",
  "Keanu Reeves": "Keanu Reeves actor",
  "Dwayne Johnson": "Dwayne Johnson actor",
  "Harry Styles": "Harry Styles singer",
  "Barack Obama": "Barack Obama",
  "Bad Bunny": "Bad Bunny singer",
  // High-compat personas -> celebrity lookalike
  "Mia Torres": "Eiza Gonzalez actress",
  "Sasha Kim": "Jamie Chung actress",
  "Ava Chen": "Constance Wu actress",
};

// ---------------------------------------------------------------------------
// Seed photos for a single user (fetches URLs, downloads, stores in Convex)
// ---------------------------------------------------------------------------

export const seedPhotosForUser = internalAction({
  args: {
    userId: v.string(),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId as Id<"users">;
    console.log(`Seeding photos for ${userId}...`);

    // Check existing photos — skip if already complete
    const existing = await ctx.runQuery(internal.photos.getByUser, { userId });
    if (existing.length >= args.urls.length) {
      console.log(`  Already has ${existing.length} photos, skipping`);
      return { userId: args.userId, added: 0, skipped: true };
    }

    // Delete existing and re-seed from scratch
    for (const photo of existing) {
      await ctx.runMutation(internal.photos.remove, { photoId: photo._id });
    }

    let added = 0;
    for (let order = 0; order < args.urls.length; order++) {
      const url = args.urls[order];
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "FoundDatingApp/1.0 (dev seed script)",
          },
        });
        if (!response.ok) {
          console.warn(`  Failed to fetch ${url}: ${response.status}`);
          continue;
        }
        const blob = await response.blob();
        const storageId = await ctx.storage.store(blob);
        await ctx.runMutation(internal.photos.addDirect, {
          userId,
          storageId,
          order,
        });
        added++;
        console.log(`  Photo ${order + 1}/${args.urls.length} done`);
      } catch (e) {
        console.warn(`  Failed photo ${order + 1}: ${e}`);
      }
    }
    return { userId: args.userId, added };
  },
});

// ---------------------------------------------------------------------------
// Public actions: seed all test user photos via DDG image search
// ---------------------------------------------------------------------------

// Seed photos for ALL test users (fictional + celeb + high-compat)
export const seedAllPhotos = action({
  args: { adminSecret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);

    const testUsers = await ctx.runQuery(internal.seedTestUsers.getTestUsers);
    const nameToId = new Map(testUsers.map((u: any) => [u.name, u._id]));

    const names = Object.keys(PHOTO_QUERIES);
    let scheduled = 0;

    for (const [index, name] of names.entries()) {
      const userId = nameToId.get(name);
      if (!userId) {
        console.warn(`No test user found for "${name}", skipping`);
        continue;
      }

      const query = PHOTO_QUERIES[name];
      console.log(`Searching DDG for "${query}"...`);
      try {
        const urls = await searchPhotos(query, 3);
        if (urls.length === 0) {
          console.warn(`  No results for "${query}", skipping`);
          continue;
        }
        console.log(`  Found ${urls.length} images, scheduling download`);
        await ctx.scheduler.runAfter(
          index * 2000, // 2s stagger
          internal.actions.seedTestPhotos.seedPhotosForUser,
          { userId, urls },
        );
        scheduled++;
      } catch (e) {
        console.warn(`  DDG search failed for "${query}": ${e}`);
      }
    }

    console.log(`Scheduled photo seeds for ${scheduled}/${names.length} users`);
    return { scheduled, total: names.length };
  },
});

// Seed photos for a single user by name (useful for retrying one)
export const seedPhotosForName = action({
  args: {
    name: v.string(),
    count: v.optional(v.number()),
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);

    const query = PHOTO_QUERIES[args.name];
    if (!query) throw new Error(`No photo query for "${args.name}"`);

    const testUsers = await ctx.runQuery(internal.seedTestUsers.getTestUsers);
    const user = testUsers.find((u: any) => u.name === args.name);
    if (!user) throw new Error(`No test user named "${args.name}"`);

    const urls = await searchPhotos(query, args.count ?? 3);
    if (urls.length === 0) throw new Error(`No DDG results for "${query}"`);

    console.log(`Found ${urls.length} images for "${args.name}", seeding...`);
    await ctx.scheduler.runAfter(
      0,
      internal.actions.seedTestPhotos.seedPhotosForUser,
      { userId: user._id, urls },
    );
    return { name: args.name, query, urls };
  },
});

// ---------------------------------------------------------------------------
// Auto-seed photos for a newly created persona (called from seedSingleVoiceTestUser)
// Uses PHOTO_QUERIES if the name is known, otherwise asks GPT to pick a celeb.
// ---------------------------------------------------------------------------

export const seedPhotosForPersona = internalAction({
  args: {
    userId: v.string(),
    name: v.string(),
    gender: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    let query = PHOTO_QUERIES[args.name];

    if (!query) {
      // Build a search query from the persona description for a plausible face.
      // Extract ethnicity/nationality cues + gender to find a matching celebrity.
      const genderTerm = args.gender === "Woman" ? "woman" : args.gender === "Man" ? "man" : "person";
      // Grab the first sentence fragment for ethnicity/vibe cues (e.g. "Nigerian-American runway model")
      const snippet = args.description.split(/[.!]/)[ 0] || args.description.slice(0, 80);
      query = `${snippet} ${genderTerm} portrait photo`;
      console.log(`  Auto query: "${query}"`);
    }

    try {
      const urls = await searchPhotos(query, 3);
      if (urls.length === 0) {
        console.warn(`  No DDG results for "${query}", skipping photos`);
        return;
      }
      console.log(`  Found ${urls.length} photos for "${args.name}" (query: "${query}")`);
      await ctx.scheduler.runAfter(
        0,
        internal.actions.seedTestPhotos.seedPhotosForUser,
        { userId: args.userId, urls },
      );
    } catch (e) {
      console.warn(`  Photo seeding failed for "${args.name}": ${e}`);
    }
  },
});
