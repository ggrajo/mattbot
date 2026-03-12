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
  const { data } = await apiClient.post('/auth/login', { email, password });
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

export async function stepUp(password?: string, totpCode?: string) {
  const { data } = await apiClient.post('/auth/step-up', { password, totp_code: totpCode });
  return data;
}
