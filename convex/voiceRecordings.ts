import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const TOTAL_VOICE_QUESTIONS = 10;

// Save a voice recording
export const saveRecording = mutation({
  args: {
    userId: v.id("users"),
    questionIndex: v.number(),
    storageId: v.id("_storage"),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if there's an existing recording for this question
    const existing = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", args.userId).eq("questionIndex", args.questionIndex),
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
      userId: args.userId,
      questionIndex: args.questionIndex,
      storageId: args.storageId,
      durationSeconds: args.durationSeconds,
      createdAt: Date.now(),
    });

    // Check if all 10 questions are now complete
    const allRecordings = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (allRecordings.length === TOTAL_VOICE_QUESTIONS) {
      // All 10 complete - schedule voice profile parsing
      // This runs both on initial completion AND when updating any recording
      await ctx.scheduler.runAfter(
        0,
        internal.actions.parseVoiceProfile.parseVoiceProfile,
        {
          userId: args.userId,
        },
      );

      // Update user's onboarding type to "voice"
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), args.userId))
        .first();
      if (user && user.onboardingType !== "voice") {
        await ctx.db.patch(user._id, { onboardingType: "voice" });
      }
    }

    return id;
  },
});

// Delete a voice recording
export const deleteRecording = mutation({
  args: {
    userId: v.id("users"),
    questionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const recording = await ctx.db
      .query("voiceRecordings")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", args.userId).eq("questionIndex", args.questionIndex),
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
    await ctx.db.patch(args.recordingId, {
      transcription: args.transcription,
    });
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
