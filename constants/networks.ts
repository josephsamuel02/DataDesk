import { CountryNetwork } from './countries';

// Networks are now defined per-country in constants/countries.ts.
// `Network` is kept as an alias for backward compatibility across the app.
// Data plans now live in constants/dataPlans.ts (the VTU Africa catalog).
export type Network = CountryNetwork;
