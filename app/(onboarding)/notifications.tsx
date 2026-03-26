import { OnboardingScreen } from '@/components/OnboardingScreen';
import { api } from '@/convex/_generated/api';
import { promptForNotifications } from '@/hooks/usePushNotifications';
import { colors, fontSizes, spacing } from '@/lib/theme';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function NotificationsOnboardingScreen() {
  const router = useRouter();
  const completeNotificationOnboarding = useMutation(api.users.completeNotificationOnboarding);
  const [loading, setLoading] = useState(false);

  const handleOkay = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { granted, token } = await promptForNotifications();
      await completeNotificationOnboarding({
        granted,
        pushToken: token ?? undefined,
      });
      router.replace('/(tabs)/questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingScreen
      question="Please enable notifications so we can share updates during the test period."
      canProceed
      loading={loading}
      onNext={handleOkay}
      submitLabel="Okay"
    >
      <View style={styles.container}>
        <Text style={styles.description}>
          We only use this to keep you in sync when there are new questions to answer.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    lineHeight: 24,
  },
});
