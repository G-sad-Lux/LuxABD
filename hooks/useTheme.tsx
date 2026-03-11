import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  activeTheme: 'light' | 'dark'; // The actual computed theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeColorScheme = useNativeColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem('theme-mode').then(savedMode => {
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setModeState(savedMode);
      }
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('theme-mode', newMode);
  };

  const activeTheme = mode === 'system' 
    ? (nativeColorScheme || 'light') 
    : mode;

  return (
    <ThemeContext.Provider value={{ mode, setMode, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
