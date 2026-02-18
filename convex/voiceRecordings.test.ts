import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import { setupTest } from "./test.setup";

const identity = { subject: "clerk_voice_user", name: "Voice User" };

async function createUserWithStorage(t: ReturnType<typeof setupTest>) {
  const as = t.withIdentity(identity);
  const userId = await as.mutation(api.users.getOrCreate, {});
  return { as, userId };
}

async function storeBlob(t: ReturnType<typeof setupTest>) {
  return await t.run(async (ctx) => ctx.storage.store(new Blob(["audio"])));
}

describe("saveRecording", () => {
  it("saves new recording", async () => {
    const t = setupTest();
    const { as, userId } = await createUserWithStorage(t);
    const storageId = await storeBlob(t);
    const id = await as.mutation(api.voiceRecordings.saveRecording, {
      questionIndex: 0,
      storageId,
      durationSeconds: 30,
    });
    expect(id).toBeTruthy();
  });

  it("replaces existing recording for same question index", async () => {
    const t = setupTest();
    const { as, userId } = await createUserWithStorage(t);
    const storageId1 = await storeBlob(t);
    const storageId2 = await storeBlob(t);

    await as.mutation(api.voiceRecordings.saveRecording, {
      questionIndex: 0,
      storageId: storageId1,
      durationSeconds: 30,
    });
    await as.mutation(api.voiceRecordings.saveRecording, {
      questionIndex: 0,
      storageId: storageId2,
      durationSeconds: 45,
    });

    const recordings = await t.run(async (ctx) =>
      ctx.db.query("voiceRecordings")
        .withIndex("by_user_question", (q) => q.eq("userId", userId).eq("questionIndex", 0))
        .collect()
    );
    expect(recordings).toHaveLength(1);
    expect(recordings[0].durationSeconds).toBe(45);
  });

  it("8th recording schedules parseVoiceProfile", async () => {
    const t = setupTest();
    const { as } = await createUserWithStorage(t);

    for (let i = 0; i < 8; i++) {
      const storageId = await storeBlob(t);
      await as.mutation(api.voiceRecordings.saveRecording, {
        questionIndex: i,
        storageId,
        durationSeconds: 30,
      });
    }

    const scheduled = await t.run(async (ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    );
    // Should have scheduled transcription for each + parseVoiceProfile at the end
    expect(scheduled.length).toBeGreaterThanOrEqual(9);
  });
});

describe("deleteRecording", () => {
  it("removes recording, returns true", async () => {
    const t = setupTest();
    const { as } = await createUserWithStorage(t);
    const storageId = await storeBlob(t);
    await as.mutation(api.voiceRecordings.saveRecording, {
      questionIndex: 0,
      storageId,
      durationSeconds: 30,
    });
    const result = await as.mutation(api.voiceRecordings.deleteRecording, {
      questionIndex: 0,
    });
    expect(result).toBe(true);
  });

  it("non-existent returns false", async () => {
    const t = setupTest();
    const { as } = await createUserWithStorage(t);
    const result = await as.mutation(api.voiceRecordings.deleteRecording, {
      questionIndex: 5,
    });
    expect(result).toBe(false);
  });
});

describe("getRecordingsForUser", () => {
  it("returns all recordings for user", async () => {
    const t = setupTest();
    const { as, userId } = await createUserWithStorage(t);

    for (let i = 0; i < 3; i++) {
      const storageId = await storeBlob(t);
      await as.mutation(api.voiceRecordings.saveRecording, {
        questionIndex: i,
        storageId,
        durationSeconds: 30,
      });
    }

    const recordings = await as.query(api.voiceRecordings.getRecordingsForUser, {
      userId,
    });
    expect(recordings).toHaveLength(3);
  });
});

describe("getCompletedCount", () => {
  it("returns correct count after saves", async () => {
    const t = setupTest();
    const { as, userId } = await createUserWithStorage(t);

    for (let i = 0; i < 4; i++) {
      const storageId = await storeBlob(t);
      await as.mutation(api.voiceRecordings.saveRecording, {
        questionIndex: i,
        storageId,
        durationSeconds: 30,
      });
    }

    const count = await as.query(api.voiceRecordings.getCompletedCount, { userId });
    expect(count).toBe(4);
  });

  it("returns 0 for fresh user", async () => {
    const t = setupTest();
    const { as, userId } = await createUserWithStorage(t);
    const count = await as.query(api.voiceRecordings.getCompletedCount, { userId });
    expect(count).toBe(0);
  });
});
