import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { colors, fontSizes, spacing } from "@/lib/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import * as ExpoImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
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
import { DraxProvider, DraxView } from "react-native-drax";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const ImageCropper =
  Platform.OS !== "web"
    ? require("react-native-image-crop-picker").default
    : null;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.xl;
const SLOT_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const SLOT_HEIGHT = SLOT_WIDTH * 1.3;

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

  // Sync with existing photos from database
  useEffect(() => {
    if (!existingPhotos) return;

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
        // Keep local state if we have it (uploading)
        if (item.localUri || item.uploading) {
          return item;
        }
        // Clear if no longer in database
        if (!existingPhoto) {
          return { id: item.id, order: item.order };
        }
        return item;
      })
    );
  }, [existingPhotos]);

  const filledCount = items.filter((s) => s.url || s.localUri).length;

  // Notify parent of photo count changes
  useEffect(() => {
    onPhotoCountChange?.(filledCount);
  }, [filledCount, onPhotoCountChange]);

  const pickImage = async (slotOrder: number) => {
    try {
      let uri: string;

      if (ImageCropper) {
        const image = await ImageCropper.openPicker({
          mediaType: "photo",
          cropping: true,
          width: 800,
          height: 1000,
          cropperCircleOverlay: false,
          compressImageQuality: 0.8,
        });
        uri = image.path;
      } else {
        const result = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        uri = result.assets[0].uri;
      }

      // Set local preview immediately
      const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
      setItems((prev) =>
        prev.map((s) =>
          s.order === slotOrder
            ? { ...s, localUri: fileUri, uploading: true }
            : s
        )
      );

      // Upload to Convex
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

      const result = await uploadResponse.json();

      if (result.storageId) {
        await addPhoto({
          userId,
          storageId: result.storageId,
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

  const handleSwap = async (fromIndex: number, toIndex: number) => {
    // Swap items in local state
    const newItems = [...items];
    const temp = newItems[fromIndex];
    newItems[fromIndex] = { ...newItems[toIndex], order: fromIndex, id: fromIndex.toString() };
    newItems[toIndex] = { ...temp, order: toIndex, id: toIndex.toString() };
    setItems(newItems);

    // Update database
    const filledItems = newItems.filter((item) => item.photoId);
    if (filledItems.length >= 1) {
      const photoIds = newItems
        .filter((item) => item.photoId)
        .map((item) => item.photoId!);
      if (photoIds.length > 0) {
        await reorderPhotos({ userId, photoIds });
      }
    }
  };

  const renderSlot = (item: PhotoItem, index: number) => {
    const hasImage = item.url || item.localUri;
    const isRequired = showRequired && index < 2;
    const isFirst = index === 0;

    if (hasImage) {
      return (
        <DraxView
          key={item.id}
          style={[styles.slot]}
          draggingStyle={styles.slotDragging}
          dragReleasedStyle={styles.slot}
          hoverDraggingStyle={styles.slotHover}
          dragPayload={index}
          longPressDelay={150}
          receivingStyle={styles.slotReceiving}
          onReceiveDragDrop={({ dragged }) => {
            const fromIndex = dragged.payload as number;
            if (fromIndex !== index) {
              handleSwap(fromIndex, index);
            }
          }}
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
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemove(item)}
          >
            <Ionicons name="close-circle" size={24} color={colors.text} />
          </Pressable>
          {isFirst && (
            <View style={styles.mainBadge}>
              <Text style={styles.mainBadgeText}>Main</Text>
            </View>
          )}
        </DraxView>
      );
    }

    return (
      <DraxView
        key={item.id}
        style={[styles.slot, isRequired && styles.slotRequired]}
        receivingStyle={styles.slotReceiving}
        dragPayload={index}
        onReceiveDragDrop={({ dragged }) => {
          const fromIndex = dragged.payload as number;
          if (fromIndex !== index) {
            handleSwap(fromIndex, index);
          }
        }}
      >
        <Pressable style={styles.emptySlot} onPress={() => pickImage(index)}>
          <Ionicons
            name="add"
            size={32}
            color={isRequired ? colors.text : colors.textMuted}
          />
          {isRequired && <Text style={styles.requiredLabel}>Required</Text>}
        </Pressable>
      </DraxView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <DraxProvider>
        <View style={styles.grid}>
          <View style={styles.row}>
            {items.slice(0, 3).map((item, i) => renderSlot(item, i))}
          </View>
          <View style={styles.row}>
            {items.slice(3, 6).map((item, i) => renderSlot(item, i + 3))}
          </View>
        </View>
      </DraxProvider>
      <Text style={styles.photoCount}>
        {filledCount} of 6 photos
        {showRequired && filledCount < 2 && " (2 required)"}
      </Text>
      <Text style={styles.dragHintText}>Hold and drag photos to reorder</Text>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
  },
  grid: {
    gap: GRID_GAP,
  },
  row: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  slot: {
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  slotRequired: {
    borderColor: colors.text,
    borderStyle: "dashed",
  },
  slotDragging: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  slotHover: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  slotReceiving: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  emptySlot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  requiredLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
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
  photoCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  dragHintText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
