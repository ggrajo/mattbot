import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ScreenWrapper({
  children,
  scrollable = true,
  style,
  contentStyle,
}: ScreenWrapperProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const safeStyle = [styles.safe, { backgroundColor: colors.background }, style];

  if (!scrollable) {
    return <SafeAreaView style={safeStyle}>{children}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={safeStyle}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { padding: spacing.xl, paddingBottom: spacing.xxxl },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
});
