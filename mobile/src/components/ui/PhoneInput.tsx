import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  Pressable,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from './Icon';

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'CA', dial: '+1', flag: '🇨🇦' },
  { code: 'GB', dial: '+44', flag: '🇬🇧' },
  { code: 'AU', dial: '+61', flag: '🇦🇺' },
  { code: 'IN', dial: '+91', flag: '🇮🇳' },
  { code: 'PH', dial: '+63', flag: '🇵🇭' },
  { code: 'DE', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', dial: '+33', flag: '🇫🇷' },
  { code: 'JP', dial: '+81', flag: '🇯🇵' },
  { code: 'KR', dial: '+82', flag: '🇰🇷' },
  { code: 'BR', dial: '+55', flag: '🇧🇷' },
  { code: 'MX', dial: '+52', flag: '🇲🇽' },
  { code: 'SG', dial: '+65', flag: '🇸🇬' },
  { code: 'NZ', dial: '+64', flag: '🇳🇿' },
  { code: 'AE', dial: '+971', flag: '🇦🇪' },
];

interface Props {
  value: string;
  onChangeValue: (fullNumber: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChangeValue,
  label = 'Phone Number',
  error,
  placeholder = '(555) 123-4567',
}: Props) {
  const { colors, spacing, radii, typography } = useTheme();
  const [country, setCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [localNumber, setLocalNumber] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const suppressSync = useRef(false);

  useEffect(() => {
    if (suppressSync.current) {
      suppressSync.current = false;
      return;
    }
    if (!value) {
      setLocalNumber('');
      return;
    }
    const match = COUNTRY_CODES.find((c) => value.startsWith(c.dial));
    if (match) {
      setCountry(match);
      setLocalNumber(value.slice(match.dial.length).replace(/^\s+/, ''));
    } else {
      setLocalNumber(value.replace(/^\+?\d{1,3}\s?/, ''));
    }
  }, [value]);

  const handleNumberChange = (text: string) => {
    setLocalNumber(text);
    suppressSync.current = true;
    const clean = text.replace(/[^0-9]/g, '');
    onChangeValue(clean ? `${country.dial}${clean}` : '');
  };

  const handleCountrySelect = (c: CountryCode) => {
    setCountry(c);
    setPickerVisible(false);
    suppressSync.current = true;
    const clean = localNumber.replace(/[^0-9]/g, '');
    onChangeValue(clean ? `${c.dial}${clean}` : '');
  };

  const borderColor = error
    ? colors.error
    : focused
      ? colors.borderFocused
      : colors.border;

  const focusGlow =
    focused && !error && Platform.OS === 'ios'
      ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8 }
      : {};

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text
          style={{
            ...typography.bodySmall,
            color: error ? colors.error : colors.textSecondary,
            marginBottom: spacing.xs,
            fontWeight: '500',
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          ...focusGlow,
        }}
      >
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md + 2,
            borderRightWidth: 1,
            borderRightColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 18 }}>{country.flag}</Text>
          <Text
            style={{
              ...typography.body,
              color: colors.textPrimary,
              marginLeft: spacing.xs,
            }}
          >
            {country.dial}
          </Text>
          <Icon name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 2 }} />
        </Pressable>

        <RNTextInput
          value={localNumber}
          onChangeText={handleNumberChange}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            ...typography.body,
            color: colors.textPrimary,
            paddingVertical: spacing.md + 2,
            paddingHorizontal: spacing.md,
          }}
          accessibilityLabel={label}
        />
      </View>

      {error ? (
        <Text
          style={{ ...typography.caption, color: colors.error, marginTop: spacing.xs }}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}

      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setPickerVisible(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              maxHeight: '60%',
              paddingBottom: spacing.xl,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.textDisabled,
                  marginBottom: spacing.sm,
                }}
              />
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>
                Select Country
              </Text>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleCountrySelect(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                  <Text
                    style={{
                      ...typography.body,
                      color: colors.textPrimary,
                      flex: 1,
                      marginLeft: spacing.md,
                    }}
                  >
                    {item.code}
                  </Text>
                  <Text style={{ ...typography.body, color: colors.textSecondary }}>
                    {item.dial}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
