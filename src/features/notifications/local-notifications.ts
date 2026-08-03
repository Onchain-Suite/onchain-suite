import type { Notification } from "@/types/notification";

export const LOCAL_NOTIFICATIONS_KEY = "onchain.notifications.local.v1";

const safeParse = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const loadLocalNotifications = (): Notification[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x) => x && typeof x === "object")
    .map((x) => x as Record<string, unknown>)
    .map((x) => ({
      id: String(x.id ?? ""),
      title: String(x.title ?? "Notification"),
      description: String(x.description ?? ""),
      time: x.time ? new Date(String(x.time)) : new Date(),
      read: Boolean(x.read ?? false),
      type: (String(x.type ?? "info") as Notification["type"]) ?? "info",
    }))
    .filter((x) => x.id.length > 0)
    .slice(0, 100);
};

export const saveLocalNotifications = (items: Notification[]) => {
  if (typeof window === "undefined") return;
  const serialized = items.map((n) => ({
    ...n,
    time: n.time.toISOString(),
  }));
  window.localStorage.setItem(
    LOCAL_NOTIFICATIONS_KEY,
    JSON.stringify(serialized.slice(0, 100))
  );
  window.dispatchEvent(new Event("onchain.localNotifications"));
};

export const upsertLocalNotification = (notification: Notification) => {
  const existing = loadLocalNotifications();
  const next = [
    notification,
    ...existing.filter((x) => String(x.id) !== String(notification.id)),
  ];
  saveLocalNotifications(next);
};

export const markLocalNotificationRead = (id: string) => {
  const existing = loadLocalNotifications();
  saveLocalNotifications(
    existing.map((x) => (x.id === id ? { ...x, read: true } : x))
  );
};

export const markAllLocalNotificationsRead = () => {
  const existing = loadLocalNotifications();
  saveLocalNotifications(existing.map((x) => ({ ...x, read: true })));
};

export const removeLocalNotification = (id: string) => {
  const existing = loadLocalNotifications();
  saveLocalNotifications(existing.filter((x) => x.id !== id));
};
