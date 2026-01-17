import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Listen for notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Handle notification received while app is open
      }
    );

    // Listen for user interacting with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // Handle user tapping on notification
      }
    );

    return () => {
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch {
        // Cleanup not supported in this version
      }
    };
  }, []);

  return {};
}

/**
 * Request notification permissions and return the push token
 * Returns null if permissions denied or not available
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Must be a physical device for push notifications
  if (!Device.isDevice) {
    console.log("[Notifications] Push notifications require a physical device");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted");
    return null;
  }

  // Get push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    console.log("[Notifications] Push token:", tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error("[Notifications] Error getting push token:", error);
    return null;
  }
}

/**
 * Check if notification permissions are granted
 */
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/**
 * Schedule a daily reminder notification at the specified time
 */
export async function scheduleDailyReminder(
  hour: number = 12,
  minute: number = 0
): Promise<string | null> {
  // Cancel existing reminders first
  await cancelDailyReminder();

  // Schedule new daily notification
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Daily Reminder",
        body: "Don't forget to check in today!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    console.log(`[Notifications] Scheduled daily reminder at ${hour}:${minute.toString().padStart(2, "0")}`);
    return identifier;
  } catch (error) {
    console.error("[Notifications] Error scheduling reminder:", error);
    return null;
  }
}

/**
 * Cancel the daily reminder notification
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("[Notifications] Cancelled all scheduled notifications");
  } catch (error) {
    console.error("[Notifications] Error cancelling notifications:", error);
  }
}

/**
 * Prompt for notifications - shows system dialog and returns result
 * Use this after first challenge join
 */
export async function promptForNotifications(): Promise<{
  granted: boolean;
  token: string | null;
}> {
  if (Platform.OS === "web") {
    return { granted: false, token: null };
  }

  // Check/request permissions first
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  const granted = finalStatus === "granted";

  if (granted) {
    // Schedule default reminder at noon
    await scheduleDailyReminder(12, 0);
  }

  // Try to get push token (may fail on simulator or without EAS config)
  let token: string | null = null;
  if (granted && Device.isDevice) {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
      console.log("[Notifications] Push token:", token);
    } catch (error) {
      console.log("[Notifications] Could not get push token:", error);
    }
  }

  return { granted, token };
}
