import React from 'react';
import { View, StyleSheet } from 'react-native';
import MtnLogo from '../assets/mtn-new-logo.svg';
import GloLogo from '../assets/icons8-glo.svg';
import AirtelLogo from '../assets/bharti-airtel-limited.svg';
import NineMobileLogo from '../assets/9mobile-1.svg';
import { Network } from '../constants/networks';

const LOGOS: Record<Network['id'], React.FC<{ width: number; height: number }>> = {
  MTN: MtnLogo,
  GLO: GloLogo,
  AIRTEL: AirtelLogo,
  '9MOBILE': NineMobileLogo,
};

interface NetworkLogoProps {
  id: Network['id'];
  size?: number;
  rounded?: boolean;
}

export function NetworkLogo({ id, size = 40, rounded = true }: NetworkLogoProps) {
  const Logo = LOGOS[id];
  const inner = Math.round(size * 0.72);
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: rounded ? size / 4 : 0,
        },
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
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
