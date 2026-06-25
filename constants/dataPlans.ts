import { DataPackage } from '../components/DataPackageCard';

// ─── VTU Africa active data plans ────────────────────────────────────────────
// Source: VTU Africa active data plan list (per network).
// Economy peg: 1 point = ₦1, so a plan's points cost == its Naira price.
// Keyed by the network id used in constants/countries.ts (uppercase).

export interface NetworkPlan extends DataPackage {
  /** Retail price in Naira. With the 1pt=₦1 peg, this equals `points`. */
  priceNaira: number;
}

function plan(id: string, label: string, gb: number, validity: string, priceNaira: number): NetworkPlan {
  return { id, label, gb, validity, priceNaira, points: priceNaira };
}

export const NETWORK_DATA_PLANS: Record<string, NetworkPlan[]> = {
  MTN: [
    plan('mtn_500mb', '500MB', 0.5, '7 Days', 340),
    plan('mtn_1gb', '1GB', 1, '30 Days', 780),
    plan('mtn_2gb', '2GB', 2, '30 Days', 1440),
    plan('mtn_3gb', '3GB', 3, '30 Days', 1780),
    plan('mtn_5gb', '5GB', 5, '7 Days', 1850),
    plan('mtn_6gb', '6GB', 6, '7 Days', 2465),
    plan('mtn_10gb', '10GB', 10, '30 Days', 4480),
  ],
  GLO: [
    plan('glo_50mb', '50MB', 0.05, '1 Day', 57),
    plan('glo_125mb', '125MB', 0.125, '1 Day', 103),
    plan('glo_260mb', '260MB', 0.26, '2 Days', 197),
    plan('glo_350mb', '350MB', 0.35, '1 Day', 105),
    plan('glo_750mb_night', '750MB', 0.75, '1 Night', 124),
    plan('glo_750mb_day', '750MB', 0.75, '1 Day', 210),
    plan('glo_125gb', '1.25GB', 1.25, 'Sunday Plan', 205),
    plan('glo_15gb', '1.5GB', 1.5, '1 Day', 305),
    plan('glo_25gb', '2.5GB', 2.5, '2 Days', 505),
    plan('glo_10gb', '10GB', 10, '7 Days', 2005),
  ],
  // VTU Africa currently lists no active Airtel data plans.
  AIRTEL: [],
  '9MOBILE': [
    plan('9mobile_250mb', '250MB', 0.25, '14 Days', 86),
    plan('9mobile_500mb', '500MB', 0.5, '30 Days', 140),
    plan('9mobile_35gb', '3.5GB', 3.5, '30 Days', 910),
    plan('9mobile_7gb', '7GB', 7, '30 Days', 1755),
    plan('9mobile_15gb', '15GB', 15, '30 Days', 3105),
  ],
};

/** Plans available for a given network id (empty if none/unsupported). */
export function getPlansForNetwork(networkId?: string | null): NetworkPlan[] {
  if (!networkId) return [];
  return NETWORK_DATA_PLANS[networkId.toUpperCase()] ?? [];
}

const ALL_PLANS: NetworkPlan[] = Object.values(NETWORK_DATA_PLANS).flat();

/** Cheapest plan price across all networks — the entry point into redeeming. */
export const CHEAPEST_PLAN_POINTS = Math.min(...ALL_PLANS.map((p) => p.points));

/** Format a GB amount as a friendly label (e.g. 0.5 → "500MB", 1.25 → "1.25GB"). */
export function formatData(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1000)}MB`;
  return `${Number.isInteger(gb) ? gb : gb.toFixed(2).replace(/\.?0+$/, '')}GB`;
}

/**
 * The largest single data bundle the user can buy right now with their points.
 * Returns null when they can't yet afford the cheapest plan.
 */
export function bestAffordableData(points: number): { label: string; gb: number } | null {
  let best: NetworkPlan | null = null;
  for (const p of ALL_PLANS) {
    if (p.points <= points && (!best || p.gb > best.gb)) best = p;
  }
  return best ? { label: best.label, gb: best.gb } : null;
}
