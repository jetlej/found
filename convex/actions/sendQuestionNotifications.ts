'use node';

import { v } from 'convex/values';
import { action } from '../_generated/server';
import { internal } from '../_generated/api';
import { TOTAL_VOICE_QUESTIONS } from '../lib/voiceConfig';
import { requireAdmin } from '../lib/admin';

type ExpoPushMessage = {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: Record<string, string | number>;
};

function firstMissingQuestionIndex(answeredIndices: Set<number>): number {
  for (let i = 0; i < TOTAL_VOICE_QUESTIONS; i++) {
    if (!answeredIndices.has(i)) return i;
  }
  return TOTAL_VOICE_QUESTIONS - 1;
}

async function sendExpoBatch(messages: ExpoPushMessage[]) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed (${response.status}): ${text}`);
  }

  return await response.json();
}

export const broadcastUnansweredVoiceQuestions = action({
  args: {
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminSecret);

    const users = await ctx.runQuery(internal.users.listAll, {});

    const messages: ExpoPushMessage[] = [];
    let usersWithoutToken = 0;
    let usersAlreadyComplete = 0;

    for (const user of users) {
      if (!user.onboardingComplete) continue;

      const recordings = await ctx.runQuery(internal.voiceRecordings.getRecordingsForUserInternal, {
        userId: user._id,
      });
      const answeredIndices = new Set(recordings.map((r) => r.questionIndex));

      if (answeredIndices.size >= TOTAL_VOICE_QUESTIONS) {
        usersAlreadyComplete++;
        continue;
      }

      if (!user.pushToken || !user.pushToken.startsWith('ExponentPushToken[')) {
        usersWithoutToken++;
        continue;
      }

      const startIndex = firstMissingQuestionIndex(answeredIndices);
      messages.push({
        to: user.pushToken,
        sound: 'default',
        title: 'New question ready',
        body: 'Please answer your next voice question for this test round.',
        data: {
          type: 'voice_question_needed',
          startIndex,
          path: '/(tabs)/questions',
        },
      });
    }

    let sent = 0;
    let failedBatches = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        await sendExpoBatch(batch);
        sent += batch.length;
      } catch (error) {
        failedBatches++;
        console.error('Failed to send push batch:', error);
      }
    }

    return {
      eligibleToNotify: messages.length,
      sent,
      failedBatches,
      usersWithoutToken,
      usersAlreadyComplete,
    };
  },
});
