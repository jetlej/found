import {
  ALL_INTERESTS,
  getAllCategories,
  getInterestsByCategory,
  Interest,
  INTERESTS_BY_ID,
  searchInterests,
} from "@/convex/lib/interests";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconSearch, IconX } from "@tabler/icons-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface InterestPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelections?: number;
}

const MAX_DEFAULT_SELECTIONS = 25;

export function InterestPicker({
  selectedIds,
  onChange,
  maxSelections = MAX_DEFAULT_SELECTIONS,
}: InterestPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => getAllCategories(), []);

  // Get interests to display based on search or category
  const displayedInterests = useMemo(() => {
    if (searchQuery.length >= 2) {
      return searchInterests(searchQuery, 50);
    }
    if (activeCategory) {
      return getInterestsByCategory(activeCategory);
    }
    // Show popular/featured when nothing selected
    return ALL_INTERESTS.slice(0, 50);
  }, [searchQuery, activeCategory]);

  // Get selected interest objects
  const selectedInterests = useMemo(() => {
    return selectedIds
      .map((id) => INTERESTS_BY_ID.get(id))
      .filter((i): i is Interest => i !== undefined);
  }, [selectedIds]);

  const toggleInterest = useCallback(
    (interest: Interest) => {
      if (selectedIds.includes(interest.id)) {
        onChange(selectedIds.filter((id) => id !== interest.id));
      } else if (selectedIds.length < maxSelections) {
        onChange([...selectedIds, interest.id]);
      }
    },
    [selectedIds, onChange, maxSelections]
  );

  const removeInterest = useCallback(
    (interestId: string) => {
      onChange(selectedIds.filter((id) => id !== interestId));
    },
    [selectedIds, onChange]
  );

  const renderInterestItem = useCallback(
    ({ item }: { item: Interest }) => {
      const isSelected = selectedIds.includes(item.id);
      const isDisabled = !isSelected && selectedIds.length >= maxSelections;

      return (
        <Pressable
          style={[
            styles.interestItem,
            isSelected && styles.interestItemSelected,
            isDisabled && styles.interestItemDisabled,
          ]}
          onPress={() => !isDisabled && toggleInterest(item)}
          disabled={isDisabled}
        >
          <Text
            style={[
              styles.interestItemText,
              isSelected && styles.interestItemTextSelected,
              isDisabled && styles.interestItemTextDisabled,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {isSelected && (
            <View style={styles.checkIcon}>
              <Text style={styles.checkText}>✓</Text>
            </View>
          )}
        </Pressable>
      );
    },
    [selectedIds, maxSelections, toggleInterest]
  );

  return (
    <View style={styles.container}>
      {/* Selected tags */}
      {selectedInterests.length > 0 && (
        <View style={styles.selectedSection}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedCount}>
              {selectedInterests.length}/{maxSelections} selected
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedTags}
          >
            {selectedInterests.map((interest) => (
              <Pressable
                key={interest.id}
                style={styles.selectedTag}
                onPress={() => removeInterest(interest.id)}
              >
                <Text style={styles.selectedTagText} numberOfLines={1}>
                  {interest.name}
                </Text>
                <IconX size={14} color={colors.text} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search input */}
      <View style={styles.searchContainer}>
        <IconSearch size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search interests..."
          placeholderTextColor={colors.textPlaceholder}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.length > 0) {
              setActiveCategory(null);
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <IconX size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Category tabs */}
      {searchQuery.length < 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabs}
        >
          <Pressable
            style={[
              styles.categoryTab,
              activeCategory === null && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory(null)}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === null && styles.categoryTabTextActive,
              ]}
            >
              Popular
            </Text>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryTab,
                activeCategory === category && styles.categoryTabActive,
              ]}
              onPress={() => setActiveCategory(category)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === category && styles.categoryTabTextActive,
                ]}
                numberOfLines={1}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Results */}
      <FlatList
        data={displayedInterests}
        renderItem={renderInterestItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.interestRow}
        contentContainerStyle={styles.interestList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery.length >= 2
                ? "No interests found"
                : "Type to search interests"}
            </Text>
          </View>
        }
      />

      {/* Limit warning */}
      {selectedIds.length >= maxSelections && (
        <View style={styles.limitWarning}>
          <Text style={styles.limitWarningText}>
            Maximum {maxSelections} interests reached
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectedSection: {
    marginBottom: spacing.md,
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  selectedCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  selectedTags: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  selectedTagText: {
    fontSize: fontSizes.sm,
    color: colors.primaryText,
    fontWeight: "500",
    maxWidth: 120,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  categoryTabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  categoryTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  categoryTabTextActive: {
    color: colors.primaryText,
    fontWeight: "600",
  },
  interestList: {
    paddingBottom: spacing.xl,
  },
  interestRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  interestItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestItemSelected: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.primary,
  },
  interestItemDisabled: {
    opacity: 0.5,
  },
  interestItemText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  interestItemTextSelected: {
    fontWeight: "600",
  },
  interestItemTextDisabled: {
    color: colors.textMuted,
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.xs,
  },
  checkText: {
    color: colors.primaryText,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
  },
  limitWarning: {
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  limitWarningText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
