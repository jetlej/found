import { GradientBackground } from "@/components/GradientBackground";
import { colors } from "@/lib/theme";
import { IconHeart, IconHome, IconRoute } from "@tabler/icons-react-native";
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
            tabBarIcon: ({ color }) => <IconRoute size={24} color={color} />,
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
