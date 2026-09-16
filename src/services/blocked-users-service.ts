import AsyncStorage from "@react-native-async-storage/async-storage";

export interface BlockedUserItem {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  blockedAt?: string;
}

const BLOCKED_STORAGE_KEY = "localfarm_blocked_users_list";

const DEFAULT_BLOCKED_USERS: BlockedUserItem[] = [
  {
    id: "blocked-sample-1",
    name: "Alex Rivera",
    username: "arivera_farms",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    blockedAt: "Yesterday",
  },
];

export async function getBlockedUsers(): Promise<BlockedUserItem[]> {
  try {
    const data = await AsyncStorage.getItem(BLOCKED_STORAGE_KEY);
    if (data !== null) {
      return JSON.parse(data);
    }
    // Seed with default list on first launch
    await AsyncStorage.setItem(
      BLOCKED_STORAGE_KEY,
      JSON.stringify(DEFAULT_BLOCKED_USERS)
    );
    return DEFAULT_BLOCKED_USERS;
  } catch (err) {
    console.warn("Failed to load blocked users:", err);
    return DEFAULT_BLOCKED_USERS;
  }
}

export async function blockUser(user: {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}): Promise<BlockedUserItem[]> {
  try {
    const current = await getBlockedUsers();
    // Avoid duplicate
    const filtered = current.filter((u) => u.id !== user.id);
    const newEntry: BlockedUserItem = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      blockedAt: "Just now",
    };
    const updated = [newEntry, ...filtered];
    await AsyncStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Failed to block user:", err);
    return [];
  }
}

export async function unblockUser(userId: string): Promise<BlockedUserItem[]> {
  try {
    const current = await getBlockedUsers();
    const updated = current.filter((u) => u.id !== userId);
    await AsyncStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Failed to unblock user:", err);
    return [];
  }
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const current = await getBlockedUsers();
    return current.some((u) => u.id === userId);
  } catch {
    return false;
  }
}
