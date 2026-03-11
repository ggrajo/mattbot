import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import { useAuthStore } from '../store/authStore';
import { logout } from '../api/auth';

function gateMessage(status: string | null): { headline: string; body: string } {
  switch (status) {
    case 'canceled':
      return {
        headline: 'Subscription Canceled',
        body: 'Your subscription has been canceled. Resubscribe to regain access to call screening and all MattBot features.',
      };
    case 'past_due':
      return {
        headline: 'Payment Issue',
        body: 'Your last payment failed. Please update your payment method to restore access to MattBot.',
      };
    case 'incomplete':
      return {
        headline: 'Setup Incomplete',
        body: 'Your subscription setup was not completed. Please finish setting up your plan to start using MattBot.',
      };
    default:
      return {
        headline: 'No Active Subscription',
        body: 'Subscribe to a plan to unlock call screening, AI summaries, and all MattBot features.',
      };
  }
}

export function SubscriptionGateScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation<any>();
  const billingStatus = useBillingStore(s => s.billingStatus);
  const { signOut } = useAuthStore();

  const { headline, body } = gateMessage(billingStatus?.status ?? null);

  async function handleSignOut() {
    try { await logout(); } catch { /* best-effort */ }
    await signOut();
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          gap: spacing.xl,
        }}
      >
        <FadeIn delay={0} slide="up">
          <View style={{ alignItems: 'center', gap: spacing.lg }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: radii.xl,
                backgroundColor: colors.warning + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="credit-card-off-outline" size={40} color={colors.warning} />
            </View>

            <Text
              style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
              allowFontScaling
            >
              {headline}
            </Text>
            <Text
              style={{
                ...typography.body,
                color: colors.textSecondary,
                textAlign: 'center',
                maxWidth: 320,
              }}
              allowFontScaling
            >
              {body}
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={150}>
          <Card variant="flat" style={{ width: '100%', gap: spacing.sm }}>
            <Button
              title="Manage Subscription"
              icon="credit-card-outline"
              onPress={() => navigation.navigate('PlanSelection', { source: 'manage' })}
              variant="primary"
            />
            <Button
              title="Account Settings"
              icon="account-circle-outline"
              onPress={() => navigation.navigate('AccountSettings')}
              variant="outline"
            />
            <Button
              title="Sign Out"
              icon="logout"
              onPress={handleSignOut}
              variant="ghost"
            />
          </Card>
        </FadeIn>
      </View>
    </ScreenWrapper>
  );
}
