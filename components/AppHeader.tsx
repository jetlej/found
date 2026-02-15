import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface AppHeaderProps {
  showLevelLink?: boolean;
  onLogoPress?: () => void;
}

export function AppHeader({
  showLevelLink = true,
  onLogoPress,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft} />
      {onLogoPress ? (
        <Pressable onPress={onLogoPress}>
          <Text style={styles.logo}>Found.</Text>
        </Pressable>
      ) : (
        <Text style={styles.logo}>Found.</Text>
      )}
      <View style={styles.headerRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  logo: {
    fontFamily: fonts.logo,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
});
