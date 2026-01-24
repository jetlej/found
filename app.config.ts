import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "Found",
  slug: "found",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "found",
  userInterfaceStyle: "light",
  backgroundColor: "#FAFAFA",
  newArchEnabled: true,
  splash: {
    backgroundColor: "#FAFAFA",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.found.app",
    appleTeamId: "34HCA7L7PV",
    backgroundColor: "#FAFAFA",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "Found needs your location to find matches near you.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FAFAFA",
    },
    edgeToEdgeEnabled: true,
    package: "com.found.app",
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
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
      "expo-image-picker",
      {
        photosPermission: "Found needs access to your photos to add them to your profile.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Found needs your location to find matches near you.",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FAFAFA",
        image: "./assets/images/icon-rounded.png",
        imageWidth: 200,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#ffffff",
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
