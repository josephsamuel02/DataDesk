// ─── Country & per-country network configuration ────────────────────────────
// Only TIER 1 launch countries are configured for data purchasing for now:
// Nigeria · Ghana · Kenya · Uganda
// Users from other countries can still register and watch ads to earn points,
// they just cannot redeem/buy data until their country is supported.

export type NetworkLogoKey = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';

export interface CountryNetwork {
  id: string;
  name: string;
  /** Which bundled SVG logo to render, if any. Falls back to an initials badge. */
  logo?: NetworkLogoKey;
  color: string;
}

export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "NG" */
  code: string;
  name: string;
  /** International dial code including the leading "+", e.g. "+234" */
  dialCode: string;
  flag: string;
  currency: string;
  /** Length of the national number after the trunk "0" / dial code. */
  nsnLength: number;
  /** Vendor key used to resolve the data vendor API from env (see dataVendorService). */
  vendorKey: string;
  networks: CountryNetwork[];
}

// Tier 1 countries are the only ones supported for data purchasing.
export const SUPPORTED_COUNTRIES: Country[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    flag: '🇳🇬',
    currency: 'NGN',
    nsnLength: 10,
    vendorKey: 'NG',
    networks: [
      { id: 'MTN', name: 'MTN', logo: 'MTN', color: '#FFC107' },
      { id: 'AIRTEL', name: 'Airtel', logo: 'AIRTEL', color: '#E53935' },
      { id: 'GLO', name: 'Glo', logo: 'GLO', color: '#4CAF50' },
      { id: '9MOBILE', name: '9mobile', logo: '9MOBILE', color: '#00897B' },
    ],
  },
  {
    code: 'GH',
    name: 'Ghana',
    dialCode: '+233',
    flag: '🇬🇭',
    currency: 'GHS',
    nsnLength: 9,
    vendorKey: 'GH',
    networks: [
      { id: 'MTN', name: 'MTN', logo: 'MTN', color: '#FFC107' },
      { id: 'AIRTELTIGO', name: 'AirtelTigo', logo: 'AIRTEL', color: '#E53935' },
      { id: 'TELECEL', name: 'Telecel', color: '#D32F2F' },
    ],
  },
  {
    code: 'KE',
    name: 'Kenya',
    dialCode: '+254',
    flag: '🇰🇪',
    currency: 'KES',
    nsnLength: 9,
    vendorKey: 'KE',
    networks: [
      { id: 'SAFARICOM', name: 'Safaricom', color: '#43A047' },
      { id: 'AIRTEL', name: 'Airtel', logo: 'AIRTEL', color: '#E53935' },
      { id: 'TELKOM', name: 'Telkom', color: '#1976D2' },
    ],
  },
  {
    code: 'UG',
    name: 'Uganda',
    dialCode: '+256',
    flag: '🇺🇬',
    currency: 'UGX',
    nsnLength: 9,
    vendorKey: 'UG',
    networks: [
      { id: 'MTN', name: 'MTN', logo: 'MTN', color: '#FFC107' },
      { id: 'AIRTEL', name: 'Airtel', logo: 'AIRTEL', color: '#E53935' },
    ],
  },
];

/** Sentinel used when a user registers from a country we don't support yet. */
export const OTHER_COUNTRY_CODE = 'OTHER';

export function getCountryByCode(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return SUPPORTED_COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function isCountrySupported(code?: string | null): boolean {
  return !!getCountryByCode(code);
}

/**
 * Detect the country from an entered phone number.
 * Works on international format (e.g. "+233241234567" or "233241234567").
 * Returns the matching supported Country, or null if it can't be determined
 * or belongs to an unsupported country.
 */
export function detectCountryFromPhone(raw: string): Country | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Match the longest dial code first to avoid prefix collisions.
  const byLength = [...SUPPORTED_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );
  for (const country of byLength) {
    const cc = country.dialCode.replace('+', '');
    if (digits.startsWith(cc)) return country;
  }
  return null;
}

/**
 * Normalise a national or international number into E.164 for a given country.
 * Returns null when the number doesn't look valid for that country.
 */
export function formatPhoneForCountry(raw: string, country: Country): string | null {
  let digits = raw.replace(/\D/g, '');
  const cc = country.dialCode.replace('+', '');

  if (digits.startsWith(cc)) digits = digits.slice(cc.length);
  // Drop a single trunk "0" if present.
  if (digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length !== country.nsnLength) return null;
  return `${country.dialCode}${digits}`;
}

/** Find a network's display info across all supported countries (for history, etc). */
export function findNetwork(id: string): CountryNetwork | undefined {
  for (const country of SUPPORTED_COUNTRIES) {
    const match = country.networks.find((n) => n.id === id);
    if (match) return match;
  }
  return undefined;
}
