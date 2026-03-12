import React, { useState, useEffect, useCallback } from 'react';
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
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './ui/Icon';

interface DeviceContact {
  recordID: string;
  displayName: string;
  company: string;
  phoneNumbers: { label: string; number: string }[];
  emailAddresses: { label: string; email: string }[];
}

export interface SelectedContact {
  phoneNumber: string;
  displayName?: string;
  company?: string;
  email?: string;
}

interface Props {
  visible?: boolean;
  onSelect: (selected: SelectedContact) => void;
  onClose?: () => void;
  buttonLabel?: string;
}

async function requestPermission(): Promise<boolean> {
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

export function ContactPicker({ visible: controlledVisible, onSelect, onClose, buttonLabel }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selfVisible, setSelfVisible] = useState(false);

  const isControlled = controlledVisible !== undefined;
  const modalVisible = isControlled ? controlledVisible : selfVisible;
  const handleClose = () => {
    if (isControlled && onClose) onClose();
    else setSelfVisible(false);
  };

  const loadContacts = useCallback(async () => {
    const ok = await requestPermission();
    if (!ok) {
      Alert.alert('Permission Denied', 'Cannot access contacts without permission.');
      handleClose();
      return;
    }

    setLoading(true);
    try {
      let Contacts: any;
      try {
        Contacts = require('react-native-contacts').default;
      } catch {
        Alert.alert('Error', 'react-native-contacts is not installed.');
        handleClose();
        setLoading(false);
        return;
      }

      let all: DeviceContact[];
      try {
        all = await Contacts.getAllWithoutPhotos();
      } catch {
        all = await Contacts.getAll();
      }

      const withPhone = all
        .filter((c: DeviceContact) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .sort((a: DeviceContact, b: DeviceContact) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
        );
      setContacts(withPhone);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load contacts: ' + (err?.message || 'Unknown'));
      handleClose();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modalVisible && contacts.length === 0) {
      loadContacts();
    }
  }, [modalVisible, contacts.length, loadContacts]);

  const handleSelect = (phone: string, name: string, company?: string, email?: string) => {
    const cleaned = phone.replace(/[\s()\-\.]/g, '');
    const normalized = cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;
    onSelect({ phoneNumber: normalized, displayName: name, company, email });
    handleClose();
  };

  return (
    <>
      {!isControlled && (
        <Pressable
          onPress={() => { setSelfVisible(true); loadContacts(); }}
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
          <Icon name="account-box-outline" size="sm" color={colors.primary} />
          <Text style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }}>
            {buttonLabel ?? 'From Contacts'}
          </Text>
        </Pressable>
      )}
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={handleClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            maxHeight: '70%',
            paddingBottom: spacing.xl,
          }}
          onPress={() => {}}
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
                      onPress={() => handleSelect(pn.number, item.displayName, item.company, item.emailAddresses?.[0]?.email)}
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
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}
