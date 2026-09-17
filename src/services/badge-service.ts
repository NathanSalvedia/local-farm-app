import { apiFetch } from "@/lib/api";

export interface BadgeCounts {
  requestsCount: number;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
}

export async function getBadgeCountsApi(): Promise<BadgeCounts> {
  try {
    const res = await apiFetch<BadgeCounts>("/notifications/badge-counts");
    return {
      requestsCount: res.requestsCount || 0,
      unreadMessagesCount: res.unreadMessagesCount || 0,
      unreadNotificationsCount: res.unreadNotificationsCount || 0,
    };
  } catch {
    return { requestsCount: 0, unreadMessagesCount: 0, unreadNotificationsCount: 0 };
  }
}
