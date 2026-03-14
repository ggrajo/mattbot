import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BotLoader } from '../components/ui/BotLoader';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import {
  getForwardingGuide,
  type ForwardingGuide,
  type CarrierGuide,
} from '../api/telephony';
import { extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { useSettingsStore } from '../store/settingsStore';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForwardingSetupGuide'>;

export function ForwardingSetupGuideScreen({ route, navigation }: Props) {
  const isOnboarding = route.params?.onboarding ?? false;
  const { colors, spacing, typography, radii } = useTheme();
  const { completeStep } = useSettingsStore();
  const [skipping, setSkipping] = useState(false);

  const [loading, setLoading] = useState(true);
  const [guide, setGuide] = useState<ForwardingGuide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);

  async function loadGuide() {
    setLoading(true);
    setError(null);
    try {
      const data = await getForwardingGuide();
      setGuide(data);
    } catch (e: unknown) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuide();
  }, []);

  function toggleCarrier(carrier: string) {
    hapticLight();
    setExpandedCarrier((prev) => (prev === carrier ? null : carrier));
  }

  if (loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BotLoader color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {isOnboarding && (
        <OnboardingProgress currentStep={7} totalSteps={7} label="Call Setup" />
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
          <Icon name="phone-forward-outline" size={36} color={colors.primary} />
        </View>
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Call Forwarding Setup
        </Text>
        <Text
          style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}
          allowFontScaling
        >
          Forward missed calls from your personal number to your AI assistant.
        </Text>
      </View>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadGuide} />
        </View>
      )}

      {guide && (
        <FadeIn>
          {/* Generic instructions */}
          {guide.generic_instructions.length > 0 && (
            <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon name="format-list-numbered" size="md" color={colors.primary} />
                  <Text
                    style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }}
                    allowFontScaling
                  >
                    General Steps
                  </Text>
                </View>

                {guide.generic_instructions.map((step, index) => (
                  <View
                    key={index}
                    style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colors.primary + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      <Text
                        style={{ ...typography.caption, color: colors.primary, fontWeight: '700' }}
                        allowFontScaling
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}
                      allowFontScaling
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Carrier-specific guides */}
          {guide.carrier_guides.length > 0 && (
            <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  marginBottom: spacing.xs,
                  marginLeft: spacing.xs,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary + '40',
                  paddingLeft: spacing.sm,
                }}
              >
                <Icon name="cellphone-wireless" size="sm" color={colors.primary} />
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.primary,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                  allowFontScaling
                >
                  Carrier-Specific Guides
                </Text>
              </View>

              {guide.carrier_guides.map((carrier: CarrierGuide) => {
                const isExpanded = expandedCarrier === carrier.carrier;
                return (
                  <Card key={carrier.carrier} variant="flat">
                    <TouchableOpacity
                      onPress={() => toggleCarrier(carrier.carrier)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={`${carrier.carrier} forwarding guide`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <Icon name="sim-outline" size="md" color={colors.textPrimary} />
                        <Text
                          style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                          allowFontScaling
                        >
                          {carrier.carrier}
                        </Text>
                      </View>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size="md"
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                        <View style={{ gap: spacing.xs }}>
                          <Text
                            style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }}
                            allowFontScaling
                          >
                            Enable (Busy/No-Answer)
                          </Text>
                          <View
                            style={{
                              backgroundColor: colors.surfaceVariant,
                              borderRadius: radii.md,
                              padding: spacing.md,
                            }}
                          >
                            <Text
                              style={{ ...typography.body, color: colors.textPrimary, fontFamily: 'monospace' }}
                              selectable
                              allowFontScaling
                            >
                              {carrier.enable_busy}
                            </Text>
                          </View>
                        </View>

                        <View style={{ gap: spacing.xs }}>
                          <Text
                            style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }}
                            allowFontScaling
                          >
                            Enable (Unreachable)
                          </Text>
                          <View
                            style={{
                              backgroundColor: colors.surfaceVariant,
                              borderRadius: radii.md,
                              padding: spacing.md,
                            }}
                          >
                            <Text
                              style={{ ...typography.body, color: colors.textPrimary, fontFamily: 'monospace' }}
                              selectable
                              allowFontScaling
                            >
                              {carrier.enable_unreachable}
                            </Text>
                          </View>
                        </View>

                        <View style={{ gap: spacing.xs }}>
                          <Text
                            style={{ ...typography.bodySmall, color: colors.warning, fontWeight: '600' }}
                            allowFontScaling
                          >
                            Disable Forwarding
                          </Text>
                          <View
                            style={{
                              backgroundColor: colors.surfaceVariant,
                              borderRadius: radii.md,
                              padding: spacing.md,
                            }}
                          >
                            <Text
                              style={{ ...typography.body, color: colors.textPrimary, fontFamily: 'monospace' }}
                              selectable
                              allowFontScaling
                            >
                              {carrier.disable}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          )}
        </FadeIn>
      )}

      <View style={{ gap: spacing.sm }}>
        <Button
          title="Next: Verify Forwarding"
          icon="arrow-right"
          onPress={() => {
            hapticLight();
            navigation.navigate('ForwardingVerify', { onboarding: isOnboarding || undefined });
          }}
          accessibilityLabel="Proceed to forwarding verification"
        />
        {isOnboarding && (
          <Button
            title="Skip for Now"
            variant="ghost"
            loading={skipping}
            onPress={async () => {
              setSkipping(true);
              hapticMedium();
              await completeStep('forwarding_configured');
              navigation.navigate('CallModes', { onboarding: true });
            }}
            accessibilityLabel="Skip forwarding and continue"
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
