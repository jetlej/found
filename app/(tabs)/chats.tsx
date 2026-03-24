import { AppHeader } from '@/components/AppHeader';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { IconMessageCircle } from '@tabler/icons-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatsScreen() {
  const opacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 150 });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />
      <Animated.View style={[styles.content, fadeStyle]}>
        <View style={styles.iconContainer}>
          <IconMessageCircle size={80} color={colors.textMuted} />
        </View>
        <Text style={styles.title}>No chats yet</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    lineHeight: 24,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.xl,
    marginBottom: spacing.sm,
  },
});
