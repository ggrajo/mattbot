import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface TimePickerProps {
  visible: boolean;
  value: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  title?: string;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}

export function TimePicker({
  visible,
  value,
  onConfirm,
  onCancel,
  title = 'Select Time',
}: TimePickerProps) {
  const { colors, spacing, typography, radii } = useTheme();
  const listRef = useRef<FlatList>(null);
  const slots = useMemo(() => generateTimeSlots(), []);
  const [selected, setSelected] = React.useState(value);

  React.useEffect(() => {
    if (visible) {
      setSelected(value);
      const idx = slots.indexOf(value);
      if (idx >= 0 && listRef.current) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.4 });
        }, 100);
      }
    }
  }, [visible, value, slots]);

  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      const isSelected = item === selected;
      return (
        <TouchableOpacity
          onPress={() => setSelected(item)}
          activeOpacity={0.7}
          style={{
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
            backgroundColor: isSelected ? colors.primary + '14' : 'transparent',
            borderRadius: radii.md,
            marginHorizontal: spacing.md,
            marginVertical: 2,
          }}
        >
          <Text
            style={{
              ...typography.body,
              color: isSelected ? colors.primary : colors.textPrimary,
              fontWeight: isSelected ? '600' : '400',
              textAlign: 'center',
            }}
          >
            {formatDisplayTime(item)}
          </Text>
        </TouchableOpacity>
      );
    },
    [selected, colors, spacing, typography, radii],
  );

  const screenHeight = Dimensions.get('window').height;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            maxHeight: screenHeight * 0.6,
            paddingBottom: spacing.xl,
          }}
        >
          <View
            style={{
              paddingVertical: spacing.lg,
              paddingHorizontal: spacing.xl,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>{title}</Text>
          </View>

          <FlatList
            ref={listRef}
            data={slots}
            keyExtractor={(item) => item}
            renderItem={renderItem}
            getItemLayout={(_, index) => ({
              length: 48,
              offset: 48 * index,
              index,
            })}
            style={{ maxHeight: screenHeight * 0.35 }}
            showsVerticalScrollIndicator={false}
          />

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
            }}
          >
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...typography.body, color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(selected)}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radii.md,
                backgroundColor: colors.primary,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...typography.body, color: '#fff', fontWeight: '600' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
