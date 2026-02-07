import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { colors, fontSizes, spacing } from "@/lib/theme";
import ExpoImageCropTool from "@bsky.app/expo-image-crop-tool";
import { IconCircleX, IconPlus } from "@tabler/icons-react-native";
import { useMutation } from "convex/react";
import * as ExpoImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.xl;
const SLOT_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const SLOT_HEIGHT = SLOT_WIDTH * 1.3;
const COL_STRIDE = SLOT_WIDTH + GRID_GAP;
const ROW_STRIDE = SLOT_HEIGHT + GRID_GAP;

function getSlotXY(slot: number) {
  "worklet";
  return {
    x: (slot % 3) * COL_STRIDE,
    y: Math.floor(slot / 3) * ROW_STRIDE,
  };
}

function getSlotFromXY(x: number, y: number) {
  "worklet";
  const col = Math.round(x / COL_STRIDE);
  const row = Math.round(y / ROW_STRIDE);
  return Math.min(5, Math.max(0, Math.min(2, col)) + Math.max(0, Math.min(1, row)) * 3);
}

interface PhotoItem {
  id: string;
  order: number;
  photoId?: Id<"photos">;
  storageId?: Id<"_storage">;
  url?: string;
  uploading?: boolean;
  localUri?: string;
}

interface PhotoGridProps {
  userId: Id<"users">;
  existingPhotos: Doc<"photos">[] | undefined;
  showRequired?: boolean;
  onPhotoCountChange?: (count: number) => void;
}

