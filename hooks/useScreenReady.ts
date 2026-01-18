import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

/**
 * Hook to handle smooth screen transitions from splash/loading to content.
 * Call setReady(true) when your screen's data is loaded.
 * Returns fadeAnim to apply to your content wrapper.
 */
export function useScreenReady() {
  const [isReady, setIsReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isReady && !hasAnimated.current) {
      hasAnimated.current = true;
      
      // Hide splash screen and start fade-in
      SplashScreen.hideAsync();
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady]);

  return {
    isReady,
    setReady: setIsReady,
    fadeAnim,
  };
}
