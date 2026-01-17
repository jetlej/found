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
          <Text style={styles.logo}>Found</Text>
          <Text style={styles.tagline}>100 Questions to Find Your Person</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.headline}>
            This isn't another dating app.
          </Text>
          <Text style={styles.description}>
            Found is an AI matchmaker built for people who are serious about finding a real partnership.
          </Text>
          <Text style={styles.description}>
            To truly understand who you are and what you're looking for, we ask you to answer 100 thoughtful questions about yourself.
          </Text>
          <Text style={styles.emphasis}>
            No swiping. No small talk. Just meaningful connections.
          </Text>
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
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["5xl"],
    color: colors.text,
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  body: {
    gap: spacing.lg,
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    textAlign: "center",
    lineHeight: 38,
  },
  description: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  emphasis: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
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
  },
});
