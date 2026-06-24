// ─── Data Vendor Abstraction Layer ──────────────────────────────────────────
// Each TIER 1 country routes to its own data vendor, configured via env.
// Compatible with: Clubkonnect, GsubzApi, Nellobytesystems, Reloadly, etc.
// Set EXPO_PUBLIC_VENDOR_MOCK=true to use mock mode in development.

const MOCK_MODE = process.env.EXPO_PUBLIC_VENDOR_MOCK === 'true';

export interface DataVendorConfig {
  baseUrl: string;
  apiKey: string;
}

// Per-country vendor credentials (Tier 1). Keyed by ISO country code.
const VENDORS: Record<string, DataVendorConfig> = {
  NG: {
    baseUrl: process.env.EXPO_PUBLIC_VENDOR_NG_URL ?? process.env.EXPO_PUBLIC_VENDOR_API_URL ?? '',
    apiKey: process.env.EXPO_PUBLIC_VENDOR_NG_KEY ?? process.env.EXPO_PUBLIC_VENDOR_API_KEY ?? '',
  },
  GH: {
    baseUrl: process.env.EXPO_PUBLIC_VENDOR_GH_URL ?? '',
    apiKey: process.env.EXPO_PUBLIC_VENDOR_GH_KEY ?? '',
  },
  KE: {
    baseUrl: process.env.EXPO_PUBLIC_VENDOR_KE_URL ?? '',
    apiKey: process.env.EXPO_PUBLIC_VENDOR_KE_KEY ?? '',
  },
  UG: {
    baseUrl: process.env.EXPO_PUBLIC_VENDOR_UG_URL ?? '',
    apiKey: process.env.EXPO_PUBLIC_VENDOR_UG_KEY ?? '',
  },
};

function getVendor(countryCode?: string | null): DataVendorConfig | null {
  if (!countryCode) return null;
  return VENDORS[countryCode.toUpperCase()] ?? null;
}

/** Whether data purchasing is available for the given country. */
export function isVendorAvailable(countryCode?: string | null): boolean {
  return !!getVendor(countryCode);
}

export interface RechargePayload {
  phone: string;
  /** ISO country code (e.g. "NG") used to pick the right vendor. */
  countryCode: string;
  network: string;
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

  const vendor = getVendor(payload.countryCode);
  if (!vendor) {
    return {
      success: false,
      message: 'Data purchasing is not yet available in your country.',
    };
  }

  // TODO: Replace with actual vendor endpoint
  // Compatible with Clubkonnect: POST /api/topup
  // Compatible with GsubzApi: POST /v1/data
  // Compatible with Nellobytesystems: POST /api/data/purchase
  try {
    const response = await fetch(`${vendor.baseUrl}/api/data/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendor.apiKey}`,
      },
      body: JSON.stringify({
        phone: payload.phone,
        country: payload.countryCode,
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

export async function getDataPlans(network: string, countryCode?: string): Promise<DataPlan[]> {
  if (MOCK_MODE) {
    return MOCK_PLANS[network] ?? [];
  }

  const vendor = getVendor(countryCode);
  if (!vendor) return MOCK_PLANS[network] ?? [];

  // TODO: Replace with actual vendor endpoint
  try {
    const response = await fetch(`${vendor.baseUrl}/api/plans?network=${network.toLowerCase()}`, {
      headers: { Authorization: `Bearer ${vendor.apiKey}` },
    });
    const data = await response.json();
    return data.plans ?? [];
  } catch {
    return MOCK_PLANS[network] ?? [];
  }
}

// ─── Check vendor wallet balance ─────────────────────────────────────────────

export async function checkBalance(countryCode?: string): Promise<number> {
  if (MOCK_MODE) {
    return 50000;
  }

  const vendor = getVendor(countryCode);
  if (!vendor) return 0;

  // TODO: Replace with actual vendor endpoint
  try {
    const response = await fetch(`${vendor.baseUrl}/api/balance`, {
      headers: { Authorization: `Bearer ${vendor.apiKey}` },
    });
    const data = await response.json();
    return data.balance ?? 0;
  } catch {
    return 0;
  }
}
