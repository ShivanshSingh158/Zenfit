/**
 * IdempotencyLedger.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Deterministic Key Generator, Payload Hashing, and Deduplication Ledger.
 * Solves duplicate and ghost notifications permanently.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeliveryLedgerEntry, NotificationCategory } from '../types';

const LEDGER_STORAGE_KEY = '@zenfit_notification_ledger_v2';
const MAX_LEDGER_ENTRIES = 100;
const PRUNE_HORIZON_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory hot cache for synchronous check & fast bailing
let _hotLedger: Map<string, DeliveryLedgerEntry> = new Map();
let _isHydrated = false;

// Simple deterministic string hashing (FNV-1a 32-bit algorithm)
export function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class IdempotencyLedger {
  /**
   * Deterministic Identifier Factory
   * Guarantees that every notification intent maps to ONE and ONLY ONE identifier.
   */
  public static getIdentifier(category: NotificationCategory, keyParam: string = 'default'): string {
    switch (category) {
      case NotificationCategory.GYM_WORKOUT:
        return `zenfit:workout:${keyParam}`;
      case NotificationCategory.MISSED_WORKOUT:
        return `zenfit:missed:${keyParam}`;
      case NotificationCategory.TOMORROW_BLUEPRINT:
        return `zenfit:blueprint:${keyParam}`;
      case NotificationCategory.REST_DAY_RECOVERY:
        return `zenfit:recovery:${keyParam}`;
      case NotificationCategory.WEEKLY_REPORT:
        return `zenfit:weekly_report:${keyParam}`;
      case NotificationCategory.REST_TIMER:
        return 'zenfit:rest_timer:active';
      case NotificationCategory.WORKOUT_HUD:
        return 'zenfit:workout_hud:active';
      case NotificationCategory.CHURN_REENGAGEMENT:
        return 'zenfit:churn_reengagement';
      default:
        return `zenfit:${category}:${keyParam}`;
    }
  }

  /**
   * Generates a stable content hash for deduplication
   */
  public static computeContentHash(identifier: string, title: string, body: string, triggerMs: number): string {
    return fnv1aHash(`${identifier}|${title}|${body}|${Math.floor(triggerMs / 60000)}`);
  }

  /**
   * Hydrates the in-memory ledger from persistent storage
   */
  public static async hydrate(): Promise<void> {
    if (_isHydrated) return;
    try {
      const raw = await AsyncStorage.getItem(LEDGER_STORAGE_KEY);
      if (raw) {
        const parsed: DeliveryLedgerEntry[] = JSON.parse(raw);
        _hotLedger.clear();
        for (const entry of parsed) {
          _hotLedger.set(entry.identifier, entry);
        }
      }
      _isHydrated = true;
    } catch (err) {
      console.warn('[IdempotencyLedger] Failed to hydrate ledger:', err);
      _isHydrated = true;
    }
  }

  /**
   * Checks if an identical notification has already been scheduled or delivered
   */
  public static isDuplicate(identifier: string, contentHash: string, windowMs: number = 86400000): boolean {
    const entry = _hotLedger.get(identifier);
    if (!entry) return false;

    // If identical content hash and within deduplication window
    const now = Date.now();
    const entryTime = entry.deliveredTime || entry.scheduledTime;
    if (entry.hash === contentHash && (now - entryTime) < windowMs) {
      return true;
    }

    return false;
  }

  /**
   * Records a successfully scheduled or updated alarm in the ledger
   */
  public static async recordScheduled(
    identifier: string,
    category: NotificationCategory,
    hash: string,
    triggerMs: number,
    deferPersist = false
  ): Promise<void> {
    await this.hydrate();

    const entry: DeliveryLedgerEntry = {
      identifier,
      category,
      hash,
      scheduledTime: triggerMs,
    };

    _hotLedger.set(identifier, entry);
    if (!deferPersist) {
      await this._persist();
    }
  }

  public static async persist(): Promise<void> {
    await this._persist();
  }

  /**
   * Records that an alarm has fired or was delivered to the user
   */
  public static async recordDelivered(identifier: string): Promise<void> {
    await this.hydrate();
    const entry = _hotLedger.get(identifier);
    if (entry) {
      entry.deliveredTime = Date.now();
      _hotLedger.set(identifier, entry);
      await this._persist();
    }
  }

  /**
   * Removes an identifier from the ledger (e.g. upon ghost cancellation or manual dismiss)
   */
  public static async remove(identifier: string): Promise<void> {
    await this.hydrate();
    if (_hotLedger.delete(identifier)) {
      await this._persist();
    }
  }

  /**
   * Prunes expired ledger entries and commits to AsyncStorage
   */
  private static async _persist(): Promise<void> {
    try {
      const now = Date.now();
      const entries = Array.from(_hotLedger.values())
        .filter(e => {
          const t = e.deliveredTime || e.scheduledTime;
          return (now - t) < PRUNE_HORIZON_MS;
        })
        .slice(-MAX_LEDGER_ENTRIES);

      // Refresh hot map
      _hotLedger = new Map(entries.map(e => [e.identifier, e]));
      await AsyncStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.warn('[IdempotencyLedger] Failed to persist ledger:', err);
    }
  }

  /**
   * Clears the entire ledger (for unit tests / user reset)
   */
  public static async clear(): Promise<void> {
    _hotLedger.clear();
    await AsyncStorage.removeItem(LEDGER_STORAGE_KEY).catch(() => {});
  }
}
