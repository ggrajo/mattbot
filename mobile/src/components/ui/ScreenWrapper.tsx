import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
}

export function ScreenWrapper({ children, scrollable = false, padding = true }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const style = {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingHorizontal: padding ? theme.spacing.lg : 0,
  };

  if (scrollable) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={style}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={style}>{children}</View>;
}
