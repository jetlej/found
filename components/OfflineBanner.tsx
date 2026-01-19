import { colors, fontSizes, spacing } from "@/lib/theme";
import { useOfflineStore } from "@/stores/offline";
import { IconCloudOff } from "@tabler/icons-react-native";
import { StyleSheet, Text, View } from "react-native";

export function OfflineBanner() {
  const { isOnline } = useOfflineStore();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.offlineBanner}>
      <IconCloudOff size={16} color={colors.warning} />
      <Text style={styles.offlineText}>You're offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#fef3c7",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  offlineText: {
    fontSize: fontSizes.sm,
    color: colors.warning,
    fontWeight: "500",
  },
});
