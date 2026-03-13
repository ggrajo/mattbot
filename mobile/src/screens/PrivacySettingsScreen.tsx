import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  TextInput as RNTextInput,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { Divider } from '../components/ui/Divider';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useBiometric } from '../hooks/useBiometric';
import { apiClient, extractApiError } from '../api/client';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacySettings'>;

interface PinStatus {
  pin_enabled: boolean;
  pin_set_at: string | null;
  pin_expired: boolean;
  days_until_expiry: number | null;
  expires_at: string | null;
}

interface UserProfile {
  has_password: boolean;
  mfa_enabled: boolean;
  email: string | null;
}

const PIN_LENGTH = 6;

function PinDots({
  length,
  filled,
  shake,
  colors,
}: {
  length: number;
  filled: number;
  shake: Animated.Value;
  colors: any;
}) {
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        gap: 14,
        justifyContent: 'center',
        transform: [{ translateX: shake }],
      }}
    >
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: i < filled ? colors.primary : colors.border,
            backgroundColor: i < filled ? colors.primary : 'transparent',
          }}
        />
      ))}
    </Animated.View>
  );
}

function PinKeypad({
  onDigit,
  onDelete,
  colors,
  typography,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  colors: any;
  typography: any;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'empty', '0', 'del'];
  return (
    <View style={{ gap: 12 }}>
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
          {keys.slice(row * 3, row * 3 + 3).map((key) => {
            if (key === 'empty') return <View key="empty" style={{ width: 72, height: 72 }} />;
            if (key === 'del') {
              return (
                <TouchableOpacity
                  key="del"
                  onPress={onDelete}
                  activeOpacity={0.6}
                  style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="backspace-outline" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={key}
                onPress={() => { hapticLight(); onDigit(key); }}
                activeOpacity={0.6}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: colors.surfaceVariant,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 28, fontWeight: '600', color: colors.textPrimary }}>
                  {key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function PrivacySettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loading, error, loadSettings, updateSettings } = useSettingsStore();
  const { available: biometricAvailable, biometryType, loading: biometricLoading, authenticate } = useBiometric();
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Password section
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // PIN setup flow
  const [pinMode, setPinMode] = useState<null | 'setup' | 'confirm'>(null);
  const [pinEntry, setPinEntry] = useState('');
  const [pinFirst, setPinFirst] = useState('');
  const [pinError, setPinError] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Step-up (2FA verification) flow
  const [stepUpAction, setStepUpAction] = useState<null | 'pin' | 'password'>(null);
  const [totpCode, setTotpCode] = useState('');
  const [stepUpError, setStepUpError] = useState('');
  const [verifyingStepUp, setVerifyingStepUp] = useState(false);
  const [pendingPin, setPendingPin] = useState('');
  const totpInputRef = useRef<RNTextInput>(null);

  useEffect(() => {
    loadSettings();
    loadProfileAndPin();
  }, []);

  async function loadProfileAndPin() {
    setLoadingProfile(true);
    try {
      const [meRes, pinRes] = await Promise.all([
        apiClient.get<UserProfile>('/me'),
        apiClient.get<PinStatus>('/auth/pin/status'),
      ]);
      setProfile(meRes.data);
      setPinStatus(pinRes.data);
    } catch {
      // non-critical
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleToggle(key: string, value: boolean | string) {
    const ok = await updateSettings({ [key]: value });
    if (ok) {
      setToastType('success');
      setToast('Settings saved');
    } else {
      setToastType('error');
      setToast(useSettingsStore.getState().error ?? 'Failed to save setting.');
    }
  }

  async function handleBiometricToggle(enabled: boolean) {
    if (enabled) {
      const success = await authenticate('Verify your identity');
      if (!success) {
        setToastType('error');
        setToast('Biometric verification failed.');
        return;
      }
    }
    handleToggle('biometric_unlock_enabled', enabled);
  }

  function handlePasswordSave() {
    if (newPassword !== confirmPassword) {
      setToastType('error');
      setToast('Passwords do not match.');
      return;
    }
    if (newPassword.length < 12) {
      setToastType('error');
      setToast('Password must be at least 12 characters.');
      return;
    }
    setStepUpAction('password');
    setTotpCode('');
    setStepUpError('');
  }

  async function executePasswordChange(stepUpToken: string) {
    setSavingPassword(true);
    try {
      const payload: Record<string, string> = { new_password: newPassword };
      if (profile?.has_password && currentPassword) {
        payload.current_password = currentPassword;
      }
      await apiClient.post('/auth/password/change', payload, {
        headers: { 'X-Step-Up-Token': stepUpToken },
      });
      setToastType('success');
      setToast(profile?.has_password ? 'Password changed successfully.' : 'Password created successfully.');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfile((p) => p ? { ...p, has_password: true } : p);
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
    } finally {
      setSavingPassword(false);
    }
  }

  function triggerShake() {
    Vibration.vibrate(80);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function handlePinDigit(digit: string) {
    if (pinEntry.length >= PIN_LENGTH) return;
    const next = pinEntry + digit;
    setPinEntry(next);
    setPinError('');

    if (next.length === PIN_LENGTH) {
      if (pinMode === 'setup') {
        setPinFirst(next);
        setPinEntry('');
        setPinMode('confirm');
      } else if (pinMode === 'confirm') {
        if (next === pinFirst) {
          submitPin(next);
        } else {
          triggerShake();
          setPinError('PINs do not match. Try again.');
          setPinEntry('');
          setPinMode('setup');
          setPinFirst('');
        }
      }
    }
  }

  function handlePinDelete() {
    setPinEntry((prev) => prev.slice(0, -1));
    setPinError('');
  }

  function submitPin(pin: string) {
    setPendingPin(pin);
    setPinMode(null);
    setStepUpAction('pin');
    setTotpCode('');
    setStepUpError('');
  }

  async function executePinSetup(stepUpToken: string) {
    setSavingPin(true);
    try {
      await apiClient.post('/auth/pin/setup', { pin: pendingPin }, {
        headers: { 'X-Step-Up-Token': stepUpToken },
      });
      setToastType('success');
      setToast('PIN set up successfully.');
      setPinEntry('');
      setPinFirst('');
      setPendingPin('');
      await loadProfileAndPin();
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
      setPinEntry('');
      setPinFirst('');
      setPendingPin('');
    } finally {
      setSavingPin(false);
    }
  }

  async function handleDisablePin() {
    try {
      await apiClient.delete('/auth/pin');
      setToastType('success');
      setToast('PIN disabled.');
      await loadProfileAndPin();
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
    }
  }

  async function handleStepUpVerify() {
    if (totpCode.length < 6) return;
    setVerifyingStepUp(true);
    setStepUpError('');
    try {
      const { data } = await apiClient.post('/auth/step-up', { totp_code: totpCode });
      const token = data.step_up_token as string;
      const action = stepUpAction;
      setStepUpAction(null);
      setTotpCode('');
      if (action === 'pin') {
        await executePinSetup(token);
      } else if (action === 'password') {
        await executePasswordChange(token);
      }
    } catch (e) {
      setStepUpError(extractApiError(e));
    } finally {
      setVerifyingStepUp(false);
    }
  }

  function cancelStepUp() {
    setStepUpAction(null);
    setTotpCode('');
    setStepUpError('');
    if (pendingPin) {
      setPinMode('setup');
      setPinEntry('');
      setPinFirst('');
      setPendingPin('');
    }
  }

  // Step-Up (2FA) Verification Full-Screen UI
  if (stepUpAction) {
    return (
      <ScreenWrapper scroll={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl }}>
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accent + '1A',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <Icon name="two-factor-authentication" size={36} color={colors.accent} />
            </View>

            <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }} allowFontScaling>
              Verify Your Identity
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }} allowFontScaling>
              Enter your 6-digit authenticator code to{' '}
              {stepUpAction === 'pin' ? 'set your PIN' : 'change your password'}
            </Text>

            <View style={{ width: '100%', maxWidth: 280, marginBottom: spacing.lg }}>
              <RNTextInput
                ref={totpInputRef}
                value={totpCode}
                onChangeText={(t) => setTotpCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={{
                  fontSize: 32,
                  fontWeight: '700',
                  letterSpacing: 12,
                  textAlign: 'center',
                  color: colors.textPrimary,
                  paddingVertical: spacing.md,
                  borderBottomWidth: 2,
                  borderBottomColor: stepUpError ? colors.error : colors.primary,
                }}
                placeholder="000000"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            {stepUpError ? (
              <Text style={{ ...typography.bodySmall, color: colors.error, textAlign: 'center', marginBottom: spacing.md }} allowFontScaling>
                {stepUpError}
              </Text>
            ) : null}

            <View style={{ width: '100%', maxWidth: 280, gap: spacing.sm }}>
              <Button
                title="Verify & Continue"
                onPress={handleStepUpVerify}
                loading={verifyingStepUp}
                disabled={totpCode.length < 6}
                icon="check"
              />
              <TouchableOpacity
                onPress={cancelStepUp}
                style={{ alignItems: 'center', paddingVertical: spacing.md }}
              >
                <Text style={{ ...typography.body, color: colors.textSecondary, fontWeight: '500' }} allowFontScaling>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenWrapper>
    );
  }

  // PIN Setup Full-Screen UI
  if (pinMode) {
    const isConfirm = pinMode === 'confirm';
    return (
      <ScreenWrapper scroll={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl }}>
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primary + '1A',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <Icon name="lock-outline" size={36} color={colors.primary} />
            </View>

            <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }} allowFontScaling>
              {isConfirm ? 'Confirm Your PIN' : pinStatus?.pin_enabled ? 'Set New PIN' : 'Create a PIN'}
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }} allowFontScaling>
              {isConfirm
                ? 'Enter the same 6-digit PIN to confirm'
                : 'Choose a secure 6-digit PIN for quick sign-in'}
            </Text>

            <View style={{ marginBottom: spacing.xl }}>
              <PinDots length={PIN_LENGTH} filled={pinEntry.length} shake={shakeAnim} colors={colors} />
            </View>

            {pinError ? (
              <Text style={{ ...typography.bodySmall, color: colors.error, textAlign: 'center', marginBottom: spacing.md }} allowFontScaling>
                {pinError}
              </Text>
            ) : null}

            {savingPin ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <PinKeypad onDigit={handlePinDigit} onDelete={handlePinDelete} colors={colors} typography={typography} />
            )}

            <TouchableOpacity
              onPress={() => { setPinMode(null); setPinEntry(''); setPinFirst(''); setPinError(''); }}
              style={{ marginTop: spacing.xl }}
            >
              <Text style={{ ...typography.body, color: colors.textSecondary, fontWeight: '500' }} allowFontScaling>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScreenWrapper>
    );
  }

  if (!settings && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!settings && error) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      {error && <ErrorMessage message={error} action="Retry" onAction={loadSettings} />}

      {/* Password & Account Security */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="shield-lock-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Account Security
            </Text>
          </View>

          {loadingProfile ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              {/* Password */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.sm,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                  <Icon name="key-outline" size="md" color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                      Password
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                      {profile?.has_password ? 'Password is set' : 'No password set (signed in with Google)'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowPasswordForm(!showPasswordForm)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radii.full,
                    backgroundColor: colors.primary + '14',
                  }}
                >
                  <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '600' }} allowFontScaling>
                    {profile?.has_password ? 'Change' : 'Set Up'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showPasswordForm && (
                <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                  {profile?.has_password && (
                    <TextInput
                      label="Current Password"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      leftIcon="lock-outline"
                      placeholder="Enter current password"
                    />
                  )}
                  <TextInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    leftIcon="lock-plus-outline"
                    placeholder="Min 12 characters"
                  />
                  <TextInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    leftIcon="lock-check-outline"
                    placeholder="Re-enter new password"
                  />
                  <Button
                    title={profile?.has_password ? 'Change Password' : 'Set Password'}
                    onPress={handlePasswordSave}
                    loading={savingPassword}
                    disabled={!newPassword || !confirmPassword}
                    icon="check"
                  />
                </View>
              )}

              <Divider />

              {/* MFA Status (always set during onboarding, display-only) */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                  <Icon name="two-factor-authentication" size="md" color={profile?.mfa_enabled ? colors.success : colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                      Two-Factor Authentication
                    </Text>
                    <Text style={{ ...typography.caption, color: profile?.mfa_enabled ? colors.success : colors.warning }} allowFontScaling>
                      {profile?.mfa_enabled ? 'Enabled — set during onboarding' : 'Not enabled'}
                    </Text>
                  </View>
                </View>
                <Icon name={profile?.mfa_enabled ? 'check-circle' : 'alert-circle-outline'} size="md" color={profile?.mfa_enabled ? colors.success : colors.warning} />
              </View>
            </>
          )}
        </View>
      </Card>

      {/* PIN Login */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="dialpad" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              PIN Login
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Use a 6-digit PIN for quick sign-in on this device. 2FA is still required after PIN login for security.
          </Text>

          {loadingProfile ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : pinStatus?.pin_enabled ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radii.md,
                backgroundColor: colors.success + '14',
              }}>
                <Icon name="check-circle" size="md" color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.success, fontWeight: '600' }} allowFontScaling>
                    PIN is active
                  </Text>
                  {pinStatus.days_until_expiry != null && (
                    <Text style={{
                      ...typography.caption,
                      color: pinStatus.pin_expired ? colors.error : pinStatus.days_until_expiry <= 14 ? colors.warning : colors.textSecondary,
                    }} allowFontScaling>
                      {pinStatus.pin_expired
                        ? 'PIN expired — please rotate your PIN'
                        : `Expires in ${pinStatus.days_until_expiry} days`}
                    </Text>
                  )}
                  {pinStatus.expires_at && !pinStatus.pin_expired && (
                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }} allowFontScaling>
                      {new Date(pinStatus.expires_at).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              </View>

              {pinStatus.pin_expired && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  backgroundColor: colors.warning + '14',
                }}>
                  <Icon name="alert-outline" size="sm" color={colors.warning} />
                  <Text style={{ ...typography.caption, color: colors.warning, flex: 1 }} allowFontScaling>
                    Your PIN has expired. Set a new PIN or continue using it for one more cycle.
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Rotate PIN"
                    variant="outline"
                    icon="refresh"
                    onPress={() => setPinMode('setup')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Disable"
                    variant="outline"
                    icon="close"
                    onPress={handleDisablePin}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Button
              title="Set Up PIN"
              icon="dialpad"
              onPress={() => setPinMode('setup')}
            />
          )}
        </View>
      </Card>

      {/* Biometric Unlock */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg, opacity: biometricAvailable ? 1 : 0.5 }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon
              name={biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
              size="md"
              color={biometricAvailable ? colors.primary : colors.textDisabled}
            />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              {biometryType === 'FaceID' ? 'Face ID' : biometryType === 'TouchID' ? 'Touch ID' : 'Biometric Unlock'}
            </Text>
          </View>
          {biometricAvailable ? (
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              Quick unlock with biometrics. 2FA verification is required on first use each session.
            </Text>
          ) : (
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              {biometricLoading
                ? 'Checking biometric availability...'
                : 'Biometric authentication is not available on this device.'}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                ...typography.body,
                color: biometricAvailable ? colors.textPrimary : colors.textDisabled,
              }}
              allowFontScaling
            >
              Enable biometric lock
            </Text>
            <Switch
              value={biometricAvailable ? (settings?.biometric_unlock_enabled ?? false) : false}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>
      </Card>

      {/* Notification Privacy Mode */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="bell-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Notification Privacy
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Choose how much detail appears in your push notifications.
          </Text>

          <Divider />

          {[
            { value: 'private' as const, label: 'Private', desc: 'Hide notification content', icon: 'eye-off-outline' },
            { value: 'preview' as const, label: 'Preview', desc: 'Show caller info in notifications', icon: 'eye-outline' },
            { value: 'full' as const, label: 'Full', desc: 'Show all details in notifications', icon: 'text-box-outline' },
          ].map((opt) => {
            const selected = settings?.notification_privacy_mode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleToggle('notification_privacy_mode', opt.value)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary + '14' : 'transparent',
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Icon name={opt.icon} size="md" color={selected ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      ...typography.body,
                      color: colors.textPrimary,
                      fontWeight: selected ? '600' : '500',
                    }}
                    allowFontScaling
                  >
                    {opt.label}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                    {opt.desc}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Call Recording — always on */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.success + '18', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="microphone" size="md" color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Call Recording
            </Text>
            <Text style={{ ...typography.caption, color: colors.success }} allowFontScaling>
              Always enabled — recordings are encrypted
            </Text>
          </View>
          <Icon name="check-circle" size="md" color={colors.success} />
        </View>
      </Card>
    </ScreenWrapper>
  );
}
