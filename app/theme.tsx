import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';
type ThemeCtx = { mode: ThemeMode; toggle: () => void };
const ThemeContext = createContext<ThemeCtx>({ mode: 'dark', toggle: () => {} });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(system ?? 'dark');
  const value = useMemo(
    () => ({ mode, toggle: () => setMode(m => (m === 'dark' ? 'light' : 'dark')) }),
    [mode]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => useContext(ThemeContext);

export const colorsFor = (mode: ThemeMode) =>
  mode === 'dark'
    ? {
        bg: '#222',
        card: '#333',
        card2: '#444',      // lighter than card
        card3: '#2a2a2a',   // darker than card
        text: '#fff',
        tint: '#fff',
        headerBg: '#111',
      }
    : {
        bg: '#fff',
        card: '#b3b3b3ff',
        card2: '#8a8a8aff', // lighter than card
        card3: '#5c5c5cff', // darker than card
        text: '#000',
        tint: '#000',
        headerBg: '#c7c7c7ff',
      };