import { GradientBackground } from "@/components/GradientBackground";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors } from "@/lib/theme";
import { TOTAL_VOICE_QUESTIONS } from "@/lib/voice-questions";
import { BottomTabBar, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { IconHeart, IconMessageCircle, IconMessageQuestion, IconUser } from "@tabler/icons-react-native";
import { useQuery } from "convex/react";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

export default function TabLayout() {
  const userId = useEffectiveUserId();
  const currentUser = useQuery(api.users.current, userId ? {} : "skip");
  const recordingCount = useQuery(
    api.voiceRecordings.getCompletedCount,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );
  const questionsComplete =
    recordingCount !== undefined && recordingCount >= TOTAL_VOICE_QUESTIONS;

  // Entrance animations (run once on mount)
  const hasAnimated = useRef(false);
  const contentOpacity = useSharedValue(0);
  const barOpacity = useSharedValue(0);
  const barTranslateY = useSharedValue(20);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    contentOpacity.value = withTiming(1, { duration: 150 });
    barOpacity.value = withDelay(100, withTiming(1, { duration: 350 }));
    barTranslateY.value = withDelay(100, withTiming(0, { duration: 350 }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: contentOpacity.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
    transform: [{ translateY: barTranslateY.value }],
  }));

  const renderTabBar = (props: BottomTabBarProps) => (
    <Animated.View style={barStyle}>
      <BottomTabBar {...props} />
    </Animated.View>
  );

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground>
        <Animated.View style={contentStyle}>
          <Tabs
            tabBar={renderTabBar}
          screenOptions={{
            lazy: false,
            tabBarActiveTintColor: "#FFFFFF",
              tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
              tabBarShowLabel: false,
              tabBarStyle: {
                backgroundColor: "#000000",
                borderTopColor: "rgba(255,255,255,0.1)",
                paddingTop: 8,
              },
              headerStyle: {
                backgroundColor: "transparent",
              },
              headerTintColor: colors.text,
              sceneStyle: {
                backgroundColor: "transparent",
              },
              animation: "fade",
            }}
          >
            {/* Questions tab -- visible only before questions are complete */}
            <Tabs.Screen
              name="questions"
              options={{
                headerShown: false,
                href: questionsComplete ? null : "/(tabs)/questions",
                tabBarIcon: ({ color }) => <IconMessageQuestion size={24} color={color} />,
              }}
            />

            {/* Browse tab -- visible only after questions are complete */}
            <Tabs.Screen
              name="matches"
              options={{
                headerShown: false,
                href: questionsComplete ? "/(tabs)/matches" : null,
                tabBarIcon: ({ color }) => <IconHeart size={24} color={color} />,
              }}
            />

            {/* Chats tab -- visible only after questions are complete */}
            <Tabs.Screen
              name="chats"
              options={{
                headerShown: false,
                href: questionsComplete ? "/(tabs)/chats" : null,
                tabBarIcon: ({ color }) => <IconMessageCircle size={24} color={color} />,
              }}
            />

            {/* Settings/Profile tab -- always visible */}
            <Tabs.Screen
              name="settings"
              options={{
                headerShown: false,
                tabBarIcon: ({ color }) => <IconUser size={24} color={color} />,
              }}
            />

            {/* Hidden tabs */}
            <Tabs.Screen name="waitlist" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="journey" options={{ href: null, headerShown: false }} />
          </Tabs>
        </Animated.View>
      </GradientBackground>
    </View>
  );
}
