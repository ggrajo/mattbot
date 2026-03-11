import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Appearance, ColorSchemeName, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from './tokens';
import { lightTheme } from './lightTheme';
import { darkTheme } from './darkTheme';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = '@mattbot/theme_preference';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
});

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeContext(): ThemeContextType {
  return useContext(ThemeContext);
}

interface Props {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: Props) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => listener.remove();
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const theme = useMemo(() => {
    if (themeMode === 'light') return lightTheme;
    if (themeMode === 'dark') return darkTheme;
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemScheme]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      {children}
    </ThemeContext.Provider>
  );
}
