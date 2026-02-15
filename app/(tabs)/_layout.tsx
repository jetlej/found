import { GradientBackground } from "@/components/GradientBackground";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors } from "@/lib/theme";
import { TOTAL_VOICE_QUESTIONS } from "@/lib/voice-questions";
import { IconHeart, IconMessageCircle, IconMessageQuestion, IconUser } from "@tabler/icons-react-native";
import { useQuery } from "convex/react";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const userId = useEffectiveUserId();
  const currentUser = useQuery(api.users.current, userId ? {} : "skip");
  const recordingCount = useQuery(
    api.voiceRecordings.getCompletedCount,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );
  const questionsComplete =
    recordingCount !== undefined && recordingCount >= TOTAL_VOICE_QUESTIONS;

  return (
    <GradientBackground>
      <Tabs
        screenOptions={{
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
    </GradientBackground>
  );
}
