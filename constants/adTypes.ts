export interface AdType {
  id: number;
  name: string;
  points: number;
  durationSeconds: number;
  tier: 'premium' | 'standard' | 'basic' | 'mini';
  description: string;
  iconColor: string;
  iconSurface: string;
}

import { EARN_POINTS } from './earn';

export const AD_TYPES: AdType[] = [
  {
    id: 1,
    name: 'Rewarded Video Ad',
    points: EARN_POINTS.rewardedAd,
    durationSeconds: 30,
    tier: 'premium',
    description: 'Watch a short video to earn points',
    iconColor: '#8B5CF6',
    iconSurface: '#EDE9FE',
  },
];
