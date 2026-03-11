import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAgentStore } from '../store/agentStore';
import type { Theme } from '../theme/tokens';

const TEMPERAMENTS = [
  {
    key: 'professional',
    label: 'Professional',
    icon: '💼',
    description: 'Formal tone, business-oriented responses. Ideal for corporate use.',
  },
  {
    key: 'friendly',
    label: 'Friendly',
    icon: '😊',
    description: 'Warm and approachable. Great for customer-facing interactions.',
  },
  {
    key: 'casual',
    label: 'Casual',
    icon: '🤙',
    description: 'Relaxed and conversational. Perfect for personal use.',
  },
  {
    key: 'formal',
    label: 'Formal',
    icon: '🎩',
    description: 'Strict etiquette, polished language. Suited for luxury or legal services.',
  },
] as const;

export function TemperamentScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const { currentAgent, fetchAgents, updateAgent, loading } = useAgentStore();

  const [selected, setSelected] = useState<string>('professional');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentAgent) fetchAgents();
  }, [currentAgent, fetchAgents]);

  useEffect(() => {
    if (currentAgent?.personality) {
      setSelected(currentAgent.personality);
    }
  }, [currentAgent]);

  const handleSave = async () => {
    if (!currentAgent) return;
    setSaving(true);
    const result = await updateAgent(currentAgent.id, { personality: selected });
    setSaving(false);
    if (result) {
      Alert.alert('Saved', 'Temperament updated successfully.');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn delay={0}>
          <Text style={s.heading}>Temperament</Text>
          <Text style={s.subtitle}>
            Choose how your AI assistant communicates with callers.
          </Text>
        </FadeIn>

        {TEMPERAMENTS.map((t, i) => (
          <FadeIn key={t.key} delay={60 + i * 40}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelected(t.key)}
            >
              <Card style={selected === t.key ? s.cardSelected : s.card}>
                <View style={s.cardRow}>
                  <Text style={s.cardIcon}>{t.icon}</Text>
                  <View style={s.cardContent}>
                    <Text style={[s.cardTitle, selected === t.key && s.cardTitleSelected]}>
                      {t.label}
                    </Text>
                    <Text style={s.cardDesc}>{t.description}</Text>
                  </View>
                  <View style={[s.radio, selected === t.key && s.radioSelected]}>
                    {selected === t.key && <View style={s.radioDot} />}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </FadeIn>
        ))}

        <FadeIn delay={300}>
          <Button
            title="Save Temperament"
            onPress={handleSave}
            loading={saving}
            style={s.saveButton}
          />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    card: { marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border },
    cardSelected: {
      marginBottom: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primaryContainer,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardIcon: { fontSize: 28 },
    cardContent: { flex: 1 },
    cardTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    cardTitleSelected: { color: colors.primary },
    cardDesc: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { borderColor: colors.primary },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    saveButton: { marginTop: spacing.lg },
  });
}
