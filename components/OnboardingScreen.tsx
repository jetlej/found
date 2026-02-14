import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { useEffect, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
              style={[styles.button, onBack && styles.buttonFlex, (!canProceed || loading) && styles.buttonDisabled]}
              onPress={onNext}
              disabled={!canProceed || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                {loading ? "Saving..." : submitLabel ?? "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  closeHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  closeButton: {
    alignSelf: "flex-start",
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  question: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    marginBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonFlex: {
    flex: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
});
