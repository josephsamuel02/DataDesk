// ─── Data Vendor Abstraction Layer ──────────────────────────────────────────
// Compatible with: Clubkonnect, GsubzApi, Nellobytesystems
// Set EXPO_PUBLIC_VENDOR_MOCK=true to use mock mode in development

const BASE_URL = process.env.EXPO_PUBLIC_VENDOR_API_URL ?? '';
const API_KEY = process.env.EXPO_PUBLIC_VENDOR_API_KEY ?? '';
const MOCK_MODE = process.env.EXPO_PUBLIC_VENDOR_MOCK === 'true';

export interface DataVendorConfig {
  baseUrl: string;
  apiKey: string;
}

export interface RechargePayload {
  phone: string;
  network: 'GLO' | 'MTN' | 'AIRTEL' | '9MOBILE';
  dataPlan: string;
  requestId: string;
}

export interface RechargeResult {
  success: boolean;
  transactionId?: string;
  message: string;
}

export interface DataPlan {
  id: string;
  name: string;
  size: string;
  validity: string;
  price?: number;
  points?: number;
}

// ─── Mock responses for development ─────────────────────────────────────────

const MOCK_PLANS: Record<string, DataPlan[]> = {
  GLO: [
    { id: 'glo_500mb', name: '500MB', size: '500MB', validity: '7 days' },
    { id: 'glo_1gb', name: '1GB', size: '1GB', validity: '30 days' },
    { id: 'glo_2gb', name: '2GB', size: '2GB', validity: '30 days' },
    { id: 'glo_5gb', name: '5GB', size: '5GB', validity: '30 days' },
    { id: 'glo_10gb', name: '10GB', size: '10GB', validity: '30 days' },
  ],
  MTN: [
    { id: 'mtn_500mb', name: '500MB', size: '500MB', validity: '7 days' },
    { id: 'mtn_1gb', name: '1GB', size: '1GB', validity: '30 days' },
    { id: 'mtn_2gb', name: '2GB', size: '2GB', validity: '30 days' },
    { id: 'mtn_5gb', name: '5GB', size: '5GB', validity: '30 days' },
    { id: 'mtn_10gb', name: '10GB', size: '10GB', validity: '30 days' },
  ],
  AIRTEL: [
    { id: 'airtel_500mb', name: '500MB', size: '500MB', validity: '7 days' },
    { id: 'airtel_1gb', name: '1GB', size: '1GB', validity: '30 days' },
    { id: 'airtel_2gb', name: '2GB', size: '2GB', validity: '30 days' },
    { id: 'airtel_5gb', name: '5GB', size: '5GB', validity: '30 days' },
    { id: 'airtel_10gb', name: '10GB', size: '10GB', validity: '30 days' },
  ],
  '9MOBILE': [
    { id: '9mobile_500mb', name: '500MB', size: '500MB', validity: '7 days' },
    { id: '9mobile_1gb', name: '1GB', size: '1GB', validity: '30 days' },
    { id: '9mobile_2gb', name: '2GB', size: '2GB', validity: '30 days' },
    { id: '9mobile_5gb', name: '5GB', size: '5GB', validity: '30 days' },
    { id: '9mobile_10gb', name: '10GB', size: '10GB', validity: '30 days' },
  ],
};

// ─── Recharge data to a Nigerian phone number ────────────────────────────────

export async function rechargeData(payload: RechargePayload): Promise<RechargeResult> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true,
      transactionId: `MOCK_${Date.now()}`,
      message: 'Mock recharge successful! Your data will be credited shortly.',
    };
  }

  // TODO: Replace with actual vendor endpoint
  // Compatible with Clubkonnect: POST /api/topup
  // Compatible with GsubzApi: POST /v1/data
  // Compatible with Nellobytesystems: POST /api/data/purchase
  try {
    const response = await fetch(`${BASE_URL}/api/data/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        phone: payload.phone,
        network: payload.network.toLowerCase(),
        plan: payload.dataPlan,
        request_id: payload.requestId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message ?? 'Recharge failed. Please try again.' };
    }

    return {
      success: true,
      transactionId: data.transaction_id ?? data.ref,
      message: 'Recharge successful!',
    };
  } catch (err: any) {
    return { success: false, message: err.message ?? 'Network error. Please try again.' };
  }
}

// ─── Get available data plans for a network ──────────────────────────────────

export async function getDataPlans(network: string): Promise<DataPlan[]> {
  if (MOCK_MODE) {
    return MOCK_PLANS[network] ?? [];
  }

  // TODO: Replace with actual vendor endpoint
  try {
    const response = await fetch(`${BASE_URL}/api/plans?network=${network.toLowerCase()}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await response.json();
    return data.plans ?? [];
  } catch {
    return MOCK_PLANS[network] ?? [];
  }
}

// ─── Check vendor wallet balance ─────────────────────────────────────────────

export async function checkBalance(): Promise<number> {
  if (MOCK_MODE) {
    return 50000;
  }

  // TODO: Replace with actual vendor endpoint
  try {
    const response = await fetch(`${BASE_URL}/api/balance`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await response.json();
    return data.balance ?? 0;
  } catch {
    return 0;
  }
}
