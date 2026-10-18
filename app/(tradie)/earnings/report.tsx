import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTradieReport, type TradieReportRow } from '@/hooks/use-transactions';
import { useAuthStore } from '@/store/auth-store';

function startOfSaTaxYear(reference: Date): Date {
  // SA tax year runs 1 March -> end of February
  const year = reference.getMonth() >= 2 ? reference.getFullYear() : reference.getFullYear() - 1;
  return new Date(year, 2, 1);
}

function endOfMonthDay(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function SarsReportScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();

  const now = new Date();
  const [start, setStart] = useState(startOfSaTaxYear(now));
  const [end, setEnd] = useState(now);
  const [pickerOpen, setPickerOpen] = useState<'start' | 'end' | null>(null);
  const [rows, setRows] = useState<TradieReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  function applyPreset(preset: 'thisMonth' | 'lastMonth' | 'thisTaxYear' | 'lastTaxYear') {
    const today = new Date();
    if (preset === 'thisMonth') {
      setStart(new Date(today.getFullYear(), today.getMonth(), 1));
      setEnd(today);
    } else if (preset === 'lastMonth') {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setStart(lastMonthStart);
      setEnd(new Date(today.getFullYear(), today.getMonth(), 0));
    } else if (preset === 'thisTaxYear') {
      setStart(startOfSaTaxYear(today));
      setEnd(today);
    } else {
      const thisYearStart = startOfSaTaxYear(today);
      const lastYearStart = new Date(thisYearStart.getFullYear() - 1, 2, 1);
      setStart(lastYearStart);
      setEnd(new Date(thisYearStart.getFullYear(), 1, endOfMonthDay(thisYearStart.getFullYear(), 1)));
    }
  }

  async function handleGenerate() {
    if (!user) return;
    setLoading(true);
    try {
      const startIso = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0).toISOString();
      const endIso = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString();
      const data = await getTradieReport(user.id, startIso, endIso);
      setRows(data);
      setHasRun(true);
    } catch {
      Alert.alert('Error', 'Could not generate the report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const header = [
        'Invoice Number', 'Date Released', 'Job Title', 'Category', 'Customer',
        'Gross Job Amount (ZAR)', 'Commission Paid (ZAR)', 'Your Revenue (ZAR)', 'Invoice VAT (ZAR)',
      ].join(',');
      const csvEscape = (v: unknown) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = rows.map((r) =>
        [
          r.invoiceNumber, format(new Date(r.releasedDate), 'yyyy-MM-dd'), r.jobTitle, r.jobCategory,
          r.customerName, r.grossAmount.toFixed(2), r.commissionAmount.toFixed(2), r.payout.toFixed(2),
          r.invoiceVatAmount != null ? r.invoiceVatAmount.toFixed(2) : '',
        ].map(csvEscape).join(',')
      );
      const csv = [header, ...lines].join('\n');

      const fileUri = `${FileSystem.cacheDirectory}sars-report-${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export SARS Report' });
      } else {
        Alert.alert('Sharing unavailable', 'Could not share the file on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not export the report. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.grossAmount,
      commission: acc.commission + r.commissionAmount,
      revenue: acc.revenue + r.payout,
    }),
    { gross: 0, commission: 0, revenue: 0 }
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>SARS Report</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Presets */}
        <View style={styles.presetRow}>
          {([
            ['thisMonth', 'This Month'],
            ['lastMonth', 'Last Month'],
            ['thisTaxYear', 'This Tax Year'],
            ['lastTaxYear', 'Last Tax Year'],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => applyPreset(key)}
              style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.presetText, { color: colors.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Date range */}
        <Card style={styles.dateCard}>
          <Pressable style={styles.dateRow} onPress={() => setPickerOpen('start')}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Start Date</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{format(start, 'dd MMM yyyy')}</Text>
          </Pressable>
          <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.dateRow} onPress={() => setPickerOpen('end')}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>End Date</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{format(end, 'dd MMM yyyy')}</Text>
          </Pressable>
        </Card>

        <Button size="lg" loading={loading} onPress={handleGenerate}>
          Generate Report
        </Button>

        {hasRun && (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Jobs</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{rows.length}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gross Value</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>R{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Commission Paid</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>R{totals.commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                <Text style={[styles.statLabel, { color: '#166534' }]}>Your Revenue</Text>
                <Text style={[styles.statValue, { color: '#166534' }]}>R{totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>

            <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
              "Your Revenue" is what you actually received after TrustaTradie's commission — this is your
              taxable income for the period. Commission Paid is a deductible business expense. This report is
              a data export, not tax advice — confirm treatment with your accountant before filing.
            </Text>

            {rows.length > 0 && (
              <Button variant="secondary" loading={exporting} onPress={handleExport}>
                📥 Export & Share CSV
              </Button>
            )}

            {rows.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                No paid-out jobs in this date range.
              </Text>
            ) : (
              rows.map((r) => (
                <Card key={r.transactionId} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {r.jobTitle ?? 'Job'}
                    </Text>
                    <Text style={[styles.rowAmount, { color: '#166534' }]}>R{r.payout.toFixed(2)}</Text>
                  </View>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                    {r.customerName ?? 'Customer'} · {format(new Date(r.releasedDate), 'dd MMM yyyy')}
                    {r.invoiceNumber ? ` · ${r.invoiceNumber}` : ''}
                  </Text>
                  <Text style={[styles.rowBreakdown, { color: colors.textSecondary }]}>
                    Gross R{r.grossAmount.toFixed(2)} − Commission R{r.commissionAmount.toFixed(2)}
                  </Text>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      <DatePickerModal
        visible={pickerOpen === 'start'}
        title="Select Start Date"
        initialDate={start}
        onClose={() => setPickerOpen(null)}
        onConfirm={setStart}
      />
      <DatePickerModal
        visible={pickerOpen === 'end'}
        title="Select End Date"
        initialDate={end}
        onClose={() => setPickerOpen(null)}
        onConfirm={setEnd}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  presetText: { fontSize: 13, fontWeight: '600' },
  dateCard: { gap: 0 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  dateLabel: { fontSize: 14 },
  dateValue: { fontSize: 15, fontWeight: '700' },
  dateDivider: { height: 1 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: '900' },
  disclaimer: { fontSize: 12, lineHeight: 17 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  rowCard: { gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  rowAmount: { fontSize: 16, fontWeight: '800' },
  rowMeta: { fontSize: 12 },
  rowBreakdown: { fontSize: 12 },
});
