import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Network } from '../constants/networks';
import { NetworkLogo } from './NetworkLogo';

interface NetworkSelectorProps {
  networks: Network[];
  selected: string | null;
  onSelect: (network: Network) => void;
}

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {networks.map((network) => {
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
            <NetworkLogo
              logo={network.logo}
              name={network.name}
              color={network.color}
              size={56}
            />
            {!network.logo && (
              <Text style={styles.name} numberOfLines={1}>
                {network.name}
              </Text>
            )}
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
    gap: 6,
    minWidth: 76,
    ...THEME.shadow.small,
  },
  cardSelected: {
    backgroundColor: THEME.colors.primarySurface,
  },
  name: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
});
