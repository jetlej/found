import { PhotoGrid } from "@/components/PhotoGrid";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { getAuditableItems } from "@/lib/filterProfile";
import { colors, fonts, fontSizes, spacing, textStyles } from "@/lib/theme";
import {
  IconBabyCarriage,
  IconBuildingChurch,
  IconBuildingCommunity,
  IconCannabis,
  IconChevronLeft,
  IconEye,
  IconEyeOff,
  IconFlag,
  IconGlass,
  IconHeart,
  IconHome,
  IconPaw,
  IconPill,
  IconRuler,
  IconSmokingNo,
  IconUserFilled,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_INNER_WIDTH = SCREEN_WIDTH - spacing.lg * 4;
const PHOTO_GAP = 10;
const PHOTO_WIDTH = CARD_INNER_WIDTH * 0.45;
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.25;

// --- Helpers (mirrored from matches.tsx) ---

function formatHeight(inches?: number): string | null {
  if (!inches) return null;
  const ft = Math.floor(inches / 12);
  const inn = inches % 12;
  return inn > 0 ? `${ft}'${inn}"` : `${ft}'`;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type BasicRow = { icon: React.ComponentType<{ size: number; color: string }>; label: string };
const ICON_SIZE = 20;
const ICON_COLOR = colors.text;

function getBasicsData(user: Doc<"users">) {
  const topRow: BasicRow[] = [];
  if (user.heightInches) topRow.push({ icon: IconRuler, label: formatHeight(user.heightInches)! });
  if (user.hometown) topRow.push({ icon: IconHome, label: user.hometown });
  if (user.wantsChildren) {
    const kidsLabels: Record<string, string> = { yes: "Wants children", no: "Doesn't want children", open: "Open to children", not_sure: "Not sure about children" };
    topRow.push({ icon: IconBabyCarriage, label: kidsLabels[user.wantsChildren] || user.wantsChildren });
  }
  if (user.pets) topRow.push({ icon: IconPaw, label: user.pets });
  if (user.drinkingVisible !== false && user.drinking) topRow.push({ icon: IconGlass, label: user.drinking });
  if (user.smokingVisible !== false && user.smoking) topRow.push({ icon: IconSmokingNo, label: user.smoking });
  if (user.marijuanaVisible !== false && user.marijuana) topRow.push({ icon: IconCannabis, label: user.marijuana });
  if (user.drugsVisible !== false && user.drugs) topRow.push({ icon: IconPill, label: user.drugs });

  const detailRows: BasicRow[] = [];
  if (user.ethnicity) detailRows.push({ icon: IconFlag, label: user.ethnicity });
  if (user.religion) detailRows.push({ icon: IconBuildingChurch, label: user.religion });
  if (user.politicalLeaning) detailRows.push({ icon: IconBuildingCommunity, label: user.politicalLeaning });
  const goalParts: string[] = [];
  if (user.relationshipGoal) { const g = user.relationshipGoal.replace(/_/g, " "); goalParts.push(g.charAt(0).toUpperCase() + g.slice(1)); }
  if (user.relationshipType) goalParts.push(user.relationshipType);
  if (goalParts.length > 0) detailRows.push({ icon: IconHeart, label: goalParts.join(" / ") });

  return { topRow, detailRows };
}

function getTraitLabel(trait: string) {
  const labels: Record<string, { name: string; low: string; high: string; inverted?: boolean }> = {
    introversion: { name: "Social Style", low: "Introvert", high: "Extrovert", inverted: true },
    adventurousness: { name: "Adventure", low: "Routine-lover", high: "Thrill-seeker" },
    ambition: { name: "Ambition", low: "Content", high: "Driven" },
    emotionalOpenness: { name: "Emotional Openness", low: "Private", high: "Open book" },
    traditionalValues: { name: "Values", low: "Traditional", high: "Progressive", inverted: true },
    independenceNeed: { name: "Independence", low: "Together", high: "Space needed" },
    romanticStyle: { name: "Romance Style", low: "Practical", high: "Deeply romantic" },
    socialEnergy: { name: "Social Energy", low: "Homebody", high: "Social butterfly" },
    communicationStyle: { name: "Communication", low: "Reserved", high: "Expressive" },
    attachmentStyle: { name: "Attachment", low: "Avoidant", high: "Anxious" },
    planningStyle: { name: "Planning", low: "Structured", high: "Spontaneous", inverted: true },
  };
  return labels[trait] || { name: trait, low: "Low", high: "High" };
}

// --- Sub-components ---

function ScrollableBasicsRow({ items }: { items: BasicRow[] }) {
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

function TraitBar({ name, value, lowLabel, highLabel, inverted }: { name: string; value: number; lowLabel: string; highLabel: string; inverted?: boolean }) {
  const displayValue = inverted ? 10 - value : value;
  const percentage = (displayValue / 10) * 100;
  return (
    <View style={s.traitRow}>
      <Text style={s.traitName}>{name}</Text>
      <View style={s.traitBarContainer}>
        <Text style={s.traitLabelLeft}>{lowLabel}</Text>
        <View style={s.traitBar}>
          <View style={[s.traitBarFill, { width: `${percentage}%` }]} />
          <View style={[s.traitIndicator, { left: `${percentage}%` }]} />
        </View>
        <Text style={s.traitLabelRight}>{highLabel}</Text>
      </View>
    </View>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.profileSection}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Toggleable tag with eye icon
function AuditTag({ label, isHidden, style, textStyle, onToggle }: {
  label: string; isHidden: boolean;
  style?: any; textStyle?: any;
  onToggle: () => void;
}) {
  return (
    <Pressable style={[s.tag, style, isHidden && s.tagHidden]} onPress={onToggle}>
      <Text style={[s.tagText, textStyle, isHidden && s.hiddenText]} numberOfLines={2}>{label}</Text>
      {isHidden
        ? <IconEyeOff size={12} color={colors.textMuted} />
        : <IconEye size={12} color={colors.textSecondary} />}
    </Pressable>
  );
}

// --- Main Screen ---

export default function ProfileAuditScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { firstTime, fromRegenerate } = useLocalSearchParams<{ firstTime?: string; fromRegenerate?: string }>();
  const isFirstTime = firstTime === "true";
  const isFromRegenerate = fromRegenerate === "true";
  const isMandatory = isFirstTime || isFromRegenerate;

  const currentUser = useQuery(api.users.current, userId ? {} : "skip");
  const myProfile = useQuery(
    api.userProfiles.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );
  const userPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );
  const updateHiddenFields = useMutation(api.userProfiles.updateHiddenFields);
  const completeProfileAudit = useMutation(api.users.completeProfileAudit);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);

  useEffect(() => {
    if (myProfile && !initialized) {
      setHidden(new Set(myProfile.hiddenFields ?? []));
      setInitialized(true);
    }
  }, [myProfile, initialized]);

  const auditItems = useMemo(() => (myProfile ? getAuditableItems(myProfile) : []), [myProfile]);

  // Build a lookup: path -> AuditItem for quick checks
  const auditPaths = useMemo(() => new Set(auditItems.map((i) => i.path)), [auditItems]);

  const toggleItem = useCallback((path: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleDone = async () => {
    setSaving(true);
    try {
      await updateHiddenFields({ hiddenFields: Array.from(hidden) });
      if (isMandatory) {
        await completeProfileAudit({});
      }
    } catch (e) {
      console.error("Failed to save hidden fields:", e);
      setSaving(false);
      return;
    }
    setSaving(false);
    if (isFirstTime) {
      router.replace("/(tabs)/matches");
    } else {
      router.back();
    }
  };

  if (!currentUser || !myProfile || !initialized) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.loading}><ActivityIndicator color={colors.textMuted} /></View>
      </SafeAreaView>
    );
  }

  const photos = (userPhotos ?? []).sort((a, b) => a.order - b.order).map((p) => p.url);
  const age = currentUser.birthdate
    ? Math.floor((Date.now() - new Date(currentUser.birthdate).getTime()) / 31557600000)
    : null;
  const basics = getBasicsData(currentUser);
  const profile = myProfile;

  // Helper to render a tag row where items are audit-toggleable
  const renderAuditTags = (items: string[], pathPrefix: string, tagStyle?: any, tagTextStyle?: any) => (
    <View style={s.tagsRow}>
      {items.map((item, i) => {
        const path = `${pathPrefix}.${i}`;
        if (!auditPaths.has(path)) {
          // Not auditable, render plain
          return (
            <View key={i} style={[s.tag, tagStyle]}>
              <Text style={[s.tagText, tagTextStyle]}>{item}</Text>
            </View>
          );
        }
        return (
          <AuditTag key={i} label={item} isHidden={hidden.has(path)} style={tagStyle} textStyle={tagTextStyle} onToggle={() => toggleItem(path)} />
        );
      })}
    </View>
  );

  // Helper for nested audit tags
  const renderNestedAuditTags = (items: string[], parentKey: string, subKey: string, tagStyle?: any, tagTextStyle?: any) =>
    renderAuditTags(items, `${parentKey}.${subKey}`, tagStyle, tagTextStyle);

  // Helper for nested scalar audit item
  const renderNestedScalar = (parentKey: string, subKey: string, label: string, text: string) => {
    const path = `${parentKey}.${subKey}`;
    const isAuditable = auditPaths.has(path);
    const isHid = hidden.has(path);
    return (
      <View style={s.storyItem}>
        <View style={s.storyLabelRow}>
          <Text style={s.storyLabel}>{label}</Text>
          {isAuditable && (
            <Pressable onPress={() => toggleItem(path)} hitSlop={8}>
              {isHid ? <IconEyeOff size={14} color={colors.textMuted} /> : <IconEye size={14} color={colors.textSecondary} />}
            </Pressable>
          )}
        </View>
        <Text style={[s.storyText, isHid && s.hiddenText]}>{text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Nav bar */}
      <View style={s.navBar}>
        {isMandatory ? (
          <View style={s.navButton} />
        ) : (
          <Pressable onPress={() => router.back()} style={s.navButton}>
            <IconChevronLeft size={24} color={colors.text} />
          </Pressable>
        )}
        <Text style={s.navTitle}>
          {isMandatory ? "Review Your Profile" : "My Profile"}
        </Text>
        <View style={s.navButton} />
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {/* Subtitle */}
        <Text style={s.subtitle}>
          {isFirstTime
            ? "Here's what we learned about you. Tap "
            : "Tap "}
          <IconEye size={14} color={colors.textSecondary} />
          {isFirstTime
            ? " on anything you'd rather keep private."
            : " to hide or show items on your profile."}
        </Text>

        {/* Match card container */}
        <View style={s.card}>
          {/* Header: name, age, location */}
          <View style={s.cardInner}>
            <View style={s.matchHeader}>
              <View style={s.matchInfo}>
                <Text style={s.matchName}>
                  {currentUser.name?.split(" ")[0] || "You"}
                </Text>
                <Text style={s.matchLocation}>
                  {age ? `${age}, ` : ""}{currentUser.location || ""}
                </Text>
              </View>
            </View>

            {/* Photo strip */}
            <View style={photoStyles.container}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={PHOTO_WIDTH + PHOTO_GAP} contentContainerStyle={{ gap: PHOTO_GAP }} style={{ overflow: "visible" }}>
                {(photos.length > 0 ? photos : [null, null, null]).map((url, i) => (
                  <Pressable key={i} onPress={() => setShowPhotoEditor(true)} style={[photoStyles.photoWrapper, { transform: [{ rotate: i % 2 === 0 ? "-5deg" : "5deg" }, { translateY: i % 2 === 0 ? 0 : PHOTO_HEIGHT * 0.05 }] }]}>
                    {url ? (
                      <Image source={{ uri: url }} style={photoStyles.photo} resizeMode="cover" />
                    ) : (
                      <View style={photoStyles.placeholder}><IconUserFilled size={40} color="#BDBDBD" /></View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Basics at a glance */}
          {(basics.topRow.length > 0 || basics.detailRows.length > 0) && (
            <View style={basicsStyles.container}>
              <ScrollableBasicsRow items={basics.topRow} />
              {basics.detailRows.length > 0 && basics.topRow.length > 0 && <View style={basicsStyles.dividerLine} />}
              <ScrollableBasicsRow items={basics.detailRows} />
            </View>
          )}

          {/* Bio */}
          <View style={s.bioSection}>
            {profile.generatedBio && (
              <Text style={s.shortBio}>{profile.generatedBio}</Text>
            )}
          </View>

          {/* Full profile sections with audit toggles */}
          <View style={s.fullProfile}>
            {/* Values */}
            {profile.values.length > 0 && (
              <ProfileSection title="Values">
                {renderAuditTags(profile.values, "values", s.tagValue, s.tagValueText)}
              </ProfileSection>
            )}

            {/* Interests */}
            {profile.interests.length > 0 && (
              <ProfileSection title="Interests">
                {renderAuditTags(profile.interests, "interests", s.tagInterest, s.tagInterestText)}
              </ProfileSection>
            )}

            {/* Dealbreakers */}
            {profile.dealbreakers.length > 0 && (
              <ProfileSection title="Dealbreakers">
                {renderAuditTags(profile.dealbreakers, "dealbreakers", s.tagDealbreaker, s.tagDealbreakerText)}
              </ProfileSection>
            )}

            {/* Keywords */}
            {profile.keywords.length > 0 && (
              <ProfileSection title="Keywords">
                {renderAuditTags(profile.keywords, "keywords", s.tagSmall)}
              </ProfileSection>
            )}

            {/* Personality */}
            <ProfileSection title="Personality">
              {Object.entries(profile.traits).map(([key, value]) => {
                if (value === undefined) return null;
                const label = getTraitLabel(key);
                return <TraitBar key={key} name={label.name} value={value as number} lowLabel={label.low} highLabel={label.high} inverted={label.inverted} />;
              })}
            </ProfileSection>

            {/* Life Story */}
            {profile.lifeStory && (
              <ProfileSection title="Life Story">
                {profile.lifeStory.proudestAchievement && renderNestedScalar("lifeStory", "proudestAchievement", "🏆 Proudest Achievement", profile.lifeStory.proudestAchievement)}
                {profile.lifeStory.definingHardship && renderNestedScalar("lifeStory", "definingHardship", "💪 Defining Challenge", profile.lifeStory.definingHardship)}
                {profile.lifeStory.biggestRisk && renderNestedScalar("lifeStory", "biggestRisk", "🎲 Biggest Risk Taken", profile.lifeStory.biggestRisk)}
                {profile.lifeStory.dreams.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>✨ Dreams</Text>
                    {renderNestedAuditTags(profile.lifeStory.dreams, "lifeStory", "dreams", s.tagSmall)}
                  </View>
                )}
                {profile.lifeStory.fears.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>😰 Fears</Text>
                    {renderNestedAuditTags(profile.lifeStory.fears, "lifeStory", "fears", s.tagSmall)}
                  </View>
                )}
              </ProfileSection>
            )}

            {/* Love Philosophy */}
            {profile.lovePhilosophy && (profile.lovePhilosophy.loveDefinition || profile.lovePhilosophy.healthyRelationshipVision) && (
              <ProfileSection title="Love Philosophy">
                {profile.lovePhilosophy.loveDefinition && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>What is Love?</Text>
                    <Text style={s.storyText}>{profile.lovePhilosophy.loveDefinition}</Text>
                  </View>
                )}
                {profile.lovePhilosophy.healthyRelationshipVision && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>Healthy Relationship</Text>
                    <Text style={s.storyText}>{profile.lovePhilosophy.healthyRelationshipVision}</Text>
                  </View>
                )}
              </ProfileSection>
            )}

            {/* Partner Preferences */}
            {profile.partnerPreferences && (
              <ProfileSection title="Partner Preferences">
                {profile.partnerPreferences.mustHaves.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>✅ Must Haves</Text>
                    {renderNestedAuditTags(profile.partnerPreferences.mustHaves, "partnerPreferences", "mustHaves", s.tagMustHave, s.tagMustHaveText)}
                  </View>
                )}
                {profile.partnerPreferences.niceToHaves.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>💫 Nice to Have</Text>
                    {renderNestedAuditTags(profile.partnerPreferences.niceToHaves, "partnerPreferences", "niceToHaves", s.tagSmall)}
                  </View>
                )}
                {profile.partnerPreferences.redFlags.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>🚩 Red Flags</Text>
                    {renderNestedAuditTags(profile.partnerPreferences.redFlags, "partnerPreferences", "redFlags", s.tagRedFlag, s.tagRedFlagText)}
                  </View>
                )}
              </ProfileSection>
            )}

            {/* Fun Facts */}
            {profile.bioElements && (
              <ProfileSection title="Fun Facts">
                {profile.bioElements.conversationStarters.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>💬 Conversation Starters</Text>
                    {profile.bioElements.conversationStarters.map((c, i) => (
                      <Text key={i} style={s.bulletText}>• {c}</Text>
                    ))}
                  </View>
                )}
                {profile.bioElements.uniqueQuirks.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>🎭 Quirks</Text>
                    {renderNestedAuditTags(profile.bioElements.uniqueQuirks, "bioElements", "uniqueQuirks", s.tagQuirk, s.tagQuirkText)}
                  </View>
                )}
                {profile.bioElements.passions.length > 0 && (
                  <View style={s.storyItem}>
                    <Text style={s.storyLabel}>🔥 Passions</Text>
                    {renderNestedAuditTags(profile.bioElements.passions, "bioElements", "passions", s.tagPassion, s.tagPassionText)}
                  </View>
                )}
              </ProfileSection>
            )}

            {/* Relationship Style */}
            <ProfileSection title="Relationship Style">
              <View style={s.infoGrid}>
                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>Love Language</Text>
                  <Text style={s.infoValue}>{formatLabel(profile.relationshipStyle.loveLanguage)}</Text>
                </View>
                <View style={s.infoItem}>
                  <Text style={s.infoLabel}>Conflict Style</Text>
                  <Text style={s.infoValue}>{formatLabel(profile.relationshipStyle.conflictStyle)}</Text>
                </View>
              </View>
              <TraitBar name="Alone Time Need" value={profile.relationshipStyle.aloneTimeNeed} lowLabel="Together always" highLabel="Lots of space" />
            </ProfileSection>

            {/* Family & Future */}
            <ProfileSection title="Family & Future">
              {profile.familyPlans.kidsTimeline && (
                <View style={s.infoGrid}>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>Kids Timeline</Text>
                    <Text style={s.infoValue}>{profile.familyPlans.kidsTimeline}</Text>
                  </View>
                </View>
              )}
              <TraitBar name="Family Closeness" value={profile.familyPlans.familyCloseness} lowLabel="Independent" highLabel="Very close" />
            </ProfileSection>
          </View>
        </View>

        <View style={s.bottomPadding} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Pressable style={[s.doneButton, saving && s.doneButtonDisabled]} onPress={handleDone} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.primaryText} size="small" />
          ) : (
            <Text style={s.doneButtonText}>{isMandatory ? "Looks Good" : "Done"}</Text>
          )}
        </Pressable>
      </View>

      <Modal
        visible={showPhotoEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPhotoEditor(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <View style={s.modalHeaderSpacer} />
            <Text style={s.modalTitle}>Edit Photos</Text>
            <Pressable onPress={() => setShowPhotoEditor(false)} style={s.modalDoneButton}>
              <Text style={s.modalDoneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1, paddingTop: spacing.lg }}>
            <Text style={s.modalSubtitle}>
              Hold and drag photos to reorder. Your first photo is your main profile picture.
            </Text>
            {currentUser._id && (
              <PhotoGrid userId={currentUser._id} existingPhotos={userPhotos} showRequired={false} />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---

const photoStyles = StyleSheet.create({
  container: { marginTop: spacing.md - PHOTO_HEIGHT * 0.1, marginBottom: -spacing.md, paddingVertical: 20, overflow: "visible" },
  photoWrapper: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT },
  photo: { width: "100%", height: "100%", borderRadius: 12 },
  placeholder: { width: "100%", height: "100%", backgroundColor: "#E0E0E0", justifyContent: "center", alignItems: "center", borderRadius: 12 },
});

const basicsStyles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: 12, marginBottom: spacing.xs },
  topRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  topItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  topDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  topLabel: { fontSize: fontSizes.xs, color: colors.text },
  dividerLine: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  navTitle: { ...textStyles.pageTitle },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing["3xl"] },
  subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: spacing.xl, marginBottom: spacing.lg, textAlign: "center" },

  // Card (mirrors matchCard from matches.tsx)
  card: { marginHorizontal: spacing.lg, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3, backgroundColor: colors.surface },
  cardInner: { padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 12, overflow: "hidden" },
  matchHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  matchInfo: { flex: 1 },
  matchName: { fontFamily: fonts.serifBold, fontSize: fontSizes["3xl"], color: colors.text },
  matchLocation: { fontSize: fontSizes.base, color: colors.textSecondary, marginTop: 2 },
  bioSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  shortBio: { fontSize: fontSizes.sm, color: colors.text, lineHeight: 20, fontStyle: "italic" },

  // Full profile
  fullProfile: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  profileSection: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { fontFamily: fonts.serifBold, fontSize: fontSizes.base, color: colors.text, marginBottom: spacing.sm },

  // Tags (shared)
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: fontSizes.xs, flexShrink: 1 },
  tagHidden: { backgroundColor: `${colors.border}40` },
  hiddenText: { color: colors.textMuted, textDecorationLine: "line-through" },
  tagValue: { backgroundColor: "#dbeafe" },
  tagValueText: { color: "#1e40af" },
  tagInterest: { backgroundColor: "#fef3c7" },
  tagInterestText: { color: "#92400e" },
  tagDealbreaker: { backgroundColor: "#fee2e2" },
  tagDealbreakerText: { color: "#991b1b" },
  tagMustHave: { backgroundColor: "#dcfce7" },
  tagMustHaveText: { color: "#166534" },
  tagRedFlag: { backgroundColor: "#fee2e2" },
  tagRedFlagText: { color: "#991b1b" },
  tagQuirk: { backgroundColor: "#f3e8ff" },
  tagQuirkText: { color: "#7c3aed" },
  tagPassion: { backgroundColor: "#fce7f3" },
  tagPassionText: { color: "#be185d" },
  tagSmall: { backgroundColor: colors.background },

  // Trait bars
  traitRow: { marginBottom: spacing.sm },
  traitName: { fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: 4 },
  traitBarContainer: { flexDirection: "row", alignItems: "center" },
  traitLabelLeft: { fontSize: 10, color: colors.textMuted, width: 70 },
  traitLabelRight: { fontSize: 10, color: colors.textMuted, width: 70, textAlign: "right" },
  traitBar: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, marginHorizontal: spacing.xs, position: "relative" },
  traitBarFill: { height: "100%", backgroundColor: colors.text, borderRadius: 4 },
  traitIndicator: { position: "absolute", top: -2, width: 12, height: 12, backgroundColor: colors.text, borderRadius: 6, marginLeft: -6, borderWidth: 2, borderColor: colors.surface },

  // Info grid
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  infoItem: { minWidth: 100, marginBottom: spacing.xs },
  infoLabel: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: fontSizes.sm, color: colors.text, marginTop: 2 },

  // Story items
  storyItem: { marginBottom: spacing.sm },
  storyLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: 4 },
  storyLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  storyText: { fontSize: fontSizes.sm, color: colors.text, lineHeight: 20 },
  bulletText: { fontSize: fontSizes.sm, color: colors.text, lineHeight: 20, marginLeft: spacing.sm },

  // Footer
  bottomPadding: { height: spacing["2xl"] },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  doneButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: 12, alignItems: "center" },
  doneButtonDisabled: { opacity: 0.6 },
  doneButtonText: { fontSize: fontSizes.base, fontWeight: "600", color: colors.primaryText },

  // Photo editor modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderSpacer: { width: 60 },
  modalTitle: { ...textStyles.pageTitle },
  modalDoneButton: { width: 60, alignItems: "flex-end" },
  modalDoneText: { fontSize: fontSizes.base, fontWeight: "600", color: colors.primary },
  modalSubtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.xl, marginBottom: spacing.lg, lineHeight: 20 },
});
