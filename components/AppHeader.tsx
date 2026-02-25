import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AppHeaderProps {
  showLevelLink?: boolean;
  onLogoPress?: () => void;
}

export function AppHeader({ showLevelLink = true, onLogoPress }: AppHeaderProps) {
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  headerLeft: {
    alignItems: 'flex-start',
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  logo: {
    color: colors.text,
    fontFamily: fonts.logo,
    fontSize: fontSizes['2xl'],
  },
});
