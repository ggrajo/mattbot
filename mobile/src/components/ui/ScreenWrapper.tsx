import React from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Platform,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  /** Extra style applied to the content wrapper inside the scroll/view. */
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  scrollProps?: ScrollViewProps;
}

export function ScreenWrapper({
  children,
  scroll = true,
  contentStyle,
  keyboardAvoiding = true,
  scrollProps,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const baseStyle: ViewStyle = {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center' as const,
  };

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      <View style={[baseStyle, contentStyle]}>
        {children}
      </View>
    </ScrollView>
  ) : (
    <View style={[baseStyle, { flex: 1 }, contentStyle]}>
      {children}
    </View>
  );

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {wrapped}
    </SafeAreaView>
  );
}
