import { apiFetch } from "@/lib/api";

export interface ActiveChatUser {
  id: string;
  name: string;
  fullName: string;
  avatarUrl?: string;
  isOnline: boolean;
  isSelf?: boolean;
}

export interface ConversationItem {
  id: string; // conversation_id
  otherUserId: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  snippet: string;
  time: string;
  unread: number;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "other";
  senderId?: string;
  receiverId?: string;
  type?: "text" | "image";
  text?: string;
  imageUrl?: string;
  avatarUrl?: string;
  time?: string;
  isSeen?: boolean;
}

export async function getActiveChatUsersApi(): Promise<ActiveChatUser[]> {
  const res = await apiFetch<{ users: ActiveChatUser[] }>("/chats/active-users");
  return res.users || [];
}

export async function getConversationsApi(): Promise<ConversationItem[]> {
  const res = await apiFetch<{ conversations: ConversationItem[]; count: number }>(
    "/chats/conversations"
  );
  return res.conversations || [];
}

export async function getMessagesApi(params: {
  conversationId?: string;
  userId?: string;
}): Promise<{ messages: ChatMessage[]; conversationId: string | null }> {
  let endpoint = "/chats/messages";
  const queryParams: string[] = [];
  if (params.conversationId) queryParams.push(`conversationId=${params.conversationId}`);
  if (params.userId) queryParams.push(`userId=${params.userId}`);
  if (queryParams.length > 0) endpoint += `?${queryParams.join("&")}`;

  return await apiFetch<{ messages: ChatMessage[]; conversationId: string | null }>(endpoint);
}

export async function sendMessageApi(params: {
  receiverId?: string;
  conversationId?: string;
  messageText: string;
  messageType?: "text" | "image";
  imageUrl?: string;
}): Promise<{ message: string; data: ChatMessage }> {
  return await apiFetch<{ message: string; data: ChatMessage }>("/chats/messages", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
