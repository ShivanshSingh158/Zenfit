/**
 * InAppNotificationStore.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Stateful In-App Notification Center & Feed with Persistence.
 * Inspired by Novu & Knock In-App Notification Inboxes.
 */

import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InAppNotificationRecord, NotificationCategory, NotificationPriority } from '../types';

const IN_APP_STORAGE_KEY = '@zenfit_in_app_notifications_v2';
export const IN_APP_NOTIF_EVENT = 'zenfit_in_app_notification_changed';
const MAX_INBOX_ITEMS = 50;

let _hotInbox: InAppNotificationRecord[] = [];
let _isHydrated = false;

export class InAppNotificationStore {
  public static async hydrate(): Promise<void> {
    if (_isHydrated) return;
    try {
      const raw = await AsyncStorage.getItem(IN_APP_STORAGE_KEY);
      if (raw) {
        _hotInbox = JSON.parse(raw);
      }
      _isHydrated = true;
    } catch (err) {
      console.warn('[InAppNotificationStore] Hydration warning:', err);
      _isHydrated = true;
    }
  }

  public static getNotifications(): InAppNotificationRecord[] {
    return [..._hotInbox];
  }

  public static getUnreadCount(): number {
    return _hotInbox.filter(n => !n.read).length;
  }

  public static async addNotification(item: {
    id?: string;
    title: string;
    body: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    actionType?: string;
    actionPayload?: Record<string, any>;
    data?: Record<string, any>;
  }): Promise<InAppNotificationRecord> {
    await this.hydrate();

    const record: InAppNotificationRecord = {
      id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: item.title,
      body: item.body,
      category: item.category || NotificationCategory.SYSTEM,
      priority: item.priority || NotificationPriority.NORMAL,
      timestamp: Date.now(),
      read: false,
      actionType: item.actionType,
      actionPayload: item.actionPayload,
      data: item.data,
    };

    // Deduplicate if identical ID already in inbox
    _hotInbox = [record, ..._hotInbox.filter(n => n.id !== record.id)].slice(0, MAX_INBOX_ITEMS);

    await this._persist();
    DeviceEventEmitter.emit(IN_APP_NOTIF_EVENT, _hotInbox);
    return record;
  }

  public static async markAsRead(id: string): Promise<void> {
    await this.hydrate();
    let updated = false;

    _hotInbox = _hotInbox.map(n => {
      if (n.id === id && !n.read) {
        updated = true;
        return { ...n, read: true };
      }
      return n;
    });

    if (updated) {
      await this._persist();
      DeviceEventEmitter.emit(IN_APP_NOTIF_EVENT, _hotInbox);
    }
  }

  public static async markAllAsRead(): Promise<void> {
    await this.hydrate();
    _hotInbox = _hotInbox.map(n => ({ ...n, read: true }));
    await this._persist();
    DeviceEventEmitter.emit(IN_APP_NOTIF_EVENT, _hotInbox);
  }

  public static async deleteNotification(id: string): Promise<void> {
    await this.hydrate();
    _hotInbox = _hotInbox.filter(n => n.id !== id);
    await this._persist();
    DeviceEventEmitter.emit(IN_APP_NOTIF_EVENT, _hotInbox);
  }

  public static async clearAll(): Promise<void> {
    _hotInbox = [];
    await AsyncStorage.removeItem(IN_APP_STORAGE_KEY).catch(() => {});
    DeviceEventEmitter.emit(IN_APP_NOTIF_EVENT, _hotInbox);
  }

  private static async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(IN_APP_STORAGE_KEY, JSON.stringify(_hotInbox));
    } catch (err) {
      console.warn('[InAppNotificationStore] Persistence warning:', err);
    }
  }
}

/**
 * React Hook for In-App Notifications
 */
export function useInAppNotifications() {
  const [notifications, setNotifications] = useState<InAppNotificationRecord[]>(() =>
    InAppNotificationStore.getNotifications()
  );
  const [unreadCount, setUnreadCount] = useState<number>(() =>
    InAppNotificationStore.getUnreadCount()
  );

  useEffect(() => {
    InAppNotificationStore.hydrate().then(() => {
      setNotifications(InAppNotificationStore.getNotifications());
      setUnreadCount(InAppNotificationStore.getUnreadCount());
    });

    const sub = DeviceEventEmitter.addListener(
      IN_APP_NOTIF_EVENT,
      (updatedInbox: InAppNotificationRecord[]) => {
        setNotifications([...updatedInbox]);
        setUnreadCount(updatedInbox.filter(n => !n.read).length);
      }
    );

    return () => sub.remove();
  }, []);

  const markAsRead = useCallback((id: string) => {
    InAppNotificationStore.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    InAppNotificationStore.markAllAsRead();
  }, []);

  const deleteNotification = useCallback((id: string) => {
    InAppNotificationStore.deleteNotification(id);
  }, []);

  const clearAll = useCallback(() => {
    InAppNotificationStore.clearAll();
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
