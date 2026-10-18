import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui/input';
import { Brand } from '@/constants/theme';
import { normalizeTown } from '@/lib/towns';

interface TownSelectorProps {
  towns: string[];
  onChange: (towns: string[]) => void;
}

export function TownSelector({ towns, onChange }: TownSelectorProps) {
  const [input, setInput] = useState('');

  function addTown() {
    const normalized = normalizeTown(input);
    if (!normalized) return;
    if (towns.some((t) => t.toLowerCase() === normalized.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...towns, normalized]);
    setInput('');
  }

  function removeTown(town: string) {
    onChange(towns.filter((t) => t !== town));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.addRow}>
        <View style={{ flex: 1 }}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="e.g. Sandton"
            onSubmitEditing={addTown}
            returnKeyType="done"
          />
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: Brand.primary }]} onPress={addTown}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {towns.length > 0 && (
        <View style={styles.chips}>
          {towns.map((town) => (
            <View key={town} style={[styles.chip, { backgroundColor: Brand.primaryLight, borderColor: Brand.primary }]}>
              <Text style={[styles.chipText, { color: Brand.primaryDark }]}>{town}</Text>
              <Pressable onPress={() => removeTown(town)} hitSlop={8}>
                <Text style={styles.chipRemove}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  addBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 13 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipRemove: { fontSize: 13, fontWeight: '700', color: '#64748b' },
});
