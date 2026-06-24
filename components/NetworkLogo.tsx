import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MtnLogo from '../assets/mtn-new-logo.svg';
import GloLogo from '../assets/icons8-glo.svg';
import AirtelLogo from '../assets/bharti-airtel-limited.svg';
import NineMobileLogo from '../assets/9mobile-1.svg';
import { NetworkLogoKey } from '../constants/countries';

const LOGOS: Record<NetworkLogoKey, React.FC<{ width: number; height: number }>> = {
  MTN: MtnLogo,
  GLO: GloLogo,
  AIRTEL: AirtelLogo,
  '9MOBILE': NineMobileLogo,
};

interface NetworkLogoProps {
  /** SVG logo key, if the network has a bundled logo. */
  logo?: NetworkLogoKey;
  /** Network display name — used for the fallback initial. */
  name?: string;
  /** Fallback badge color when there's no bundled logo. */
  color?: string;
  size?: number;
  rounded?: boolean;
}

export function NetworkLogo({
  logo,
  name = '?',
  color = '#6B7280',
  size = 40,
  rounded = true,
}: NetworkLogoProps) {
  const radius = rounded ? size / 4 : 0;

  // Fallback: colored badge with the network's initial.
  if (!logo || !LOGOS[logo]) {
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: radius, backgroundColor: color },
        ]}
      >
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  const Logo = LOGOS[logo];
  const inner = Math.round(size * 0.72);
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius, backgroundColor: '#FFFFFF' },
      ]}
    >
      <Logo width={inner} height={inner} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
