import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import { useSettingsStore } from '../store/settingsStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanSelection'>;

const PLAN_ICONS: Record<string, string> = {
  free: 'gift-outline',
  pro: 'star-outline',
  enterprise: 'shield-crown-outline',
};

export function PlanSelectionScreen({ route, navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const source = route.params?.source;
  const { plans, loading, error, loadPlans } = useBillingStore();
  const { completeStep } = useSettingsStore();

  useEffect(() => {
    loadPlans();
  }, []);

  async function handleSelect(planCode: string, requiresCard: boolean) {
    if (!requiresCard) {
      const ok = await useBillingStore.getState().subscribe(planCode);
      if (ok && source === 'onboarding') {
        await completeStep('plan_selected');
        navigation.navigate('NumberProvision');
      } else if (ok) {
        navigation.navigate('SubscriptionStatus');
      }
      return;
    }

    navigation.navigate('PaymentMethod', { plan: planCode, source });
  }

  const sortedPlans = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <ScreenWrapper>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
            Choose a Plan
          </Text>
          <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
            Select the plan that best fits your needs.
          </Text>
        </View>

        {error && <ErrorMessage message={error} action="Retry" onAction={loadPlans} />}

        {sortedPlans.map((plan) => {
          const iconName = PLAN_ICONS[plan.code] ?? 'card-outline';
          const features = plan.description.split('\n').filter(Boolean);

          return (
            <Card key={plan.code} variant="elevated" style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radii.md,
                    backgroundColor: colors.primary + '14',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={iconName} size="lg" color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ ...typography.h3, color: colors.textPrimary }}
                    allowFontScaling
                  >
                    {plan.name}
                  </Text>
                  <Text
                    style={{ ...typography.bodySmall, color: colors.textSecondary }}
                    allowFontScaling
                  >
                    {plan.price_usd === '0' || plan.price_usd === '0.00'
                      ? 'Free'
                      : `$${plan.price_usd}/mo`}
                    {' · '}{plan.included_minutes} min/mo
                  </Text>
                </View>
              </View>

              {features.length > 0 && (
                <View style={{ gap: spacing.xs }}>
                  {features.map((feat, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Icon name="check" size="sm" color={colors.success} />
                      <Text
                        style={{ ...typography.bodySmall, color: colors.textSecondary, flex: 1 }}
                        allowFontScaling
                      >
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Button
                title={plan.requires_credit_card ? 'Select' : 'Get Started'}
                onPress={() => handleSelect(plan.code, plan.requires_credit_card)}
                variant={plan.requires_credit_card ? 'primary' : 'outline'}
                loading={loading}
              />
            </Card>
          );
        })}

        {source === 'manage' && (
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
