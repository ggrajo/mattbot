import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from './Button';

interface Props {
  visible: boolean;
  value: string;
  onChange: (time: string) => void;
  onDismiss: () => void;
  label?: string;
}

function generateTimeSlots(): { label: string; value: string }[] {
  const slots: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const value = `${hh}:${mm}`;
      const period = h < 12 ? 'AM' : 'PM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayH}:${mm} ${period}`;
      slots.push({ label, value });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export function TimePicker({ visible, value, onChange, onDismiss, label }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [selected, setSelected] = useState(value);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setSelected(value);
      const index = TIME_SLOTS.findIndex((s) => s.value === value);
      if (index >= 0 && listRef.current) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: Math.max(0, index - 3), animated: false });
        }, 100);
      }
    }
  }, [visible, value]);

  function handleConfirm() {
    onChange(selected);
    onDismiss();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        onPress={onDismiss}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            maxHeight: '60%',
          }}
          onPress={() => {}}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.xl,
              paddingBottom: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}
              allowFontScaling
            >
              {label || 'Select Time'}
            </Text>
          </View>

          {/* Time list */}
          <FlatList
            ref={listRef}
            data={TIME_SLOTS}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.sm }}
            getItemLayout={(_, index) => ({
              length: 52,
              offset: 52 * index,
              index,
            })}
            renderItem={({ item }) => {
              const isActive = selected === item.value;
              return (
                <TouchableOpacity
                  onPress={() => setSelected(item.value)}
                  activeOpacity={0.7}
                  style={{
                    height: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginHorizontal: spacing.lg,
                    borderRadius: radii.md,
                    backgroundColor: isActive ? colors.primary + '14' : 'transparent',
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={{
                      ...typography.body,
                      color: isActive ? colors.primary : colors.textPrimary,
                      fontWeight: isActive ? '600' : '400',
                      fontSize: 18,
                    }}
                    allowFontScaling
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Actions */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button title="Cancel" onPress={onDismiss} variant="ghost" />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Confirm" onPress={handleConfirm} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${mStr} ${period}`;
}
