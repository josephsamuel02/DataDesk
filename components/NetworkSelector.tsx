import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { NETWORKS, Network } from '../constants/networks';

interface NetworkSelectorProps {
  selected: Network['id'] | null;
  onSelect: (network: Network) => void;
}

export function NetworkSelector({ selected, onSelect }: NetworkSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {NETWORKS.map((network) => {
        const isSelected = selected === network.id;
        return (
          <TouchableOpacity
            key={network.id}
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? network.color : THEME.colors.card,
                borderColor: network.color,
                borderWidth: 2,
              },
              isSelected && THEME.shadow.medium,
            ]}
            onPress={() => onSelect(network)}
            activeOpacity={0.8}
          >
            <Text style={styles.emoji}>{network.emoji}</Text>
            <Text
              style={[
                styles.name,
                { color: isSelected ? network.textColor : THEME.colors.text },
              ]}
            >
              {network.id}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 2,
    gap: 10,
    paddingVertical: 4,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 72,
    gap: 4,
    ...THEME.shadow.small,
  },
  emoji: {
    fontSize: 20,
  },
  name: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
  },
});
