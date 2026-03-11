import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [hours, setHours] = useState(parseInt(value.split(':')[0] || '0', 10));
  const [minutes, setMinutes] = useState(parseInt(value.split(':')[1] || '0', 10));

  const handleConfirm = () => {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    onChange(`${h}:${m}`);
    setVisible(false);
  };

  return (
    <View>
      {label && <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.inputText, { color: theme.colors.textPrimary }]}>{value || '00:00'}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.picker, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: theme.colors.textPrimary }]}>Select Time</Text>
            <View style={styles.row}>
              <View style={styles.column}>
                <TouchableOpacity onPress={() => setHours((h) => (h + 1) % 24)}>
                  <Text style={[styles.arrow, { color: theme.colors.primary }]}>▲</Text>
                </TouchableOpacity>
                <Text style={[styles.timeValue, { color: theme.colors.textPrimary }]}>
                  {hours.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => setHours((h) => (h - 1 + 24) % 24)}>
                  <Text style={[styles.arrow, { color: theme.colors.primary }]}>▼</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.separator, { color: theme.colors.textPrimary }]}>:</Text>
              <View style={styles.column}>
                <TouchableOpacity onPress={() => setMinutes((m) => (m + 15) % 60)}>
                  <Text style={[styles.arrow, { color: theme.colors.primary }]}>▲</Text>
                </TouchableOpacity>
                <Text style={[styles.timeValue, { color: theme.colors.textPrimary }]}>
                  {minutes.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => setMinutes((m) => (m - 15 + 60) % 60)}>
                  <Text style={[styles.arrow, { color: theme.colors.primary }]}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.buttons}>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.button}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: 8 }]}>
                <Text style={{ color: theme.colors.onPrimary, fontSize: 16, fontWeight: '600' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14 },
  inputText: { fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  picker: { width: 280, borderRadius: 16, padding: 24 },
  pickerTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  column: { alignItems: 'center', width: 60 },
  arrow: { fontSize: 24, padding: 8 },
  timeValue: { fontSize: 32, fontWeight: '700' },
  separator: { fontSize: 32, fontWeight: '700', marginHorizontal: 8 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  button: { paddingVertical: 10, paddingHorizontal: 20 },
});
