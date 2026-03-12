import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Pressable, TextInput as RNTextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useCallStore } from '../store/callStore';
import { useVipStore } from '../store/vipStore';
import { useBlockStore } from '../store/blockStore';
import type { CallEvent, CallLabel, TranscriptTurn } from '../api/calls';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return 'N/A';
  if (seconds < 60) return `${seconds} seconds`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} minute${mins !== 1 ? 's' : ''}`;
}

type StatusBadge = { label: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'info' };

function statusBadge(status: string): StatusBadge {
  switch (status) {
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    case 'in_progress':
      return { label: 'In Progress', variant: 'primary' };
    case 'failed':
      return { label: 'Failed', variant: 'error' };
    case 'canceled':
      return { label: 'Canceled', variant: 'warning' };
    case 'twiml_responded':
      return { label: 'Answered', variant: 'info' };
    case 'inbound_received':
      return { label: 'Received', variant: 'info' };
    default:
      return { label: status, variant: 'info' };
  }
}

function eventIcon(eventType: string): string {
  switch (eventType) {
    case 'call_started':
      return 'phone-ring';
    case 'call_answered':
      return 'phone-in-talk';
    case 'twiml_responded':
      return 'message-processing';
    case 'call_ended':
      return 'phone-hangup';
    case 'provider_status_update':
      return 'swap-horizontal';
    case 'provider_error':
    case 'system_error':
      return 'alert-circle';
    default:
      return 'circle-outline';
  }
}

function eventLabel(eventType: string, providerStatus: string | null): string {
  switch (eventType) {
    case 'call_started':
      return 'Call received';
    case 'call_answered':
      return 'Call answered';
    case 'twiml_responded':
      return 'Response sent';
    case 'call_ended':
      return 'Call ended';
    case 'provider_status_update':
      return providerStatus
        ? `Status: ${providerStatus.replace('-', ' ')}`
        : 'Status updated';
    case 'provider_error':
      return 'Provider error';
    case 'system_error':
      return 'System error';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

const LABEL_PRIORITY: Record<string, number> = {
  spam: 0,
  urgent: 1,
  vip: 2,
  sales: 3,
  normal: 4,
  unknown: 5,
};

function labelBadgeVariant(name: string): 'primary' | 'success' | 'warning' | 'error' | 'info' {
  switch (name) {
    case 'spam':
      return 'error';
    case 'urgent':
      return 'warning';
    case 'vip':
      return 'primary';
    case 'sales':
      return 'info';
    default:
      return 'success';
  }
}

function labelDisplayName(name: string): string {
  switch (name) {
    case 'spam':
      return 'Spam';
    case 'urgent':
      return 'Urgent';
    case 'vip':
      return 'VIP';
    case 'sales':
      return 'Sales';
    case 'normal':
      return 'Normal';
    default:
      return name.charAt(0).toUpperCase() + name.slice(1);
  }
}

export function CallDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { callId } = route.params as { callId: string };
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const {
    selectedCall,
    transcript,
    loading,
    transcriptLoading,
    error,
    loadCallDetail,
    loadTranscript,
    retryTranscript,
  } = useCallStore();
  const vipStore = useVipStore();
  const blockStore = useBlockStore();

  const [toast, setToast] = useState('');
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [spamSheetVisible, setSpamSheetVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const callerNumber = selectedCall?.from_masked ?? '';
  const isVip = vipStore.items.some((v) => v.phone_number === callerNumber);
  const isBlocked = blockStore.items.some((b) => b.phone_number === callerNumber);
  const vipEntry = vipStore.items.find((v) => v.phone_number === callerNumber);
  const blockEntry = blockStore.items.find((b) => b.phone_number === callerNumber);

  useEffect(() => {
    loadCallDetail(callId);
    vipStore.loadVip();
    blockStore.loadBlocks();
  }, [callId]);

  const handleRefreshTranscript = useCallback(() => {
    loadTranscript(callId);
  }, [callId, loadTranscript]);

  const handleToggleVip = useCallback(async () => {
    setActionLoading('vip');
    if (isVip && vipEntry) {
      const ok = await vipStore.removeVip(vipEntry.id);
      setToast(ok ? 'Removed from VIP' : vipStore.error ?? 'Failed');
    } else {
      const ok = await vipStore.addVip(callerNumber);
      setToast(ok ? 'Added to VIP' : vipStore.error ?? 'Failed');
    }
    setActionLoading(null);
  }, [isVip, vipEntry, callerNumber]);

  const handleToggleBlock = useCallback(async () => {
    setBlockConfirmVisible(false);
    setActionLoading('block');
    if (isBlocked && blockEntry) {
      const ok = await blockStore.removeBlock(blockEntry.id);
      setToast(ok ? 'Number unblocked' : blockStore.error ?? 'Failed');
    } else {
      const ok = await blockStore.addBlock(callerNumber);
      setToast(ok ? 'Number blocked' : blockStore.error ?? 'Failed');
    }
    setActionLoading(null);
  }, [isBlocked, blockEntry, callerNumber]);

  const handleMarkSpam = useCallback(async () => {
    setSpamSheetVisible(false);
    setActionLoading('spam');
    const ok = await blockStore.addBlock(callerNumber, undefined, 'spam');
    setToast(ok ? 'Marked as spam & blocked' : blockStore.error ?? 'Failed');
    setActionLoading(null);
  }, [callerNumber]);

  const handleSaveNote = useCallback(() => {
    setNoteModalVisible(false);
    if (noteText.trim()) {
      setToast('Note saved');
      setNoteText('');
    }
  }, [noteText]);

  if (loading && !selectedCall) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !selectedCall) {
    return (
      <ScreenWrapper>
        <ErrorMessage message={error} action="Retry" onAction={() => loadCallDetail(callId)} />
      </ScreenWrapper>
    );
  }

  if (!selectedCall) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
            Call not found
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const badge = statusBadge(selectedCall.status);
  const sortedLabels = [...(selectedCall.labels || [])].sort(
    (a, b) => (LABEL_PRIORITY[a.label_name] ?? 99) - (LABEL_PRIORITY[b.label_name] ?? 99)
  );

  return (
    <ScreenWrapper scroll>
      {/* Header */}
      <FadeIn delay={0}>
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={selectedCall.source_type === 'forwarded' ? 'phone-forward' : 'phone-incoming'}
              size="xl"
              color={colors.primary}
            />
          </View>

          <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
            {selectedCall.from_masked}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Badge label={badge.label} variant={badge.variant} />
            {sortedLabels.length > 0 && sortedLabels.map((lbl) => (
              <Badge
                key={lbl.label_name}
                label={labelDisplayName(lbl.label_name)}
                variant={labelBadgeVariant(lbl.label_name)}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm }}>
            <DetailItem
              icon="clock-outline"
              label="Started"
              value={formatDateTime(selectedCall.started_at)}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
            {selectedCall.ended_at && (
              <DetailItem
                icon="clock-check-outline"
                label="Ended"
                value={formatDateTime(selectedCall.ended_at)}
                colors={colors}
                typography={typography}
                spacing={spacing}
              />
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.xl }}>
            <DetailItem
              icon="timer-outline"
              label="Duration"
              value={formatDuration(selectedCall.duration_seconds)}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
            <DetailItem
              icon="arrow-collapse-right"
              label="Type"
              value={selectedCall.source_type === 'forwarded' ? 'Forwarded' : 'Direct'}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
          </View>
        </View>
      </Card>
      </FadeIn>

      {/* Summary Section */}
      <FadeIn delay={60}>
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }} allowFontScaling>
          Summary
        </Text>
        <Card variant="flat" style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}>
          {selectedCall.summary_status === 'ready' && selectedCall.summary ? (
            <Text style={{ ...typography.body, color: colors.textPrimary, lineHeight: 22 }} allowFontScaling>
              {selectedCall.summary}
            </Text>
          ) : selectedCall.summary_status === 'processing' || selectedCall.summary_status === 'pending' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
                Processing summary...
              </Text>
            </View>
          ) : selectedCall.summary_status === 'failed' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="alert-circle" size="md" color={colors.error} />
              <Text style={{ ...typography.body, color: colors.error }} allowFontScaling>
                Failed to generate summary
              </Text>
            </View>
          ) : (
            <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
              Not available yet
            </Text>
          )}
        </Card>
      </View>
      </FadeIn>

      {/* Actions */}
      <FadeIn delay={90}>
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }} allowFontScaling>
          Actions
        </Text>
        <Card variant="flat">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <ActionChip
              icon="message-text-outline"
              label="Text back"
              colors={colors}
              typography={typography}
              spacing={spacing}
              radii={radii}
              loading={actionLoading === 'textback'}
              onPress={() => navigation.navigate('TextBack', { callId, callerId: callerNumber })}
            />
            <ActionChip
              icon="pencil-outline"
              label="Add note"
              colors={colors}
              typography={typography}
              spacing={spacing}
              radii={radii}
              onPress={() => setNoteModalVisible(true)}
            />
            <ActionChip
              icon="clock-outline"
              label="Reminder"
              colors={colors}
              typography={typography}
              spacing={spacing}
              radii={radii}
              onPress={() => navigation.navigate('CreateReminder', { callId })}
            />
            <ActionChip
              icon={isBlocked ? 'shield-off-outline' : 'shield-outline'}
              label={isBlocked ? 'Unblock' : 'Block'}
              colors={colors}
              typography={typography}
              spacing={spacing}
              radii={radii}
              loading={actionLoading === 'block'}
              onPress={() => isBlocked ? handleToggleBlock() : setBlockConfirmVisible(true)}
            />
            <ActionChip
              icon="alert-octagon-outline"
              label="Spam"
              colors={colors}
              typography={typography}
              spacing={spacing}
              radii={radii}
              loading={actionLoading === 'spam'}
              onPress={() => setSpamSheetVisible(true)}
            />
            <ActionChip
              icon={isVip ? 'star' : 'star-outline'}
              label={isVip ? 'Remove VIP' : 'VIP'}
              colors={colors}
              typography={typography}
              spacing={spacing}
              radii={radii}
              loading={actionLoading === 'vip'}
              onPress={handleToggleVip}
              highlight={isVip}
            />
          </View>
        </Card>
      </View>
      </FadeIn>

      {/* Labels Section */}
      {sortedLabels.length > 0 && (
        <FadeIn delay={120}>
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }} allowFontScaling>
            Labels
          </Text>
          <Card variant="flat">
            <View style={{ gap: spacing.md }}>
              {sortedLabels.map((label: CallLabel) => (
                <View key={label.label_name}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                    <Badge label={labelDisplayName(label.label_name)} variant={labelBadgeVariant(label.label_name)} />
                    <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                      {Math.round(label.confidence * 100)}% confidence
                    </Text>
                  </View>
                  <Text style={{ ...typography.bodySmall, color: colors.textPrimary }} allowFontScaling>
                    {label.reason_text}
                  </Text>
                  {label.evidence_snippets.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      {label.evidence_snippets.map((snippet, idx) => (
                        <Text
                          key={idx}
                          style={{
                            ...typography.caption,
                            color: colors.textSecondary,
                            fontStyle: 'italic',
                            marginTop: 2,
                          }}
                          numberOfLines={2}
                          allowFontScaling
                        >
                          "{snippet}"
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Card>
        </View>
        </FadeIn>
      )}

      {/* Transcript Section */}
      <FadeIn delay={180}>
      <View style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
            Transcript
          </Text>
          {selectedCall.transcript_status === 'ready' && !transcript && (
            <TouchableOpacity onPress={handleRefreshTranscript}>
              <Text style={{ ...typography.bodySmall, color: colors.primary }} allowFontScaling>
                Load transcript
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Card variant="flat">
          {selectedCall.transcript_status === 'ready' ? (
            transcript && transcript.turns.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                {transcript.turns.map((turn: TranscriptTurn, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: turn.role === 'agent' ? colors.primary + '20' : colors.textSecondary + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={turn.role === 'agent' ? 'robot' : 'account'}
                        size="sm"
                        color={turn.role === 'agent' ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling>
                        {turn.role === 'agent' ? 'AI Assistant' : 'Caller'}
                      </Text>
                      <Text style={{ ...typography.body, color: colors.textPrimary, marginTop: 2 }} allowFontScaling>
                        {turn.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : transcriptLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
                  Loading transcript...
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleRefreshTranscript}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon name="text-box-outline" size="md" color={colors.primary} />
                  <Text style={{ ...typography.body, color: colors.primary }} allowFontScaling>
                    Tap to load transcript
                  </Text>
                </View>
              </TouchableOpacity>
            )
          ) : selectedCall.transcript_status === 'processing' || selectedCall.transcript_status === 'pending' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
                Processing transcript...
              </Text>
            </View>
          ) : selectedCall.transcript_status === 'failed' ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="alert-circle" size="md" color={colors.error} />
                <Text style={{ ...typography.body, color: colors.error }} allowFontScaling>
                  Transcript unavailable
                </Text>
              </View>
              <TouchableOpacity onPress={() => retryTranscript(callId)}>
                <Text style={{ ...typography.bodySmall, color: colors.primary }} allowFontScaling>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
              Not available yet
            </Text>
          )}
        </Card>
      </View>
      </FadeIn>

      {/* Events Timeline */}
      {selectedCall.events.length > 0 && (
        <FadeIn delay={240}>
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }} allowFontScaling>
            Timeline
          </Text>
          <Card variant="flat">
            {selectedCall.events.map((event: CallEvent, index: number) => (
              <View key={event.id}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <View style={{ alignItems: 'center', width: 32 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.primary + '14',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={eventIcon(event.event_type)} size="sm" color={colors.primary} />
                    </View>
                    {index < selectedCall.events.length - 1 && (
                      <View
                        style={{
                          width: 2,
                          flex: 1,
                          backgroundColor: colors.border,
                          marginTop: 4,
                          minHeight: 16,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: spacing.xs }}>
                    <Text
                      style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '500' }}
                      allowFontScaling
                    >
                      {eventLabel(event.event_type, event.provider_status)}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                      {formatDateTime(event.event_at)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
        </FadeIn>
      )}

      <View style={{ height: spacing.xl }} />

      <Toast message={toast} type="info" visible={!!toast} onDismiss={() => setToast('')} />

      <ConfirmSheet
        visible={blockConfirmVisible}
        onDismiss={() => setBlockConfirmVisible(false)}
        title={isBlocked ? 'Unblock this number?' : 'Block this number?'}
        message={isBlocked
          ? 'This number will be able to reach your assistant again.'
          : 'Calls from this number will be automatically rejected.'}
        icon="shield-outline"
        destructive={!isBlocked}
        confirmLabel={isBlocked ? 'Unblock' : 'Block'}
        onConfirm={handleToggleBlock}
      />

      <ConfirmSheet
        visible={spamSheetVisible}
        onDismiss={() => setSpamSheetVisible(false)}
        title="Mark as spam?"
        message="This number will be blocked and flagged as spam."
        icon="alert-octagon-outline"
        destructive
        confirmLabel="Mark spam"
        onConfirm={handleMarkSpam}
      />

      {/* Note Modal */}
      <Modal visible={noteModalVisible} transparent animationType="slide" onRequestClose={() => setNoteModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setNoteModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.xl,
              paddingBottom: spacing.xxxl,
              gap: spacing.lg,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm }} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
              Add Note
            </Text>
            <RNTextInput
              style={{
                ...typography.body,
                color: colors.textPrimary,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                minHeight: 100,
                textAlignVertical: 'top',
              }}
              placeholder="Write a note about this call..."
              placeholderTextColor={colors.textDisabled}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              autoFocus
            />
            <View style={{ gap: spacing.sm }}>
              <Button title="Save Note" onPress={handleSaveNote} variant="primary" disabled={!noteText.trim()} />
              <Button title="Cancel" onPress={() => setNoteModalVisible(false)} variant="ghost" />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

function ActionChip({
  icon,
  label,
  colors,
  typography,
  spacing,
  radii,
  onPress,
  loading,
  highlight,
}: {
  icon: string;
  label: string;
  colors: any;
  typography: any;
  spacing: any;
  radii: any;
  onPress: () => void;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: highlight ? colors.primary + '18' : colors.background,
        borderWidth: 1,
        borderColor: highlight ? colors.primary + '40' : colors.border,
        opacity: loading ? 0.5 : 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name={icon} size="sm" color={highlight ? colors.primary : colors.textSecondary} />
      )}
      <Text style={{ ...typography.caption, color: highlight ? colors.primary : colors.textPrimary, fontWeight: '500' }} allowFontScaling>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DetailItem({
  icon,
  label,
  value,
  colors,
  typography,
  spacing,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
  typography: any;
  spacing: any;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 2, minWidth: 100 }}>
      <Icon name={icon} size="sm" color={colors.textSecondary} />
      <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
        {label}
      </Text>
      <Text
        style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '500', textAlign: 'center' }}
        numberOfLines={1}
        allowFontScaling
      >
        {value}
      </Text>
    </View>
  );
}
