import { useScreenReady } from '@/hooks/useScreenReady';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useEffect, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface OnboardingScreenProps {
  question: string;
  canProceed: boolean;
  loading: boolean;
  onNext: () => void;
  onBack?: () => void;
  submitLabel?: string;
  scrollable?: boolean;
  /** Shows a back arrow at the top of the screen (used in editing mode) */
  onClose?: () => void;
  children: ReactNode;
}

export function OnboardingScreen({
  question,
  canProceed,
  loading,
  onNext,
  onBack,
  submitLabel,
  scrollable,
  onClose,
  children,
}: OnboardingScreenProps) {
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const content = (
    <>
      <Text style={styles.question}>{question}</Text>
      {children}
    </>
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        {onClose && (
          <View style={styles.closeHeader}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <IconChevronLeft size={28} color={colors.text} />
            </Pressable>
          </View>
        )}
        {scrollable ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
            {content}
          </ScrollView>
        ) : (
          <View style={styles.content}>{content}</View>
        )}

        <View style={styles.footer}>
          <View style={onBack ? styles.buttonRow : undefined}>
            {onBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                onBack && styles.buttonFlex,
                (!canProceed || loading) && styles.buttonDisabled,
              ]}
              onPress={onNext}
              disabled={!canProceed || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : (submitLabel ?? 'Next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: spacing.lg,
  },
  backButtonText: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFlex: {
    flex: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  closeHeader: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  question: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: fontSizes['3xl'],
    marginBottom: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
});
