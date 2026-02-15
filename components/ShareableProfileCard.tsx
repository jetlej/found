import { Doc } from "@/convex/_generated/dataModel";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import {
  IconBabyCarriage,
  IconBuildingChurch,
  IconBuildingCommunity,
  IconFlag,
  IconHeart,
  IconHome,
  IconPaw,
  IconRuler,
} from "@tabler/icons-react-native";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

// Format height from inches to ft'in"
function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inn = inches % 12;
  return inn > 0 ? `${ft}'${inn}"` : `${ft}'`;
}

type BasicItem = {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
};

function getBasicsRows(user: Doc<"users">) {
  const topRow: BasicItem[] = [];
  if (user.heightInches)
    topRow.push({ icon: IconRuler, label: formatHeight(user.heightInches) });
  if (user.hometown) topRow.push({ icon: IconHome, label: user.hometown });
  if (user.wantsChildren) {
    const labels: Record<string, string> = {
      yes: "Wants children",
      no: "Doesn't want children",
      open: "Open to children",
      not_sure: "Not sure about children",
    };
    topRow.push({ icon: IconBabyCarriage, label: labels[user.wantsChildren] || user.wantsChildren });
  }
  if (user.pets) topRow.push({ icon: IconPaw, label: user.pets });

  const detailRow: BasicItem[] = [];
  if (user.ethnicity) detailRow.push({ icon: IconFlag, label: user.ethnicity });
  if (user.religion) detailRow.push({ icon: IconBuildingChurch, label: user.religion });
  if (user.politicalLeaning) detailRow.push({ icon: IconBuildingCommunity, label: user.politicalLeaning });
  const goalParts: string[] = [];
  if (user.relationshipGoal) {
    const g = user.relationshipGoal.replace(/_/g, " ");
    goalParts.push(g.charAt(0).toUpperCase() + g.slice(1));
  }
  if (user.relationshipType) goalParts.push(user.relationshipType);
  if (goalParts.length > 0) detailRow.push({ icon: IconHeart, label: goalParts.join(" / ") });

  return { topRow, detailRow };
}

function BasicsWrap({ items }: { items: BasicItem[] }) {
  if (items.length === 0) return null;
  // Render items separated by dot dividers, wrapping naturally
  const elements: React.ReactNode[] = [];
  items.forEach((item, i) => {
    if (i > 0) {
      elements.push(
        <Text key={`sep-${i}`} style={basicsStyles.separator}>·</Text>
      );
    }
    elements.push(
      <View key={i} style={basicsStyles.item}>
        <item.icon size={16} color={colors.text} />
        <Text style={basicsStyles.label}>{item.label}</Text>
      </View>
    );
  });
  return <View style={basicsStyles.row}>{elements}</View>;
}

// Prefer raw (non-canonical) values — they're more unique/interesting
// canonicalValues are generic ("honesty", "loyalty"), rawValues are specific
function getInterestingValues(profile: Doc<"userProfiles">): string[] {
  const canonical = new Set(profile.canonicalValues ?? []);
  const raw = (profile.values ?? []).filter((v) => !canonical.has(v));
  // If we have enough raw values, prefer those; otherwise mix in canonical
  return raw.length >= 3
    ? raw.slice(0, 6)
    : [...raw, ...(profile.values ?? []).filter((v) => !raw.includes(v))].slice(0, 6);
}

interface ShareableProfileCardProps {
  user: Doc<"users">;
  profile: Doc<"userProfiles">;
  photoUrl: string | null;
  variant?: "card" | "fullPage";
  capturing?: boolean;
  onClose?: () => void;
}

export const ShareableProfileCard = React.forwardRef<View, ShareableProfileCardProps>(
  ({ user, profile, photoUrl, variant = "card", capturing, onClose }, ref) => {
    const isFullPage = variant === "fullPage";
    const age = user.birthdate
      ? Math.floor(
          (Date.now() - new Date(user.birthdate).getTime()) / 31557600000,
        )
      : null;
    const firstName = user.name?.split(" ")[0] || "You";

    const values = getInterestingValues(profile);
    const passions = (profile.bioElements?.passions ?? []).slice(0, 3);
    const mustHaves = (profile.partnerPreferences?.mustHaves ?? []).slice(0, 4);
    const dealbreakers = (profile.dealbreakers ?? []).slice(0, 3);
    const bio = profile.generatedBio || null;
    const { topRow, detailRow } = getBasicsRows(user);
    const allBasics = [...topRow, ...detailRow];
    const hasBasics = allBasics.length > 0;

    return (
      <View ref={ref} style={[isFullPage ? styles.fullPage : styles.card, capturing && { backgroundColor: colors.surface }]} collapsable={false}>
        {/* Logo row — centered, close button absolutely positioned left */}
        <View style={styles.logoRow}>
          {isFullPage && onClose && !capturing && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          )}
          <Text style={styles.logo}>Found.</Text>
          <Text style={styles.tagline}>The AI Matchmaker.</Text>
        </View>

        {/* Name row */}
        <View style={styles.nameRow}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.nameInfo}>
            <Text style={styles.name}>
              {firstName}
              {age ? `, ${age}` : ""}
            </Text>
            {user.location && (
              <Text style={styles.location}>{user.location}</Text>
            )}
          </View>
        </View>

        {/* Basics at a glance */}
        {hasBasics && <BasicsWrap items={allBasics} />}

        {/* Short bio / hook -- card variant only */}
        {!isFullPage && profile.shortBio && (
          <Text style={styles.shortBio}>"{profile.shortBio}"</Text>
        )}

        {/* Matchmaker's note */}
        {bio && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>matchmaker's note</Text>
            <Text style={styles.bioText}>{bio}</Text>
          </View>
        )}

        {/* Values & Passions */}
        {(values.length > 0 || passions.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>what defines them</Text>
            <View style={styles.pillRow}>
              {[...values, ...passions].map((v, i) => (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Must-haves */}
        {mustHaves.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>looking for</Text>
            <View style={styles.pillRow}>
              {mustHaves.map((m, i) => (
                <View key={i} style={styles.pillMustHave}>
                  <Text style={styles.pillMustHaveText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Dealbreakers */}
        {dealbreakers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>dealbreakers</Text>
            <View style={styles.pillRow}>
              {dealbreakers.map((d, i) => (
                <View key={i} style={styles.pillDealbreaker}>
                  <Text style={styles.pillDealbreakerText}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Watermark -- card variant only */}
        {!isFullPage && <Text style={styles.watermark}>found.app</Text>}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fullPage: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logo: {
    fontFamily: fonts.logo,
    fontSize: fontSizes.xl,
    color: colors.text,
  },
  tagline: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  closeButton: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  closeIcon: {
    fontSize: 20,
    color: colors.textMuted,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoInitial: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  nameInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
  location: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  shortBio: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 22,
    fontStyle: "italic",
  },
  section: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bioText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#dbeafe",
    borderRadius: 12,
  },
  pillText: {
    fontSize: fontSizes.xs,
    color: "#1e40af",
  },
  pillMustHave: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
  },
  pillMustHaveText: {
    fontSize: fontSizes.xs,
    color: "#166534",
  },
  pillDealbreaker: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
  },
  pillDealbreakerText: {
    fontSize: fontSizes.xs,
    color: "#991b1b",
  },
  watermark: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing.lg,
  },
});

const basicsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  separator: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.text,
    fontFamily: fonts.serif,
  },
});
