import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
}

const COUNTRIES: Country[] = [
  { code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States' },
  { code: 'CA', dial: '+1', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada' },
  { code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom' },
  { code: 'AU', dial: '+61', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia' },
  { code: 'DE', dial: '+49', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany' },
  { code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}', name: 'France' },
  { code: 'IT', dial: '+39', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy' },
  { code: 'ES', dial: '+34', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain' },
  { code: 'BR', dial: '+55', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil' },
  { code: 'MX', dial: '+52', flag: '\u{1F1F2}\u{1F1FD}', name: 'Mexico' },
  { code: 'IN', dial: '+91', flag: '\u{1F1EE}\u{1F1F3}', name: 'India' },
  { code: 'CN', dial: '+86', flag: '\u{1F1E8}\u{1F1F3}', name: 'China' },
  { code: 'JP', dial: '+81', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan' },
  { code: 'KR', dial: '+82', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea' },
  { code: 'PH', dial: '+63', flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippines' },
  { code: 'SG', dial: '+65', flag: '\u{1F1F8}\u{1F1EC}', name: 'Singapore' },
  { code: 'NZ', dial: '+64', flag: '\u{1F1F3}\u{1F1FF}', name: 'New Zealand' },
  { code: 'AE', dial: '+971', flag: '\u{1F1E6}\u{1F1EA}', name: 'United Arab Emirates' },
  { code: 'SA', dial: '+966', flag: '\u{1F1F8}\u{1F1E6}', name: 'Saudi Arabia' },
  { code: 'ZA', dial: '+27', flag: '\u{1F1FF}\u{1F1E6}', name: 'South Africa' },
  { code: 'NG', dial: '+234', flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigeria' },
  { code: 'EG', dial: '+20', flag: '\u{1F1EA}\u{1F1EC}', name: 'Egypt' },
  { code: 'IL', dial: '+972', flag: '\u{1F1EE}\u{1F1F1}', name: 'Israel' },
  { code: 'TR', dial: '+90', flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkey' },
  { code: 'RU', dial: '+7', flag: '\u{1F1F7}\u{1F1FA}', name: 'Russia' },
  { code: 'PL', dial: '+48', flag: '\u{1F1F5}\u{1F1F1}', name: 'Poland' },
  { code: 'NL', dial: '+31', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands' },
  { code: 'SE', dial: '+46', flag: '\u{1F1F8}\u{1F1EA}', name: 'Sweden' },
  { code: 'NO', dial: '+47', flag: '\u{1F1F3}\u{1F1F4}', name: 'Norway' },
  { code: 'PT', dial: '+351', flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugal' },
  { code: 'AR', dial: '+54', flag: '\u{1F1E6}\u{1F1F7}', name: 'Argentina' },
  { code: 'CO', dial: '+57', flag: '\u{1F1E8}\u{1F1F4}', name: 'Colombia' },
  { code: 'TH', dial: '+66', flag: '\u{1F1F9}\u{1F1ED}', name: 'Thailand' },
  { code: 'MY', dial: '+60', flag: '\u{1F1F2}\u{1F1FE}', name: 'Malaysia' },
  { code: 'ID', dial: '+62', flag: '\u{1F1EE}\u{1F1E9}', name: 'Indonesia' },
  { code: 'VN', dial: '+84', flag: '\u{1F1FB}\u{1F1F3}', name: 'Vietnam' },
  { code: 'PK', dial: '+92', flag: '\u{1F1F5}\u{1F1F0}', name: 'Pakistan' },
  { code: 'BD', dial: '+880', flag: '\u{1F1E7}\u{1F1E9}', name: 'Bangladesh' },
  { code: 'IE', dial: '+353', flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland' },
  { code: 'CH', dial: '+41', flag: '\u{1F1E8}\u{1F1ED}', name: 'Switzerland' },
  { code: 'AT', dial: '+43', flag: '\u{1F1E6}\u{1F1F9}', name: 'Austria' },
  { code: 'HK', dial: '+852', flag: '\u{1F1ED}\u{1F1F0}', name: 'Hong Kong' },
  { code: 'TW', dial: '+886', flag: '\u{1F1F9}\u{1F1FC}', name: 'Taiwan' },
];

function formatNational(digits: string, dialCode: string): string {
  if (dialCode === '+1' && digits.length <= 10) {
    const d = digits;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return digits;
}

interface PhoneInputProps {
  value: string;
  onChangeE164: (e164: string) => void;
  label?: string;
  placeholder?: string;
  defaultCountry?: string;
}

export function PhoneInput({
  value,
  onChangeE164,
  label = 'Phone Number',
  placeholder = '(555) 123-4567',
  defaultCountry = 'US',
}: PhoneInputProps) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  const [country, setCountry] = useState<Country>(
    () => COUNTRIES.find((c) => c.code === defaultCountry) ?? COUNTRIES[0],
  );
  const [localDigits, setLocalDigits] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<TextInput>(null);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [search]);

  const handleDigits = useCallback(
    (raw: string) => {
      const stripped = raw.replace(/\D/g, '');
      setLocalDigits(stripped);
      const e164 = stripped.length > 0 ? `${country.dial}${stripped}` : '';
      onChangeE164(e164);
    },
    [country, onChangeE164],
  );

  const selectCountry = useCallback(
    (c: Country) => {
      setCountry(c);
      setPickerVisible(false);
      setSearch('');
      if (localDigits.length > 0) {
        onChangeE164(`${c.dial}${localDigits}`);
      }
    },
    [localDigits, onChangeE164],
  );

  React.useEffect(() => {
    if (value) {
      for (const c of COUNTRIES) {
        if (value.startsWith(c.dial)) {
          setCountry(c);
          setLocalDigits(value.slice(c.dial.length));
          return;
        }
      }
      setLocalDigits(value.replace(/^\+/, ''));
    }
  }, [value]);

  const displayValue = formatNational(localDigits, country.dial);

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && (
        <Text
          style={{
            ...typography.caption,
            color: colors.textSecondary,
            marginBottom: spacing.xs,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            borderRightWidth: 1,
            borderRightColor: colors.border,
            gap: spacing.xs,
          }}
          accessibilityLabel="Select country"
        >
          <Text style={{ fontSize: 20 }}>{country.flag}</Text>
          <Text style={{ ...typography.body, color: colors.textSecondary }}>
            {country.dial}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textDisabled }}>
            {'\u25BC'}
          </Text>
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          value={displayValue}
          onChangeText={handleDigits}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          keyboardType="phone-pad"
          style={{
            flex: 1,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            ...typography.body,
            color: colors.textPrimary,
          }}
          accessibilityLabel={label}
        />
      </View>

      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPickerVisible(false);
          setSearch('');
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.lg,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
              gap: spacing.md,
            }}
          >
            <Text
              style={{
                ...typography.h3,
                color: colors.textPrimary,
                flex: 1,
              }}
            >
              Select Country
            </Text>
            <TouchableOpacity onPress={() => { setPickerVisible(false); setSearch(''); }}>
              <Text style={{ ...typography.body, color: colors.primary, fontWeight: '600' }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search countries..."
              placeholderTextColor={colors.textDisabled}
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surfaceVariant,
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
                paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
              }}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={({ item: c }) => (
              <TouchableOpacity
                onPress={() => selectCountry(c)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  backgroundColor:
                    c.code === country.code ? colors.primaryContainer : 'transparent',
                  gap: spacing.md,
                }}
              >
                <Text style={{ fontSize: 22 }}>{c.flag}</Text>
                <Text
                  style={{
                    ...typography.body,
                    color: colors.textPrimary,
                    flex: 1,
                  }}
                >
                  {c.name}
                </Text>
                <Text style={{ ...typography.body, color: colors.textSecondary }}>
                  {c.dial}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.border,
                  marginLeft: spacing.lg + 22 + spacing.md,
                }}
              />
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
