import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { colors, fontSizes, spacing } from "@/lib/theme";
import { IconCircleX, IconPlus } from "@tabler/icons-react-native";
import { useMutation } from "convex/react";
import * as ExpoImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
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
  const [isPreparingCrop, setIsPreparingCrop] = useState(false);

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

      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const selectedUri = result.assets[0].uri;

      setIsPreparingCrop(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 800));
      setIsPreparingCrop(false);

      if (ImageCropper) {
        const cropped = await ImageCropper.openCropper({
          path: selectedUri,
          width: 800,
          height: 1000,
          cropperCircleOverlay: false,
          compressImageQuality: 0.8,
          mediaType: "photo",
          hideBottomControls: true,
          enableRotationGesture: false,
        });
        uri = cropped.path;
      } else {
        const editResult = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.8,
        });
        if (editResult.canceled || !editResult.assets?.[0]) return;
        uri = editResult.assets[0].uri;
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

  const handleSwap = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      // Swap the items
      const temp = newItems[fromIndex];
      newItems[fromIndex] = { ...newItems[toIndex], order: fromIndex };
      newItems[toIndex] = { ...temp, order: toIndex };
      return newItems;
    });

    // Persist to database
    setTimeout(() => {
      setItems((currentItems) => {
        const photoIds = currentItems
          .filter((item) => item.photoId)
          .map((item) => item.photoId!);
        if (photoIds.length > 0) {
          reorderPhotos({ userId, photoIds }).catch(console.error);
        }
        return currentItems;
      });
    }, 100);
  }, [userId, reorderPhotos]);

  const renderSlot = (item: PhotoItem, index: number) => {
    const hasImage = item.url || item.localUri;
    const isRequired = showRequired && index < 4;
    const isFirst = index === 0;

    return (
      <DraxView
        key={item.id}
        style={[styles.slot, !hasImage && isRequired && styles.slotRequired]}
        draggingStyle={styles.dragging}
        dragReleasedStyle={styles.dragReleased}
        receivingStyle={styles.receiving}
        payload={index}
        longPressDelay={200}
        onReceiveDragDrop={({ dragged }) => {
          const fromIndex = dragged.payload as number;
          if (fromIndex !== index) {
            handleSwap(fromIndex, index);
          }
        }}
        onDragEnd={() => {
          // Drag ended without drop
        }}
      >
        {hasImage ? (
          <>
            <Pressable style={styles.slotContent} onPress={() => pickImage(item.order)}>
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
              onPress={() => handleRemove(item)}
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
          <Pressable style={styles.slotContent} onPress={() => pickImage(item.order)}>
            <IconPlus
              size={32}
              color={isRequired ? colors.text : colors.textMuted}
            />
            {isRequired && <Text style={styles.requiredLabel}>Required</Text>}
          </Pressable>
        )}
      </DraxView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <DraxProvider>
        <View style={styles.grid}>
          <View style={styles.row}>
            {items.slice(0, 3).map((item, index) => renderSlot(item, index))}
          </View>
          <View style={styles.row}>
            {items.slice(3, 6).map((item, index) => renderSlot(item, index + 3))}
          </View>
        </View>
      </DraxProvider>

      <Modal visible={isPreparingCrop} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Preparing photo...</Text>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
  },
  grid: {
    flexDirection: "column",
  },
  row: {
    flexDirection: "row",
    gap: GRID_GAP,
    height: SLOT_HEIGHT,
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
  dragging: {
    opacity: 0.9,
    transform: [{ scale: 1.05 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  dragReleased: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  receiving: {
    borderColor: colors.primary,
    borderWidth: 2,
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.base,
    color: colors.text,
  },
});
