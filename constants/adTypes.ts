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

export const AD_TYPES: AdType[] = [
  {
    id: 1,
    name: 'Full Screen Video',
    points: 4,
    durationSeconds: 30,
    tier: 'premium',
    description: 'Watch 30s video ad',
    iconColor: '#8B5CF6',
    iconSurface: '#EDE9FE',
  },
  {
    id: 2,
    name: 'Banner Plus',
    points: 3,
    durationSeconds: 20,
    tier: 'standard',
    description: 'Watch 20s video ad',
    iconColor: '#22C55E',
    iconSurface: '#DCFCE7',
  },
  {
    id: 3,
    name: 'Standard Ad',
    points: 2,
    durationSeconds: 15,
    tier: 'basic',
    description: 'Watch 15s video ad',
    iconColor: '#3B82F6',
    iconSurface: '#DBEAFE',
  },
  {
    id: 4,
    name: 'Mini Ad',
    points: 1,
    durationSeconds: 10,
    tier: 'mini',
    description: 'Watch 10s ad',
    iconColor: '#F97316',
    iconSurface: '#FFEDD5',
  },
];
