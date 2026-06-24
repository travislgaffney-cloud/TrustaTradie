import {
  addMonths,
  format,
  getDaysInMonth,
  getDay,
  isBefore,
  isToday,
  startOfDay,
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
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MINUTES = [0, 15, 30, 45];
const MIN_HOUR = 6;
const MAX_HOUR = 20;

export function DateTimePickerModal({ visible, onClose, onConfirm }: Props) {
  const today = startOfDay(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [hour, setHour] = useState(8);
  const [minuteIdx, setMinuteIdx] = useState(0);

  function gridCells() {
    const firstDow = getDay(startOfMonth(viewDate)); // 0=Sun
    const offset = (firstDow + 6) % 7; // convert to Mon-first
    const total = getDaysInMonth(viewDate);
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }

  function selectDay(day: number) {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (isBefore(d, today)) return;
    setSelected(d);
  }

  function isSelected(day: number) {
    return (
      selected !== null &&
      selected.getFullYear() === viewDate.getFullYear() &&
      selected.getMonth() === viewDate.getMonth() &&
      selected.getDate() === day
    );
  }

  function isPast(day: number) {
    return isBefore(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), day),
      today
    );
  }

  function handleConfirm() {
    if (!selected) return;
    const dt = new Date(selected);
    dt.setHours(hour, MINUTES[minuteIdx], 0, 0);
    onConfirm(dt);
    onClose();
  }

  const cells = gridCells();
  const previewDate = selected
    ? new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour, MINUTES[minuteIdx])
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Book a Date & Time</Text>
          <Pressable onPress={handleConfirm} disabled={!selected} style={styles.headerBtn}>
            <Text style={[styles.confirmText, !selected && styles.confirmDis]}>Confirm</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Month navigation */}
          <View style={styles.monthRow}>
            <Pressable onPress={() => setViewDate(subMonths(viewDate, 1))} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{format(viewDate, 'MMMM yyyy')}</Text>
            <Pressable onPress={() => setViewDate(addMonths(viewDate, 1))} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={styles.cell} />;
              const past = isPast(day);
              const sel = isSelected(day);
              const tod = isToday(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
              return (
                <Pressable
                  key={day}
                  style={[styles.cell, sel && styles.cellSelected, tod && !sel && styles.cellToday]}
                  onPress={() => selectDay(day)}
                >
                  <Text style={[styles.dayNum, past && styles.dayPast, sel && styles.dayNumSel, tod && !sel && styles.dayNumToday]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Time picker */}
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Select Time</Text>
          <View style={styles.timePicker}>
            {/* Hour */}
            <View style={styles.timeUnit}>
              <Pressable style={styles.timeBtn} onPress={() => setHour((h) => Math.min(MAX_HOUR, h + 1))}>
                <Text style={styles.timeBtnTxt}>▲</Text>
              </Pressable>
              <Text style={styles.timeVal}>{String(hour).padStart(2, '0')}</Text>
              <Pressable style={styles.timeBtn} onPress={() => setHour((h) => Math.max(MIN_HOUR, h - 1))}>
                <Text style={styles.timeBtnTxt}>▼</Text>
              </Pressable>
            </View>
            <Text style={styles.timeSep}>:</Text>
            {/* Minute */}
            <View style={styles.timeUnit}>
              <Pressable style={styles.timeBtn} onPress={() => setMinuteIdx((i) => (i + 1) % MINUTES.length)}>
                <Text style={styles.timeBtnTxt}>▲</Text>
              </Pressable>
              <Text style={styles.timeVal}>{String(MINUTES[minuteIdx]).padStart(2, '0')}</Text>
              <Pressable style={styles.timeBtn} onPress={() => setMinuteIdx((i) => (i - 1 + MINUTES.length) % MINUTES.length)}>
                <Text style={styles.timeBtnTxt}>▼</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.timeHint}>Minutes snap to 00 · 15 · 30 · 45</Text>

          {previewDate && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Proposing:</Text>
              <Text style={styles.previewDate}>
                {format(previewDate, "EEEE, d MMMM yyyy 'at' HH:mm")}
              </Text>
            </View>
          )}
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
  confirmDis: { color: '#cbd5e1' },
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
  dayPast: { color: '#d1d5db' },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  timePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  timeUnit: { alignItems: 'center', gap: 10 },
  timeBtn: {
    width: 52,
    height: 38,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnTxt: { fontSize: 18, color: '#334155' },
  timeVal: { fontSize: 36, fontWeight: '800', color: '#0f172a', width: 60, textAlign: 'center' },
  timeSep: { fontSize: 30, fontWeight: '700', color: '#94a3b8', marginBottom: 24 },
  timeHint: { textAlign: 'center', fontSize: 12, color: '#94a3b8' },
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
