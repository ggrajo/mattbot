import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from './Icon';

interface Contact {
  recordID: string;
  displayName: string;
  phoneNumbers: { label: string; number: string }[];
}

interface Props {
  onSelect: (phoneNumber: string, contactName?: string) => void;
  buttonLabel?: string;
}

async function requestContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts Permission',
        message: 'MattBot needs access to your contacts to add phone numbers.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function ContactPicker({ onSelect, buttonLabel = 'From Contacts' }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const [visible, setVisible] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async () => {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot access contacts without permission.');
      return;
    }

    setLoading(true);
    setVisible(true);

    try {
      const Contacts = require('react-native-contacts').default;
      const all: Contact[] = await Contacts.getAll();
      const withPhone = all
        .filter((c: Contact) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .sort((a: Contact, b: Contact) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
        );
      setContacts(withPhone);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load contacts: ' + (err?.message || 'Unknown error'));
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectPhone = (phone: string, name: string) => {
    const cleaned = phone.replace(/[\s()-]/g, '');
    onSelect(cleaned, name);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={loadContacts}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surfaceVariant,
          borderRadius: radii.md,
        }}
      >
        <Icon name="account-box-outline" size={18} color={colors.primary} />
        <Text style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }}>
          {buttonLabel}
        </Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setVisible(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              maxHeight: '70%',
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
                Pick a Contact
              </Text>
            </View>

            {loading ? (
              <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.recordID}
                renderItem={({ item }) => (
                  <View>
                    {item.phoneNumbers.map((pn, idx) => (
                      <Pressable
                        key={`${item.recordID}-${idx}`}
                        onPress={() => handleSelectPhone(pn.number, item.displayName)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: spacing.md,
                          paddingHorizontal: spacing.lg,
                          backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.primaryContainer,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              ...typography.body,
                              color: colors.primary,
                              fontWeight: '700',
                            }}
                          >
                            {(item.displayName || '?')[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                          <Text style={{ ...typography.body, color: colors.textPrimary }}>
                            {item.displayName}
                          </Text>
                          <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                            {pn.label ? `${pn.label}: ` : ''}{pn.number}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
                ListEmptyComponent={
                  <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
                    <Text style={{ ...typography.body, color: colors.textSecondary }}>
                      No contacts with phone numbers found
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
