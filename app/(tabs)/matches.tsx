import { AppHeader } from '@/components/AppHeader';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import {
  IconAlertTriangle,
  IconBabyCarriage,
  IconBuildingChurch,
  IconBuildingCommunity,
  IconCannabis,
  IconCheck,
  IconDiamondFilled,
  IconFlag,
  IconFlame,
  IconGlass,
  IconHeart,
  IconHome,
  IconMoodSmile,
  IconPaw,
  IconPill,
  IconRocket,
  IconRuler,
  IconSeedlingFilled,
  IconShield,
  IconSmokingNo,
  IconTarget,
  IconUserFilled,
  IconUsers,
  IconX,
} from '@tabler/icons-react-native';
import { useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_INNER_WIDTH = SCREEN_WIDTH - spacing.lg * 4; // card padding + margin
const PHOTO_GAP = 10;
const PHOTO_WIDTH = CARD_INNER_WIDTH * 0.45;
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.25; // 4:5 aspect
const PLACEHOLDER_COLOR = '#E0E0E0';

// Inline photo carousel for match cards
function PhotoStrip({
  photos,
  onPhotoPress,
}: {
  photos: string[];
  onPhotoPress: (index: number) => void;
}) {
  const hasPhotos = photos.length > 0;
  const items = hasPhotos ? photos : [null, null, null, null];

  return (
    <View style={photoStripStyles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={PHOTO_WIDTH + PHOTO_GAP}
        contentContainerStyle={{ gap: PHOTO_GAP }}
        style={{ overflow: 'visible' }}
      >
        {items.map((url, i) => {
          const rotation = i % 2 === 0 ? '-5deg' : '5deg';
          const translateY = i % 2 === 0 ? 0 : PHOTO_HEIGHT * 0.05;
          return (
            <Pressable
              key={i}
              onPress={() => hasPhotos && onPhotoPress(i)}
              style={[
                photoStripStyles.photoWrapper,
                { transform: [{ rotate: rotation }, { translateY }] },
              ]}
            >
              {url ? (
                <Image source={{ uri: url }} style={photoStripStyles.photo} resizeMode="cover" />
              ) : (
                <View style={photoStripStyles.placeholder}>
                  <IconUserFilled size={40} color="#BDBDBD" />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const photoStripStyles = StyleSheet.create({
  container: {
    marginBottom: -spacing.md,
    marginTop: spacing.md - PHOTO_HEIGHT * 0.1,
    overflow: 'visible',
    paddingVertical: 20,
  },
  photo: {
    borderRadius: 12,
    height: '100%',
    width: '100%',
  },
  photoWrapper: {
    height: PHOTO_HEIGHT,
    width: PHOTO_WIDTH,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 12,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
});

// Fullscreen photo viewer
function FullscreenPhotoViewer({
  photos,
  startIndex,
  onClose,
}: {
  photos: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={fullscreenStyles.backdrop}>
        <Pressable style={fullscreenStyles.closeButton} onPress={onClose}>
          <IconX size={28} color="#fff" />
        </Pressable>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startIndex * SCREEN_WIDTH, y: 0 }}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(idx);
          }}
          scrollEventThrottle={16}
        >
          {photos.map((url, i) => (
            <View key={i} style={fullscreenStyles.page}>
              <Image source={{ uri: url }} style={fullscreenStyles.image} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
        {photos.length > 1 && (
          <View style={fullscreenStyles.dots}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[fullscreenStyles.dot, i === activeIndex && fullscreenStyles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const fullscreenStyles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
    flex: 1,
    justifyContent: 'center',
  },
  closeButton: {
    padding: 8,
    position: 'absolute',
    right: 20,
    top: 60,
    zIndex: 10,
  },
  dot: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  dots: {
    bottom: 60,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  image: {
    height: SCREEN_WIDTH * 1.25,
    width: SCREEN_WIDTH,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
  },
});

// AI compatibility analysis - 10 category system (keys/labels from shared source of truth)
import { COMPATIBILITY_CATEGORIES, type CategoryKey } from '@/convex/lib/compatibilityCategories';

const CATEGORY_ICONS: Record<CategoryKey, React.ComponentType<{ size: number; color: string }>> = {
  coreValues: IconDiamondFilled,
  lifestyleAlignment: IconSeedlingFilled,
  relationshipGoals: IconTarget,
  emotionalCompatibility: IconMoodSmile,
  familyPlanning: IconBabyCarriage,
  socialLifestyle: IconUsers,
  growthMindset: IconRocket,
  sharedPassions: IconFlame,
  lifeStoryDepth: IconHeart,
  partnerFit: IconShield,
};

const AI_CATEGORIES = COMPATIBILITY_CATEGORIES.map((c) => ({
  key: c.key,
  label: c.label,
  icon: CATEGORY_ICONS[c.key],
}));

// Types for compatibility calculation
type UserProfile = Doc<'userProfiles'>;

// Format height from inches to ft'in" display
function formatHeight(inches?: number): string | null {
  if (!inches) return null;
  const ft = Math.floor(inches / 12);
  const inn = inches % 12;
  return inn > 0 ? `${ft}'${inn}"` : `${ft}'`;
}

// Convert snake_case enum values to readable labels
// e.g. "words_of_affirmation" -> "Words of Affirmation", "split_50_50" -> "Split 50/50"
function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Hinge-style basics display
const ICON_SIZE = 20;
const ICON_COLOR = colors.text;

type BasicRow = {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
};

function getBasicsData(user: Doc<'users'>) {
  // Top row: quick-glance items (horizontal scroll)
  const topRow: BasicRow[] = [];
  if (user.heightInches) topRow.push({ icon: IconRuler, label: formatHeight(user.heightInches)! });
  if (user.hometown) topRow.push({ icon: IconHome, label: user.hometown });
  if (user.wantsChildren) {
    const kidsLabels: Record<string, string> = {
      yes: 'Wants children',
      no: "Doesn't want children",
      open: 'Open to children',
      not_sure: 'Not sure about children',
    };
    topRow.push({
      icon: IconBabyCarriage,
      label: kidsLabels[user.wantsChildren] || user.wantsChildren,
    });
  }
  if (user.pets) topRow.push({ icon: IconPaw, label: user.pets });
  if (user.drinkingVisible !== false && user.drinking)
    topRow.push({ icon: IconGlass, label: user.drinking });
  if (user.smokingVisible !== false && user.smoking)
    topRow.push({ icon: IconSmokingNo, label: user.smoking });
  if (user.marijuanaVisible !== false && user.marijuana)
    topRow.push({ icon: IconCannabis, label: user.marijuana });
  if (user.drugsVisible !== false && user.drugs) topRow.push({ icon: IconPill, label: user.drugs });

  // Detail rows (important compatibility fields)
  const detailRows: BasicRow[] = [];
  if (user.ethnicity) detailRows.push({ icon: IconFlag, label: user.ethnicity });
  if (user.religion) detailRows.push({ icon: IconBuildingChurch, label: user.religion });
  if (user.politicalLeaning)
    detailRows.push({
      icon: IconBuildingCommunity,
      label: user.politicalLeaning,
    });
  // Combine relationship goal + type into one line
  const goalParts: string[] = [];
  if (user.relationshipGoal) {
    const goal = user.relationshipGoal.replace(/_/g, ' ');
    goalParts.push(goal.charAt(0).toUpperCase() + goal.slice(1));
  }
  if (user.relationshipType) goalParts.push(user.relationshipType);
  if (goalParts.length > 0) detailRows.push({ icon: IconHeart, label: goalParts.join(' / ') });

  return { topRow, detailRows };
}

function ScrollableRow({ items }: { items: BasicRow[] }) {
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}>
      <View style={basicsStyles.topRow}>
        {items.map((item, i) => (
          <View key={i} style={basicsStyles.topItem}>
            {i > 0 && <View style={basicsStyles.topDivider} />}
            <item.icon size={ICON_SIZE} color={ICON_COLOR} />
            <Text style={basicsStyles.topLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function BasicsAtAGlance({ user }: { user: Doc<'users'> }) {
  const { topRow, detailRows } = getBasicsData(user);
  if (topRow.length === 0 && detailRows.length === 0) return null;

  return (
    <View style={basicsStyles.container}>
      <ScrollableRow items={topRow} />
      {detailRows.length > 0 && topRow.length > 0 && <View style={basicsStyles.dividerLine} />}
      <ScrollableRow items={detailRows} />
    </View>
  );
}

const basicsStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  dividerLine: {
    backgroundColor: colors.border,
    height: 1,
    marginHorizontal: spacing.md,
  },
  topDivider: {
    backgroundColor: colors.border,
    height: 20,
    marginHorizontal: spacing.sm,
    width: 1,
  },
  topItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  topLabel: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: fontSizes.sm,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});

// ===== MUST-HAVE AND DEALBREAKER MATCHING =====

// Keywords that map to profile traits/values
const KEYWORD_MAPPINGS: Record<string, (profile: UserProfile) => boolean> = {
  // Family/Kids related
  'wants kids': (p) => p.familyPlans.wantsKids === 'yes' || p.familyPlans.wantsKids === 'open',
  "doesn't want kids": (p) => p.familyPlans.wantsKids === 'no',
  'has kids': (p) => p.demographics?.hasKids === true,
  'no kids': (p) => p.demographics?.hasKids !== true,
  'family-oriented': (p) => p.familyPlans.familyCloseness >= 7,

  // Personality traits
  ambitious: (p) => p.traits.ambition >= 7,
  driven: (p) => p.traits.ambition >= 7,
  adventurous: (p) => p.traits.adventurousness >= 7,
  spontaneous: (p) => (p.traits.planningStyle ?? 5) <= 4,
  'emotionally available': (p) => p.traits.emotionalOpenness >= 6,
  'emotionally open': (p) => p.traits.emotionalOpenness >= 6,
  independent: (p) => p.traits.independenceNeed >= 7,
  traditional: (p) => p.traits.traditionalValues >= 7,
  progressive: (p) => p.traits.traditionalValues <= 4,
  romantic: (p) => (p.traits.romanticStyle ?? 5) >= 7,
  introverted: (p) => p.traits.introversion >= 7,
  extroverted: (p) => p.traits.introversion <= 4,
  social: (p) => (p.traits.socialEnergy ?? 5) >= 6,
  homebody: (p) => (p.traits.socialEnergy ?? 5) <= 4,
  'secure attachment': (p) =>
    (p.traits.attachmentStyle ?? 5) >= 4 && (p.traits.attachmentStyle ?? 5) <= 6,

  // Lifestyle
  active: (p) =>
    p.lifestyle.exerciseLevel.toLowerCase().includes('daily') ||
    p.lifestyle.exerciseLevel.toLowerCase().includes('5+'),
  fit: (p) =>
    p.lifestyle.exerciseLevel.toLowerCase().includes('daily') ||
    p.lifestyle.exerciseLevel.toLowerCase().includes('5+'),
  healthy: (p) => (p.health?.physicalHealthRating ?? 5) >= 7,
  'non-smoker': (p) =>
    p.health?.smokingStatus?.toLowerCase() === 'never' ||
    p.health?.smokingStatus?.toLowerCase() === 'no',
  "doesn't smoke": (p) =>
    p.health?.smokingStatus?.toLowerCase() === 'never' ||
    p.health?.smokingStatus?.toLowerCase() === 'no',
  "doesn't drink": (p) => p.lifestyle.alcoholUse.toLowerCase() === 'never',
  'drinks socially': (p) =>
    p.lifestyle.alcoholUse.toLowerCase().includes('social') ||
    p.lifestyle.alcoholUse.toLowerCase().includes('occasionally'),
  'no drugs': (p) => p.lifestyle.drugUse.toLowerCase() === 'never',
  'early bird': (p) => p.lifestyle.sleepSchedule.toLowerCase().includes('early'),
  'night owl': (p) =>
    p.lifestyle.sleepSchedule.toLowerCase().includes('late') ||
    p.lifestyle.sleepSchedule.toLowerCase().includes('night'),
  'dog person': (p) => p.lifestyle.petPreference.toLowerCase().includes('dog'),
  'cat person': (p) => p.lifestyle.petPreference.toLowerCase().includes('cat'),
  'pet-friendly': (p) => !p.lifestyle.petPreference.toLowerCase().includes('no pet'),

  // Relationship style
  'good communicator': (p) => (p.traits.communicationStyle ?? 5) >= 6,
  'quality time': (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes('quality time'),
  'physical touch': (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes('physical'),
  'words of affirmation': (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes('words'),
  'acts of service': (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes('acts'),
  gifts: (p) => p.relationshipStyle.loveLanguage.toLowerCase().includes('gift'),

  // Demographics
  religious: (p) => (p.demographics?.religiosity ?? 0) >= 6,
  spiritual: (p) => (p.demographics?.religiosity ?? 0) >= 4,
  'not religious': (p) => (p.demographics?.religiosity ?? 0) <= 3,
  'politically active': (p) => (p.demographics?.politicalIntensity ?? 0) >= 6,
};

// Check if a must-have is met
type MustHaveResult = {
  mustHave: string;
  met: boolean;
  reason?: string;
};

function checkMustHaves(mustHaves: string[], targetProfile: UserProfile): MustHaveResult[] {
  return mustHaves.map((mustHave) => {
    const lowerMustHave = mustHave.toLowerCase();

    // Check direct keyword mappings
    for (const [keyword, checker] of Object.entries(KEYWORD_MAPPINGS)) {
      if (lowerMustHave.includes(keyword)) {
        const met = checker(targetProfile);
        return {
          mustHave,
          met,
          reason: met ? 'Profile matches' : "Profile doesn't match",
        };
      }
    }

    // Check against values array
    const matchesValue = targetProfile.values.some(
      (v) => v.toLowerCase().includes(lowerMustHave) || lowerMustHave.includes(v.toLowerCase())
    );
    if (matchesValue) {
      return { mustHave, met: true, reason: 'Matches their values' };
    }

    // Check against interests array
    const matchesInterest = targetProfile.interests.some(
      (i) => i.toLowerCase().includes(lowerMustHave) || lowerMustHave.includes(i.toLowerCase())
    );
    if (matchesInterest) {
      return { mustHave, met: true, reason: 'Matches their interests' };
    }

    // Check against keywords
    const matchesKeyword = targetProfile.keywords.some(
      (k) => k.toLowerCase().includes(lowerMustHave) || lowerMustHave.includes(k.toLowerCase())
    );
    if (matchesKeyword) {
      return { mustHave, met: true, reason: 'Found in profile' };
    }

    // Can't determine - mark as unknown (neutral)
    return { mustHave, met: true, reason: 'Unable to verify' };
  });
}

// Dealbreaker detection
type DealbreakeResult = {
  dealbreaker: string;
  triggered: boolean;
  severity: 'clear' | 'warning' | 'triggered';
  reason?: string;
};

// Specific dealbreaker checks
const DEALBREAKER_CHECKS: Record<
  string,
  (profile: UserProfile) => {
    triggered: boolean;
    severity: 'clear' | 'warning' | 'triggered';
    reason: string;
  }
> = {
  // Substance-related
  smoking: (p) => {
    const status = p.health?.smokingStatus?.toLowerCase() || '';
    if (status === 'never' || status === 'no')
      return {
        triggered: false,
        severity: 'clear',
        reason: "They don't smoke",
      };
    if (status.includes('quit') || status.includes('former'))
      return { triggered: false, severity: 'warning', reason: 'Former smoker' };
    return { triggered: true, severity: 'triggered', reason: 'They smoke' };
  },
  drugs: (p) => {
    const usage = p.lifestyle.drugUse.toLowerCase();
    if (usage === 'never') return { triggered: false, severity: 'clear', reason: 'No drug use' };
    if (usage.includes('rarely') || usage.includes('occasionally'))
      return {
        triggered: false,
        severity: 'warning',
        reason: 'Occasional use',
      };
    return { triggered: true, severity: 'triggered', reason: 'Uses drugs' };
  },
  'heavy drinking': (p) => {
    const usage = p.lifestyle.alcoholUse.toLowerCase();
    if (usage === 'never' || usage.includes('rarely') || usage.includes('social'))
      return {
        triggered: false,
        severity: 'clear',
        reason: 'Light/no drinking',
      };
    if (usage.includes('weekly') || usage.includes('moderate'))
      return {
        triggered: false,
        severity: 'warning',
        reason: 'Moderate drinking',
      };
    return { triggered: true, severity: 'triggered', reason: 'Heavy drinker' };
  },
  alcohol: (p) => {
    const usage = p.lifestyle.alcoholUse.toLowerCase();
    if (usage === 'never') return { triggered: false, severity: 'clear', reason: "Doesn't drink" };
    return { triggered: true, severity: 'triggered', reason: 'Drinks alcohol' };
  },

  // Family
  'wants kids': (p) => {
    if (p.familyPlans.wantsKids === 'no')
      return {
        triggered: false,
        severity: 'clear',
        reason: "Doesn't want kids",
      };
    if (p.familyPlans.wantsKids === 'maybe' || p.familyPlans.wantsKids === 'open')
      return { triggered: false, severity: 'warning', reason: 'Open to kids' };
    return { triggered: true, severity: 'triggered', reason: 'Wants kids' };
  },
  "doesn't want kids": (p) => {
    if (p.familyPlans.wantsKids === 'yes')
      return { triggered: false, severity: 'clear', reason: 'Wants kids' };
    if (p.familyPlans.wantsKids === 'maybe' || p.familyPlans.wantsKids === 'open')
      return { triggered: false, severity: 'warning', reason: 'Undecided' };
    return {
      triggered: true,
      severity: 'triggered',
      reason: "Doesn't want kids",
    };
  },
  'has kids': (p) => {
    if (!p.demographics?.hasKids) return { triggered: false, severity: 'clear', reason: 'No kids' };
    return { triggered: true, severity: 'triggered', reason: 'Has kids' };
  },

  // Religion/Politics
  religious: (p) => {
    if ((p.demographics?.religiosity ?? 0) <= 3)
      return { triggered: false, severity: 'clear', reason: 'Not religious' };
    if ((p.demographics?.religiosity ?? 0) <= 5)
      return {
        triggered: false,
        severity: 'warning',
        reason: 'Somewhat spiritual',
      };
    return { triggered: true, severity: 'triggered', reason: 'Religious' };
  },
  'not religious': (p) => {
    if ((p.demographics?.religiosity ?? 0) >= 6)
      return { triggered: false, severity: 'clear', reason: 'Religious' };
    return { triggered: true, severity: 'triggered', reason: 'Not religious' };
  },

  // Personality extremes
  'too introverted': (p) => {
    if (p.traits.introversion <= 7)
      return {
        triggered: false,
        severity: 'clear',
        reason: 'Balanced social style',
      };
    return {
      triggered: true,
      severity: 'triggered',
      reason: 'Very introverted',
    };
  },
  'too extroverted': (p) => {
    if (p.traits.introversion >= 3)
      return {
        triggered: false,
        severity: 'clear',
        reason: 'Balanced social style',
      };
    return {
      triggered: true,
      severity: 'triggered',
      reason: 'Very extroverted',
    };
  },
};

function checkDealbreakers(dealbreakers: string[], targetProfile: UserProfile): DealbreakeResult[] {
  return dealbreakers.map((dealbreaker) => {
    const lowerDealbreaker = dealbreaker.toLowerCase();

    // Check specific dealbreaker handlers
    for (const [keyword, checker] of Object.entries(DEALBREAKER_CHECKS)) {
      if (lowerDealbreaker.includes(keyword)) {
        const result = checker(targetProfile);
        return { dealbreaker, ...result };
      }
    }

    // Check if dealbreaker appears in their dealbreakers (compatible if different)
    const theyHaveToo = targetProfile.dealbreakers.some((d) =>
      d.toLowerCase().includes(lowerDealbreaker)
    );
    if (theyHaveToo) {
      return {
        dealbreaker,
        triggered: false,
        severity: 'clear' as const,
        reason: 'They share this dealbreaker',
      };
    }

    // Check against their values/interests (if matches, it's a problem)
    const inTheirValues = targetProfile.values.some((v) =>
      lowerDealbreaker.includes(v.toLowerCase())
    );
    if (inTheirValues) {
      return {
        dealbreaker,
        triggered: true,
        severity: 'triggered' as const,
        reason: 'Part of their core values',
      };
    }

    // Default to clear if we can't determine
    return {
      dealbreaker,
      triggered: false,
      severity: 'clear' as const,
      reason: 'No conflict detected',
    };
  });
}

// Score color based on value (10% increments) - red to green gradient (saturated/dark)
function getScoreColor(score: number): string {
  if (score >= 90) return '#0B9D4F'; // Deep green
  if (score >= 80) return '#2D8E3C'; // Forest green
  if (score >= 70) return '#5A9E2F'; // Olive green
  if (score >= 60) return '#B8960F'; // Dark gold
  if (score >= 50) return '#C97A0A'; // Dark amber
  if (score >= 40) return '#C95A10'; // Burnt orange
  if (score >= 30) return '#B83220'; // Dark red-orange
  return '#A3111B'; // Deep red
}

// Trait label helper
// Convention: LEFT = conservative/structured/reserved, RIGHT = liberal/open/spontaneous
// "inverted" means the database value is backwards from our display convention
function getTraitLabel(trait: string): {
  name: string;
  low: string;
  high: string;
  inverted?: boolean;
} {
  const labels: Record<string, { name: string; low: string; high: string; inverted?: boolean }> = {
    // Inverted: DB has 1=extrovert, 10=introvert, but we want introvert on LEFT
    introversion: {
      name: 'Social Style',
      low: 'Introvert',
      high: 'Extrovert',
      inverted: true,
    },
    adventurousness: {
      name: 'Adventure',
      low: 'Routine-lover',
      high: 'Thrill-seeker',
    },
    ambition: { name: 'Ambition', low: 'Content', high: 'Driven' },
    emotionalOpenness: {
      name: 'Emotional Openness',
      low: 'Private',
      high: 'Open book',
    },
    // Inverted: DB has 1=progressive, 10=traditional, but we want traditional on LEFT
    traditionalValues: {
      name: 'Values',
      low: 'Traditional',
      high: 'Progressive',
      inverted: true,
    },
    independenceNeed: {
      name: 'Independence',
      low: 'Together',
      high: 'Space needed',
    },
    romanticStyle: {
      name: 'Romance Style',
      low: 'Practical',
      high: 'Deeply romantic',
    },
    socialEnergy: {
      name: 'Social Energy',
      low: 'Homebody',
      high: 'Social butterfly',
    },
    communicationStyle: {
      name: 'Communication',
      low: 'Reserved',
      high: 'Expressive',
    },
    attachmentStyle: { name: 'Attachment', low: 'Avoidant', high: 'Anxious' },
    // Inverted: DB has 1=spontaneous, 10=structured, but we want structured on LEFT
    planningStyle: {
      name: 'Planning',
      low: 'Structured',
      high: 'Spontaneous',
      inverted: true,
    },
  };
  return labels[trait] || { name: trait, low: 'Low', high: 'High' };
}

// Profile detail section component
function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.profileSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Must-Haves Section Component
function MustHavesSection({
  myProfile,
  theirProfile,
  myName,
  theirName,
}: {
  myProfile: UserProfile;
  theirProfile: UserProfile;
  myName: string;
  theirName: string;
}) {
  const myMustHaves = myProfile.partnerPreferences?.mustHaves || [];
  const theirMustHaves = theirProfile.partnerPreferences?.mustHaves || [];

  const theyMeetMine = checkMustHaves(myMustHaves, theirProfile);
  const iMeetTheirs = checkMustHaves(theirMustHaves, myProfile);

  const myMetCount = theyMeetMine.filter((r) => r.met).length;
  const theirMetCount = iMeetTheirs.filter((r) => r.met).length;

  if (myMustHaves.length === 0 && theirMustHaves.length === 0) {
    return null;
  }

  return (
    <View style={styles.checkSection}>
      <Text style={styles.checkSectionTitle}>✓ Must-Haves Check</Text>

      {myMustHaves.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            Does {theirName} meet yours? {myMetCount}/{myMustHaves.length}
          </Text>
          <View style={styles.checkItems}>
            {theyMeetMine.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text style={[styles.checkIcon, result.met ? styles.checkMet : styles.checkMissed]}>
                  {result.met ? '✓' : '✗'}
                </Text>
                <Text style={[styles.checkText, !result.met && styles.checkTextMissed]}>
                  {result.mustHave}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {theirMustHaves.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            Do you meet {theirName}'s? {theirMetCount}/{theirMustHaves.length}
          </Text>
          <View style={styles.checkItems}>
            {iMeetTheirs.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text style={[styles.checkIcon, result.met ? styles.checkMet : styles.checkMissed]}>
                  {result.met ? '✓' : '✗'}
                </Text>
                <Text style={[styles.checkText, !result.met && styles.checkTextMissed]}>
                  {result.mustHave}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Dealbreakers Section Component
function DealbreakersSection({
  myProfile,
  theirProfile,
  myName,
  theirName,
}: {
  myProfile: UserProfile;
  theirProfile: UserProfile;
  myName: string;
  theirName: string;
}) {
  // Combine dealbreakers from both sources
  const myDealbreakers = [
    ...(myProfile.dealbreakers || []),
    ...(myProfile.partnerPreferences?.dealbreakersInPartner || []),
    ...(myProfile.partnerPreferences?.redFlags || []),
  ];
  const theirDealbreakers = [
    ...(theirProfile.dealbreakers || []),
    ...(theirProfile.partnerPreferences?.dealbreakersInPartner || []),
    ...(theirProfile.partnerPreferences?.redFlags || []),
  ];

  // Remove duplicates
  const uniqueMyDealbreakers = [...new Set(myDealbreakers)];
  const uniqueTheirDealbreakers = [...new Set(theirDealbreakers)];

  const theyTriggerMine = checkDealbreakers(uniqueMyDealbreakers, theirProfile);
  const iTriggerTheirs = checkDealbreakers(uniqueTheirDealbreakers, myProfile);

  const myTriggeredCount = theyTriggerMine.filter((r) => r.triggered).length;
  const myWarningCount = theyTriggerMine.filter((r) => r.severity === 'warning').length;
  const theirTriggeredCount = iTriggerTheirs.filter((r) => r.triggered).length;
  const theirWarningCount = iTriggerTheirs.filter((r) => r.severity === 'warning').length;

  if (uniqueMyDealbreakers.length === 0 && uniqueTheirDealbreakers.length === 0) {
    return null;
  }

  return (
    <View style={styles.checkSection}>
      <Text style={styles.checkSectionTitle}>⚠️ Dealbreakers Check</Text>

      {uniqueMyDealbreakers.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            Your dealbreakers:{' '}
            {myTriggeredCount === 0 && myWarningCount === 0
              ? 'All clear ✓'
              : myTriggeredCount > 0
                ? `${myTriggeredCount} triggered`
                : `${myWarningCount} warnings`}
          </Text>
          <View style={styles.checkItems}>
            {theyTriggerMine.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text
                  style={[
                    styles.checkIcon,
                    result.severity === 'clear'
                      ? styles.checkMet
                      : result.severity === 'warning'
                        ? styles.checkWarning
                        : styles.checkMissed,
                  ]}
                >
                  {result.severity === 'clear' ? '✓' : result.severity === 'warning' ? '⚠' : '✗'}
                </Text>
                <Text
                  style={[
                    styles.checkText,
                    result.severity === 'triggered' && styles.checkTextMissed,
                    result.severity === 'warning' && styles.checkTextWarning,
                  ]}
                >
                  {result.dealbreaker}
                  {result.reason && result.severity !== 'clear' && (
                    <Text style={styles.checkReason}> ({result.reason})</Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {uniqueTheirDealbreakers.length > 0 && (
        <View style={styles.checkGroup}>
          <Text style={styles.checkGroupTitle}>
            {theirName}'s dealbreakers:{' '}
            {theirTriggeredCount === 0 && theirWarningCount === 0
              ? 'All clear ✓'
              : theirTriggeredCount > 0
                ? `${theirTriggeredCount} triggered`
                : `${theirWarningCount} warnings`}
          </Text>
          <View style={styles.checkItems}>
            {iTriggerTheirs.map((result, i) => (
              <View key={i} style={styles.checkItem}>
                <Text
                  style={[
                    styles.checkIcon,
                    result.severity === 'clear'
                      ? styles.checkMet
                      : result.severity === 'warning'
                        ? styles.checkWarning
                        : styles.checkMissed,
                  ]}
                >
                  {result.severity === 'clear' ? '✓' : result.severity === 'warning' ? '⚠' : '✗'}
                </Text>
                <Text
                  style={[
                    styles.checkText,
                    result.severity === 'triggered' && styles.checkTextMissed,
                    result.severity === 'warning' && styles.checkTextWarning,
                  ]}
                >
                  {result.dealbreaker}
                  {result.reason && result.severity !== 'clear' && (
                    <Text style={styles.checkReason}> ({result.reason})</Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Trait bar component
function TraitBar({
  name,
  value,
  lowLabel,
  highLabel,
  inverted,
}: {
  name: string;
  value: number;
  lowLabel: string;
  highLabel: string;
  inverted?: boolean;
}) {
  // If inverted, flip the percentage (10 becomes 0, 1 becomes 90, etc.)
  const displayValue = inverted ? 10 - value : value;
  const percentage = (displayValue / 10) * 100;
  return (
    <View style={styles.traitRow}>
      <Text style={styles.traitName}>{name}</Text>
      <View style={styles.traitBarContainer}>
        <Text style={styles.traitLabelLeft}>{lowLabel}</Text>
        <View style={styles.traitBar}>
          <View style={[styles.traitBarFill, { width: `${percentage}%` }]} />
          <View style={[styles.traitIndicator, { left: `${percentage}%` }]} />
        </View>
        <Text style={styles.traitLabelRight}>{highLabel}</Text>
      </View>
    </View>
  );
}

// Full profile view component
function FullProfileView({
  profile,
  user,
  userName,
}: {
  profile: UserProfile;
  user?: Doc<'users'>;
  userName?: string;
}) {
  return (
    <View style={styles.fullProfileContainer}>
      {/* Values & Interests */}
      <ProfileSection title="Values">
        <View style={styles.tagsRow}>
          {profile.values.map((v, i) => (
            <View key={i} style={styles.tagValue}>
              <Text style={styles.tagValueText}>{v}</Text>
            </View>
          ))}
        </View>
      </ProfileSection>

      <ProfileSection title="Interests">
        <View style={styles.tagsRow}>
          {profile.interests.map((v, i) => (
            <View key={i} style={styles.tagInterest}>
              <Text style={styles.tagInterestText}>{v}</Text>
            </View>
          ))}
        </View>
      </ProfileSection>

      {/* Dealbreakers */}
      {profile.dealbreakers.length > 0 && (
        <ProfileSection title="Dealbreakers">
          <View style={styles.tagsRow}>
            {profile.dealbreakers.map((v, i) => (
              <View key={i} style={styles.tagDealbreaker}>
                <Text style={styles.tagDealbreakerText}>{v}</Text>
              </View>
            ))}
          </View>
        </ProfileSection>
      )}

      {/* Personality Traits */}
      <ProfileSection title="Personality">
        {Object.entries(profile.traits).map(([key, value]) => {
          if (value === undefined) return null;
          const label = getTraitLabel(key);
          return (
            <TraitBar
              key={key}
              name={label.name}
              value={value}
              lowLabel={label.low}
              highLabel={label.high}
              inverted={label.inverted}
            />
          );
        })}
      </ProfileSection>

      {/* Life Story */}
      {profile.lifeStory && (
        <ProfileSection title="Life Story">
          {profile.lifeStory.proudestAchievement && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🏆 Proudest Achievement</Text>
              <Text style={styles.storyText}>{profile.lifeStory.proudestAchievement}</Text>
            </View>
          )}
          {profile.lifeStory.definingHardship && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>💪 Defining Challenge</Text>
              <Text style={styles.storyText}>{profile.lifeStory.definingHardship}</Text>
            </View>
          )}
          {profile.lifeStory.biggestRisk && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🎲 Biggest Risk Taken</Text>
              <Text style={styles.storyText}>{profile.lifeStory.biggestRisk}</Text>
            </View>
          )}
          {profile.lifeStory.dreams.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>✨ Dreams</Text>
              <View style={styles.tagsRow}>
                {profile.lifeStory.dreams.map((d, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.lifeStory.fears.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>😰 Fears</Text>
              <View style={styles.tagsRow}>
                {profile.lifeStory.fears.map((f, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Love Philosophy */}
      {profile.lovePhilosophy &&
        (profile.lovePhilosophy.loveDefinition ||
          profile.lovePhilosophy.healthyRelationshipVision) && (
          <ProfileSection title="Love Philosophy">
            {profile.lovePhilosophy.loveDefinition && (
              <View style={styles.storyItem}>
                <Text style={styles.storyLabel}>What is Love?</Text>
                <Text style={styles.storyText}>{profile.lovePhilosophy.loveDefinition}</Text>
              </View>
            )}
            {profile.lovePhilosophy.healthyRelationshipVision && (
              <View style={styles.storyItem}>
                <Text style={styles.storyLabel}>Healthy Relationship</Text>
                <Text style={styles.storyText}>
                  {profile.lovePhilosophy.healthyRelationshipVision}
                </Text>
              </View>
            )}
          </ProfileSection>
        )}

      {/* Partner Preferences */}
      {profile.partnerPreferences && (
        <ProfileSection title="Partner Preferences">
          {profile.partnerPreferences.mustHaves.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>✅ Must Haves</Text>
              <View style={styles.tagsRow}>
                {profile.partnerPreferences.mustHaves.map((m, i) => (
                  <View key={i} style={styles.tagMustHave}>
                    <Text style={styles.tagMustHaveText}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.partnerPreferences.niceToHaves.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>💫 Nice to Have</Text>
              <View style={styles.tagsRow}>
                {profile.partnerPreferences.niceToHaves.map((n, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{n}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.partnerPreferences.redFlags.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🚩 Red Flags</Text>
              <View style={styles.tagsRow}>
                {profile.partnerPreferences.redFlags.map((r, i) => (
                  <View key={i} style={styles.tagRedFlag}>
                    <Text style={styles.tagRedFlagText}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.intimacyProfile && profile.intimacyProfile.connectionTriggers.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>What Creates Connection</Text>
              <View style={styles.tagsRow}>
                {profile.intimacyProfile.connectionTriggers.map((t, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Bio Elements */}
      {profile.bioElements && (
        <ProfileSection title="Fun Facts">
          {profile.bioElements.conversationStarters.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>💬 Conversation Starters</Text>
              {profile.bioElements.conversationStarters.map((c, i) => (
                <Text key={i} style={styles.bulletText}>
                  • {c}
                </Text>
              ))}
            </View>
          )}
          {profile.bioElements.uniqueQuirks.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🎭 Quirks</Text>
              <View style={styles.tagsRow}>
                {profile.bioElements.uniqueQuirks.map((q, i) => (
                  <View key={i} style={styles.tagQuirk}>
                    <Text style={styles.tagQuirkText}>{q}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.bioElements.passions.length > 0 && (
            <View style={styles.storyItem}>
              <Text style={styles.storyLabel}>🔥 Passions</Text>
              <View style={styles.tagsRow}>
                {profile.bioElements.passions.map((p, i) => (
                  <View key={i} style={styles.tagPassion}>
                    <Text style={styles.tagPassionText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ProfileSection>
      )}

      {/* Relationship Style */}
      <ProfileSection title="Relationship Style">
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Love Language</Text>
            <Text style={styles.infoValue}>
              {formatLabel(profile.relationshipStyle.loveLanguage)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Conflict Style</Text>
            <Text style={styles.infoValue}>
              {formatLabel(profile.relationshipStyle.conflictStyle)}
            </Text>
          </View>
        </View>
        <TraitBar
          name="Alone Time Need"
          value={profile.relationshipStyle.aloneTimeNeed}
          lowLabel="Together always"
          highLabel="Lots of space"
        />
      </ProfileSection>

      {/* Family & Future */}
      <ProfileSection title="Family & Future">
        {profile.familyPlans.kidsTimeline && (
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Kids Timeline</Text>
              <Text style={styles.infoValue}>{profile.familyPlans.kidsTimeline}</Text>
            </View>
          </View>
        )}
        <TraitBar
          name="Family Closeness"
          value={profile.familyPlans.familyCloseness}
          lowLabel="Independent"
          highLabel="Very close"
        />
      </ProfileSection>
    </View>
  );
}

export default function MatchesScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();

  const fadeOpacity = useSharedValue(0);
  const hasFaded = useRef(false);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, Set<string>>>({});
  const [fullscreenPhotos, setFullscreenPhotos] = useState<{
    urls: string[];
    startIndex: number;
  } | null>(null);
  // Track which tab is active per user: "compatibility" (default) or "profile"
  const [activeTab, setActiveTab] = useState<Record<string, 'compatibility' | 'profile'>>({});

  // Get current user
  const currentUser = useQuery(api.users.current, userId ? {} : 'skip');

  // Server-side filtered matches (replaces client-side listAll queries)
  const matchesData = useQuery(api.matching.getMatchesForCurrentUser, userId ? {} : 'skip');
  const matchGenerationStatus = useQuery(
    api.matching.getMatchGenerationStatusForCurrentUser,
    userId ? {} : 'skip'
  );

  // Build match list from server data
  const testUserMatches = matchesData
    ? matchesData.map((m: any) => ({
        user: m.user,
        profile: m.profile,
        photos: m.photos,
        analysis: m.analysis,
      }))
    : null;

  const isLoading = !currentUser || matchesData === undefined;
  const isEmpty = testUserMatches && testUserMatches.length === 0;
  const isAnalyzingFirstMatch = !!isEmpty && matchGenerationStatus?.isAnalyzing === true;
  const isReady = !isLoading && !isEmpty;

  // Trigger fade once data is ready (or empty state)
  useEffect(() => {
    if (!isLoading && !hasFaded.current) {
      hasFaded.current = true;
      fadeOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : isAnalyzingFirstMatch ? (
          <>
            <AppHeader />
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
              <Text style={styles.processingText}>Analyzing compatibility...</Text>
            </View>
          </>
        ) : isEmpty ? (
          <>
            <AppHeader />
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧪</Text>
              <Text style={styles.emptyTitle}>No Test Users</Text>
              <Text style={styles.emptyText}>
                Run the seed command to create test profiles:{'\n\n'}
                <Text style={styles.codeText}>bunx convex run seedTestUsers:seedTestUsers</Text>
              </Text>
            </View>
          </>
        ) : (
          <>
            <AppHeader />

            <ScrollView style={styles.scrollView}>
              {/* Match list */}
              {testUserMatches.map((match) => {
                if (!match) return null;
                const isExpanded = expandedUser === match.user._id;

                return (
                  <View key={match.user._id} style={styles.matchCard}>
                    <Pressable
                      style={styles.matchCardInner}
                      onPress={() => setExpandedUser(isExpanded ? null : match.user._id)}
                    >
                      <View style={styles.matchHeader}>
                        <View style={styles.matchInfo}>
                          <Text style={styles.matchName}>
                            {match.user.name?.split(' ')[0] || 'Unknown'}
                          </Text>
                          <Text style={styles.matchLocation}>
                            {match.user.birthdate
                              ? `${Math.floor((Date.now() - new Date(match.user.birthdate).getTime()) / 31557600000)}, `
                              : ''}
                            {match.user.location || 'Unknown location'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.scoreBadge,
                            {
                              backgroundColor: getScoreColor(match.analysis.overallScore),
                            },
                          ]}
                        >
                          <Text style={styles.scoreText}>{match.analysis.overallScore}</Text>
                        </View>
                      </View>

                      <PhotoStrip
                        photos={match.photos}
                        onPhotoPress={(i) => {
                          if (match.photos.length > 0)
                            setFullscreenPhotos({
                              urls: match.photos,
                              startIndex: i,
                            });
                        }}
                      />
                    </Pressable>

                    {/* Basics at a glance - outside Pressable so scroll works */}
                    <BasicsAtAGlance user={match.user} />

                    <Pressable
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingBottom: spacing.md,
                      }}
                      onPress={() => setExpandedUser(isExpanded ? null : match.user._id)}
                    >
                      {/* Bio - always visible */}
                      {match.profile.generatedBio && (
                        <Text style={styles.shortBio}>
                          {!isExpanded && match.profile.generatedBio.length > 375
                            ? match.profile.generatedBio.slice(0, 375).replace(/\s+\S*$/, '') +
                              '...'
                            : match.profile.generatedBio}
                        </Text>
                      )}

                      {/* Expanded view with tabs */}
                      {isExpanded && (
                        <View style={styles.breakdown}>
                          {/* Toggle tabs - Compatibility first (default) */}
                          <View style={styles.toggleContainer}>
                            <View style={styles.toggleTrack}>
                              <Pressable
                                style={[
                                  styles.toggleOption,
                                  (activeTab[match.user._id] || 'compatibility') ===
                                    'compatibility' && styles.toggleOptionActive,
                                ]}
                                onPress={() =>
                                  setActiveTab({
                                    ...activeTab,
                                    [match.user._id]: 'compatibility',
                                  })
                                }
                              >
                                <Text
                                  style={[
                                    styles.toggleText,
                                    (activeTab[match.user._id] || 'compatibility') ===
                                      'compatibility' && styles.toggleTextActive,
                                  ]}
                                >
                                  Compatibility
                                </Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.toggleOption,
                                  activeTab[match.user._id] === 'profile' &&
                                    styles.toggleOptionActive,
                                ]}
                                onPress={() =>
                                  setActiveTab({
                                    ...activeTab,
                                    [match.user._id]: 'profile',
                                  })
                                }
                              >
                                <Text
                                  style={[
                                    styles.toggleText,
                                    activeTab[match.user._id] === 'profile' &&
                                      styles.toggleTextActive,
                                  ]}
                                >
                                  Full Profile
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* Compatibility Tab (AI-powered) */}
                          {(activeTab[match.user._id] || 'compatibility') === 'compatibility' && (
                            <View>
                              {/* AI Summary */}
                              <Text style={styles.aiSummary}>{match.analysis.summary}</Text>

                              {/* 10 AI Category Bars */}
                              {AI_CATEGORIES.map(({ key, label, icon: CatIcon }) => {
                                const score = match.analysis.categoryScores[key] * 10; // 0-10 -> 0-100 for bar width
                                const scoreColor = getScoreColor(score);
                                const isFull = score === 100;
                                const summaryText = match.analysis.categorySummaries?.[key];
                                const isExpanded = expandedCategories[match.user._id]?.has(key);
                                return (
                                  <View key={key}>
                                    <Pressable
                                      style={styles.categoryRow}
                                      onPress={() => {
                                        if (!summaryText) return;
                                        setExpandedCategories((prev) => {
                                          const set = new Set(prev[match.user._id]);
                                          if (set.has(key)) set.delete(key);
                                          else set.add(key);
                                          return { ...prev, [match.user._id]: set };
                                        });
                                      }}
                                    >
                                      <View style={styles.categoryBar}>
                                        <View
                                          style={[
                                            styles.categoryBarFill,
                                            {
                                              width: `${score}%`,
                                              borderTopRightRadius: isFull ? 10 : 0,
                                              borderBottomRightRadius: isFull ? 10 : 0,
                                            },
                                          ]}
                                        >
                                          <LinearGradient
                                            colors={[`${scoreColor}4D`, `${scoreColor}99`]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.categoryBarGradient}
                                          />
                                          {!isFull && (
                                            <View
                                              style={[
                                                styles.categoryBarEdge,
                                                {
                                                  backgroundColor: scoreColor,
                                                },
                                              ]}
                                            />
                                          )}
                                        </View>
                                        <View style={styles.categoryBarContent}>
                                          <CatIcon size={20} color={colors.text} />
                                          <Text style={styles.categoryBarLabel}>{label}</Text>
                                        </View>
                                      </View>
                                      <Text
                                        style={[styles.categoryBarScore, { color: scoreColor }]}
                                      >
                                        {match.analysis.categoryScores[key]}
                                        /10
                                      </Text>
                                    </Pressable>
                                    {isExpanded && summaryText && (
                                      <Text style={styles.categorySummaryText}>{summaryText}</Text>
                                    )}
                                  </View>
                                );
                              })}

                              {/* Green Flags */}
                              {match.analysis.greenFlags.length > 0 && (
                                <View style={styles.flagSection}>
                                  <Text style={styles.flagTitle}>Green Flags</Text>
                                  <View style={styles.tagsRow}>
                                    {match.analysis.greenFlags.map((flag, i) => (
                                      <View key={i} style={styles.tagGreenFlag}>
                                        <IconCheck size={12} color="#166534" />
                                        <Text style={styles.tagGreenFlagText}>{flag}</Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              )}

                              {/* Yellow Flags */}
                              {match.analysis.yellowFlags.length > 0 && (
                                <View style={styles.flagSection}>
                                  <Text style={styles.flagTitle}>Yellow Flags</Text>
                                  <View style={styles.tagsRow}>
                                    {match.analysis.yellowFlags.map((flag, i) => (
                                      <View key={i} style={styles.tagYellowFlag}>
                                        <IconAlertTriangle size={12} color="#92400e" />
                                        <Text style={styles.tagYellowFlagText}>{flag}</Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              )}

                              {/* Red Flags */}
                              {match.analysis.redFlags.length > 0 && (
                                <View style={styles.flagSection}>
                                  <Text style={styles.flagTitle}>Red Flags</Text>
                                  <View style={styles.tagsRow}>
                                    {match.analysis.redFlags.map((flag, i) => (
                                      <View key={i} style={styles.tagRedFlag}>
                                        <IconX size={12} color="#991b1b" />
                                        <Text style={styles.tagRedFlagText}>{flag}</Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Full Profile Tab */}
                          {activeTab[match.user._id] === 'profile' && (
                            <FullProfileView
                              profile={match.profile}
                              user={match.user}
                              userName={match.user.name || 'User'}
                            />
                          )}
                        </View>
                      )}

                      <Text style={styles.expandHint}>
                        {isExpanded ? 'Tap to collapse' : 'Tap for details'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}

              <View style={styles.bottomPadding} />
            </ScrollView>

            {fullscreenPhotos && (
              <FullscreenPhotoViewer
                photos={fullscreenPhotos.urls}
                startIndex={fullscreenPhotos.startIndex}
                onClose={() => setFullscreenPhotos(null)}
              />
            )}
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes['2xl'],
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.xl,
    marginBottom: spacing.sm,
  },
  completeProfileButton: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  completeProfileButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  processingText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    lineHeight: 24,
    textAlign: 'center',
  },
  codeText: {
    backgroundColor: colors.surface,
    fontFamily: 'monospace',
    fontSize: fontSizes.sm,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 3,
    marginBottom: spacing.md * 2,
    marginHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  matchCardInner: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  matchHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  matchPhoto: {
    borderRadius: 28,
    height: 56,
    marginRight: spacing.md,
    width: 56,
  },
  matchPhotoPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 56,
  },
  matchPhotoInitial: {
    color: colors.textSecondary,
    fontSize: fontSizes.xl,
    fontWeight: '600',
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes['3xl'],
  },
  matchLocation: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    marginTop: 2,
  },
  scoreBadge: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  shortBio: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  scoreText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagSmall: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagSmallText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
  },
  moreText: {
    alignSelf: 'center',
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginLeft: spacing.xs,
  },
  expandHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  breakdown: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  breakdownTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  // Category bar styles (card-like progress bars)
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryBar: {
    backgroundColor: colors.border,
    borderRadius: 10,
    flex: 1,
    height: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryBarFill: {
    borderBottomLeftRadius: 10,
    borderTopLeftRadius: 10,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  categoryBarGradient: {
    flex: 1,
    height: '100%',
  },
  categoryBarEdge: {
    height: '100%',
    width: 3,
  },
  categoryBarContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    height: '100%',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    position: 'relative',
  },
  categoryBarLabel: {
    color: colors.text,
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  categoryBarScore: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    textAlign: 'right',
    width: 42,
  },
  categorySummaryText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
    lineHeight: fontSizes.xs * 1.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  sharedSection: {
    marginTop: spacing.md,
  },
  sharedTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: spacing.xs,
  },
  sharedTitleBold: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  tagShared: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagSharedText: {
    color: '#166534',
    fontSize: fontSizes.xs,
  },
  // Dealbreakers alert
  dealbreakersAlert: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  dealbreakersTitle: {
    color: '#991b1b',
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dealbreakersText: {
    color: '#991b1b',
    fontSize: fontSizes.sm,
  },
  // Must-Haves & Dealbreakers styles
  checkSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  checkSectionTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  checkGroup: {
    marginTop: spacing.sm,
  },
  checkGroupTitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    marginBottom: spacing.xs,
  },
  checkItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  checkItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  checkIcon: {
    fontSize: fontSizes.xs,
    marginRight: 4,
  },
  checkMet: {
    color: '#22c55e',
  },
  checkMissed: {
    color: '#ef4444',
  },
  checkWarning: {
    color: '#f59e0b',
  },
  checkText: {
    color: colors.text,
    fontSize: fontSizes.xs,
  },
  checkTextMissed: {
    color: '#ef4444',
  },
  checkTextWarning: {
    color: '#b45309',
  },
  checkReason: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  // Watch Out For styles
  watchOutSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  watchOutTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  watchOutItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  watchOutBullet: {
    color: '#f59e0b',
    fontSize: fontSizes.sm,
    marginRight: spacing.xs,
  },
  watchOutText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
  // Full profile styles
  fullProfileContainer: {
    marginTop: spacing.md,
  },
  aboutSection: {
    marginBottom: spacing.sm,
  },
  profileSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.base,
    marginBottom: spacing.sm,
  },
  bioText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  tagValue: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagValueText: {
    color: '#1e40af',
    fontSize: fontSizes.xs,
  },
  tagInterest: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagInterestText: {
    color: '#92400e',
    fontSize: fontSizes.xs,
  },
  tagDealbreaker: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagDealbreakerText: {
    color: '#991b1b',
    fontSize: fontSizes.xs,
  },
  tagMustHave: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagMustHaveText: {
    color: '#166534',
    fontSize: fontSizes.xs,
  },
  tagRedFlag: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagRedFlagText: {
    color: '#991b1b',
    fontSize: fontSizes.xs,
  },
  tagQuirk: {
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagQuirkText: {
    color: '#7c3aed',
    fontSize: fontSizes.xs,
  },
  tagPassion: {
    backgroundColor: '#fce7f3',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagPassionText: {
    color: '#be185d',
    fontSize: fontSizes.xs,
  },
  traitRow: {
    marginBottom: spacing.sm,
  },
  traitName: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    marginBottom: 4,
  },
  traitBarContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  traitLabelLeft: {
    color: colors.textMuted,
    fontSize: 10,
    width: 70,
  },
  traitLabelRight: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'right',
    width: 70,
  },
  traitBar: {
    backgroundColor: colors.border,
    borderRadius: 4,
    flex: 1,
    height: 8,
    marginHorizontal: spacing.xs,
    position: 'relative',
  },
  traitBarFill: {
    backgroundColor: colors.text,
    borderRadius: 4,
    height: '100%',
  },
  traitIndicator: {
    backgroundColor: colors.text,
    borderColor: colors.surface,
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    marginLeft: -6,
    position: 'absolute',
    top: -2,
    width: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    marginBottom: spacing.xs,
    minWidth: 100,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.text,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  storyItem: {
    marginBottom: spacing.sm,
  },
  storyLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    marginBottom: 4,
  },
  storyText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  bulletText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginLeft: spacing.sm,
  },
  // Toggle styles
  toggleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  toggleTrack: {
    backgroundColor: colors.border,
    borderRadius: 20,
    flexDirection: 'row',
    padding: 3,
  },
  toggleOption: {
    borderRadius: 17,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  toggleOptionActive: {
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  // AI analysis styles
  aiSummary: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  flagSection: {
    marginTop: spacing.md,
  },
  flagTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  tagGreenFlag: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagGreenFlagText: {
    color: '#166534',
    flexShrink: 1,
    fontSize: fontSizes.xs,
  },
  tagYellowFlag: {
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagYellowFlagText: {
    color: '#92400e',
    flexShrink: 1,
    fontSize: fontSizes.xs,
  },
  tagRedFlag: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagRedFlagText: {
    color: '#991b1b',
    flexShrink: 1,
    fontSize: fontSizes.xs,
  },
});
