import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Pressable, TextInput as RNTextInput, Platform, StatusBar } from 'react-native';
import Video from 'react-native-video';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { GradientView } from '../components/ui/GradientView';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { Toast } from '../components/ui/Toast';
import { BotLoader } from '../components/ui/BotLoader';
import { useTheme } from '../theme/ThemeProvider';
import { useCallStore } from '../store/callStore';
import { useSettingsStore } from '../store/settingsStore';
import { patchCallNotes, getCallRecordingUrl, markCallVip, unmarkCallVip, markCallBlocked, unmarkCallBlocked } from '../api/calls';
import { getSecureItem, TOKEN_KEYS } from '../utils/secureStorage';
import { getTimezoneAbbr } from '../utils/timezones';
import type { CallEvent, CallLabel, TranscriptTurn } from '../api/calls';
import { listMemoryItems } from '../api/memory';
import type { MemoryItem } from '../api/memory';

function formatDateTime(iso: string, tz?: string): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  };
  return d.toLocaleString(undefined, opts);
}

function formatDateTimeWithTz(iso: string, tz: string | undefined): string {
  const base = formatDateTime(iso, tz);
  if (!tz) return base;
  const abbr = getTimezoneAbbr(tz);
  return `${base} ${abbr}`;
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
  possible_spam: 1,
  urgent: 2,
  vip: 3,
  sales: 4,
  normal: 5,
  unknown: 6,
};

