import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { IconX } from '@tabler/icons-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DevAdminPanel } from './DevAdminPanel';

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
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Dev Tools</Text>
            <Pressable style={styles.closeButton} onPress={() => setShowPanel(false)}>
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
  closeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  container: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  modalContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
  },
  trigger: {
    height: 50,
    width: 70,
  },
  triggerWrapper: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 60,
    zIndex: 9999,
  },
});
