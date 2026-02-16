import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { TOTAL_VOICE_QUESTIONS } from "./lib/voiceConfig";

/** Get the authenticated user from ctx.auth, or throw. */
async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

// Save a voice recording
export const saveRecording = mutation({
  args: {
    questionIndex: v.number(),
    storageId: v.id("_storage"),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    const userId = user._id;

    // Check if there's an existing recording for this question
    const existing = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", userId).eq("questionIndex", args.questionIndex),
      )
      .first();

    if (existing) {
      // Delete the old storage file
      await ctx.storage.delete(existing.storageId);
      // Delete the old record
      await ctx.db.delete(existing._id);
    }

    // Insert the new recording
    const id = await ctx.db.insert("voiceRecordings", {
      userId,
      questionIndex: args.questionIndex,
      storageId: args.storageId,
      durationSeconds: args.durationSeconds,
      createdAt: Date.now(),
    });

    // Immediately schedule transcription for this recording
    await ctx.scheduler.runAfter(
      0,
      internal.actions.parseVoiceProfile.transcribeRecording,
      { recordingId: id },
    );

    // Check if all questions are now complete
    const allRecordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (allRecordings.length === TOTAL_VOICE_QUESTIONS) {
      // All complete - schedule voice profile parsing
      await ctx.scheduler.runAfter(
        0,
        internal.actions.parseVoiceProfile.parseVoiceProfile,
        { userId },
      );

      // Update user's onboarding type to "voice"
      if (user.onboardingType !== "voice") {
        await ctx.db.patch(userId, { onboardingType: "voice" });
      }
    }

    return id;
  },
});

// Delete a voice recording
export const deleteRecording = mutation({
  args: {
    questionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    const recording = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", user._id).eq("questionIndex", args.questionIndex),
      )
      .first();

    if (recording) {
      await ctx.storage.delete(recording.storageId);
      await ctx.db.delete(recording._id);
      return true;
    }
    return false;
  },
});

// Get all recordings for a user
export const getRecordingsForUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    if (user._id !== args.userId) throw new Error("Forbidden");

    const recordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return recordings;
  },
});

// Get recording for a specific question
export const getRecordingForQuestion = query({
  args: {
    userId: v.id("users"),
    questionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    if (user._id !== args.userId) throw new Error("Forbidden");

    const recording = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", args.userId).eq("questionIndex", args.questionIndex),
      )
      .first();

    return recording;
  },
});

// Get count of completed recordings
export const getCompletedCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");
    if (user._id !== args.userId) throw new Error("Forbidden");

    const recordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return recordings.length;
  },
});

// Update transcription for a recording (called by AI parsing action)
export const updateTranscription = mutation({
  args: {
    recordingId: v.id("voiceRecordings"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Verify the recording belongs to this user
    const recording = await ctx.db.get(args.recordingId);
    if (!recording || recording.userId !== user._id) {
      throw new Error("Recording not found");
    }

    await ctx.db.patch(args.recordingId, {
      transcription: args.transcription,
    });
  },
});

// Get a single recording by ID (used by transcribeRecording action)
export const getRecordingById = internalQuery({
  args: {
    recordingId: v.id("voiceRecordings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.recordingId);
  },
});

// Internal query for getting recordings (used by actions)
export const getRecordingsForUserInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return recordings;
  },
});

// Clear all transcriptions for a user (forces Whisper re-run on next parse)
export const clearTranscriptionsForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const r of recordings) {
      await ctx.db.patch(r._id, { transcription: undefined });
    }
    return recordings.length;
  },
});

// Internal mutation for updating transcription (used by actions)
export const updateTranscriptionInternal = internalMutation({
  args: {
    recordingId: v.id("voiceRecordings"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recordingId, {
      transcription: args.transcription,
    });
  },
});

// Replace a user's recordings with seed transcriptions (for test seeding)
export const replaceSeedRecordings = internalMutation({
  args: {
    userId: v.id("users"),
    recordings: v.array(
      v.object({
        questionIndex: v.number(),
        storageId: v.id("_storage"),
        durationSeconds: v.number(),
        transcription: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.recordings.length !== TOTAL_VOICE_QUESTIONS) {
      throw new Error(
        `Expected ${TOTAL_VOICE_QUESTIONS} recordings, got ${args.recordings.length}`,
      );
    }

    const existing = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const recording of existing) {
      await ctx.storage.delete(recording.storageId);
      await ctx.db.delete(recording._id);
    }

    const sortedRecordings = [...args.recordings].sort(
      (a, b) => a.questionIndex - b.questionIndex,
    );

    for (const recording of sortedRecordings) {
      await ctx.db.insert("voiceRecordings", {
        userId: args.userId,
        questionIndex: recording.questionIndex,
        storageId: recording.storageId,
        durationSeconds: recording.durationSeconds,
        transcription: recording.transcription,
        createdAt: Date.now() + recording.questionIndex,
      });
    }

    await ctx.db.patch(args.userId, { onboardingType: "voice" });
  },
});

// Get all user IDs that have complete voice recordings
export const getUsersWithCompleteRecordings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allRecordings = await ctx.db.query("voiceRecordings").collect();
    const countByUser = new Map<string, number>();
    for (const r of allRecordings) {
      countByUser.set(r.userId, (countByUser.get(r.userId) || 0) + 1);
    }
    const completeUsers: string[] = [];
    for (const [userId, count] of countByUser) {
      if (count >= TOTAL_VOICE_QUESTIONS) completeUsers.push(userId);
    }
    return completeUsers;
  },
});
