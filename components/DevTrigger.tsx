import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconX } from "@tabler/icons-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DevAdminPanel } from "./DevAdminPanel";

interface DevTriggerProps {
  children: React.ReactNode;
}

export function DevTrigger({ children }: DevTriggerProps) {
  const [showPanel, setShowPanel] = useState(false);

  // Only render the trigger in dev mode
  if (!__DEV__) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}

      {/* Centered long-press trigger */}
      <View style={styles.triggerWrapper} pointerEvents="box-none">
        <Pressable
          style={styles.trigger}
          onLongPress={() => setShowPanel(true)}
          delayLongPress={3000}
        />
      </View>

      {/* Dev Admin Panel Modal */}
      <Modal
        visible={showPanel}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPanel(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Dev Tools</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowPanel(false)}
            >
              <IconX size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            <DevAdminPanel onClose={() => setShowPanel(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  triggerWrapper: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  trigger: {
    width: 70,
    height: 50,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSpacer: {
    width: 40,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
  },
});
