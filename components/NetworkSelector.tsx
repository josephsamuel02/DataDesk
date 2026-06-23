import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { NETWORKS, Network } from '../constants/networks';
import { NetworkLogo } from './NetworkLogo';

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
              isSelected && styles.cardSelected,
              isSelected && THEME.shadow.medium,
            ]}
            onPress={() => onSelect(network)}
            activeOpacity={0.8}
          >
            <NetworkLogo id={network.id} size={56} />
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
    padding: 10,
    borderRadius: 14,
    backgroundColor: THEME.colors.card,
    ...THEME.shadow.small,
  },
  cardSelected: {
    backgroundColor: THEME.colors.primarySurface,
  },
});
