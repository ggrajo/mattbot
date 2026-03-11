import { useState, useCallback } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { oauthGoogle, oauthApple } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { extractApiError } from '../api/client';

let _googleConfigured = false;
function ensureGoogleConfigured() {
  if (_googleConfigured) return;
  try {
    const Config = require('react-native-config').default;
    const wid = Config?.GOOGLE_WEB_CLIENT_ID || '';
    console.log('[GoogleSignIn] webClientId:', wid ? wid.substring(0, 20) + '...' : '(empty)');
    GoogleSignin.configure({
      webClientId: wid,
      offlineAccess: false,
    });
  } catch (e) {
    console.log('[GoogleSignIn] Config fallback, no webClientId:', e);
    GoogleSignin.configure({ offlineAccess: false });
  }
  _googleConfigured = true;
}

type AuthResult = 'authenticated' | 'mfa_required' | 'mfa_enrollment' | undefined;

export function useSocialAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { setAuthenticated, setMfaRequired, setMfaEnrollment } = useAuthStore();

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setLoading(true);
    setError(undefined);
    try {
      ensureGoogleConfigured();
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken ?? (userInfo as any).idToken;
      if (!idToken) {
        setError('Google sign-in failed: no ID token received');
        return undefined;
      }

      const data = await oauthGoogle(idToken);

      if (data.requires_mfa) {
        setMfaRequired(data.mfa_challenge_token);
        return 'mfa_required';
      } else if (data.requires_mfa_enrollment) {
        setMfaEnrollment(data.partial_token);
        return 'mfa_enrollment';
      } else if (data.access_token) {
        await setAuthenticated(data.access_token, data.refresh_token);
        return 'authenticated';
      }
    } catch (e: any) {
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '12501') {
        return undefined;
      }
      const msg = e?.message || e?.code || String(e);
      console.error('[GoogleSignIn] Error:', JSON.stringify({ code: e?.code, message: e?.message, name: e?.name }, null, 2));
      setError(`Google Sign-In failed: ${msg}`);
    } finally {
      setLoading(false);
    }
    return undefined;
  }, [setAuthenticated, setMfaRequired, setMfaEnrollment]);

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    setLoading(true);
    setError(undefined);
    try {
      const { appleAuth } = require('@invertase/react-native-apple-authentication');
      const credential = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!credential.identityToken) {
        setError('Apple sign-in failed: no identity token');
        return undefined;
      }

      const data = await oauthApple(credential.identityToken, credential.authorizationCode);

      if (data.requires_mfa) {
        setMfaRequired(data.mfa_challenge_token);
        return 'mfa_required';
      } else if (data.requires_mfa_enrollment) {
        setMfaEnrollment(data.partial_token);
        return 'mfa_enrollment';
      } else if (data.access_token) {
        await setAuthenticated(data.access_token, data.refresh_token);
        return 'authenticated';
      }
    } catch (e: any) {
      if (e?.code === '1001') return undefined;
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
    return undefined;
  }, [setAuthenticated, setMfaRequired, setMfaEnrollment]);

  return { signInWithGoogle, signInWithApple, loading, error };
}
