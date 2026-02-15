import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>Found.</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.promiseSection}>
            <Text style={styles.promiseLabel}>OUR PROMISE</Text>
            <Text style={styles.promise}>
              Authentically share who you are and what you want, and we{" "}
              <Text style={styles.underline}>will</Text> introduce you to
              someone incredible.
            </Text>
          </View>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletX}>✕</Text>
              <Text style={styles.bulletTextMuted}>Endless swiping</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletX}>✕</Text>
              <Text style={styles.bulletTextMuted}>Small talk</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletX}>✕</Text>
              <Text style={styles.bulletTextMuted}>Bad matches</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>
                Butterflies on the first date
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>
                "Where have you been all my life?"
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>
                Your friends asking how you met
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={styles.button}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={styles.buttonText}>I'm Ready</Text>
          </Pressable>
          <Text style={styles.footerNote}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "space-between",
    paddingVertical: spacing["2xl"],
  },
  header: {
    alignItems: "center",
    paddingTop: spacing["2xl"],
  },
  logo: {
    fontFamily: fonts.logo,
    fontSize: fontSizes["5xl"],
    color: colors.text,
  },
  body: {
    flex: 1,
  },
  promiseSection: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 60,
    marginBottom: 50,
  },
  promiseLabel: {
    fontFamily: fonts.logo,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  promise: {
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "600",
  },
  bulletList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bulletX: {
    fontSize: fontSizes.lg,
    color: colors.error,
    fontWeight: "600",
  },
  bulletCheck: {
    fontSize: fontSizes.lg,
    color: colors.success,
    fontWeight: "600",
  },
  bulletText: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: "500",
  },
  bulletTextMuted: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  underline: {
    textDecorationLine: "underline",
  },
  footer: {
    gap: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  footerNote: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 240,
    alignSelf: "center",
  },
});
