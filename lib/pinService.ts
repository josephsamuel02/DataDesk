import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

// Transaction PIN is stored on-device in the OS secure keychain/keystore,
// and only ever as a salted SHA-256 hash — never in plaintext and never in the DB.

const KEY_PREFIX = 'datadesk_txn_pin_';
const PIN_LENGTH = 4;

async function currentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

async function hashPin(pin: string, userId: string): Promise<string> {
  // Salt the PIN with the user id so the same PIN hashes differently per account.
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${userId}:${pin}:datadesk-pin-v1`,
  );
}

export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export const PIN_DIGITS = PIN_LENGTH;

/** Whether the current user has already set a transaction PIN on this device. */
export async function hasPin(): Promise<boolean> {
  try {
    const userId = await currentUserId();
    if (!userId) return false;
    const stored = await SecureStore.getItemAsync(storageKey(userId));
    return !!stored;
  } catch {
    return false;
  }
}

/** Create or update the current user's transaction PIN. */
export async function setPin(pin: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidPinFormat(pin)) {
      return { success: false, error: `PIN must be ${PIN_LENGTH} digits` };
    }
    const userId = await currentUserId();
    if (!userId) return { success: false, error: 'You must be logged in' };

    const hash = await hashPin(pin, userId);
    await SecureStore.setItemAsync(storageKey(userId), hash, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Could not save PIN' };
  }
}

/** Verify an entered PIN against the stored hash. */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const userId = await currentUserId();
    if (!userId) return false;
    const stored = await SecureStore.getItemAsync(storageKey(userId));
    if (!stored) return false;
    const hash = await hashPin(pin, userId);
    return hash === stored;
  } catch {
    return false;
  }
}

/** Remove the stored PIN for the current user (e.g. on reset). */
export async function clearPin(): Promise<void> {
  try {
    const userId = await currentUserId();
    if (!userId) return;
    await SecureStore.deleteItemAsync(storageKey(userId));
  } catch {
    // no-op
  }
}
