import React, { useState, useEffect } from 'react';
import { View, Text, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingPrivacy'>;

export function OnboardingPrivacyScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const { settings, loading, error, loadSettings, updateSettings, completeStep } = useSettingsStore();

  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [transcriptDisclosure, setTranscriptDisclosure] = useState(false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!settings) {
      loadSettings();
    }
  }, []);

  useEffect(() => {
    if (settings) {
      setRecordingEnabled(settings.recording_enabled);
      setTranscriptDisclosure(settings.transcript_disclosure_mode === 'always');
      setAnalyticsOptIn(false);
    }
  }, [settings]);

  async function handleContinue() {
    const ok = await updateSettings({
      recording_enabled: recordingEnabled,
      transcript_disclosure_mode: transcriptDisclosure ? 'always' : 'never',
    });

    if (!ok) return;

    const stepOk = await completeStep('privacy_review');
    if (stepOk) {
      navigation.navigate('OnboardingSettings');
    } else {
      setToastMessage('Failed to save progress');
      setToastVisible(true);
    }
  }

  const toggleCards: Array<{
    key: string;
    icon: string;
    title: string;
    description: string;
    value: boolean;
    onToggle: (v: boolean) => void;
  }> = [
    {
      key: 'recording',
      icon: 'microphone-outline',
      title: 'Call Recording',
      description: 'Allow MattBot to record calls for transcription and quality improvement.',
      value: recordingEnabled,
      onToggle: setRecordingEnabled,
    },
    {
      key: 'transcript',
      icon: 'text-box-outline',
      title: 'Transcript Disclosure',
      description: 'Inform callers that calls may be transcribed by an AI assistant.',
      value: transcriptDisclosure,
      onToggle: setTranscriptDisclosure,
    },
    {
      key: 'analytics',
      icon: 'chart-bar',
      title: 'Analytics',
      description: 'Share anonymous usage data to help us improve MattBot.',
      value: analyticsOptIn,
      onToggle: setAnalyticsOptIn,
    },
  ];

  return (
    <ScreenWrapper>
      <Toast
        message={toastMessage}
        type="error"
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
            Privacy & Permissions
          </Text>
          <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
            Review how MattBot handles your data. You can change these anytime in Settings.
          </Text>
        </View>

        {error && <ErrorMessage message={error} />}

        {toggleCards.map((item) => (
          <Card key={item.key} variant="elevated" style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.md,
                  backgroundColor: colors.primary + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={item.icon} size="lg" color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  allowFontScaling
                >
                  {item.title}
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}
                  allowFontScaling
                >
                  {item.description}
                </Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onToggle}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={item.value ? colors.primary : colors.surface}
              />
            </View>
          </Card>
        ))}

        <Button
          title="Continue"
          onPress={handleContinue}
          loading={loading}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </ScreenWrapper>
  );
}
