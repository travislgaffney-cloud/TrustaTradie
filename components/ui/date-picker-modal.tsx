import {
  addMonths,
  format,
  getDaysInMonth,
  getDay,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Brand } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  initialDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DatePickerModal({ visible, title, initialDate, onClose, onConfirm }: Props) {
  const [viewDate, setViewDate] = useState(initialDate);
  const [selected, setSelected] = useState<Date>(initialDate);

  function gridCells() {
    const firstDow = getDay(startOfMonth(viewDate)); // 0=Sun
    const offset = (firstDow + 6) % 7; // convert to Mon-first
    const total = getDaysInMonth(viewDate);
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }

  function selectDay(day: number) {
    setSelected(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  }

  function isSelected(day: number) {
    return isSameDay(selected, new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  }

  function handleConfirm() {
    onConfirm(selected);
    onClose();
  }

  const cells = gridCells();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={handleConfirm} style={styles.headerBtn}>
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => setViewDate(subMonths(viewDate, 1))} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{format(viewDate, 'MMMM yyyy')}</Text>
            <Pressable onPress={() => setViewDate(addMonths(viewDate, 1))} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={styles.cell} />;
              const sel = isSelected(day);
              const tod = isToday(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
              return (
                <Pressable
                  key={day}
                  style={[styles.cell, sel && styles.cellSelected, tod && !sel && styles.cellToday]}
                  onPress={() => selectDay(day)}
                >
                  <Text style={[styles.dayNum, sel && styles.dayNumSel, tod && !sel && styles.dayNumToday]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Selected:</Text>
            <Text style={styles.previewDate}>{format(selected, "EEEE, d MMMM yyyy")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBtn: { minWidth: 70 },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cancelText: { fontSize: 15, color: '#64748b' },
  confirmText: { fontSize: 15, fontWeight: '700', color: Brand.primary, textAlign: 'right' },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 26, color: '#334155', lineHeight: 30 },
  monthLabel: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#94a3b8', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: Brand.primary, borderRadius: 100 },
  cellToday: { borderRadius: 100, borderWidth: 1.5, borderColor: Brand.primary },
  dayNum: { fontSize: 15, color: '#1e293b' },
  dayNumSel: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: Brand.primary, fontWeight: '700' },
  preview: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  previewLabel: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  previewDate: { fontSize: 15, fontWeight: '700', color: '#15803d' },
});
