import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';

export interface DataPackage {
  id: string;
  label: string;
  points: number;
  validity: string;
  gb: number;
}

interface DataPackageCardProps {
  pkg: DataPackage;
  selected: boolean;
  userPoints: number;
  onSelect: (pkg: DataPackage) => void;
}

export function DataPackageCard({
  pkg,
  selected,
  userPoints,
  onSelect,
}: DataPackageCardProps) {
  const canAfford = userPoints >= pkg.points;
  const shortfall = pkg.points - userPoints;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        !canAfford && styles.cardAffordable,
      ]}
      onPress={() => onSelect(pkg)}
      activeOpacity={0.8}
      disabled={!canAfford}
    >
      {selected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓</Text>
        </View>
      )}
      <Text style={[styles.dataSize, selected && styles.textSelected]}>
        {pkg.label}
      </Text>
      <View style={styles.pointsRow}>
        <Text style={styles.star}>⭐</Text>
        <Text style={[styles.points, selected && styles.textSelected]}>
          {pkg.points} pts
        </Text>
      </View>
      <Text style={[styles.validity, selected && styles.validitySelected]}>
        {pkg.validity}
      </Text>
      {!canAfford && (
        <Text style={styles.shortfall}>Need {shortfall} more pts</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.border,
    minWidth: 90,
    gap: 4,
    position: 'relative',
    ...THEME.shadow.small,
  },
  cardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primarySurface,
    ...THEME.shadow.glow,
  },
  cardAffordable: {
    opacity: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: THEME.fontWeight.bold,
  },
  dataSize: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },
  textSelected: {
    color: THEME.colors.primary,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    fontSize: 12,
  },
  points: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  validity: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },
  validitySelected: {
    color: THEME.colors.primary,
  },
  shortfall: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.error,
    textAlign: 'center',
  },
});
