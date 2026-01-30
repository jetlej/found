import { MMKV } from "react-native-mmkv";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { darkColors, lightColors } from "./theme";

const storage = new MMKV({ id: "theme-storage" });

type Colors = typeof darkColors;

interface ThemeContextType {
  isDark: boolean;
  colors: Colors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = storage.getString("theme");
    return stored ? stored === "dark" : true; // Default to dark
  });

  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    storage.set("theme", newValue ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback for components outside provider (shouldn't happen)
    return { isDark: true, colors: darkColors, toggleTheme: () => {} };
  }
  return context;
}
