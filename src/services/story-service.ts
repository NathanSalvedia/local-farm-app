import { apiFetch } from "@/lib/api";

export interface StoryItem {
  id: string;
  mediaType?: "image" | "video" | "text";
  imageUrl?: string;
  mediaUrl?: string;
  content?: string;
  textContent?: string;
  backgroundColor?: string;
  musicTitle?: string | null;
  privacy?: "Public" | "Friends" | "Only me";
  isSeen: boolean;
  timeAgo?: string;
  createdAt?: string;
}

export interface UserStory {
  userId: string;
  userName: string;
  userFullName?: string;
  userAvatar?: string;
  color: string;
  isCurrentUser?: boolean;
  hasUnseenStories?: boolean;
  stories: StoryItem[];
}

export interface CreateStoryPayload {
  mediaType?: "image" | "video" | "text";
  mediaUrl?: string | null;
  imageUrl?: string | null;
  textContent?: string | null;
  content?: string | null;
  backgroundColor?: string;
  musicTitle?: string | null;
  privacy?: "Public" | "Friends" | "Only me";
}

/**
 * Fetch active stories grouped by user
 */
export async function getStoriesApi(): Promise<UserStory[]> {
  const res = await apiFetch<{ userStories: UserStory[] }>("/stories");
  return res.userStories || [];
}

/**
 * Publish a new story
 */
export async function createStoryApi(payload: CreateStoryPayload): Promise<StoryItem> {
  const res = await apiFetch<{ message: string; story: StoryItem }>("/stories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.story;
}

/**
 * Mark story as viewed
 */
export async function markStoryViewedApi(storyId: string): Promise<void> {
  await apiFetch(`/stories/${storyId}/view`, {
    method: "POST",
  });
}

/**
 * Delete a story
 */
export async function deleteStoryApi(storyId: string): Promise<void> {
  await apiFetch(`/stories/${storyId}`, {
    method: "DELETE",
  });
}

/**
 * Update the privacy of a story (Public, Friends, Only me)
 */
export async function updateStoryPrivacyApi(
  storyId: string,
  privacy: "Public" | "Friends" | "Only me"
): Promise<void> {
  await apiFetch(`/stories/${storyId}/privacy`, {
    method: "PUT",
    body: JSON.stringify({ privacy }),
  });
}

