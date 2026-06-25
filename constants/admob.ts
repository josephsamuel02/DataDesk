// ─── AdMob configuration ─────────────────────────────────────────────────────
// TODO: Wire up real rewarded ads with `react-native-google-mobile-ads`.
//   1. `npx expo install react-native-google-mobile-ads`
//   2. Add the config plugin + App IDs in app.json (Android & iOS).
//   3. Build a development build (AdMob does NOT work in Expo Go).
//   4. Replace the simulated player in components/RewardedAdModal.tsx with a
//      real RewardedAd, and only call onReward in the `earned reward` callback.
//
// Until then, RewardedAdModal simulates a rewarded ad so the full earn/tier
// flow is testable end-to-end.

export const ADMOB = {
  // TODO: replace with your real Ad Unit IDs before release.
  androidRewardedUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  iosRewardedUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  // Google's public test rewarded unit (safe to use during development).
  testRewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
  /** Length of the simulated ad, in seconds (placeholder only). */
  simulatedAdSeconds: 5,
} as const;
