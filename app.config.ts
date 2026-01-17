import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "Challenger",
  slug: "challenger",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "challenger",
  userInterfaceStyle: "dark",
  backgroundColor: "#0a0a0a",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0a0a0a",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.jetlej.challenger",
    appleTeamId: "34HCA7L7PV",
    backgroundColor: "#0a0a0a",
    infoPlist: {
      UIBackgroundModes: ["audio"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#0a0a0a",
    },
    edgeToEdgeEnabled: true,
    package: "com.jetlej.challenger",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0a0a0a",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#ffffff",
      },
    ],
    [
      "@kingstinct/react-native-healthkit",
      {
        NSHealthShareUsageDescription:
          "Allow Challenger to read your health data to automatically track your challenge progress",
        NSHealthUpdateUsageDescription: "Allow Challenger to save health data",
      },
    ],
  ],
  updates: {
    url: "https://u.expo.dev/30dbc98f-9fdf-42d0-95c4-f3fadff375fa",
    checkAutomatically: "ON_LOAD",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "30dbc98f-9fdf-42d0-95c4-f3fadff375fa",
    },
  },
  owner: "jetlej",
});