// ─── Draggable slot ───────────────────────────────────────────
function DraggableSlot({
  item,
  index,
  positions,
  activeIndex,
  dragX,
  dragY,
  onSwap,
  onDragEnd,
  onTap,
  onRemove,
  showRequired,
}: {
  item: PhotoItem;
  index: number;
  positions: Animated.SharedValue<number[]>;
  activeIndex: Animated.SharedValue<number>;
  dragX: Animated.SharedValue<number>;
  dragY: Animated.SharedValue<number>;
  onSwap: () => void;
  onDragEnd: () => void;
  onTap: (order: number) => void;
  onRemove: (item: PhotoItem) => void;
  showRequired: boolean;
}) {
  const hasImage = !!(item.url || item.localUri);
  const isRequired = showRequired && item.order < 4;
  const isFirst = item.order === 0;

  const startXY = useSharedValue({ x: 0, y: 0 });

  const triggerLiftHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .enabled(hasImage)
    .onStart(() => {
      const slot = positions.value[index];
      const pos = getSlotXY(slot);
      startXY.value = pos;
      activeIndex.value = index;
      dragX.value = pos.x;
      dragY.value = pos.y;
      runOnJS(triggerLiftHaptic)();
    })
    .onUpdate((e) => {
      dragX.value = startXY.value.x + e.translationX;
      dragY.value = startXY.value.y + e.translationY;

      const overSlot = getSlotFromXY(dragX.value, dragY.value);
      const currentSlot = positions.value[index];

      if (overSlot !== currentSlot) {
        const targetIdx = positions.value.indexOf(overSlot);
        if (targetIdx >= 0) {
          const next = [...positions.value];
          next[targetIdx] = currentSlot;
          next[index] = overSlot;
          positions.value = next;
          runOnJS(onSwap)();
        }
      }
    })
    .onEnd(() => {
      const slot = positions.value[index];
      const target = getSlotXY(slot);
      dragX.value = withSpring(target.x, { damping: 20, stiffness: 200 });
      dragY.value = withSpring(target.y, { damping: 20, stiffness: 200 });
      activeIndex.value = -1;
      runOnJS(onDragEnd)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;

    if (isActive) {
      return {
        transform: [
          { translateX: dragX.value },
          { translateY: dragY.value },
          { scale: 1.05 },
        ],
        zIndex: 100,
        shadowOpacity: 0.3,
        elevation: 8,
      };
    }

    const slot = positions.value[index];
    const { x, y } = getSlotXY(slot);
    return {
      transform: [
        {
          translateX: withTiming(x, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          }),
        },
        {
          translateY: withTiming(y, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          }),
        },
        { scale: withTiming(1, { duration: 200 }) },
      ],
      zIndex: 0,
      shadowOpacity: 0,
      elevation: 0,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.slot,
          !hasImage && isRequired && styles.slotRequired,
          styles.slotShadow,
          animatedStyle,
        ]}
      >
        {hasImage ? (
          <>
            <Pressable
              style={styles.slotContent}
              onPress={() => onTap(item.order)}
            >
              <Image
                source={{ uri: item.localUri || item.url }}
                style={styles.image}
              />
              {item.uploading && (
                <View style={styles.uploadingOverlay}>
                  <Text style={styles.uploadingText}>...</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={styles.removeButton}
              onPress={() => onRemove(item)}
              hitSlop={8}
            >
              <IconCircleX size={24} color={colors.text} />
            </Pressable>
            {isFirst && (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>Main</Text>
              </View>
            )}
          </>
        ) : (
          <Pressable
            style={styles.slotContent}
            onPress={() => onTap(item.order)}
          >
            <IconPlus
              size={32}
              color={isRequired ? colors.text : colors.textMuted}
            />
            {isRequired && <Text style={styles.requiredLabel}>Required</Text>}
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Main grid ────────────────────────────────────────────────
export function PhotoGrid({
  userId,
  existingPhotos,
  showRequired = true,
  onPhotoCountChange,
}: PhotoGridProps) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addPhoto = useMutation(api.photos.add);
  const removePhoto = useMutation(api.photos.remove);
  const reorderPhotos = useMutation(api.photos.reorder);

  const [items, setItems] = useState<PhotoItem[]>([
    { id: "0", order: 0 },
    { id: "1", order: 1 },
    { id: "2", order: 2 },
    { id: "3", order: 3 },
    { id: "4", order: 4 },
    { id: "5", order: 5 },
  ]);
  const reorderPendingRef = useRef(false);

  // positions[i] = which grid slot item i currently occupies
  const positions = useSharedValue([0, 1, 2, 3, 4, 5]);
  const activeIndex = useSharedValue(-1);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  // Sync with existing photos from database
  useEffect(() => {
    if (!existingPhotos || reorderPendingRef.current) return;

    setItems((prev) =>
      prev.map((item) => {
        const existingPhoto = existingPhotos.find(
          (p) => p.order === item.order
        );
        if (existingPhoto && !item.localUri) {
          return {
            ...item,
            photoId: existingPhoto._id,
            storageId: existingPhoto.storageId,
            url: existingPhoto.url,
          };
        }
        if (item.localUri || item.uploading) {
          return item;
        }
        if (!existingPhoto) {
          return { id: item.id, order: item.order };
        }
        return item;
      })
    );
  }, [existingPhotos]);

  const filledCount = items.filter((s) => s.url || s.localUri).length;

  useEffect(() => {
    onPhotoCountChange?.(filledCount);
  }, [filledCount, onPhotoCountChange]);

  const pickImage = async (slotOrder: number) => {
    try {
      let uri: string;

      if (Platform.OS === "web") {
        const editResult = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.8,
        });
        if (editResult.canceled || !editResult.assets?.[0]) return;
        uri = editResult.assets[0].uri;
      } else {
        const result = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 1,
        });
        if (result.canceled || !result.assets?.[0]) return;

        const cropped = await ExpoImageCropTool.openCropperAsync({
          imageUri: result.assets[0].uri,
          aspectRatio: 4 / 5,
          compressImageQuality: 0.8,
        });
        uri = cropped.path;
      }

      const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
      setItems((prev) =>
        prev.map((s) =>
          s.order === slotOrder
            ? { ...s, localUri: fileUri, uploading: true }
            : s
        )
      );

      const uploadUrl = await generateUploadUrl();
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const contentType = blob.type.startsWith("image/")
        ? blob.type
        : "image/jpeg";

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.storageId) {
        await addPhoto({
          userId,
          storageId: uploadResult.storageId,
          order: slotOrder,
        });

        setItems((prev) =>
          prev.map((s) =>
            s.order === slotOrder ? { ...s, uploading: false } : s
          )
        );
      } else {
        throw new Error("No storage ID returned");
      }
    } catch (error: any) {
      if (error?.code === "E_PICKER_CANCELLED") return;
      console.error("Image picker error:", error);
      Alert.alert("Error", "Could not upload image. Please try again.");
      setItems((prev) =>
        prev.map((s) =>
          s.order === slotOrder
            ? { ...s, localUri: undefined, uploading: false }
            : s
        )
      );
    }
  };

  const handleRemove = async (item: PhotoItem) => {
    if (item.photoId) {
      await removePhoto({ photoId: item.photoId });
    }
    setItems((prev) =>
      prev.map((s) =>
        s.order === item.order ? { id: s.id, order: s.order } : s
      )
    );
  };

  // Light haptic on each swap during drag
  const handleSwap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Persist the new order after drag ends
  const handleDragEnd = useCallback(() => {
    reorderPendingRef.current = true;

    const currentPositions = positions.value;
    setItems((prev) => {
      const newItems = prev.map((item, i) => ({
        ...item,
        order: currentPositions[i],
      }));

      const orders = newItems
        .filter((item) => item.photoId)
        .map((item) => ({ photoId: item.photoId!, order: item.order }));
      if (orders.length > 0) {
        reorderPhotos({ userId, orders })
          .catch(console.error)
          .finally(() =>
            setTimeout(() => {
              reorderPendingRef.current = false;
            }, 500)
          );
      } else {
        reorderPendingRef.current = false;
      }
      return newItems;
    });
  }, [userId, reorderPhotos, positions]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <DraggableSlot
            key={item.id}
            item={item}
            index={index}
            positions={positions}
            activeIndex={activeIndex}
            dragX={dragX}
            dragY={dragY}
            onSwap={handleSwap}
            onDragEnd={handleDragEnd}
            onTap={pickImage}
            onRemove={handleRemove}
            showRequired={showRequired}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
  },
  grid: {
    height: ROW_STRIDE * 2 - GRID_GAP,
  },
  slot: {
    position: "absolute",
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  slotShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
  },
  slotRequired: {
    borderColor: colors.text,
    borderStyle: "dashed",
  },
  slotContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  requiredLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  removeButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: "#fff",
    fontSize: fontSizes.lg,
  },
  mainBadge: {
    position: "absolute",
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mainBadgeText: {
    color: colors.primaryText,
    fontSize: fontSizes.xs,
    fontWeight: "600",
  },
});
