import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, fontSizes, spacing, borderRadius } from "@/lib/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface UpdateRequiredScreenProps {
  type: "ota" | "testflight";
  onInstall: () => void;
}

export function UpdateRequiredScreen({
  type,
  onInstall,
}: UpdateRequiredScreenProps) {
  const isOta = type === "ota";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name={isOta ? "cloud-download-outline" : "phone-portrait-outline"}
          size={56}
          color={colors.text}
        />
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.message}>
          {isOta
            ? "A new update is ready to install. This will only take a moment."
            : "A new version is available. Please update from TestFlight to continue."}
        </Text>
        <Pressable style={styles.button} onPress={onInstall}>
          <Text style={styles.buttonText}>
            {isOta ? "Install & Restart" : "Open TestFlight"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },
  content: {
    alignItems: "center",
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
    marginTop: spacing.sm,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSizes.base,
    color: colors.primaryText,
  },
});
