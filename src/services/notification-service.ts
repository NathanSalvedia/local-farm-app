import { apiFetch } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: "connection_request" | "connection_accepted" | "group_invite" | "mention" | "system" | "challenge";
  user: {
    name: string;
    avatarUrl?: string;
  };
  actorId?: string;
  targetId?: string;
  content: string;
  entityName?: string;
  time: string;
  isUnread: boolean;
  hasActionButtons?: boolean;
  connectionStatus?: string;
}

export interface BadgeCounts {
  unreadNotificationsCount: number;
  requestsCount: number;
  unreadMessagesCount: number;
  totalBadgeCount: number;
  unreadCount: number;
}

export async function getNotificationsApi(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  return await apiFetch<{
    notifications: NotificationItem[];
    unreadCount: number;
  }>("/notifications");
}

export async function getBadgeCountsApi(): Promise<BadgeCounts> {
  return await apiFetch<BadgeCounts>("/notifications/badge-counts");
}

export async function markNotificationReadApi(id?: string): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>("/notifications/mark-read", {
    method: "POST",
    body: JSON.stringify(id ? { id } : {}),
  });
}

export async function deleteNotificationApi(id: string): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/notifications/${id}`, {
    method: "DELETE",
  });
}
