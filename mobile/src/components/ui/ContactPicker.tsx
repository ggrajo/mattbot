import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  PermissionsAndroid,
} from 'react-native';
import Contacts, { type Contact } from 'react-native-contacts';
import { useTheme } from '../theme/ThemeProvider';

export interface SelectedContact {
  phoneNumber: string;
  displayName: string;
  company: string | null;
  email: string | null;
}

interface ContactPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (contact: SelectedContact) => void;
}

function getBestPhone(contact: Contact): string | null {
  if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) return null;
  const mobile = contact.phoneNumbers.find(
    (p) => p.label?.toLowerCase() === 'mobile',
  );
  return (mobile ?? contact.phoneNumbers[0]).number;
}

function getBestEmail(contact: Contact): string | null {
  if (!contact.emailAddresses || contact.emailAddresses.length === 0) return null;
  return contact.emailAddresses[0].email;
}

function getDisplayName(contact: Contact): string {
  const parts = [contact.givenName, contact.familyName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (contact.company) return contact.company;
  return getBestPhone(contact) ?? 'Unknown';
}

export function ContactPicker({ visible, onClose, onSelect }: ContactPickerProps) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [permError, setPermError] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contact Access',
          message: 'Allow Mattbot to access your contacts to quickly add VIPs or blocked numbers.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }, []);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setPermError(false);
    try {
      const ok = await requestPermission();
      if (!ok) {
        setPermError(true);
        setLoading(false);
        return;
      }
      const all = await Contacts.getAll();
      const withPhone = all
        .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
      setContacts(withPhone);
    } catch {
      Alert.alert('Error', 'Could not load contacts. Please check permissions.');
      setPermError(true);
    } finally {
      setLoading(false);
    }
  }, [requestPermission]);

  useEffect(() => {
    if (visible) {
      loadContacts();
      setSearch('');
    }
  }, [visible, loadContacts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const name = getDisplayName(c).toLowerCase();
      const phone = getBestPhone(c)?.toLowerCase() ?? '';
      const company = (c.company ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q) || company.includes(q);
    });
  }, [contacts, search]);

  const handleSelect = useCallback(
    (contact: Contact) => {
      const phone = getBestPhone(contact);
      if (!phone) return;
      onSelect({
        phoneNumber: phone,
        displayName: getDisplayName(contact),
        company: contact.company || null,
        email: getBestEmail(contact),
      });
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
            style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }}
          >
            Pick from Contacts
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text
              style={{
                ...typography.body,
                color: colors.primary,
                fontWeight: '600',
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts..."
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

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
              Loading contacts...
            </Text>
          </View>
        ) : permError ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
            <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}>
              Contact permission was denied. Please enable it in your device settings.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.recordID}
            renderItem={({ item: c }) => {
              const name = getDisplayName(c);
              const phone = getBestPhone(c) ?? '';
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(c)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    gap: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
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
                        fontSize: 16,
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        ...typography.body,
                        color: colors.textPrimary,
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textSecondary,
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {phone}
                      {c.company ? ` \u00B7 ${c.company}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.border,
                  marginLeft: spacing.lg + 40 + spacing.md,
                }}
              />
            )}
            ListEmptyComponent={
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Text style={{ ...typography.body, color: colors.textSecondary }}>
                  {search.trim() ? 'No matching contacts found.' : 'No contacts with phone numbers.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
