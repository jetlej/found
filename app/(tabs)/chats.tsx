import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconMessageCircle } from "@tabler/icons-react-native";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatsScreen() {
  const opacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 150 });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[styles.content, fadeStyle]}>
        <IconMessageCircle size={48} color={colors.textMuted} />
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
  },
});
