import { CATEGORIES, Category, getQuestionCountForCategory } from "@/lib/categories";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import {
    IconBook,
    IconCheck,
    IconDiamond,
    IconHeart,
    IconLeaf,
    IconLock,
    IconPencil,
    IconPlayerTrackNext,
    IconPlayerTrackPrev,
    IconStar,
    IconUser,
} from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Dimensions, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

// Animation phases for the completion sequence
type AnimationPhase = "idle" | "completing" | "collapsing" | "unlocking" | "expanding" | "done";

interface JourneyPathProps {
  completedCategories: string[];
  currentLevel: number;
  currentCategoryAnsweredCount?: number;
  justCompletedCategoryId?: string | null;
  onAnimationComplete?: () => void;
  onTestComplete?: (categoryId: string) => void;
  onTestUncomplete?: (categoryId: string) => void;
}

type NodeState = "completed" | "current" | "locked" | "animating" | "unlocking";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  the_basics: IconUser,
  who_you_are: IconDiamond,
  relationship_style: IconHeart,
  lifestyle: IconLeaf,
  life_future: IconBook,
  deeper_stuff: IconStar,
};

function getNodeState(
  category: Category,
  completedCategories: string[],
  justCompletedCategoryId?: string | null
): NodeState {
  // The category being animated
  if (justCompletedCategoryId === category.id) {
    return "animating";
  }
  
  // When animating, the next category after the animating one should be "unlocking"
  if (justCompletedCategoryId) {
    const animatingIndex = CATEGORIES.findIndex((c) => c.id === justCompletedCategoryId);
    const nextIndex = animatingIndex + 1;
    if (nextIndex < CATEGORIES.length && CATEGORIES[nextIndex].id === category.id) {
      return "unlocking";
    }
  }
  
  // Normal completed state (but exclude the animating category from this check)
  if (completedCategories.includes(category.id) && category.id !== justCompletedCategoryId) {
    return "completed";
  }
  
  // Find first uncompleted (excluding the animating one which we handle above)
  const effectiveCompleted = justCompletedCategoryId 
    ? [...completedCategories, justCompletedCategoryId] // Treat animating as "will be completed"
    : completedCategories;
  const firstUncompleted = CATEGORIES.find((c) => !effectiveCompleted.includes(c.id));
  
  if (firstUncompleted?.id === category.id) {
    return "current";
  }
  
  return "locked";
}

interface CategoryNodeProps {
  category: Category;
  state: NodeState;
  isLast: boolean;
  onPress: () => void;
  answeredCount?: number;
  animationPhase: AnimationPhase;
  onTestComplete?: () => void;
  onTestUncomplete?: () => void;
  isLastCompleted?: boolean;
}

