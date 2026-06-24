// ─── Points earning model ───────────────────────────────────────────────────
// Single source of truth for how many points each action awards.

export const EARN_POINTS = {
  /** Points for completing one rewarded video ad. */
  rewardedAd: 2,
  /** Points for claiming the once-per-day login bonus. */
  dailyBonus: 5,
  /** Points awarded to the referrer when a referred friend signs up. */
  referralSignup: 50,
} as const;

export type EarnSource = 'ad' | 'daily_bonus' | 'referral';

// Display metadata for points-transaction sources (used in history).
export const EARN_SOURCE_META: Record<
  EarnSource,
  { label: string; icon: string }
> = {
  ad: { label: 'Rewarded Video Ad', icon: '📺' },
  daily_bonus: { label: 'Daily Login Bonus', icon: '🎁' },
  referral: { label: 'Referral Signup', icon: '👥' },
};
