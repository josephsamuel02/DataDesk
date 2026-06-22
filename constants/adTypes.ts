export interface AdType {
  id: number;
  name: string;
  points: number;
  durationSeconds: number;
  tier: 'premium' | 'standard' | 'basic' | 'mini';
  description: string;
  gradientColors: string[];
  starsCount: number;
}

export const AD_TYPES: AdType[] = [
  {
    id: 1,
    name: 'Full Screen Video',
    points: 4,
    durationSeconds: 30,
    tier: 'premium',
    description: 'Watch a full 30-second video ad',
    gradientColors: ['#15803D', '#14532D'],
    starsCount: 4,
  },
  {
    id: 2,
    name: 'Banner Plus',
    points: 3,
    durationSeconds: 20,
    tier: 'standard',
    description: 'Watch a medium video ad',
    gradientColors: ['#16A34A', '#15803D'],
    starsCount: 3,
  },
  {
    id: 3,
    name: 'Standard Ad',
    points: 2,
    durationSeconds: 15,
    tier: 'basic',
    description: 'Watch a standard banner ad',
    gradientColors: ['#22C55E', '#16A34A'],
    starsCount: 2,
  },
  {
    id: 4,
    name: 'Mini Ad',
    points: 1,
    durationSeconds: 10,
    tier: 'mini',
    description: 'Quick mini ad — fast points!',
    gradientColors: ['#4ADE80', '#22C55E'],
    starsCount: 1,
  },
];
