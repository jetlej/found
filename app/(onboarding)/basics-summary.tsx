import { PhotoGrid } from "@/components/PhotoGrid";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react-native";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";

// Helper to format height from inches
function formatHeight(inches: number | undefined): string {
  if (!inches) return "None";
  const ft = Math.floor(inches / 12);
  const inc = inches % 12;
  return `${ft}'${inc}"`;
}

// Helper to calculate age from birthdate
function calculateAge(birthdate: string | undefined): string {
  if (!birthdate) return "None";
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

// Helper to format relationship goal
function formatRelationshipGoal(goal: string | undefined): string {
  if (!goal) return "None";
  const map: Record<string, string> = {
    marriage: "Marriage",
    long_term: "Long-term partner",
    life_partner: "Life partner",
    figuring_out: "Figuring it out",
  };
  return map[goal] || goal;
}

function formatAgeRange(min: number | undefined, max: number | undefined, dealbreaker: boolean | undefined): string {
  if (min == null || max == null) return "None";
  return `${min} – ${max}${dealbreaker ? " (dealbreaker)" : ""}`;
}

function formatChildren(val: string | undefined): string {
  if (!val) return "None";
  return val === "yes" ? "Have children" : "Don't have children";
}

function formatWantsChildren(val: string | undefined): string {
  if (!val) return "None";
  const map: Record<string, string> = {
    yes: "Want children",
    no: "Don't want children",
    open: "Open to it",
    not_sure: "Not sure",
  };
  return map[val] || val;
}

interface ProfileRowProps {
  label: string;
  value: string;
  onPress: () => void;
}

function ProfileRow({ label, value, onPress }: ProfileRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || "None"}</Text>
      </View>
      <IconChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function EditBasicsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const user = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const photos = useQuery(api.photos.getByUser, user?._id ? { userId: user._id } : "skip");

  const navigateTo = (screen: string) => {
    router.push({ pathname: `/(onboarding)/${screen}` as any, params: { editing: "true" } });
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Basics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Photos" />
        <View style={styles.photosContainer}>
          <PhotoGrid userId={user._id} existingPhotos={photos} />
        </View>

        <SectionHeader title="Identity" />
        <ProfileRow label="Pronouns" value={user.pronouns || "None"} onPress={() => navigateTo("pronouns")} />
        <ProfileRow label="Gender" value={user.gender || "None"} onPress={() => navigateTo("gender")} />
        <ProfileRow label="Sexuality" value={user.sexuality || "None"} onPress={() => navigateTo("sexuality")} />

        <SectionHeader title="Relationship" />
        <ProfileRow label="Dating Intentions" value={formatRelationshipGoal(user.relationshipGoal)} onPress={() => navigateTo("relationship-goals")} />
        <ProfileRow label="Relationship Type" value={user.relationshipType || "None"} onPress={() => navigateTo("relationship-type")} />

        <SectionHeader title="My Vitals" />
        <ProfileRow label="Name" value={user.name || "None"} onPress={() => navigateTo("name")} />
        <ProfileRow label="Age" value={calculateAge(user.birthdate)} onPress={() => navigateTo("birthday")} />
        <ProfileRow label="Age Preference" value={formatAgeRange(user.ageRangeMin, user.ageRangeMax, user.ageRangeDealbreaker)} onPress={() => navigateTo("age-range")} />
        <ProfileRow label="Height" value={formatHeight(user.heightInches)} onPress={() => navigateTo("height")} />
        <ProfileRow label="Location" value={user.location || "None"} onPress={() => navigateTo("location")} />
        <ProfileRow label="Ethnicity" value={user.ethnicity || "None"} onPress={() => navigateTo("ethnicity")} />
        <ProfileRow label="Hometown" value={user.hometown || "None"} onPress={() => navigateTo("hometown")} />
        <ProfileRow label="Children" value={formatChildren(user.hasChildren)} onPress={() => navigateTo("kids")} />
        <ProfileRow label="Family Plans" value={formatWantsChildren(user.wantsChildren)} onPress={() => navigateTo("wants-kids")} />

        <SectionHeader title="Beliefs" />
        <ProfileRow label="Religious Beliefs" value={user.religion || "None"} onPress={() => navigateTo("religion")} />
        <ProfileRow label="Politics" value={user.politicalLeaning || "None"} onPress={() => navigateTo("politics")} />

        <SectionHeader title="Pets" />
        <ProfileRow label="Pets" value={user.pets || "None"} onPress={() => navigateTo("pets")} />

        <SectionHeader title="My Vices" />
        <ProfileRow label="Drinking" value={user.drinking || "None"} onPress={() => navigateTo("drinking")} />
        <ProfileRow label="Smoking" value={user.smoking || "None"} onPress={() => navigateTo("smoking")} />
        <ProfileRow label="Marijuana" value={user.marijuana || "None"} onPress={() => navigateTo("marijuana")} />
        <ProfileRow label="Drugs" value={user.drugs || "None"} onPress={() => navigateTo("drugs")} />

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginRight: 28,
  },
  headerSpacer: { width: 28 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing["2xl"] },
  photosContainer: {},
  sectionHeader: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: { flex: 1 },
  rowLabel: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.text,
  },
  rowValue: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomPadding: { height: spacing["2xl"] },
});
