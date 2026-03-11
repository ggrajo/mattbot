import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForwardingSetupGuide'>;

interface CarrierGuide {
  carrier: string;
  enable_busy: string;
  enable_unreachable: string;
  disable: string;
}

interface SetupGuideData {
  generic_instructions: string[];
  carrier_guides: CarrierGuide[];
}

export function ForwardingSetupGuideScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isOnboarding = route.params?.onboarding;

  const [guide, setGuide] = useState<SetupGuideData | null>(null);
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGuide = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/forwarding/setup-guide');
      setGuide(data);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGuide();
    }, [loadGuide]),
  );

  function handleDone() {
    navigation.navigate('ForwardingVerify', { onboarding: isOnboarding });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing.xxl,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View
          style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Icon name="phone-forward-outline" size="xl" color={colors.primary} />
        </View>
        <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}>
          Set Up Call Forwarding
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>
          Route calls from your personal phone to your MattBot AI number
        </Text>
      </View>

      {/* Who can set this up */}
      <View
        style={{
          backgroundColor: colors.primaryContainer,
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Icon name="information-outline" size="md" color={colors.primary} />
          <Text style={{ ...typography.body, color: colors.primary, fontWeight: '700' }}>
            Before You Start
          </Text>
        </View>
        <Text style={{ ...typography.bodySmall, color: colors.textPrimary, lineHeight: 22 }}>
          Call forwarding is set up from your personal phone's dialer — not inside MattBot. You'll dial a special code that tells your carrier to redirect calls to your AI number.
        </Text>
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {[
            'You must be the account holder or authorized user on the phone plan',
            'Your carrier must support conditional call forwarding',
            'You need your MattBot AI number (provisioned in the previous step)',
            'Some carriers may charge a small fee for forwarding',
          ].map((note, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <Icon name="check-circle" size="sm" color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={{ ...typography.bodySmall, color: colors.textPrimary, flex: 1, lineHeight: 20 }}>
                {note}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
      )}

      {error && !loading && (
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Icon name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, textAlign: 'center', marginTop: spacing.sm }}>
            {error}
          </Text>
          <TouchableOpacity onPress={loadGuide} style={{ marginTop: spacing.md }}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {guide && !loading && (
        <>
          {/* General steps */}
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.xl,
              padding: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
              <Icon name="format-list-numbered" size="md" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '700' }}>
                General Instructions
              </Text>
            </View>

            {(guide.generic_instructions ?? []).map((step, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  marginBottom: index < guide.generic_instructions.length - 1 ? spacing.lg : 0,
                }}
              >
                <View
                  style={{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: colors.primary,
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 14 }}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, paddingTop: 4 }}>
                  <Text style={{ ...typography.body, color: colors.textPrimary, lineHeight: 22 }}>
                    {step}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Carrier-specific guides */}
          {(guide.carrier_guides ?? []).length > 0 && (
            <View style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <Icon name="sim-outline" size="md" color={colors.primary} />
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '700' }}>
                  Carrier-Specific Codes
                </Text>
              </View>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md }}>
                Replace {'{AI_NUMBER}'} with your MattBot AI number. Tap a carrier to see its codes.
              </Text>

              {guide.carrier_guides.map((cg) => {
                const isExpanded = expandedCarrier === cg.carrier;
                return (
                  <View key={cg.carrier} style={{ marginBottom: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => setExpandedCarrier(isExpanded ? null : cg.carrier)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isExpanded ? colors.primaryContainer : colors.surface,
                        borderRadius: isExpanded ? radii.md : radii.md,
                        borderBottomLeftRadius: isExpanded ? 0 : radii.md,
                        borderBottomRightRadius: isExpanded ? 0 : radii.md,
                        padding: spacing.md,
                        gap: spacing.md,
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: isExpanded ? colors.primary : colors.background,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="cellphone" size="md" color={isExpanded ? colors.onPrimary : colors.textSecondary} />
                      </View>
                      <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 }}>
                        {cg.carrier}
                      </Text>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size="md"
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View
                        style={{
                          backgroundColor: colors.surface,
                          borderBottomLeftRadius: radii.md,
                          borderBottomRightRadius: radii.md,
                          padding: spacing.lg,
                          gap: spacing.md,
                        }}
                      >
                        <View>
                          <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            Forward when busy
                          </Text>
                          <View style={{
                            backgroundColor: colors.background,
                            borderRadius: radii.sm,
                            padding: spacing.md,
                          }}>
                            <Text style={{ ...typography.body, color: colors.primary, fontWeight: '600', fontFamily: 'monospace' }}>
                              {cg.enable_busy}
                            </Text>
                          </View>
                        </View>

                        <View>
                          <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            Forward when unreachable
                          </Text>
                          <View style={{
                            backgroundColor: colors.background,
                            borderRadius: radii.sm,
                            padding: spacing.md,
                          }}>
                            <Text style={{ ...typography.body, color: colors.primary, fontWeight: '600', fontFamily: 'monospace' }}>
                              {cg.enable_unreachable}
                            </Text>
                          </View>
                        </View>

                        <View>
                          <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            Disable forwarding
                          </Text>
                          <View style={{
                            backgroundColor: colors.background,
                            borderRadius: radii.sm,
                            padding: spacing.md,
                          }}>
                            <Text style={{ ...typography.body, color: colors.error, fontWeight: '600', fontFamily: 'monospace' }}>
                              {cg.disable}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Important notes */}
          <View
            style={{
              backgroundColor: colors.warningContainer ?? colors.surface,
              borderRadius: radii.xl,
              padding: spacing.lg,
              marginBottom: spacing.xl,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Icon name="alert-outline" size="md" color={colors.warning ?? colors.textSecondary} />
              <Text style={{ ...typography.body, color: colors.warning ?? colors.textSecondary, fontWeight: '700' }}>
                Important Notes
              </Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              {[
                'Dial these codes from the phone whose calls you want to forward.',
                'You should hear a confirmation tone or see a success message from your carrier.',
                'Conditional forwarding (busy/unreachable) means your phone will still ring first — if you don\'t answer, the call goes to MattBot.',
                'To stop forwarding at any time, dial the disable code for your carrier.',
              ].map((note, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                  <Text style={{ color: colors.warning ?? colors.textSecondary, fontWeight: '700', fontSize: 14, marginTop: 1 }}>•</Text>
                  <Text style={{ ...typography.bodySmall, color: colors.textPrimary, flex: 1, lineHeight: 20 }}>
                    {note}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            onPress={handleDone}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Text style={{ ...typography.button, color: colors.onPrimary }}>
              I've Set Up Forwarding — Verify
            </Text>
          </TouchableOpacity>

          {isOnboarding && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ alignItems: 'center', marginTop: spacing.md, paddingVertical: spacing.sm }}
            >
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}
