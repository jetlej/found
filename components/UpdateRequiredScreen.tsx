import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius } from '@/lib/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface UpdateRequiredScreenProps {
  type: 'ota' | 'testflight';
  onInstall: () => void;
}

export function UpdateRequiredScreen({ type, onInstall }: UpdateRequiredScreenProps) {
  const isOta = type === 'ota';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name={isOta ? 'cloud-download-outline' : 'phone-portrait-outline'}
          size={56}
          color={colors.text}
        />
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.message}>
          {isOta
            ? 'A new update is ready to install. This will only take a moment.'
            : 'A new version is available. Please update from TestFlight to continue.'}
        </Text>
        <Pressable style={styles.button} onPress={onInstall}>
          <Text style={styles.buttonText}>{isOta ? 'Install & Restart' : 'Open TestFlight'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  },
  buttonText: {
    color: colors.primaryText,
    fontFamily: fonts.sansBold,
    fontSize: fontSizes.base,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  message: {
    color: colors.textSecondary,
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 24,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes['2xl'],
    marginTop: spacing.sm,
  },
});
