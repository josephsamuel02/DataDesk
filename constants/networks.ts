export interface Network {
  id: 'GLO' | 'MTN' | 'AIRTEL' | '9MOBILE';
  name: string;
  color: string;
  textColor: string;
  shortCode: string;
}

export const NETWORKS: Network[] = [
  {
    id: 'GLO',
    name: 'Glo Nigeria',
    color: '#4CAF50',
    textColor: '#FFFFFF',
    shortCode: '07',
  },
  {
    id: 'MTN',
    name: 'MTN Nigeria',
    color: '#FFC107',
    textColor: '#1A1A2E',
    shortCode: '08',
  },
  {
    id: 'AIRTEL',
    name: 'Airtel Nigeria',
    color: '#E53935',
    textColor: '#FFFFFF',
    shortCode: '08',
  },
  {
    id: '9MOBILE',
    name: '9mobile Nigeria',
    color: '#00897B',
    textColor: '#FFFFFF',
    shortCode: '08',
  },
];

export const DATA_PLANS = [
  { id: '500mb', label: '500MB', points: 50, validity: '7 days', gb: 0.5 },
  { id: '1gb', label: '1GB', points: 100, validity: '30 days', gb: 1 },
  { id: '2gb', label: '2GB', points: 180, validity: '30 days', gb: 2 },
  { id: '5gb', label: '5GB', points: 400, validity: '30 days', gb: 5 },
  { id: '10gb', label: '10GB', points: 700, validity: '30 days', gb: 10 },
];

export const DIRECT_PURCHASE_PLANS = [
  { id: '500mb', label: '500MB', price: 150, validity: '7 days' },
  { id: '1gb', label: '1GB', price: 300, validity: '30 days' },
  { id: '2gb', label: '2GB', price: 500, validity: '30 days' },
  { id: '5gb', label: '5GB', price: 1200, validity: '30 days' },
  { id: '10gb', label: '10GB', price: 2000, validity: '30 days' },
];
