import { colors, fontSizes, spacing } from '@/lib/theme';
import { useOfflineStore } from '@/stores/offline';
import { IconCloudOff } from '@tabler/icons-react-native';
import { StyleSheet, Text, View } from 'react-native';

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
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  offlineText: {
    color: colors.warning,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
});
