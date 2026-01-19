import { create } from "zustand";

// Available fonts for testing - click header logo to cycle
export const DISPLAY_FONTS = [
  { name: "Figtree", bold: "Figtree-Bold" },
  { name: "Fredoka", bold: "Fredoka-Bold" },
  { name: "Instrument Sans", bold: "InstrumentSans-Bold" },
  { name: "Readex Pro", bold: "ReadexPro-Bold" },
] as const;

interface FontStore {
  fontIndex: number;
  nextFont: () => void;
  getCurrentFont: () => (typeof DISPLAY_FONTS)[number];
}

export const useFontStore = create<FontStore>((set, get) => ({
  fontIndex: 0,
  nextFont: () =>
    set((state) => ({
      fontIndex: (state.fontIndex + 1) % DISPLAY_FONTS.length,
    })),
  getCurrentFont: () => DISPLAY_FONTS[get().fontIndex],
}));
