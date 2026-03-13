import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { TextInput } from '../components/ui/TextInput';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { SuccessModal } from '../components/ui/SuccessModal';
import { ContactPicker, type SelectedContact } from '../components/ContactPicker';
import { useTheme } from '../theme/ThemeProvider';
import { useContactsStore } from '../store/contactsStore';
import type { ContactCreateParams } from '../api/contacts';

const TEMPERAMENT_OPTIONS = [
  { value: '', label: 'Use Default' },
  { value: 'professional_polite', label: 'Professional & Polite' },
  { value: 'casual_friendly', label: 'Friendly & Casual' },
  { value: 'short_and_direct', label: 'Short & Direct' },
  { value: 'warm_and_supportive', label: 'Warm & Supportive' },
  { value: 'formal', label: 'Formal' },
];

const SWEARING_OPTIONS = [
  { value: '', label: 'Use Default' },
  { value: 'no_swearing', label: 'No Swearing' },
  { value: 'mirror_caller', label: 'Mirror Caller' },
  { value: 'allow', label: 'Allow' },
];

const GREETING_OPTIONS = [
  { value: '', label: 'Use Default' },
  { value: 'standard', label: 'Standard' },
  { value: 'brief', label: 'Brief' },
  { value: 'formal', label: 'Formal' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'AddContact'>;
export function AddContactScreen({ route, navigation }: Props) {
  const autoVip = route.params?.autoVip ?? false;
  const autoBlocked = route.params?.autoBlocked ?? false;

  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { categories, addContact, loadCategories } = useContactsStore();

  const [phoneE164, setPhoneE164] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('other');
  const [isVip, setIsVip] = useState(autoVip);
  const [isBlocked, setIsBlocked] = useState(autoBlocked);
  const [showAi, setShowAi] = useState(false);
  const [aiTemperament, setAiTemperament] = useState('');
  const [aiSwearing, setAiSwearing] = useState('');
  const [aiGreeting, setAiGreeting] = useState('');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [aiMaxCall, setAiMaxCall] = useState('');
  const [aiGreetingInstructions, setAiGreetingInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleContactPick = useCallback((selected: SelectedContact) => {
    if (selected.phoneNumber) setPhoneE164(selected.phoneNumber);
    if (selected.displayName) setDisplayName(selected.displayName);
    if (selected.company) setCompany(selected.company);
    if (selected.email) setEmail(selected.email);
    setContactPickerVisible(false);
  }, []);

  async function handleSave() {
    if (!phoneE164.trim()) {
      setToastType('error');
      setToast('Phone number is required');
      return;
    }
    setSaving(true);
    const params: ContactCreateParams = {
      phone_number: phoneE164.trim(),
      display_name: displayName.trim() || undefined,
      company: company.trim() || undefined,
      relationship: relationship.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      category,
      is_vip: isVip,
      is_blocked: isBlocked,
    };
    if (aiTemperament) params.ai_temperament_preset = aiTemperament;
    if (aiGreeting) params.ai_greeting_template = aiGreeting;
    if (aiSwearing) params.ai_swearing_rule = aiSwearing;
    if (aiMaxCall && Number(aiMaxCall) >= 60) params.ai_max_call_length_seconds = Number(aiMaxCall);
    if (aiGreetingInstructions.trim()) params.ai_greeting_instructions = aiGreetingInstructions.trim();
    if (aiCustomInstructions.trim()) params.ai_custom_instructions = aiCustomInstructions.trim();

    const ok = await addContact(params);
    if (ok) {
      navigation.goBack();
    } else {
      setToastType('error');
      setToast(useContactsStore.getState().error ?? 'Failed to add contact');
    }
    setSaving(false);
  }

  function renderPicker(
    label: string,
    options: { value: string; label: string }[],
    selected: string,
    onSelect: (v: string) => void,
  ) {
    return (
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {options.map((opt) => {
            const active = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: radii.full,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + '14' : 'transparent',
                }}
              >
                <Text style={{ ...typography.caption, color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '600' : '400' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />
      <SuccessModal visible={!!successModal} title={successModal?.title ?? ''} message={successModal?.message} onDismiss={() => setSuccessModal(null)} />
      <ContactPicker visible={contactPickerVisible} onSelect={handleContactPick} onClose={() => setContactPickerVisible(false)} />

      <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}>Add Contact</Text>

      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <PhoneInput value={phoneE164} onChangeE164={setPhoneE164} label="Phone Number" />

          <TouchableOpacity
            onPress={() => setContactPickerVisible(true)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.md,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: colors.primary + '0A',
            }}
          >
            <Icon name="contacts" size="sm" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.primary, fontWeight: '600' }}>Pick from Contacts</Text>
          </TouchableOpacity>

          <TextInput label="Display Name" value={displayName} onChangeText={(v) => setDisplayName(v.replace(/[^a-zA-Z\s\-'\.]/g, ''))} placeholder="John Smith" />
          <TextInput label="Company" value={company} onChangeText={setCompany} placeholder="Acme Corp" />
          <TextInput label="Relationship" value={relationship} onChangeText={setRelationship} placeholder="e.g. Client, Vendor" />
          <TextInput label="Email" value={email} onChangeText={(v) => setEmail(v.toLowerCase())} placeholder="email@example.com" keyboardType="email-address" />
          <TextInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Additional notes..." multiline numberOfLines={2} />

          <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {categories.map((cat) => {
                const active = category === cat.slug;
                return (
                  <TouchableOpacity
                    key={cat.slug}
                    onPress={() => {
                      setCategory(cat.slug);
                      if (!relationship || categories.some(c => c.label === relationship)) {
                        setRelationship(cat.label);
                      }
                    }}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs + 2,
                      borderRadius: radii.full,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + '14' : 'transparent',
                    }}
                  >
                    <Text style={{ ...typography.caption, color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '600' : '400' }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="star" size="sm" color="#F59E0B" />
              <Text style={{ ...typography.body, color: colors.textPrimary }}>VIP</Text>
            </View>
            <Switch value={isVip} onValueChange={(v) => { setIsVip(v); if (v) setIsBlocked(false); }} trackColor={{ true: colors.primary }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="shield-off-outline" size="sm" color={colors.error} />
              <Text style={{ ...typography.body, color: colors.textPrimary }}>Blocked</Text>
            </View>
            <Switch value={isBlocked} onValueChange={(v) => { setIsBlocked(v); if (v) setIsVip(false); }} trackColor={{ true: colors.error }} />
          </View>
        </View>
      </Card>

      {/* AI Overrides (collapsible) */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <TouchableOpacity
          onPress={() => setShowAi(!showAi)}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="robot-outline" size="md" color={colors.accent} />
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>AI Overrides</Text>
          </View>
          <Icon name={showAi ? 'chevron-up' : 'chevron-down'} size="sm" color={colors.textSecondary} />
        </TouchableOpacity>

        {showAi && (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>
              Leave blank to use category or global defaults
            </Text>
            {renderPicker('Temperament', TEMPERAMENT_OPTIONS, aiTemperament, setAiTemperament)}
            {renderPicker('Greeting Style', GREETING_OPTIONS, aiGreeting, setAiGreeting)}
            {renderPicker('Swearing Rule', SWEARING_OPTIONS, aiSwearing, setAiSwearing)}
            <TextInput
              label="Max Call Length (seconds)"
              value={aiMaxCall}
              onChangeText={(v) => setAiMaxCall(v.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 180 (leave empty for default)"
              keyboardType="numeric"
            />
            <TextInput
              label="Custom Greeting Instructions"
              value={aiGreetingInstructions}
              onChangeText={setAiGreetingInstructions}
              placeholder="How the AI should greet this caller..."
              multiline
              numberOfLines={3}
            />
            <TextInput
              label="Custom AI Instructions"
              value={aiCustomInstructions}
              onChangeText={setAiCustomInstructions}
              placeholder="Extra context about this contact..."
              multiline
              numberOfLines={3}
            />
          </View>
        )}
      </Card>

      <Button
        title={saving ? 'Adding...' : 'Add Contact'}
        onPress={handleSave}
        disabled={saving || !phoneE164.trim()}
        style={{ marginBottom: spacing.xxl }}
      />
    </ScreenWrapper>
  );
}
