import { apiClient } from './client';
import { Platform } from 'react-native';

interface DeviceInfo {
  platform: string;
  device_name?: string;
  app_version?: string;
  os_version?: string;
}

function getDeviceInfo(): DeviceInfo {
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    device_name: `${Platform.OS} Device`,
    os_version: `${Platform.Version}`,
  };
}

export async function register(email: string, password: string) {
  const { data } = await apiClient.post('/auth/register', {
    email,
    password,
    device: getDeviceInfo(),
  });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post('/auth/login', {
    email,
    password,
    device: getDeviceInfo(),
  });
  return data;
}

export async function oauthGoogle(idToken: string) {
  const { data } = await apiClient.post('/auth/oauth/google', {
    id_token: idToken,
    device: getDeviceInfo(),
  });
  return data;
}

export async function oauthApple(identityToken: string, authorizationCode?: string) {
  const { data } = await apiClient.post('/auth/oauth/apple', {
    identity_token: identityToken,
    authorization_code: authorizationCode,
    device: getDeviceInfo(),
  });
  return data;
}

export async function verifyEmail(token: string) {
  const { data } = await apiClient.post('/auth/email/verify', { token });
  return data;
}

export async function mfaTotpStart(partialToken: string) {
  const { data } = await apiClient.post(
    '/auth/mfa/totp/start',
    {},
    { headers: { Authorization: `Bearer ${partialToken}` } }
  );
  return data;
}

export async function mfaTotpConfirm(setupToken: string, totpCode: string) {
  const { data } = await apiClient.post('/auth/mfa/totp/confirm', {
    mfa_setup_token: setupToken,
    totp_code: totpCode,
  });
  return data;
}

export async function mfaVerify(challengeToken: string, totpCode?: string, recoveryCode?: string) {
  const { data } = await apiClient.post('/auth/mfa/verify', {
    mfa_challenge_token: challengeToken,
    totp_code: totpCode,
    recovery_code: recoveryCode,
  });
  return data;
}

export async function refreshToken(currentRefreshToken: string) {
  const { data } = await apiClient.post('/auth/token/refresh', {
    refresh_token: currentRefreshToken,
  });
  return data;
}

export async function logout() {
  const { data } = await apiClient.post('/auth/logout');
  return data;
}

export async function logoutAll() {
  const { data } = await apiClient.post('/auth/logout-all');
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data } = await apiClient.post('/auth/password/reset/request', { email });
  return data;
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const { data } = await apiClient.post('/auth/password/reset/confirm', {
    token,
    new_password: newPassword,
  });
  return data;
}

export async function requestEmailOtp(email: string) {
  const { data } = await apiClient.post('/auth/mfa/email-otp/request', { email });
  return data;
}

export async function verifyEmailOtp(email: string, otpCode: string, password?: string) {
  const { data } = await apiClient.post('/auth/mfa/email-otp/verify', {
    email,
    otp_code: otpCode,
    password,
  });
  return data;
}

export async function changePassword(currentPassword?: string, newPassword?: string) {
  const { data } = await apiClient.post('/auth/password/change', {
    current_password: currentPassword || undefined,
    new_password: newPassword,
  });
  return data;
}

export async function setupPin(pin: string, stepUpToken: string) {
  const { data } = await apiClient.post(
    '/auth/pin/setup',
    { pin },
    { headers: { 'X-Step-Up-Token': stepUpToken } },
  );
  return data;
}

export async function pinLogin(deviceId: string, pin: string) {
  const { data } = await apiClient.post('/auth/pin/login', {
    device_id: deviceId,
    pin,
  });
  return data;
}

export async function disablePin() {
  const { data } = await apiClient.delete('/auth/pin');
  return data;
}

export async function getPinStatus(): Promise<{ pin_enabled: boolean }> {
  const { data } = await apiClient.get('/auth/pin/status');
  return data;
}

export async function stepUp(password?: string, totpCode?: string) {
  const { data } = await apiClient.post('/auth/step-up', { password, totp_code: totpCode });
  return data;
}

export async function deleteAccount(stepUpToken: string) {
  const { data } = await apiClient.post(
    '/me/delete-account',
    {},
    { headers: { 'X-Step-Up-Token': stepUpToken } },
  );
  return data;
}

export interface UserProfile {
  id: string;
  email: string | null;
  email_verified: boolean;
  status: string;
  display_name: string | null;
  nickname: string | null;
  company_name: string | null;
  role_title: string | null;
  ai_greeting_instructions: string | null;
  default_timezone: string;
  language_code: string;
  mfa_enabled: boolean;
  has_password: boolean;
  created_at: string;
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get('/me');
  return data;
}

export async function updateProfile(changes: Partial<Omit<UserProfile, 'id' | 'email' | 'email_verified' | 'status' | 'mfa_enabled' | 'created_at'>>): Promise<UserProfile> {
  const { data } = await apiClient.patch('/me', changes);
  return data;
}
