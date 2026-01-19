import { AppHeader } from "@/components/AppHeader";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Types for compatibility calculation
type UserProfile = Doc<"userProfiles">;

// Weights for different compatibility factors
const WEIGHTS = {
  values: 0.25,
  lifestyle: 0.2,
  relationshipStyle: 0.2,
  familyPlans: 0.15,
  interests: 0.1,
  personality: 0.1,
};

// Calculate overlap between two arrays (Jaccard similarity)
function calculateArrayOverlap(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1.map((s) => s.toLowerCase()));
  const set2 = new Set(arr2.map((s) => s.toLowerCase()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Calculate similarity between two numeric values
function calculateNumericSimilarity(
  val1: number,
  val2: number,
  max: number = 10
): number {
  const diff = Math.abs(val1 - val2);
  return 1 - diff / max;
}

// Calculate values compatibility
function calculateValuesScore(p1: UserProfile, p2: UserProfile): number {
  return calculateArrayOverlap(p1.values, p2.values);
}

// Calculate lifestyle compatibility
function calculateLifestyleScore(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let factors = 0;

  // Sleep schedule
  if (p1.lifestyle.sleepSchedule === p2.lifestyle.sleepSchedule) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Exercise level
  if (p1.lifestyle.exerciseLevel === p2.lifestyle.exerciseLevel) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Alcohol use
  if (p1.lifestyle.alcoholUse === p2.lifestyle.alcoholUse) {
    score += 1;
  } else if (
    p1.lifestyle.alcoholUse === "Never" ||
    p2.lifestyle.alcoholUse === "Never"
  ) {
    score += 0.4;
  } else {
    score += 0.7;
  }
  factors++;

  // Drug use
  if (p1.lifestyle.drugUse === p2.lifestyle.drugUse) {
    score += 1;
  } else if (
    p1.lifestyle.drugUse === "Never" ||
    p2.lifestyle.drugUse === "Never"
  ) {
    score += 0.3;
  } else {
    score += 0.6;
  }
  factors++;

  // Location preference
  if (p1.lifestyle.locationPreference === p2.lifestyle.locationPreference) {
    score += 1;
  } else if (
    p1.lifestyle.locationPreference === "flexible" ||
    p2.lifestyle.locationPreference === "flexible"
  ) {
    score += 0.8;
  } else {
    score += 0.4;
  }
  factors++;

  return score / factors;
}

// Calculate relationship style compatibility
function calculateRelationshipStyleScore(
  p1: UserProfile,
  p2: UserProfile
): number {
  let score = 0;
  let factors = 0;

  // Love language
  if (p1.relationshipStyle.loveLanguage === p2.relationshipStyle.loveLanguage) {
    score += 1;
  } else {
    score += 0.6;
  }
  factors++;

  // Communication frequency
  if (
    p1.relationshipStyle.communicationFrequency ===
    p2.relationshipStyle.communicationFrequency
  ) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Conflict style
  if (p1.relationshipStyle.conflictStyle === p2.relationshipStyle.conflictStyle) {
    score += 1;
  } else {
    score += 0.6;
  }
  factors++;

  // Financial approach
  if (
    p1.relationshipStyle.financialApproach ===
    p2.relationshipStyle.financialApproach
  ) {
    score += 1;
  } else {
    score += 0.5;
  }
  factors++;

  // Alone time need
  score += calculateNumericSimilarity(
    p1.relationshipStyle.aloneTimeNeed,
    p2.relationshipStyle.aloneTimeNeed
  );
  factors++;

  return score / factors;
}

// Calculate family plans compatibility
function calculateFamilyPlansScore(p1: UserProfile, p2: UserProfile): number {
  let score = 0;
  let factors = 0;

  // Kids preference
  const kidsCompatibility: Record<string, Record<string, number>> = {
    yes: {
      yes: 1,
      maybe: 0.7,
      open: 0.8,
      no: 0.1,
      already_has: 0.8,
      unknown: 0.5,
    },
    no: {
      no: 1,
      maybe: 0.4,
      open: 0.5,
      yes: 0.1,
      already_has: 0.2,
      unknown: 0.5,
    },
    maybe: {
      maybe: 0.8,
      yes: 0.7,
      no: 0.4,
      open: 0.8,
      already_has: 0.6,
      unknown: 0.6,
    },
    open: {
      open: 0.9,
      yes: 0.8,
      no: 0.5,
      maybe: 0.8,
      already_has: 0.7,
      unknown: 0.7,
    },
    already_has: {
      already_has: 0.9,
      yes: 0.8,
      open: 0.7,
      maybe: 0.6,
      no: 0.2,
      unknown: 0.5,
    },
    unknown: {
      unknown: 0.5,
      yes: 0.5,
      no: 0.5,
      maybe: 0.6,
      open: 0.7,
      already_has: 0.5,
    },
  };

  const kids1 = p1.familyPlans.wantsKids.toLowerCase().replace(" ", "_");
  const kids2 = p2.familyPlans.wantsKids.toLowerCase().replace(" ", "_");
  score += kidsCompatibility[kids1]?.[kids2] ?? 0.5;
  factors++;

  // Family closeness
  score += calculateNumericSimilarity(
    p1.familyPlans.familyCloseness,
    p2.familyPlans.familyCloseness
  );
  factors++;

  return score / factors;
}

// Calculate interests overlap
function calculateInterestsScore(p1: UserProfile, p2: UserProfile): number {
  return calculateArrayOverlap(p1.interests, p2.interests);
}

// Calculate personality complementarity
function calculatePersonalityScore(p1: UserProfile, p2: UserProfile): number {
  let score = 0;

  score += calculateNumericSimilarity(
    p1.traits.introversion,
    p2.traits.introversion
  );
  score += calculateNumericSimilarity(
    p1.traits.adventurousness,
    p2.traits.adventurousness
  );
  score += calculateNumericSimilarity(p1.traits.ambition, p2.traits.ambition);
  score += calculateNumericSimilarity(
    p1.traits.emotionalOpenness,
    p2.traits.emotionalOpenness
  );
  score += calculateNumericSimilarity(
    p1.traits.traditionalValues,
    p2.traits.traditionalValues
  );
  score += calculateNumericSimilarity(
    p1.traits.independenceNeed,
    p2.traits.independenceNeed
  );

  return score / 6;
}

// Main compatibility calculation
function calculateCompatibility(
  p1: UserProfile,
  p2: UserProfile
): {
  score: number;
  breakdown: {
    values: number;
    lifestyle: number;
    relationshipStyle: number;
    familyPlans: number;
    interests: number;
    personality: number;
  };
} {
  const breakdown = {
    values: calculateValuesScore(p1, p2),
    lifestyle: calculateLifestyleScore(p1, p2),
    relationshipStyle: calculateRelationshipStyleScore(p1, p2),
    familyPlans: calculateFamilyPlansScore(p1, p2),
    interests: calculateInterestsScore(p1, p2),
    personality: calculatePersonalityScore(p1, p2),
  };

  const score =
    breakdown.values * WEIGHTS.values +
    breakdown.lifestyle * WEIGHTS.lifestyle +
    breakdown.relationshipStyle * WEIGHTS.relationshipStyle +
    breakdown.familyPlans * WEIGHTS.familyPlans +
    breakdown.interests * WEIGHTS.interests +
    breakdown.personality * WEIGHTS.personality;

  return {
    score: Math.round(score * 100),
    breakdown: {
      values: Math.round(breakdown.values * 100),
      lifestyle: Math.round(breakdown.lifestyle * 100),
      relationshipStyle: Math.round(breakdown.relationshipStyle * 100),
      familyPlans: Math.round(breakdown.familyPlans * 100),
      interests: Math.round(breakdown.interests * 100),
      personality: Math.round(breakdown.personality * 100),
    },
  };
}

// Score color based on value
function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

export default function MatchesScreen() {
  const { userId } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Get current user
  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip"
  );

  // Get current user's profile
  const myProfile = useQuery(
    api.userProfiles.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  // Get all profiles (we'll filter to test users)
  const allProfiles = useQuery(api.userProfiles.listAll);

  // Get all users to get names
  const allUsers = useQuery(api.users.listAll);

  // Get all photos to show profile pics
  const allPhotos = useQuery(api.photos.listAll);

  // Helper to get first photo URL for a user
  const getFirstPhotoUrl = (userId: string): string | null => {
    if (!allPhotos) return null;
    const userPhotos = allPhotos
      .filter((p) => p.userId === userId)
      .sort((a, b) => a.order - b.order);
    return userPhotos[0]?.url || null;
  };

  // Filter to test users (waitlistPosition === 999) and calculate compatibility
  const testUserMatches = (() => {
    if (!myProfile || !allProfiles || !allUsers) return null;

    const testUsers = allUsers.filter(
      (u) => u.waitlistPosition === 999 && u._id !== currentUser?._id
    );

    return testUsers
      .map((user) => {
        const profile = allProfiles.find((p) => p.userId === user._id);
        if (!profile) return null;

        const compatibility = calculateCompatibility(myProfile, profile);
        return {
          user,
          profile,
          photoUrl: getFirstPhotoUrl(user._id),
          ...compatibility,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));
  })();

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!myProfile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader />
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Profile Not Ready</Text>
          <Text style={styles.emptyText}>
            Complete the 100 questions to see your compatibility scores.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!testUserMatches || testUserMatches.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader />
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🧪</Text>
          <Text style={styles.emptyTitle}>No Test Users</Text>
          <Text style={styles.emptyText}>
            Run the seed command to create test profiles:{"\n\n"}
            <Text style={styles.codeText}>
              bunx convex run seedTestUsers:seedTestUsers
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader />

      <ScrollView style={styles.scrollView}>
        {/* Your profile summary */}
        <View style={styles.myProfileCard}>
          <View style={styles.myProfileHeader}>
            {getFirstPhotoUrl(currentUser._id) ? (
              <Image
                source={{ uri: getFirstPhotoUrl(currentUser._id)! }}
                style={styles.myProfilePhoto}
              />
            ) : (
              <View style={styles.myProfilePhotoPlaceholder}>
                <Text style={styles.myProfilePhotoInitial}>
                  {currentUser.name?.charAt(0) || "?"}
                </Text>
              </View>
            )}
            <View style={styles.myProfileInfo}>
              <Text style={styles.myProfileLabel}>YOUR PROFILE</Text>
              <Text style={styles.myProfileName}>{currentUser.name || "You"}</Text>
            </View>
          </View>
          <View style={styles.tagsRow}>
            {myProfile.values.slice(0, 4).map((v, i) => (
              <View key={i} style={styles.tagSmall}>
                <Text style={styles.tagSmallText}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Match list */}
        {testUserMatches.map((match) => {
          if (!match) return null;
          const isExpanded = expandedUser === match.user._id;

          return (
            <Pressable
              key={match.user._id}
              style={styles.matchCard}
              onPress={() =>
                setExpandedUser(isExpanded ? null : match.user._id)
              }
            >
              <View style={styles.matchHeader}>
                {match.photoUrl ? (
                  <Image
                    source={{ uri: match.photoUrl }}
                    style={styles.matchPhoto}
                  />
                ) : (
                  <View style={styles.matchPhotoPlaceholder}>
                    <Text style={styles.matchPhotoInitial}>
                      {match.user.name?.charAt(0) || "?"}
                    </Text>
                  </View>
                )}
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{match.user.name}</Text>
                  <Text style={styles.matchLocation}>
                    {match.user.location || "Unknown location"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreColor(match.score) },
                  ]}
                >
                  <Text style={styles.scoreText}>{match.score}%</Text>
                </View>
              </View>

              {/* Tags preview */}
              <View style={styles.tagsRow}>
                {match.profile.interests.slice(0, 3).map((interest, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{interest}</Text>
                  </View>
                ))}
                {match.profile.interests.length > 3 && (
                  <Text style={styles.moreText}>
                    +{match.profile.interests.length - 3} more
                  </Text>
                )}
              </View>

              {/* Expanded breakdown */}
              {isExpanded && (
                <View style={styles.breakdown}>
                  <Text style={styles.breakdownTitle}>Score Breakdown</Text>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Values ({WEIGHTS.values * 100}%)
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${match.breakdown.values}%`,
                            backgroundColor: getScoreColor(
                              match.breakdown.values
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>
                      {match.breakdown.values}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Lifestyle ({WEIGHTS.lifestyle * 100}%)
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${match.breakdown.lifestyle}%`,
                            backgroundColor: getScoreColor(
                              match.breakdown.lifestyle
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>
                      {match.breakdown.lifestyle}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Relationship ({WEIGHTS.relationshipStyle * 100}%)
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${match.breakdown.relationshipStyle}%`,
                            backgroundColor: getScoreColor(
                              match.breakdown.relationshipStyle
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>
                      {match.breakdown.relationshipStyle}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Family ({WEIGHTS.familyPlans * 100}%)
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${match.breakdown.familyPlans}%`,
                            backgroundColor: getScoreColor(
                              match.breakdown.familyPlans
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>
                      {match.breakdown.familyPlans}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Interests ({WEIGHTS.interests * 100}%)
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${match.breakdown.interests}%`,
                            backgroundColor: getScoreColor(
                              match.breakdown.interests
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>
                      {match.breakdown.interests}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Personality ({WEIGHTS.personality * 100}%)
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${match.breakdown.personality}%`,
                            backgroundColor: getScoreColor(
                              match.breakdown.personality
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>
                      {match.breakdown.personality}%
                    </Text>
                  </View>

                  {/* Shared values */}
                  {(() => {
                    const shared = myProfile.values.filter((v) =>
                      match.profile.values
                        .map((x) => x.toLowerCase())
                        .includes(v.toLowerCase())
                    );
                    if (shared.length === 0) return null;
                    return (
                      <View style={styles.sharedSection}>
                        <Text style={styles.sharedTitle}>Shared Values</Text>
                        <View style={styles.tagsRow}>
                          {shared.map((v, i) => (
                            <View key={i} style={styles.tagShared}>
                              <Text style={styles.tagSharedText}>{v}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Shared interests */}
                  {(() => {
                    const shared = myProfile.interests.filter((v) =>
                      match.profile.interests
                        .map((x) => x.toLowerCase())
                        .includes(v.toLowerCase())
                    );
                    if (shared.length === 0) return null;
                    return (
                      <View style={styles.sharedSection}>
                        <Text style={styles.sharedTitle}>Shared Interests</Text>
                        <View style={styles.tagsRow}>
                          {shared.map((v, i) => (
                            <View key={i} style={styles.tagShared}>
                              <Text style={styles.tagSharedText}>{v}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}

              <Text style={styles.expandHint}>
                {isExpanded ? "Tap to collapse" : "Tap for details"}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: fontSizes.sm,
    backgroundColor: colors.surface,
  },
  myProfileCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  myProfilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  myProfilePhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  myProfilePhotoInitial: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  myProfileInfo: {
    flex: 1,
  },
  myProfileLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  myProfileName: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  matchCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  matchPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  matchPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  matchPhotoInitial: {
    fontSize: fontSizes.xl,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  matchLocation: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: fontSizes.base,
    fontWeight: "700",
    color: "#fff",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tagSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  tagSmallText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    alignSelf: "center",
    marginLeft: spacing.xs,
  },
  expandHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  breakdown: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  breakdownLabel: {
    width: 120,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: "hidden",
  },
  breakdownBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownValue: {
    width: 40,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlign: "right",
  },
  sharedSection: {
    marginTop: spacing.md,
  },
  sharedTitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  tagShared: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
  },
  tagSharedText: {
    fontSize: fontSizes.xs,
    color: "#166534",
  },
  bottomPadding: {
    height: spacing["3xl"],
  },
});
