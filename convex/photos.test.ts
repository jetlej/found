import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import { setupTest } from "./test.setup";

const identity = { subject: "clerk_photo_user" };

async function setupPhotoUser(t: ReturnType<typeof setupTest>) {
  const as = t.withIdentity(identity);
  const userId = await as.mutation(api.users.getOrCreate, {});
  return { as, userId };
}

async function storeBlob(t: ReturnType<typeof setupTest>) {
  return await t.run(async (ctx) => ctx.storage.store(new Blob(["img"])));
}

describe("add", () => {
  it("creates photo at order slot", async () => {
    const t = setupTest();
    const { as, userId } = await setupPhotoUser(t);
    const storageId = await storeBlob(t);
    const photoId = await as.mutation(api.photos.add, { storageId, order: 0 });
    expect(photoId).toBeTruthy();

    const photos = await t.run(async (ctx) =>
      ctx.db.query("photos").withIndex("by_user", (q) => q.eq("userId", userId)).collect()
    );
    expect(photos).toHaveLength(1);
    expect(photos[0].order).toBe(0);
  });

  it("replaces existing photo at same order slot", async () => {
    const t = setupTest();
    const { as, userId } = await setupPhotoUser(t);
    const storageId1 = await storeBlob(t);
    const storageId2 = await storeBlob(t);

    await as.mutation(api.photos.add, { storageId: storageId1, order: 0 });
    await as.mutation(api.photos.add, { storageId: storageId2, order: 0 });

    const photos = await t.run(async (ctx) =>
      ctx.db.query("photos").withIndex("by_user", (q) => q.eq("userId", userId)).collect()
    );
    expect(photos).toHaveLength(1);
    expect(photos[0].storageId).toEqual(storageId2);
  });
});

describe("remove", () => {
  it("deletes photo, forbidden for other user's photo", async () => {
    const t = setupTest();
    const { as } = await setupPhotoUser(t);
    const storageId = await storeBlob(t);
    const photoId = await as.mutation(api.photos.add, { storageId, order: 0 });

    // Own photo: should succeed
    await as.mutation(api.photos.remove, { photoId });
    const remaining = await t.run(async (ctx) =>
      ctx.db.query("photos").collect()
    );
    expect(remaining).toHaveLength(0);

    // Other user's photo: should throw
    const otherPhotoId = await t.run(async (ctx) => {
      const otherId = await ctx.db.insert("users", { clerkId: "clerk_other" });
      const sid = await ctx.storage.store(new Blob(["img"]));
      const url = await ctx.storage.getUrl(sid);
      return await ctx.db.insert("photos", {
        userId: otherId,
        storageId: sid,
        url: url!,
        order: 0,
      });
    });

    await expect(
      as.mutation(api.photos.remove, { photoId: otherPhotoId }),
    ).rejects.toThrowError(/not found/i);
  });
});

describe("reorder", () => {
  it("updates order values for multiple photos", async () => {
    const t = setupTest();
    const { as } = await setupPhotoUser(t);
    const s1 = await storeBlob(t);
    const s2 = await storeBlob(t);
    const p1 = await as.mutation(api.photos.add, { storageId: s1, order: 0 });
    const p2 = await as.mutation(api.photos.add, { storageId: s2, order: 1 });

    await as.mutation(api.photos.reorder, {
      orders: [
        { photoId: p1, order: 1 },
        { photoId: p2, order: 0 },
      ],
    });

    const photo1 = await t.run(async (ctx) => ctx.db.get(p1));
    const photo2 = await t.run(async (ctx) => ctx.db.get(p2));
    expect(photo1?.order).toBe(1);
    expect(photo2?.order).toBe(0);
  });
});

describe("countByUser", () => {
  it("returns correct count", async () => {
    const t = setupTest();
    const { as, userId } = await setupPhotoUser(t);
    const s1 = await storeBlob(t);
    const s2 = await storeBlob(t);
    await as.mutation(api.photos.add, { storageId: s1, order: 0 });
    await as.mutation(api.photos.add, { storageId: s2, order: 1 });

    const count = await as.query(api.photos.countByUser, { userId });
    expect(count).toBe(2);
  });
});
