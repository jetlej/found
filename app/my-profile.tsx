import { api } from '@/convex/_generated/api';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { filterProfile } from '@/lib/filterProfile';
import { colors, fonts, fontSizes, spacing, textStyles } from '@/lib/theme';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyProfileScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();

  const currentUser = useQuery(api.users.current, userId ? {} : 'skip');
  const myProfile = useQuery(
    api.userProfiles.getByUser,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );
  const userPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );

  const filteredProfile = useMemo(
    () => (myProfile ? filterProfile(myProfile, myProfile.hiddenFields ?? undefined) : null),
    [myProfile]
  );

  const sortedPhotos = userPhotos?.sort((a, b) => a.order - b.order) ?? [];

  const age = currentUser?.birthdate
    ? Math.floor((Date.now() - new Date(currentUser.birthdate).getTime()) / 31557600000)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>My Profile</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Photos */}
        {sortedPhotos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {sortedPhotos.map((photo, i) => (
              <Image key={i} source={{ uri: photo.url }} style={styles.photo} />
            ))}
          </ScrollView>
        )}

        {/* Name & basics */}
        <View style={styles.nameSection}>
          <Text style={styles.name}>
            {currentUser?.name?.split(' ')[0] || 'You'}
            {age ? `, ${age}` : ''}
          </Text>
          {currentUser?.location && <Text style={styles.location}>{currentUser.location}</Text>}
        </View>

        {/* Bio */}
        {filteredProfile?.generatedBio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{filteredProfile.generatedBio}</Text>
          </View>
        )}

        {/* Values */}
        {filteredProfile?.values && filteredProfile.values.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Values</Text>
            <View style={styles.tagsRow}>
              {filteredProfile.values.map((v, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interests */}
        {filteredProfile?.interests && filteredProfile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.tagsRow}>
              {filteredProfile.interests.map((v, i) => (
                <View key={i} style={[styles.tag, styles.tagInterest]}>
                  <Text style={[styles.tagText, styles.tagInterestText]}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Keywords */}
        {filteredProfile?.keywords && filteredProfile.keywords.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Keywords</Text>
            <View style={styles.tagsRow}>
              {filteredProfile.keywords.map((k, i) => (
                <View key={i} style={[styles.tag, styles.tagKeyword]}>
                  <Text style={styles.tagText}>{k}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bioText: { color: colors.text, fontSize: fontSizes.base, lineHeight: 24 },
  bottomPadding: { height: spacing['2xl'] },
  closeButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  closeIcon: { color: colors.textMuted, fontSize: 20 },
  container: { backgroundColor: colors.background, flex: 1 },
  location: { color: colors.textSecondary, fontSize: fontSizes.base, marginTop: spacing.xs },
  name: { color: colors.text, fontFamily: fonts.serifBold, fontSize: fontSizes['3xl'] },
  nameSection: { paddingBottom: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  navBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navTitle: { ...textStyles.pageTitle },
  photo: { backgroundColor: colors.border, borderRadius: 12, height: 250, width: 200 },
  photoStrip: { gap: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  scrollContent: { paddingBottom: spacing['3xl'] },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  tag: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagInterest: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  tagInterestText: { color: '#4338CA' },
  tagKeyword: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  tagText: { color: colors.text, fontSize: fontSizes.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
