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
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
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

  const handleDragEnd = async ({ data }: { data: PhotoItem[] }) => {
    // Update local state with new order
    const updatedItems = data.map((item, index) => ({
      ...item,
      order: index,
    }));
    setItems(updatedItems);

    // Get photo IDs that need reordering (only filled slots)
    const filledItems = updatedItems.filter((item) => item.photoId);
    if (filledItems.length < 2) return;

    // Update database with new order
    const photoIds = filledItems.map((item) => item.photoId!);
    await reorderPhotos({ userId, photoIds });
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<PhotoItem>) => {
    const hasImage = item.url || item.localUri;
    const isRequired = showRequired && item.order < 2;
    const isFirst = item.order === 0;

    return (
      <ScaleDecorator>
        <Pressable
          style={[
            styles.slot,
            isRequired && !hasImage && styles.slotRequired,
            isActive && styles.slotDragging,
          ]}
          onPress={() => !hasImage && pickImage(item.order)}
          onLongPress={hasImage ? drag : undefined}
          delayLongPress={150}
        >
          {hasImage ? (
            <>
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
              {!isActive && (
                <View style={styles.dragHint}>
                  <Ionicons name="menu" size={16} color="rgba(255,255,255,0.8)" />
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptySlot}>
              <Ionicons
                name="add"
                size={32}
                color={isRequired ? colors.text : colors.textMuted}
              />
              {isRequired && (
                <Text style={styles.requiredLabel}>Required</Text>
              )}
            </View>
          )}
        </Pressable>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <DraggableFlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        numColumns={3}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
      />
      <Text style={styles.photoCount}>
        {filledCount} of 6 photos
        {showRequired && filledCount < 2 && " (2 required)"}
      </Text>
      <Text style={styles.dragHintText}>
        Hold and drag photos to reorder
      </Text>
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
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
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
    opacity: 0.9,
    transform: [{ scale: 1.05 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
  dragHint: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 4,
    padding: 2,
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
