import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

interface TemperamentValues {
  formality: number;
  verbosity: number;
  tone: number;
}

const DEFAULTS: TemperamentValues = { formality: 50, verbosity: 50, tone: 50 };
const STEPS = [0, 25, 50, 75, 100];

interface SliderRowProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  icon: string;
  value: number;
  onSelect: (val: number) => void;
  theme: { dark: boolean };
  colors: any;
  spacing: any;
  typography: any;
  radii: any;
}

function SliderRow({ label, leftLabel, rightLabel, icon, value, onSelect, theme, colors, spacing, typography, radii }: SliderRowProps) {
  return (
    <View style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <Icon name={icon} size="md" color={colors.textSecondary} />
        <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ ...typography.caption, color: colors.textSecondary }}>{leftLabel}</Text>
        <Text style={{ ...typography.caption, color: colors.textSecondary }}>{rightLabel}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {STEPS.map((step) => {
          const selected = value === step;
          const fraction = step / 100;
          return (
            <TouchableOpacity
              key={step}
              onPress={() => onSelect(step)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: radii.sm,
                backgroundColor: selected ? colors.primary : colors.background,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onPrimary }} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function TemperamentScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [agentId, setAgentId] = useState('');
  const [values, setValues] = useState<TemperamentValues>(DEFAULTS);
  const [original, setOriginal] = useState<TemperamentValues>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/agents')
        .then((res) => {
          if (!active) return;
          const agents = res.data.items ?? res.data;
          const agent = Array.isArray(agents) && agents.length > 0 ? agents[0] : null;
          if (agent) {
            setAgentId(agent.id);
            const vals: TemperamentValues = {
              formality: agent.formality ?? DEFAULTS.formality,
              verbosity: agent.verbosity ?? DEFAULTS.verbosity,
              tone: agent.tone ?? DEFAULTS.tone,
            };
            setValues(vals);
            setOriginal(vals);
          }
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  const hasChanges = JSON.stringify(values) !== JSON.stringify(original);

  async function handleSave() {
    if (!agentId) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.patch(`/agents/${agentId}`, values);
      setOriginal(values);
      Alert.alert('Saved', 'Temperament settings updated.');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, gap: spacing.md }}>
        <SliderRow
          label="Formality"
          leftLabel="Casual"
          rightLabel="Formal"
          icon="tie"
          value={values.formality}
          onSelect={(v) => setValues((p) => ({ ...p, formality: v }))}
          theme={theme}
          colors={colors}
          spacing={spacing}
          typography={typography}
          radii={radii}
        />
        <SliderRow
          label="Verbosity"
          leftLabel="Brief"
          rightLabel="Detailed"
          icon="text-long"
          value={values.verbosity}
          onSelect={(v) => setValues((p) => ({ ...p, verbosity: v }))}
          theme={theme}
          colors={colors}
          spacing={spacing}
          typography={typography}
          radii={radii}
        />
        <SliderRow
          label="Tone"
          leftLabel="Friendly"
          rightLabel="Professional"
          icon="emoticon-outline"
          value={values.tone}
          onSelect={(v) => setValues((p) => ({ ...p, tone: v }))}
          theme={theme}
          colors={colors}
          spacing={spacing}
          typography={typography}
          radii={radii}
        />
      </View>

      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving}
          style={{
            backgroundColor: hasChanges ? colors.primary : colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: hasChanges ? colors.onPrimary : colors.textDisabled }}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
