import { apiFetch } from "@/lib/api";

export interface StoryItem {
  id: string;
  imageUrl: string;
  content?: string;
  isSeen: boolean;
  timeAgo?: string;
  backgroundColor?: string;
  mediaType?: string;
}

export interface UserStory {
  userId: string;
  userName: string;
  userAvatar?: string;
  color: string;
  stories: StoryItem[];
}

export interface CreateStoryPayload {
  mediaUrl?: string;
  textContent?: string;
  backgroundColor?: string;
  musicTitle?: string;
  privacy?: string;
  mediaType?: string;
}

/**
 * Fetch all active stories grouped by user
 */
export async function getStoriesApi(): Promise<UserStory[]> {
  try {
    const res = await apiFetch<{ stories: UserStory[]; count: number }>("/stories");
    return res.stories || [];
  } catch (err) {
    console.warn("[StoryService] getStoriesApi error:", err);
    return [];
  }
}

/**
 * Create a new 24-hour expiring story
 */
export async function createStoryApi(payload: CreateStoryPayload): Promise<StoryItem> {
  const res = await apiFetch<{ message: string; story: StoryItem }>("/stories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.story;
}

/**
 * Record that the current user has viewed a story
 */
export async function markStoryViewedApi(storyId: string): Promise<void> {
  try {
    await apiFetch(`/stories/${storyId}/view`, {
      method: "POST",
    });
  } catch (err) {
    console.warn("[StoryService] markStoryViewedApi error:", err);
  }
}
