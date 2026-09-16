import { apiFetch } from "@/lib/api";

export interface OriginalPostItem {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  avatarUri: string;
  location: string;
  timeAgo: string;
  content: string;
  imageUrl: string;
  category: string;
  isVerified?: boolean;
}

export interface PostItem {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  avatarUri: string;
  location: string;
  timeAgo: string;
  content: string;
  imageUrl: string;
  category: string;
  privacy: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved?: boolean;
  isShared?: boolean;
  isVerified?: boolean;
  originalPost?: OriginalPostItem | null;
  expiresAt?: number | string | null;
  durationLabel?: string;
}

export interface SavedPostItem extends PostItem {
  savedId: string;
  collectionName: string;
  savedAt: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  avatarUri?: string;
  timeAgo: string;
  content: string;
  likes: number;
  isLiked: boolean;
  isVerified?: boolean;
  parentId?: string | null;
}

export interface CreatePostPayload {
  content: string;
  category?: string;
  privacy?: string;
  location?: string | null;
  photos?: string[];
  imageUrl?: string;
  expiresAt?: number | string | null;
  durationLabel?: string;
}

export async function getPostsApi(category?: string): Promise<PostItem[]> {
  const query = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
  const res = await apiFetch<{ posts: PostItem[]; count: number }>(`/posts${query}`);
  return res.posts || [];
}

export async function createPostApi(payload: CreatePostPayload): Promise<PostItem> {
  const res = await apiFetch<{ message: string; post: PostItem }>("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.post;
}

export async function toggleLikePostApi(postId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  return await apiFetch<{ isLiked: boolean; likesCount: number }>(`/posts/${postId}/like`, {
    method: "POST",
  });
}

export async function getPostCommentsApi(postId: string): Promise<CommentItem[]> {
  const res = await apiFetch<{ comments: CommentItem[]; count: number }>(`/posts/${postId}/comments`);
  return res.comments || [];
}

export async function addPostCommentApi(
  postId: string,
  content: string,
  parentId?: string | null
): Promise<CommentItem> {
  const res = await apiFetch<{ message: string; comment: CommentItem }>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, parentId }),
  });
  return res.comment;
}

export async function toggleLikeCommentApi(commentId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  return await apiFetch<{ isLiked: boolean; likesCount: number }>(`/comments/${commentId}/like`, {
    method: "POST",
  });
}

export async function sharePostApi(
  postId: string,
  shareType: string = "public",
  caption?: string
): Promise<{ message: string; sharesCount: number; sharedPost?: PostItem | null }> {
  return await apiFetch<{ message: string; sharesCount: number; sharedPost?: PostItem | null }>(`/posts/${postId}/share`, {
    method: "POST",
    body: JSON.stringify({ shareType, caption }),
  });
}

export async function getPostByIdApi(postId: string): Promise<PostItem> {
  const res = await apiFetch<{ post: PostItem }>(`/posts/${postId}`);
  return res.post;
}

export async function updatePostApi(
  postId: string,
  data: {
    content?: string;
    category?: string;
    privacy?: string;
    location?: string | null;
    imageUrl?: string | null;
    photos?: string[];
    expiresAt?: number | null;
    durationLabel?: string;
  }
): Promise<{
  message: string;
  post: {
    id: string;
    content: string;
    category: string;
    privacy: string;
    location?: string;
    imageUrl?: string;
  };
}> {
  return await apiFetch<{
    message: string;
    post: {
      id: string;
      content: string;
      category: string;
      privacy: string;
      location?: string;
      imageUrl?: string;
    };
  }>(`/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePostApi(postId: string): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function getSavedPostsApi(): Promise<SavedPostItem[]> {
  const res = await apiFetch<{ savedPosts: SavedPostItem[]; count: number }>("/posts/saved");
  return res.savedPosts || [];
}

export async function getSavedCollectionsApi(): Promise<string[]> {
  const res = await apiFetch<{ collections: string[] }>("/posts/saved/collections");
  return res.collections || ["All Saved"];
}

export async function toggleSavePostApi(
  postId: string,
  collectionName?: string
): Promise<{ message: string; isSaved: boolean }> {
  return await apiFetch<{ message: string; isSaved: boolean }>(`/posts/${postId}/save`, {
    method: "POST",
    body: JSON.stringify({ collectionName }),
  });
}
