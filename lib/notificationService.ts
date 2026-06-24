import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show notifications as banners while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ANDROID_CHANNEL_ID = 'daily-reminders';

// Two reminders per day: midday and evening (24h local time).
const AD_REMINDERS = [
  {
    hour: 12,
    minute: 0,
    title: '📺 Free data is waiting!',
    body: 'Watch a quick video and earn 10 points toward free data on Data Desk.',
  },
  {
    hour: 19,
    minute: 0,
    title: '🎁 Don’t miss your points!',
    body: 'Catch up before bed — watch an ad and claim your daily login bonus.',
  },
];

async function ensurePermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;

  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/**
 * Schedule the twice-daily "watch ads" reminders. Safe to call on every login:
 * it clears any previously scheduled reminders first so there are never
 * duplicates.
 */
export async function scheduleAdReminders(): Promise<boolean> {
  const granted = await ensurePermissions();
  if (!granted) return false;

  await ensureAndroidChannel();

  // Clear existing scheduled notifications so we don't stack duplicates.
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const reminder of AD_REMINDERS) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }

  return true;
}

/** Cancel all scheduled reminders (e.g. on sign out). */
export async function cancelAdReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
