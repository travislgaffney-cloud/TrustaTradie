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
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScheduledJobs } from '@/hooks/use-calendar';
import { useAuthStore } from '@/store/auth-store';
import type { Job } from '@/types/database';

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function gridCells(viewDate: Date): (number | null)[] {
  const firstDow = getDay(startOfMonth(viewDate));
  const offset = (firstDow + 6) % 7;
  const total = getDaysInMonth(viewDate);
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
}

function jobsForDay(jobs: Job[], year: number, month: number, day: number): Job[] {
  return jobs.filter((j) => {
    if (!j.scheduled_at) return false;
    const d = new Date(j.scheduled_at);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

function hasJobOnDay(jobs: Job[], year: number, month: number, day: number): boolean {
  return jobs.some((j) => {
    if (!j.scheduled_at) return false;
    const d = new Date(j.scheduled_at);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

export function CalendarScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuthStore();
  const { jobs, loading, refresh } = useScheduledJobs();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = useMemo(() => gridCells(viewDate), [viewDate]);

  const dayJobs = useMemo(
    () => jobsForDay(jobs, selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()),
    [jobs, selectedDay]
  );

  const isTradie = profile?.role === 'tradie';

  function navigateToJob(job: Job) {
    if (isTradie) {
      router.push(`/(tradie)/active-jobs/${job.id}`);
    } else {
      router.push(`/(customer)/jobs/${job.id}`);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Calendar</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Brand.primary} />}
        >
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <Pressable onPress={() => setViewDate(subMonths(viewDate, 1))} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {format(viewDate, 'MMMM yyyy')}
            </Text>
            <Pressable onPress={() => setViewDate(addMonths(viewDate, 1))} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>

          {/* Week day headers */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={[styles.weekDay, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={styles.cell} />;
              const cellDate = new Date(year, month, day);
              const isSelected = isSameDay(cellDate, selectedDay);
              const isTod = isToday(cellDate);
              const hasJob = hasJobOnDay(jobs, year, month, day);
              return (
                <Pressable
                  key={day}
                  style={[styles.cell, isSelected && styles.cellSelected, isTod && !isSelected && styles.cellToday]}
                  onPress={() => setSelectedDay(cellDate)}
                >
                  <Text style={[
                    styles.dayNum,
                    { color: colors.text },
                    isSelected && styles.dayNumSel,
                    isTod && !isSelected && styles.dayNumToday,
                  ]}>
                    {day}
                  </Text>
                  {hasJob && (
                    <View style={[styles.dot, isSelected && styles.dotSelected]} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Agenda */}
          <View style={[styles.agendaHeader, { borderTopColor: colors.border }]}>
            <Text style={[styles.agendaDate, { color: colors.text }]}>
              {format(selectedDay, 'EEEE, d MMMM yyyy')}
            </Text>
          </View>

          {dayJobs.length === 0 ? (
            <View style={styles.noJobs}>
              <Text style={styles.noJobsIcon}>📭</Text>
              <Text style={[styles.noJobsText, { color: colors.textSecondary }]}>No jobs booked on this day</Text>
            </View>
          ) : (
            <View style={styles.jobList}>
              {dayJobs.map((job) => (
                <Pressable
                  key={job.id}
                  style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => navigateToJob(job)}
                >
                  <View style={[styles.timeBadge, { backgroundColor: Brand.primaryLight }]}>
                    <Text style={[styles.timeText, { color: Brand.primaryDark }]}>
                      {format(new Date(job.scheduled_at!), 'HH:mm')}
                    </Text>
                  </View>
                  <View style={styles.jobInfo}>
                    <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text style={[styles.jobAddr, { color: colors.textSecondary }]} numberOfLines={1}>
                      {job.suburb ?? job.address_text}
                    </Text>
                  </View>
                  <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Upcoming section */}
          {jobs.length > 0 && (
            <>
              <Text style={[styles.upcomingTitle, { color: colors.text }]}>All Upcoming</Text>
              <View style={styles.jobList}>
                {jobs.map((job) => (
                  <Pressable
                    key={job.id}
                    style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => navigateToJob(job)}
                  >
                    <View style={[styles.timeBadge, { backgroundColor: Brand.primaryLight }]}>
                      <Text style={[styles.timeText, { color: Brand.primaryDark }]}>
                        {format(new Date(job.scheduled_at!), 'HH:mm')}
                      </Text>
                    </View>
                    <View style={styles.jobInfo}>
                      <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={[styles.jobAddr, { color: colors.textSecondary }]} numberOfLines={1}>
                        {format(new Date(job.scheduled_at!), 'EEE d MMM')} · {job.suburb ?? job.address_text}
                      </Text>
                    </View>
                    <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 60 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 15 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: Brand.primary, lineHeight: 32 },
  monthLabel: { fontSize: 18, fontWeight: '800' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 8 },
  cell: {
    width: '14.285714%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellSelected: { backgroundColor: Brand.primary, borderRadius: 100 },
  cellToday: { borderRadius: 100, borderWidth: 1.5, borderColor: Brand.primary },
  dayNum: { fontSize: 14 },
  dayNumSel: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: Brand.primary, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Brand.primary },
  dotSelected: { backgroundColor: '#fff' },
  agendaHeader: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  agendaDate: { fontSize: 15, fontWeight: '700' },
  noJobs: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noJobsIcon: { fontSize: 32 },
  noJobsText: { fontSize: 14 },
  jobList: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  timeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  timeText: { fontSize: 14, fontWeight: '800' },
  jobInfo: { flex: 1, gap: 2 },
  jobTitle: { fontSize: 14, fontWeight: '700' },
  jobAddr: { fontSize: 12 },
  arrow: { fontSize: 22 },
  upcomingTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
});
