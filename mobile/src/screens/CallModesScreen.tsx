import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BotLoader } from '../components/ui/BotLoader';
import { Toast } from '../components/ui/Toast';
import { SuccessModal } from '../components/ui/SuccessModal';
import { useTheme } from '../theme/ThemeProvider';
import { useTelephonyStore } from '../store/telephonyStore';
import { useSettingsStore } from '../store/settingsStore';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CallModes'>;

const ACCESS_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'contacts', label: 'Contacts Only' },
  { value: 'vip', label: 'VIP Only' },
] as const;

export function CallModesScreen({ navigation, route }: Props) {
  const isOnboarding = route.params?.onboarding ?? false;
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { callModes, loading, error, loadCallModes, updateCallModes } =
    useTelephonyStore();
  const { completeStep } = useSettingsStore();

  const [modeA, setModeA] = useState(true);
  const [modeB, setModeB] = useState(false);
  const [accessControl, setAccessControl] = useState('everyone');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    loadCallModes();
  }, []);

  useEffect(() => {
    if (callModes) {
      setModeA(callModes.mode_a_enabled);
      setModeB(callModes.mode_b_enabled);
      setAccessControl(callModes.access_control);
    }
  }, [callModes]);

  async function handleToggleModeA(value: boolean) {
    setModeA(value);
    const ok = await updateCallModes({ mode_a_enabled: value });
    if (!ok) setModeA(!value);
  }

  async function handleToggleModeB(value: boolean) {
    setModeB(value);
    const ok = await updateCallModes({ mode_b_enabled: value });
    if (!ok) setModeB(!value);
  }

  async function handleAccessChange(value: string) {
    const prev = accessControl;
    setAccessControl(value);
    const ok = await updateCallModes({ access_control: value });
    if (!ok) setAccessControl(prev);
  }

  async function handleContinue() {
    setSaving(true);
    if (isOnboarding) {
      const fwdOk = await completeStep('forwarding_configured');
      if (!fwdOk) { setSaving(false); return; }
      const ok = await completeStep('call_modes_configured');
      if (!ok) { setSaving(false); return; }
      const doneOk = await completeStep('onboarding_complete');
      if (!doneOk) { setSaving(false); return; }
      requestAnimationFrame(() => {
        navigation.navigate('OnboardingComplete');
      });
      return;
    } else {
      navigation.goBack();
      return;
    }
  }

  const verificationStatus = callModes?.verification_status;
  const showForwardingWarning =
    modeB && verificationStatus && verificationStatus !== 'verified';

  if (!callModes && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <BotLoader color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast
        message={toast}
        type="success"
        visible={!!toast}
        onDismiss={() => setToast('')}
      />
      <SuccessModal
        visible={!!successModal}
        title={successModal?.title ?? ''}
        message={successModal?.message}
        onDismiss={() => setSuccessModal(null)}
      />

      {isOnboarding && (
        <OnboardingProgress currentStep={6} totalSteps={6} label="Call Setup" />
      )}

      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radii.xl,
            backgroundColor: colors.primary + '14',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <Icon
            name="phone-settings-outline"
            size={36}
            color={colors.primary}
            accessibilityLabel="Call modes icon"
          />
        </View>
        <Text
          style={{
            ...typography.h2,
            color: colors.textPrimary,
            textAlign: 'center',
          }}
          allowFontScaling
        >
          Call Modes
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.sm,
          }}
          allowFontScaling
        >
          Choose how people can reach your AI assistant.
        </Text>
      </View>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage
            message={error}
            action="Retry"
            onAction={loadCallModes}
          />
        </View>
      )}

      {/* Mode A */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Icon name="phone-in-talk" size="md" color={colors.primary} />
            <Text
              style={{
                ...typography.h3,
                color: colors.textPrimary,
                flex: 1,
              }}
              allowFontScaling
            >
              Dedicated AI Number
            </Text>
          </View>
          <Text
            style={{ ...typography.bodySmall, color: colors.textSecondary }}
            allowFontScaling
          >
            People call your AI number directly. MattBot answers and handles
            the call.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{ ...typography.body, color: colors.textPrimary }}
              allowFontScaling
            >
              Enable Mode A
            </Text>
            <Switch
              value={modeA}
              onValueChange={handleToggleModeA}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable dedicated AI number mode"
              accessibilityRole="switch"
              accessibilityState={{ checked: modeA }}
            />
          </View>

          {modeA && (
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textSecondary,
                  fontWeight: '500',
                }}
                allowFontScaling
              >
                Who can call your AI number?
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {ACCESS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleAccessChange(opt.value)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.md,
                      borderRadius: radii.md,
                      borderWidth: 1.5,
                      borderColor:
                        accessControl === opt.value
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        accessControl === opt.value
                          ? colors.primary + '14'
                          : 'transparent',
                      alignItems: 'center',
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: accessControl === opt.value }}
                    accessibilityLabel={`${opt.label} access control`}
                  >
                    <Text
                      style={{
                        ...typography.caption,
                        color:
                          accessControl === opt.value
                            ? colors.primary
                            : colors.textSecondary,
                        fontWeight:
                          accessControl === opt.value ? '600' : '400',
                      }}
                      allowFontScaling
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Mode B */}
      <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Icon
              name="phone-forward-outline"
              size="md"
              color={colors.secondary}
            />
            <Text
              style={{
                ...typography.h3,
                color: colors.textPrimary,
                flex: 1,
              }}
              allowFontScaling
            >
              Forwarding Fallback
            </Text>
          </View>
          <Text
            style={{ ...typography.bodySmall, color: colors.textSecondary }}
            allowFontScaling
          >
            When you miss a call on your personal number, it forwards to
            MattBot automatically.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{ ...typography.body, color: colors.textPrimary }}
              allowFontScaling
            >
              Enable Mode B
            </Text>
            <Switch
              value={modeB}
              onValueChange={handleToggleModeB}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable forwarding fallback mode"
              accessibilityRole="switch"
              accessibilityState={{ checked: modeB }}
            />
          </View>

          {modeB && (
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForwardingSetupGuide', { onboarding: isOnboarding || undefined })}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
                accessibilityRole="link"
                accessibilityLabel="Set up call forwarding"
              >
                <Icon
                  name="open-in-new"
                  size="sm"
                  color={colors.primary}
                />
                <Text
                  style={{
                    ...typography.body,
                    color: colors.primary,
                    fontWeight: '600',
                  }}
                  allowFontScaling
                >
                  Set up forwarding
                </Text>
              </TouchableOpacity>

              {showForwardingWarning && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    backgroundColor: colors.warningContainer,
                    borderRadius: radii.md,
                    padding: spacing.md,
                  }}
                  accessibilityRole="alert"
                >
                  <Icon
                    name="alert-outline"
                    size="md"
                    color={colors.warning}
                  />
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: colors.warning,
                      flex: 1,
                      fontWeight: '500',
                    }}
                    allowFontScaling
                  >
                    Forwarding not verified yet
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Card>

      <Button
        title={isOnboarding ? 'Continue' : 'Done'}
        icon={isOnboarding ? 'arrow-right' : 'check'}
        onPress={handleContinue}
        loading={saving}
        disabled={saving}
        accessibilityLabel={
          isOnboarding ? 'Continue onboarding' : 'Save and go back'
        }
      />
    </ScreenWrapper>
  );
}