function labelBadgeVariant(name: string): 'primary' | 'success' | 'warning' | 'error' | 'info' {
  switch (name) {
    case 'spam':
      return 'error';
    case 'possible_spam':
      return 'warning';
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

function labelColor(name: string, colors: any): string {
  switch (name) {
    case 'spam':
      return colors.error;
    case 'possible_spam':
      return colors.warning ?? '#F59E0B';
    case 'urgent':
      return colors.warning ?? '#F59E0B';
    case 'vip':
      return colors.primary;
    case 'sales':
      return colors.info ?? '#3B82F6';
    default:
      return colors.success ?? '#22C55E';
  }
}

function labelDisplayName(name: string): string {
  switch (name) {
    case 'spam':
      return 'Spam';
    case 'possible_spam':
      return 'Possible Spam';
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
    detailLoading,
    transcriptLoading,
    detailError,
    transcriptError,
    loadCallDetail,
    loadTranscript,
    retryTranscript,
  } = useCallStore();
  const userTz = useSettingsStore((s) => s.settings?.timezone);

  const [toast, setToast] = useState('');
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [spamSheetVisible, setSpamSheetVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const videoRef = useRef<any>(null);
  const [callerMemories, setCallerMemories] = useState<MemoryItem[]>([]);
  const [isVip, setIsVip] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSpam, setIsSpam] = useState(false);

  const callerNumber = selectedCall?.from_masked ?? '';

  useEffect(() => {
    if (selectedCall) {
      setIsVip(selectedCall.is_vip ?? false);
      setIsBlocked(selectedCall.is_blocked ?? false);
    }
  }, [selectedCall?.id]);

  useEffect(() => {
    loadCallDetail(callId);
  }, [callId]);

  useEffect(() => {
    if (
      selectedCall?.transcript_status === 'ready' &&
      !transcript &&
      !transcriptLoading &&
      !transcriptError
    ) {
      loadTranscript(callId);
    }
  }, [selectedCall?.transcript_status, transcript, transcriptLoading, transcriptError, callId, loadTranscript]);

  useEffect(() => {
    if (selectedCall) {
      listMemoryItems()
        .then(data => setCallerMemories(data.items || []))
        .catch(() => {});
    }
  }, [selectedCall?.id]);

  const handleRefreshTranscript = useCallback(() => {
    loadTranscript(callId);
  }, [callId, loadTranscript]);

  const handleToggleVip = useCallback(async () => {
    setActionLoading('vip');
    try {
      if (isVip) {
        await unmarkCallVip(callId);
        setIsVip(false);
        setToast('Removed from VIP');
      } else {
        await markCallVip(callId);
        setIsVip(true);
        setToast('Added to VIP');
      }
    } catch {
      setToast('Could not complete action. Please try again.');
    }
    setActionLoading(null);
  }, [isVip, callId]);

  const handleToggleBlock = useCallback(async () => {
    setBlockConfirmVisible(false);
    setActionLoading('block');
    try {
      if (isBlocked) {
        await unmarkCallBlocked(callId);
        setIsBlocked(false);
        setIsSpam(false);
        setToast('Number unblocked');
      } else {
        await markCallBlocked(callId);
        setIsBlocked(true);
        setToast('Number blocked');
      }
    } catch {
      setToast('Could not complete action. Please try again.');
    }
    setActionLoading(null);
  }, [isBlocked, callId]);

  const handleMarkSpam = useCallback(async () => {
    setSpamSheetVisible(false);
    setActionLoading('spam');
    try {
      await markCallBlocked(callId, 'spam');
      setIsBlocked(true);
      setIsSpam(true);
      setToast('Marked as spam & blocked');
    } catch {
      setToast('Could not complete action. Please try again.');
    }
    setActionLoading(null);
  }, [callId]);

  const handleRemoveSpam = useCallback(async () => {
    setActionLoading('spam');
    try {
      await unmarkCallBlocked(callId);
      setIsBlocked(false);
      setIsSpam(false);
      setToast('Removed from spam');
    } catch {
      setToast('Could not complete action. Please try again.');
    }
    setActionLoading(null);
  }, [callId]);

  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) return;
    setNoteModalVisible(false);
    setActionLoading('note');
    try {
      await patchCallNotes(callId, noteText.trim());
      setToast('Note saved');
      setNoteText('');
      loadCallDetail(callId);
    } catch {
      setToast('Could not save note. Please try again.');
    }
    setActionLoading(null);
  }, [noteText, callId, loadCallDetail]);

  const handlePlayRecording = useCallback(async () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (recordingUrl) {
      setIsPlaying(true);
      return;
    }
    try {
      setAudioLoading(true);
      const token = await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
      if (!token) {
        setToast('Please sign in again to play recording.');
        setAudioLoading(false);
        return;
      }
      const url = getCallRecordingUrl(callId, token);
      setRecordingUrl(url);
      setIsPlaying(true);
    } catch {
      setToast('Could not play recording. Please try again.');
    } finally {
      setAudioLoading(false);
    }
  }, [callId, isPlaying, recordingUrl]);

  const onAudioLoad = useCallback((data: { duration: number }) => {
    setAudioDuration(data.duration);
    setAudioLoading(false);
  }, []);

  const onAudioProgress = useCallback((data: { currentTime: number }) => {
    setAudioProgress(data.currentTime);
  }, []);

  const onAudioEnd = useCallback(() => {
    setIsPlaying(false);
    setAudioProgress(0);
  }, []);

  const onAudioError = useCallback(() => {
    setIsPlaying(false);
    setRecordingUrl(null);
    setToast('Could not play recording. Please try again.');
  }, []);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressBarWidth = useRef(0);

  const seekAudio = useCallback((locationX: number) => {
    if (videoRef.current && audioDuration > 0 && progressBarWidth.current > 0) {
      const ratio = Math.max(0, Math.min(1, locationX / progressBarWidth.current));
      const seekTo = ratio * audioDuration;
      videoRef.current.seek(seekTo);
      setAudioProgress(seekTo);
    }
  }, [audioDuration]);

  if (detailLoading && !selectedCall) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BotLoader color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (detailError && !selectedCall) {
    return (
      <ScreenWrapper>
        <View style={{ paddingTop: spacing.lg, paddingHorizontal: spacing.md }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, marginLeft: spacing.xs }}>Back</Text>
          </TouchableOpacity>
        </View>
        <ErrorMessage message={detailError || 'Could not load call details.'} action="Retry" onAction={() => loadCallDetail(callId)} />
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

  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 40) : 50;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Gradient Hero */}
      <GradientView
        colors={[colors.gradientStart ?? colors.primary, colors.gradientEnd ?? colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: statusBarH, paddingBottom: spacing.xxl + 20, paddingHorizontal: spacing.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="arrow-left" size="md" color="#fff" />
          </TouchableOpacity>
          <Text style={{ ...typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginLeft: spacing.sm, fontWeight: '500' }} allowFontScaling>
            Call Details
          </Text>
        </View>

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={selectedCall.source_type === 'forwarded' ? 'phone-forward' : 'phone-incoming'}
              size={28}
              color="#fff"
            />
          </View>

          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: 0.5 }} allowFontScaling>
            {selectedCall.from_masked}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Badge label={badge.label} variant={badge.variant} />
            {sortedLabels.length > 0 && sortedLabels.map((lbl) => (
              <Badge
                key={lbl.label_name}
                label={labelDisplayName(lbl.label_name)}
                variant={labelBadgeVariant(lbl.label_name)}
              />
            ))}
          </View>
        </View>
      </GradientView>

      {/* Floating info strip */}
      <View style={{ marginTop: -(spacing.xxl), marginHorizontal: spacing.md, marginBottom: spacing.md, zIndex: 2 }}>
        <FadeIn delay={0}>
        <Card variant="elevated" style={{ borderRadius: radii.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <InfoCell icon="clock-outline" label="Started" value={formatDateTimeWithTz(selectedCall.started_at, userTz)} colors={colors} typography={typography} spacing={spacing} />
            {selectedCall.ended_at && (
              <InfoCell icon="clock-check-outline" label="Ended" value={formatDateTimeWithTz(selectedCall.ended_at, userTz)} colors={colors} typography={typography} spacing={spacing} />
            )}
            <InfoCell icon="timer-outline" label="Duration" value={formatDuration(selectedCall.duration_seconds)} colors={colors} typography={typography} spacing={spacing} />
            <InfoCell icon="arrow-collapse-right" label="Type" value={selectedCall.source_type === 'forwarded' ? 'Forwarded' : 'Direct'} colors={colors} typography={typography} spacing={spacing} />
          </View>
        </Card>
        </FadeIn>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

      {/* Summary Section */}
      <FadeIn delay={60}>
      <View style={{ marginBottom: spacing.lg }}>
        <SectionHeader icon="text-box-outline" label="Summary" colors={colors} typography={typography} spacing={spacing} />
        <Card variant="flat" style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}>
          {selectedCall.summary_status === 'ready' && selectedCall.summary ? (
            <Text style={{ ...typography.body, color: colors.textPrimary, lineHeight: 22 }} allowFontScaling>
              {selectedCall.summary}
            </Text>
          ) : selectedCall.summary_status === 'processing' || selectedCall.summary_status === 'pending' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <BotLoader size="small" color={colors.primary} />
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

      {/* Appointment Booked */}
      {selectedCall.booked_calendar_event_id && (
        <FadeIn delay={65}>
        <View style={{ marginBottom: spacing.lg }}>
          <SectionHeader icon="calendar-check" label="Appointment Booked" colors={colors} typography={typography} spacing={spacing} />
          <Card variant="elevated" style={{ borderLeftWidth: 3, borderLeftColor: colors.success ?? '#22C55E' }}>
            <View style={{ gap: spacing.sm }}>
              {selectedCall.booked_calendar_event_summary && (
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
                  {selectedCall.booked_calendar_event_summary}
                </Text>
              )}
              <View style={{ gap: spacing.xs }}>
                {selectedCall.booked_appointment_date && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Icon name="calendar-outline" size="sm" color={colors.textSecondary} />
                    <Text style={{ ...typography.bodySmall, color: colors.textPrimary }} allowFontScaling>
                      {(() => {
                        try {
                          const d = new Date(selectedCall.booked_appointment_date + 'T00:00:00');
                          return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', ...(userTz ? { timeZone: userTz } : {}) });
                        } catch { return selectedCall.booked_appointment_date; }
                      })()}
                    </Text>
                  </View>
                )}
                {selectedCall.booked_appointment_time && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Icon name="clock-outline" size="sm" color={colors.textSecondary} />
                    <Text style={{ ...typography.bodySmall, color: colors.textPrimary }} allowFontScaling>
                      {(() => {
                        try {
                          const [h, m] = selectedCall.booked_appointment_time.split(':').map(Number);
                          const ampm = h >= 12 ? 'PM' : 'AM';
                          const h12 = h % 12 || 12;
                          return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                        } catch { return selectedCall.booked_appointment_time; }
                      })()}
                      {selectedCall.booked_appointment_duration_minutes
                        ? ` (${selectedCall.booked_appointment_duration_minutes} min)`
                        : ''}
                      {userTz ? ` ${getTimezoneAbbr(userTz)}` : ''}
                    </Text>
                  </View>
                )}
                {selectedCall.booked_appointment_caller_name && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Icon name="account-outline" size="sm" color={colors.textSecondary} />
                    <Text style={{ ...typography.bodySmall, color: colors.textPrimary }} allowFontScaling>
                      {selectedCall.booked_appointment_caller_name}
                    </Text>
                  </View>
                )}
                {selectedCall.booked_appointment_reason && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Icon name="text-short" size="sm" color={colors.textSecondary} />
                    <Text style={{ ...typography.bodySmall, color: colors.textPrimary }} allowFontScaling>
                      {selectedCall.booked_appointment_reason}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  const dateParam = selectedCall.booked_appointment_date ?? undefined;
                  navigation.navigate('Calendar', dateParam ? { date: dateParam } : undefined);
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radii.lg,
                  backgroundColor: colors.primary,
                  marginTop: spacing.sm,
                }}
              >
                <Icon name="calendar-arrow-right" size="sm" color="#fff" />
                <Text style={{ ...typography.bodySmall, color: '#fff', fontWeight: '700' }} allowFontScaling>
                  View in Calendar
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
        </FadeIn>
      )}

      {/* Recording */}
      {selectedCall.recording_available && (
        <FadeIn delay={75}>
        <View style={{ marginBottom: spacing.lg }}>
          <SectionHeader icon="microphone-outline" label="Recording" colors={colors} typography={typography} spacing={spacing} />
          <Card variant="flat">
            {recordingUrl && (
              <Video
                ref={videoRef}
                source={{ uri: recordingUrl }}
                paused={!isPlaying}
                playInBackground={false}
                onLoad={onAudioLoad}
                onProgress={onAudioProgress}
                onEnd={onAudioEnd}
                onError={onAudioError}
                progressUpdateInterval={250}
                style={{ width: 0, height: 0, position: 'absolute' }}
              />
            )}
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <TouchableOpacity
                  onPress={handlePlayRecording}
                  disabled={audioLoading}
                  activeOpacity={0.7}
                  style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: isPlaying ? colors.error + '18' : colors.primary + '18',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {audioLoading ? (
                    <BotLoader size="small" color={colors.primary} />
                  ) : (
                    <Icon name={isPlaying ? 'pause' : 'play'} size="md" color={isPlaying ? colors.error : colors.primary} />
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Pressable
                    onLayout={(e) => { progressBarWidth.current = e.nativeEvent.layout.width; }}
                    onPress={(e) => seekAudio(e.nativeEvent.locationX)}
                    style={{ justifyContent: 'center', paddingVertical: 8 }}
                  >
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }}>
                      <View
                        style={{
                          width: audioDuration > 0 ? `${(audioProgress / audioDuration) * 100}%` : '0%',
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: colors.primary,
                        }}
                      />
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                      {formatTime(audioProgress)}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                      {audioDuration > 0 ? formatTime(audioDuration) : '--:--'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </View>
        </FadeIn>
      )}

      {/* Actions */}
      <FadeIn delay={90}>
      <View style={{ marginBottom: spacing.lg }}>
        <SectionHeader icon="gesture-tap" label="Actions" colors={colors} typography={typography} spacing={spacing} />
        <Card variant="flat">
          <View style={{ gap: spacing.md }}>
            <View>
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }} allowFontScaling>
                Communication
              </Text>
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
                  icon="clock-outline"
                  label="Reminder"
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                  onPress={() => navigation.navigate('CreateReminder', { callId })}
                />
              </View>
            </View>

            <View>
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }} allowFontScaling>
                Moderation
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
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
                  icon={isSpam ? 'alert-octagon' : 'alert-octagon-outline'}
                  label={isSpam ? 'Remove Spam' : 'Spam'}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                  loading={actionLoading === 'spam'}
                  onPress={() => isSpam ? handleRemoveSpam() : setSpamSheetVisible(true)}
                  highlight={isSpam}
                />
              </View>
            </View>

            <View>
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }} allowFontScaling>
                Notes
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <ActionChip
                  icon={selectedCall.notes ? 'pencil' : 'pencil-outline'}
                  label={selectedCall.notes ? 'Edit note' : 'Add note'}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                  onPress={() => {
                    if (selectedCall.notes) setNoteText(selectedCall.notes);
                    setNoteModalVisible(true);
                  }}
                />
              </View>
            </View>
          </View>
        </Card>
      </View>
      </FadeIn>

      {/* Notes Section */}
      {selectedCall.notes && (
        <FadeIn delay={95}>
        <View style={{ marginBottom: spacing.lg }}>
          <SectionHeader icon="note-text-outline" label="Notes" colors={colors} typography={typography} spacing={spacing} />
          <Card variant="flat" style={{ borderLeftWidth: 3, borderLeftColor: colors.warning ?? '#F59E0B' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, lineHeight: 22 }} allowFontScaling>
              {selectedCall.notes}
            </Text>
          </Card>
        </View>
        </FadeIn>
      )}

      {/* Labels Section */}
      {sortedLabels.length > 0 && (
        <FadeIn delay={120}>
        <View style={{ marginBottom: spacing.lg }}>
          <SectionHeader icon="label-outline" label="Labels" colors={colors} typography={typography} spacing={spacing} />
          <Card variant="flat">
            <View style={{ gap: spacing.md }}>
              {sortedLabels.map((label: CallLabel) => {
                const lc = labelColor(label.label_name, colors);
                return (
                  <View key={label.label_name}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                      <Badge label={labelDisplayName(label.label_name)} variant={labelBadgeVariant(label.label_name)} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border }}>
                        <View style={{ width: `${Math.round(label.confidence * 100)}%`, height: 4, borderRadius: 2, backgroundColor: lc }} />
                      </View>
                      <Text style={{ ...typography.caption, color: colors.textSecondary, width: 36, textAlign: 'right' }}>
                        {Math.round(label.confidence * 100)}%
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
                );
              })}
            </View>
          </Card>
        </View>
        </FadeIn>
      )}

      {/* Spam Analysis Card */}
      {sortedLabels.some((l) => l.label_name === 'spam' || l.label_name === 'possible_spam') && (
        <FadeIn delay={130}>
          <View style={{ marginBottom: spacing.lg }}>
            <Card variant="flat" style={{ borderLeftWidth: 3, borderLeftColor: colors.error }}>
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon name="alert-octagon" size="md" color={colors.error} />
                  <Text style={{ ...typography.h3, color: colors.error, flex: 1 }} allowFontScaling>
                    Spam Analysis
                  </Text>
                  {(() => {
                    const spamLabel = sortedLabels.find((l) => l.label_name === 'spam' || l.label_name === 'possible_spam');
                    const score = spamLabel?.spam_score ?? spamLabel?.confidence ?? 0;
                    return (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
                        backgroundColor: (score >= 0.7 ? colors.error : (colors.warning ?? '#F59E0B')) + '18',
                      }}>
                        <Text style={{
                          ...typography.caption, fontWeight: '700',
                          color: score >= 0.7 ? colors.error : (colors.warning ?? '#F59E0B'),
                        }} allowFontScaling>
                          {Math.round(score * 100)}% confidence
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                {sortedLabels
                  .filter((l) => l.label_name === 'spam' || l.label_name === 'possible_spam')
                  .map((l) => (
                    <View key={l.label_name}>
                      <Text style={{ ...typography.bodySmall, color: colors.textPrimary }} allowFontScaling>
                        {l.reason_text}
                      </Text>
                      {l.evidence_snippets.length > 0 && l.evidence_snippets.map((s, i) => (
                        <Text key={i} style={{ ...typography.caption, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 }} numberOfLines={2} allowFontScaling>
                          "{s}"
                        </Text>
                      ))}
                    </View>
                  ))}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                  {!isSpam && (
                    <TouchableOpacity
                      onPress={() => setSpamSheetVisible(true)}
                      style={{
                        flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md,
                        backgroundColor: colors.error + '14', alignItems: 'center',
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Block caller"
                    >
                      <Text style={{ ...typography.bodySmall, color: colors.error, fontWeight: '600' }} allowFontScaling>
                        Block Caller
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isSpam && (
                    <TouchableOpacity
                      onPress={handleRemoveSpam}
                      style={{
                        flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md,
                        backgroundColor: colors.success + '14', alignItems: 'center',
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Mark as not spam"
                    >
                      <Text style={{ ...typography.bodySmall, color: colors.success, fontWeight: '600' }} allowFontScaling>
                        Not Spam
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          </View>
        </FadeIn>
      )}

      {/* Caller Memories */}
      <FadeIn delay={150}>
      <View style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Icon name="brain" size="md" color={colors.primary} />
          <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
            Caller Memories
          </Text>
        </View>
        {callerMemories.length === 0 ? (
          <Card variant="flat">
            <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
              No memories for this caller
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {Object.values(
              callerMemories.reduce<Record<string, MemoryItem>>((acc, m) => {
                const key = m.subject ?? m.id;
                if (!acc[key] || new Date(m.created_at) > new Date(acc[key].created_at)) {
                  acc[key] = m;
                }
                return acc;
              }, {})
            ).map((mem) => (
              <Card key={mem.id} variant="flat" style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: radii.sm,
                      backgroundColor: colors.primary + '20',
                    }}
                  >
                    <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '600' }}>
                      {mem.memory_type}
                    </Text>
                  </View>
                  {mem.subject && (
                    <Text
                      style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600', flex: 1 }}
                      numberOfLines={1}
                      allowFontScaling
                    >
                      {mem.subject}
                    </Text>
                  )}
                </View>
                {mem.value && (
                  <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
                    {mem.value}
                  </Text>
                )}
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  {formatDateTime(mem.created_at, userTz)}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </View>
      </FadeIn>

      {/* Transcript Section */}
      <FadeIn delay={180}>
      <View style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="script-text-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
              Transcript
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {transcript && transcript.turns.length > 0 && (
              <TouchableOpacity onPress={() => setShowTranscript(!showTranscript)}>
                <Text style={{ ...typography.bodySmall, color: colors.primary }} allowFontScaling>
                  {showTranscript ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            )}
            {selectedCall.transcript_status === 'ready' && !transcript && !transcriptLoading && (
              <TouchableOpacity onPress={handleRefreshTranscript}>
                <Text style={{ ...typography.bodySmall, color: colors.primary }} allowFontScaling>
                  Load transcript
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Card variant="flat">
          {selectedCall.transcript_status === 'ready' ? (
            transcript && transcript.turns.length > 0 && showTranscript ? (
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
                <BotLoader size="small" color={colors.primary} />
                <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
                  Loading transcript...
                </Text>
              </View>
            ) : transcriptError && !transcript ? (
              <TouchableOpacity onPress={handleRefreshTranscript}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon name="alert-circle" size="md" color={colors.error} />
                  <Text style={{ ...typography.body, color: colors.error }} allowFontScaling>
                    Could not load transcript. Tap to retry.
                  </Text>
                </View>
              </TouchableOpacity>
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
              <BotLoader size="small" color={colors.primary} />
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
          <SectionHeader icon="timeline-clock-outline" label="Timeline" colors={colors} typography={typography} spacing={spacing} />
          <Card variant="flat" style={{ borderLeftWidth: 3, borderLeftColor: colors.primary + '30' }}>
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
                          backgroundColor: colors.primary + '30',
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
                      {formatDateTimeWithTz(event.event_at, userTz)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
        </FadeIn>
      )}

    </ScrollView>

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
    </View>
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
        paddingVertical: 10,
        paddingHorizontal: 14,
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
        <BotLoader size="small" color={colors.primary} />
      ) : (
        <Icon name={icon} size="sm" color={highlight ? colors.primary : colors.textSecondary} />
      )}
      <Text style={{ ...typography.caption, color: highlight ? colors.primary : colors.textPrimary, fontWeight: '500' }} allowFontScaling>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InfoCell({
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
    <View style={{ width: '50%', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <Icon name={icon} size={14} color={colors.textSecondary} />
        <Text style={{ ...typography.caption, color: colors.textSecondary, fontSize: 11 }} allowFontScaling>
          {label}
        </Text>
      </View>
      <Text
        style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' }}
        numberOfLines={2}
        allowFontScaling
      >
        {value}
      </Text>
    </View>
  );
}

function SectionHeader({
  icon,
  label,
  colors,
  typography,
  spacing,
}: {
  icon: string;
  label: string;
  colors: any;
  typography: any;
  spacing: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <Icon name={icon} size="md" color={colors.primary} />
      <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
        {label}
      </Text>
    </View>
  );
}
