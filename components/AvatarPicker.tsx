import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAvatarUrl } from "@/lib/avatar";
import { useMutation } from "convex/react";
import * as ExpoImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Only import cropper on native platforms
const ImageCropper =
  Platform.OS !== "web"
    ? require("react-native-image-crop-picker").default
    : null;

interface AvatarPickerProps {
  avatarUrl?: string | null;
  userId?: string; // Used for Pravatar fallback
  name?: string;
  size?: number;
  onAvatarUploaded?: (storageId: Id<"_storage">) => void;
  editable?: boolean;
  showPlaceholder?: boolean; // If false, shows empty circle when no avatar
}

export function AvatarPicker({
  avatarUrl,
  userId,
  name,
  size = 80,
  onAvatarUploaded,
  editable = true,
  showPlaceholder = true,
}: AvatarPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const pickImage = async () => {
    try {
      if (ImageCropper) {
        // Use react-native-image-crop-picker for selection + circular cropping
        const image = await ImageCropper.openPicker({
          mediaType: "photo",
          cropping: true,
          width: 400,
          height: 400,
          cropperCircleOverlay: true,
          compressImageQuality: 0.8,
        });
        await uploadImage(image.path);
      } else {
        // Fallback for web - use expo-image-picker with built-in editing
        const result = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      // User cancelled - don't show error
      if (error?.code === "E_PICKER_CANCELLED") return;
      console.error("Image picker error:", error);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);

    // Ensure file:// prefix for local paths
    const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
    setLocalUri(fileUri);

    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Ensure correct content type for images
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
        onAvatarUploaded?.(result.storageId);
      } else {
        Alert.alert("Upload failed", "No storage ID returned");
        setLocalUri(null);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert("Upload failed", "Please try again");
      setLocalUri(null);
    } finally {
      setUploading(false);
    }
  };

  const showOptions = () => {
    if (!editable) return;
    pickImage();
  };

  // Use local upload preview, then custom avatar, then Pravatar fallback (if enabled)
  const displayUri =
    localUri ??
    avatarUrl ??
    (showPlaceholder
      ? getAvatarUrl(null, userId ?? name ?? "user", size * 2)
      : null);

  return (
    <Pressable
      onPress={showOptions}
      disabled={!editable || uploading}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {displayUri ? (
        <Image
          source={{ uri: displayUri }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.emptyAvatar,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      )}
      {editable && (
        <View style={styles.editBadge}>
          <Text style={styles.editIcon}>📷</Text>
        </View>
      )}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <Text style={styles.uploadingText}>...</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    backgroundColor: "#333",
  },
  emptyAvatar: {
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    fontSize: 12,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: "#fff",
    fontSize: 18,
  },
});
