import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import * as ExpoImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

const ImageCropper =
  Platform.OS !== "web"
    ? require("react-native-image-crop-picker").default
    : null;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.xl;
const SLOT_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const SLOT_HEIGHT = SLOT_WIDTH * 1.3;

interface PhotoSlot {
  order: number;
  photoId?: Id<"photos">;
  url?: string;
  uploading?: boolean;
  localUri?: string;
}

export default function PhotosScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const existingPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );
  
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addPhoto = useMutation(api.photos.add);
  const removePhoto = useMutation(api.photos.remove);

  const [slots, setSlots] = useState<PhotoSlot[]>([
    { order: 0 },
    { order: 1 },
    { order: 2 },
    { order: 3 },
    { order: 4 },
    { order: 5 },
  ]);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);

  // Check if user already has enough photos and should skip to questions
  useEffect(() => {
    if (existingPhotos && !hasCheckedResume) {
      setHasCheckedResume(true);
      if (existingPhotos.length >= 2) {
        // User already has photos, go to questions
        router.replace("/(onboarding)/questions");
      }
    }
  }, [existingPhotos, hasCheckedResume]);

  // Merge existing photos into slots
  const mergedSlots = slots.map((slot) => {
    const existingPhoto = existingPhotos?.find((p) => p.order === slot.order);
    if (existingPhoto && !slot.localUri) {
      return {
        ...slot,
        photoId: existingPhoto._id,
        url: existingPhoto.url,
      };
    }
    return slot;
  });

  const filledCount = mergedSlots.filter((s) => s.url || s.localUri).length;
  const isValid = filledCount >= 2;

  const pickImage = async (slotOrder: number) => {
    if (!currentUser?._id) return;

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
      setSlots((prev) =>
        prev.map((s) =>
          s.order === slotOrder ? { ...s, localUri: fileUri, uploading: true } : s
        )
      );

      // Upload to Convex
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const contentType = blob.type.startsWith("image/") ? blob.type : "image/jpeg";

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      const result = await uploadResponse.json();

      if (result.storageId) {
        await addPhoto({
          userId: currentUser._id,
          storageId: result.storageId,
          order: slotOrder,
        });

        setSlots((prev) =>
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
      setSlots((prev) =>
        prev.map((s) =>
          s.order === slotOrder ? { ...s, localUri: undefined, uploading: false } : s
        )
      );
    }
  };

  const handleRemove = async (slot: PhotoSlot) => {
    if (slot.photoId) {
      await removePhoto({ photoId: slot.photoId });
    }
    setSlots((prev) =>
      prev.map((s) =>
        s.order === slot.order
          ? { order: s.order }
          : s
      )
    );
  };

  const handleContinue = () => {
    router.push("/(onboarding)/questions");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Add your photos</Text>
          <Text style={styles.subtitle}>
            Add at least 2 photos to continue. Show your personality!
          </Text>
        </View>

        <View style={styles.grid}>
          {mergedSlots.map((slot) => {
            const hasImage = slot.url || slot.localUri;
            const isRequired = slot.order < 2;

            return (
              <Pressable
                key={slot.order}
                style={[
                  styles.slot,
                  isRequired && !hasImage && styles.slotRequired,
                ]}
                onPress={() => (hasImage ? null : pickImage(slot.order))}
              >
                {hasImage ? (
                  <>
                    <Image
                      source={{ uri: slot.localUri || slot.url }}
                      style={styles.image}
                    />
                    {slot.uploading && (
                      <View style={styles.uploadingOverlay}>
                        <Text style={styles.uploadingText}>...</Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => handleRemove(slot)}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.text} />
                    </Pressable>
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
            );
          })}
        </View>

        <Text style={styles.photoCount}>
          {filledCount} of 6 photos added
          {filledCount < 2 && " (2 required)"}
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: GRID_PADDING,
  },
  header: {
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  photoCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
});
