import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';
import { apiClient } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'TextBack'>;

export function TextBackScreen({ route, navigation }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography } = useTheme();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/messages/text-back/${callId}`, { message: message.trim() });
      setToast({ message: 'Message sent', type: 'success' });
      setTimeout(() => navigation.goBack(), 500);
    } catch {
      setToast({ message: 'Failed to send', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>Text Back</Text>
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
          <TextInput
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            multiline
            numberOfLines={4}
          />
        </Card>
        <Button title="Send" onPress={handleSend} loading={sending} disabled={!message.trim()} />
      </ScrollView>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </ScreenWrapper>
  );
}
