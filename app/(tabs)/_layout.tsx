import { GradientBackground } from "@/components/GradientBackground";
import { colors } from "@/lib/theme";
import { IconHeart, IconHome, IconMessageQuestion, IconRoute } from "@tabler/icons-react-native";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <GradientBackground>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarIconStyle: {
            marginBottom: 4,
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
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color }) => <IconHome size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="journey"
          options={{
            title: "Journey",
            headerShown: false,
            href: null, // Hidden - may bring back later
            tabBarIcon: ({ color }) => <IconRoute size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="questions"
          options={{
            title: "Questions",
            headerShown: false,
            tabBarIcon: ({ color }) => <IconMessageQuestion size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: "Matches",
            headerShown: false,
            tabBarIcon: ({ color }) => <IconHeart size={24} color={color} />,
          }}
        />
      </Tabs>
    </GradientBackground>
  );
}