function CategoryNode({ 
  category, 
  state, 
  isLast, 
  onPress, 
  answeredCount = 0,
  animationPhase,
  onTestComplete,
  onTestUncomplete,
  isLastCompleted,
}: CategoryNodeProps) {
  const questionCount = getQuestionCountForCategory(category);
  const [measuredContentHeight, setMeasuredContentHeight] = useState(0);
  const collapseStartedRef = useRef(false);
  
  // Animation values for completing category
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const borderColorProgress = useSharedValue(0);
  const titleColorProgress = useSharedValue(0);
  const connectorColorProgress = useSharedValue(0);
  
  // Collapsing content animation (for completing category)
  // Start expanded, will animate to collapsed
  const contentHeight = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  
  // Reset animation values when state becomes "animating"
  useEffect(() => {
    if (state === "animating") {
      // Reset to initial state (black bg, white text, no checkmark)
      checkmarkScale.value = 0;
      checkmarkOpacity.value = 0;
      borderColorProgress.value = 0;
      titleColorProgress.value = 0;
      connectorColorProgress.value = 0;
      contentOpacity.value = 1;
    }
  }, [state]);
  
  // Reset unlock animation values when state becomes "unlocking"
  useEffect(() => {
    if (state === "unlocking") {
      // Reset to initial state (gold border, light bg)
      unlockBorderProgress.value = 0;
      unlockContentHeight.value = 0;
      progressSectionOpacity.value = 0;
      unlockPreviewOpacity.value = 0;
      lockScale.value = 1;
      lockOpacity.value = 1;
      progressBarWidth.value = 0;
    }
  }, [state]);
  
  // Unlocking category animation values
  const unlockBorderProgress = useSharedValue(0);
  const unlockContentHeight = useSharedValue(0);
  const progressSectionOpacity = useSharedValue(0); // Progress bar fades in first
  const unlockPreviewOpacity = useSharedValue(0); // Unlock preview fades in second
  const lockScale = useSharedValue(state === "unlocking" ? 1 : 0);
  const lockOpacity = useSharedValue(state === "unlocking" ? 1 : 0);
  const progressBarWidth = useSharedValue(0); // For animating progress fill from 0 to actual
  
  // Calculate actual progress
  const safeAnsweredCount = answeredCount ?? 0;
  const progress = questionCount > 0 ? safeAnsweredCount / questionCount : 0;

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0 && height !== measuredContentHeight) {
      setMeasuredContentHeight(height);
    }
  };

  useEffect(() => {
    if (state !== "animating") {
      collapseStartedRef.current = false;
      return;
    }
    if (measuredContentHeight > 0) {
      contentHeight.value = measuredContentHeight;
      contentOpacity.value = 1;
    }
  }, [measuredContentHeight, state]);
  
  // Phase 1: Collapse animation (content slides up and fades out FIRST)
  // Only triggers on "completing" phase, not "collapsing"
  useEffect(() => {
    if (state !== "animating") return;
    if (animationPhase !== "completing") return;
    if (measuredContentHeight <= 0) return;
    if (collapseStartedRef.current) return;

    collapseStartedRef.current = true;
    // Set initial values before animating
    contentHeight.value = measuredContentHeight;
    contentOpacity.value = 1;
    // Animate collapse
    contentOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    contentHeight.value = withTiming(0, { duration: 400, easing: Easing.inOut(Easing.cubic) });
  }, [state, animationPhase, measuredContentHeight]);
  
  // Phase 2: Turn green + checkmark (after collapse)
  useEffect(() => {
    if (state === "animating" && animationPhase === "collapsing") {
      // Border transitions to green
      borderColorProgress.value = withTiming(1, { duration: 300 });
      connectorColorProgress.value = withTiming(1, { duration: 300 });
      
      // Title color transitions to green
      titleColorProgress.value = withTiming(1, { duration: 300 });
      
      // Checkmark appears with bounce at the same time
      checkmarkOpacity.value = withTiming(1, { duration: 200 });
      checkmarkScale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  }, [state, animationPhase]);
  
  // Phase 3: Unlock animation (border changes, lock disappears)
  useEffect(() => {
    if (state === "unlocking" && animationPhase === "unlocking") {
      // Border transitions from locked gray to current black
      unlockBorderProgress.value = withTiming(1, { duration: 300 });
      
      // Lock icon fades and shrinks
      lockOpacity.value = withTiming(0, { duration: 250 });
      lockScale.value = withTiming(0, { duration: 250 });
    }
  }, [state, animationPhase]);
  
  // Phase 4: Expand animation (height first, then progress bar, then unlock preview, then fill animates)
  useEffect(() => {
    if (state === "unlocking" && animationPhase === "expanding") {
      if (measuredContentHeight <= 0) return;
      // Reset fill so it animates from zero
      progressBarWidth.value = 0;
      // 1. Expand height (0-350ms)
      unlockContentHeight.value = withTiming(measuredContentHeight, { duration: 350, easing: Easing.out(Easing.cubic) });
      // 2. Progress bar section fades in (350-500ms)
      progressSectionOpacity.value = withDelay(350, withTiming(1, { duration: 150 }));
      // 3. Progress fill animates from 0 to actual (400-800ms) 
      progressBarWidth.value = withDelay(400, withTiming(progress * 100, { duration: 400, easing: Easing.out(Easing.cubic) }));
      // 4. Unlock preview fades in (500-700ms)
      unlockPreviewOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));
    }
  }, [state, animationPhase, progress, measuredContentHeight]);
  
  // Animated styles for completing category
  // Background goes from black (current) to white (completed)
  const animatedBorderStyle = useAnimatedStyle(() => {
    if (state !== "animating") return {};
    const backgroundColor = interpolateColor(
      borderColorProgress.value,
      [0, 1],
      [colors.text, colors.surface]
    );
    return { backgroundColor };
  });
  
  const animatedConnectorStyle = useAnimatedStyle(() => {
    if (state !== "animating") return {};
    const backgroundColor = interpolateColor(
      connectorColorProgress.value,
      [0, 1],
      [colors.border, colors.text]
    );
    return { backgroundColor };
  });
  
  // Text/icon go from white (current) to black (completed)
  const animatedTitleStyle = useAnimatedStyle(() => {
    if (state !== "animating") return {};
    const color = interpolateColor(
      titleColorProgress.value,
      [0, 1],
      ["#FFFFFF", colors.text]
    );
    return { color };
  });
  
  // For animating the icon color - white fades out, black fades in
  const animatedIconWhiteStyle = useAnimatedStyle(() => {
    if (state !== "animating") return { opacity: 0 };
    return { opacity: 1 - titleColorProgress.value };
  });
  
  const animatedIconBlackStyle = useAnimatedStyle(() => {
    if (state !== "animating") return { opacity: 1 };
    return { opacity: titleColorProgress.value };
  });
  
  // Pencil fades in with titleColorProgress
  const animatedPencilStyle = useAnimatedStyle(() => {
    if (state !== "animating") return { opacity: 0 };
    return { opacity: titleColorProgress.value };
  });
  
  const animatedCheckmarkStyle = useAnimatedStyle(() => {
    return {
      opacity: checkmarkOpacity.value,
      transform: [{ scale: checkmarkScale.value }],
    };
  });
  
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      height: contentHeight.value,
      opacity: contentOpacity.value,
    };
  });
  
  // Animated styles for unlocking category
  const animatedUnlockBorderStyle = useAnimatedStyle(() => {
    if (state !== "unlocking") return {};
    const borderColor = interpolateColor(
      unlockBorderProgress.value,
      [0, 1],
      ["#AAAAAA", colors.text]
    );
    const backgroundColor = interpolateColor(
      unlockBorderProgress.value,
      [0, 1],
      [colors.background, colors.text]
    );
    return { borderColor, backgroundColor };
  });
  
  // Text color for unlocking: gold → white (synced with background)
  const animatedUnlockTitleStyle = useAnimatedStyle(() => {
    if (state !== "unlocking") return {};
    const color = interpolateColor(
      unlockBorderProgress.value,
      [0, 1],
      ["#AAAAAA", "#FFFFFF"]
    );
    return { color };
  });
  
  const animatedLockStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: lockScale.value }],
      opacity: lockOpacity.value,
    };
  });
  
  // For unlocking icon: gold → white (synced with background)
  const animatedUnlockIconGoldStyle = useAnimatedStyle(() => {
    if (state !== "unlocking") return { opacity: 1 };
    return { opacity: 1 - unlockBorderProgress.value };
  });
  
  const animatedUnlockIconWhiteStyle = useAnimatedStyle(() => {
    if (state !== "unlocking") return { opacity: 0 };
    return { opacity: unlockBorderProgress.value };
  });
  
  const animatedUnlockContentStyle = useAnimatedStyle(() => {
    return {
      height: unlockContentHeight.value,
    };
  });
  
  const animatedProgressSectionStyle = useAnimatedStyle(() => {
    return {
      opacity: progressSectionOpacity.value,
    };
  });
  
  const animatedUnlockPreviewStyle = useAnimatedStyle(() => {
    return {
      opacity: unlockPreviewOpacity.value,
    };
  });
  
  const animatedProgressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progressBarWidth.value}%`,
    };
  });

  const iconColor =
    state === "completed"
      ? colors.text
      : state === "current"
        ? "#FFFFFF"
        : state === "locked"
          ? "#AAAAAA"
          : state === "unlocking" && (animationPhase === "expanding" || animationPhase === "done")
            ? "#FFFFFF"
            : state === "unlocking"
              ? "#AAAAAA"
              : colors.text;
  
  const measurementContent = (
      <View pointerEvents="none" style={styles.measureWrapper} onLayout={handleContentLayout}>
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{safeAnsweredCount}/{questionCount}</Text>
      </View>
      <View style={styles.unlockPreview}>
        <Text style={styles.unlockLabel}>Unlock:</Text>
        <Text style={styles.unlockText}>{category.unlockDescription}</Text>
      </View>
    </View>
  );

  // Render based on state
  if (state === "animating") {
    return (
      <View style={styles.nodeWrapper}>
        {!isLast && (
          <Animated.View style={[styles.connector, animatedConnectorStyle]} />
        )}
        
        <Animated.View style={[styles.node, styles.nodeCurrent, animatedBorderStyle]}>
          <View style={styles.nodeHeader}>
            <View style={styles.nodeHeaderLeft}>
              {(() => {
                const CategoryIcon = CATEGORY_ICONS[category.id];
                return (
                  <View style={styles.categoryIconWrapper}>
                    <Animated.View style={[styles.categoryIconAbsolute, animatedIconWhiteStyle]}>
                      <CategoryIcon size={21} color="#FFFFFF" />
                    </Animated.View>
                    <Animated.View style={[styles.categoryIconAbsolute, animatedIconBlackStyle]}>
                      <CategoryIcon size={21} color={colors.text} />
                    </Animated.View>
                  </View>
                );
              })()}
              <Animated.Text style={[styles.nodeName, animatedTitleStyle]}>
                {category.name}
              </Animated.Text>
              <Animated.View style={[styles.inlineIcon, animatedPencilStyle]}>
                <IconPencil size={12} color={colors.textSecondary} />
              </Animated.View>
            </View>
            <Animated.View style={animatedCheckmarkStyle}>
              <IconCheck size={14} color={colors.success} />
            </Animated.View>
          </View>
          
          <Animated.View style={[styles.collapsibleContent, animatedContentStyle]}>
            <View style={styles.progressSection}>
              <View style={[styles.progressBar, styles.progressBarCurrent]}>
                <View style={[styles.progressFill, styles.progressFillCurrent, { width: "100%" }]} />
              </View>
              <Text style={[styles.progressText, styles.progressTextCurrent]}>{questionCount}/{questionCount}</Text>
            </View>
            <View style={styles.unlockPreview}>
              <Text style={[styles.unlockLabel, styles.unlockLabelCurrent]}>Unlock:</Text>
              <Text style={[styles.unlockText, styles.unlockTextCurrent]}>{category.unlockDescription}</Text>
            </View>
          </Animated.View>
          {measurementContent}
        </Animated.View>
      </View>
    );
  }
  
  if (state === "unlocking") {
    return (
      <View style={styles.nodeWrapper}>
        {!isLast && (
          <View style={styles.connector} />
        )}
        
        <Animated.View style={[styles.node, styles.nodeLocked, animatedUnlockBorderStyle]}>
          <View style={styles.nodeHeader}>
            <View style={styles.nodeHeaderLeft}>
              {(() => {
                const CategoryIcon = CATEGORY_ICONS[category.id];
                return (
                  <View style={styles.categoryIconWrapper}>
                    <Animated.View style={[styles.categoryIconAbsolute, animatedUnlockIconGoldStyle]}>
                      <CategoryIcon size={21} color="#AAAAAA" />
                    </Animated.View>
                    <Animated.View style={[styles.categoryIconAbsolute, animatedUnlockIconWhiteStyle]}>
                      <CategoryIcon size={21} color="#FFFFFF" />
                    </Animated.View>
                  </View>
                );
              })()}
              <Animated.Text style={[styles.nodeName, animatedUnlockTitleStyle]}>
                {category.name}
              </Animated.Text>
            </View>
            <Animated.View style={animatedLockStyle}>
              <IconLock size={14} color="#AAAAAA" />
            </Animated.View>
          </View>
          
          <Animated.View style={[styles.collapsibleContent, animatedUnlockContentStyle]}>
            <Animated.View style={[styles.progressSection, animatedProgressSectionStyle]}>
              <View style={[styles.progressBar, styles.progressBarCurrent]}>
                <Animated.View style={[styles.progressFill, styles.progressFillCurrent, animatedProgressBarStyle]} />
              </View>
              <Text style={[styles.progressText, styles.progressTextCurrent]}>{safeAnsweredCount}/{questionCount}</Text>
            </Animated.View>
            <Animated.View style={[styles.unlockPreview, animatedUnlockPreviewStyle]}>
              <Text style={[styles.unlockLabel, styles.unlockLabelCurrent]}>Unlock:</Text>
              <Text style={[styles.unlockText, styles.unlockTextCurrent]}>{category.unlockDescription}</Text>
            </Animated.View>
          </Animated.View>
          {measurementContent}
        </Animated.View>
      </View>
    );
  }
  
  // Static states: completed, current, locked
  return (
    <View style={styles.nodeWrapper}>
      {!isLast && (
        <View style={[
          styles.connector,
          state === "completed" && styles.connectorCompleted,
        ]} />
      )}
      
      <Pressable
        style={[
          styles.node,
          state === "completed" && styles.nodeCompleted,
          state === "current" && styles.nodeCurrent,
          state === "locked" && styles.nodeLocked,
        ]}
        onPress={onPress}
        disabled={state === "locked"}
      >
        <View style={styles.nodeHeader}>
          <View style={styles.nodeHeaderLeft}>
            {(() => {
              const CategoryIcon = CATEGORY_ICONS[category.id];
              return <View style={styles.categoryIcon}><CategoryIcon size={21} color={iconColor} /></View>;
            })()}
            <Text style={[
              styles.nodeName,
              state === "completed" && styles.nodeNameCompleted,
              state === "current" && styles.nodeNameCurrent,
              state === "locked" && styles.nodeNameLocked,
            ]}>
              {category.name}
            </Text>
            {state === "completed" && (
              <Pressable style={styles.inlineIcon} onPress={onPress}>
                <IconPencil size={12} color={colors.textSecondary} />
              </Pressable>
            )}
            {__DEV__ && false && state === "current" && onTestComplete && (
              <Pressable style={styles.testIconButton} onPress={onTestComplete}>
                <IconPlayerTrackNext size={10} color={colors.textMuted} />
              </Pressable>
            )}
            {__DEV__ && false && isLastCompleted && onTestUncomplete && (
              <Pressable style={styles.testIconButton} onPress={onTestUncomplete}>
                <IconPlayerTrackPrev size={10} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          {state === "completed" && (
            <IconCheck size={14} color={colors.success} />
          )}
          {state === "locked" && (
            <IconLock size={14} color="#AAAAAA" />
          )}
        </View>
        
        {state === "current" && (
          <>
            <View style={styles.progressSection}>
              <View style={[styles.progressBar, styles.progressBarCurrent]}>
                <View style={[styles.progressFill, styles.progressFillCurrent, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={[styles.progressText, styles.progressTextCurrent]}>{answeredCount}/{questionCount}</Text>
            </View>
            <View style={styles.unlockPreview}>
              <Text style={[styles.unlockLabel, styles.unlockLabelCurrent]}>Unlock:</Text>
              <Text style={[styles.unlockText, styles.unlockTextCurrent]}>{category.unlockDescription}</Text>
            </View>
          </>
        )}
        {measurementContent}
      </Pressable>
    </View>
  );
}

// Approximate node height for scroll calculations
const NODE_HEIGHT_COLLAPSED = 60; // Completed/locked nodes
const NODE_HEIGHT_EXPANDED = 140; // Current/animating nodes with content
const NODE_MARGIN = 12; // spacing.md
const SCREEN_HEIGHT = Dimensions.get("window").height;

export function JourneyPath({ 
  completedCategories, 
  currentLevel, 
  currentCategoryAnsweredCount = 0,
  justCompletedCategoryId,
  onAnimationComplete,
  onTestComplete,
  onTestUncomplete,
}: JourneyPathProps) {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const hasScrolledRef = useRef(false);

  // Start animation sequence when a category is completed
  useEffect(() => {
    if (justCompletedCategoryId) {
      // Wait for page transition to settle before starting animation phases
      const TRANSITION_DELAY = 400;
      
      // Phase 1: completing (content collapses) - starts after transition
      const timer0 = setTimeout(() => {
        setAnimationPhase("completing");
      }, TRANSITION_DELAY);
      
      // Phase 2: collapsing (turn green + checkmark) - after collapse is done
      const timer1 = setTimeout(() => {
        setAnimationPhase("collapsing");
      }, TRANSITION_DELAY + 450);
      
      // Phase 3: unlocking (lock fades, border changes)
      const timer2 = setTimeout(() => {
        setAnimationPhase("unlocking");
      }, TRANSITION_DELAY + 850);
      
      // Phase 4: expanding (content slides down)
      const timer3 = setTimeout(() => {
        setAnimationPhase("expanding");
      }, TRANSITION_DELAY + 1150);
      
      // Phase 5: done
      const timer4 = setTimeout(() => {
        setAnimationPhase("done");
        onAnimationComplete?.();
      }, TRANSITION_DELAY + 2100);
      
      return () => {
        clearTimeout(timer0);
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    } else {
      setAnimationPhase("idle");
    }
  }, [justCompletedCategoryId]);

  // Calculate scroll position to center a category
  const getScrollPositionForCategory = (categoryIndex: number) => {
    // Calculate total height up to this category
    let yOffset = spacing.lg; // paddingTop
    for (let i = 0; i < categoryIndex; i++) {
      const catState = getNodeState(CATEGORIES[i], completedCategories, justCompletedCategoryId);
      const isExpanded = catState === "current" || catState === "animating" || catState === "unlocking";
      yOffset += (isExpanded ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT_COLLAPSED) + NODE_MARGIN;
    }
    // Center the target node on screen
    const targetNodeHeight = NODE_HEIGHT_EXPANDED; // Target is usually expanded
    const centerOffset = (SCREEN_HEIGHT - targetNodeHeight) / 2 - 150; // Adjust for header
    return Math.max(0, yOffset - centerOffset);
  };

  // Scroll to target category on mount or when returning from completion
  useEffect(() => {
    // Determine which category to scroll to
    let targetIndex: number;
    
    if (justCompletedCategoryId) {
      // Scroll to the category being animated
      targetIndex = CATEGORIES.findIndex((c) => c.id === justCompletedCategoryId);
    } else if (!hasScrolledRef.current) {
      // On first load, scroll to current (first uncompleted) category
      targetIndex = CATEGORIES.findIndex((c) => !completedCategories.includes(c.id));
      hasScrolledRef.current = true;
    } else {
      return; // Don't scroll on subsequent renders
    }

    if (targetIndex >= 0 && scrollViewRef.current) {
      const scrollY = getScrollPositionForCategory(targetIndex);
      // Small delay to ensure layout is ready
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollY, animated: false });
      }, 50);
    }
  }, [justCompletedCategoryId, completedCategories]);

  const handleCategoryPress = (category: Category, state: NodeState) => {
    if (state === "locked" || state === "animating" || state === "unlocking") return;
    
    router.push({
      pathname: "/(onboarding)/questions",
      params: { categoryId: category.id },
    });
  };

  const lastCompletedCategoryId = completedCategories.length > 0 
    ? completedCategories[completedCategories.length - 1]
    : null;

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {CATEGORIES.map((category, index) => {
        const state = getNodeState(category, completedCategories, justCompletedCategoryId);
        return (
          <CategoryNode
            key={category.id}
            category={category}
            state={state}
            isLast={index === CATEGORIES.length - 1}
            onPress={() => handleCategoryPress(category, state)}
            answeredCount={state === "current" || state === "unlocking" ? currentCategoryAnsweredCount : undefined}
            animationPhase={animationPhase}
            onTestComplete={onTestComplete ? () => onTestComplete(category.id) : undefined}
            onTestUncomplete={onTestUncomplete ? () => onTestUncomplete(category.id) : undefined}
            isLastCompleted={category.id === lastCompletedCategoryId}
          />
        );
      })}
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  nodeWrapper: {
    position: "relative",
    marginBottom: spacing.md,
  },
  connector: {
    position: "absolute",
    left: 24,
    top: 56,
    bottom: -spacing.md - 4,
    width: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  connectorCompleted: {
    backgroundColor: colors.text,
  },
  node: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    zIndex: 1,
  },
  nodeCompleted: {
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  nodeCurrent: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  nodeLocked: {
    borderColor: "#AAAAAA",
    backgroundColor: colors.background,
  },
  nodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  nodeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    marginRight: spacing.sm,
  },
  categoryIconWrapper: {
    width: 21,
    height: 21,
    marginRight: spacing.sm,
  },
  categoryIconAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  inlineIcon: {
    marginLeft: spacing.xs,
    padding: 4,
  },
  collapsibleContent: {
    overflow: "hidden",
  },
  nodeName: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  nodeNameCompleted: {
    color: colors.text,
  },
  nodeNameCurrent: {
    color: "#FFFFFF",
  },
  nodeNameLocked: {
    color: "#AAAAAA",
  },
  nodeQuestionCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  nodeQuestionCountLocked: {
    color: "#888888",
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarCurrent: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.text,
    borderRadius: 3,
  },
  progressFillCurrent: {
    backgroundColor: "#FFFFFF",
  },
  progressText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    minWidth: 36,
    textAlign: "right",
  },
  progressTextCurrent: {
    color: "rgba(255,255,255,0.7)",
  },
  unlockPreview: {
    marginTop: spacing.sm,
  },
  unlockLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  unlockLabelCurrent: {
    color: "rgba(255,255,255,0.6)",
  },
  unlockText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: "500",
  },
  unlockTextCurrent: {
    color: "#FFFFFF",
  },
  measureWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
  bottomPadding: {
    height: spacing["2xl"],
  },
  testIconButton: {
    marginLeft: spacing.xs,
    padding: 4,
    opacity: 0.5,
  },
});
