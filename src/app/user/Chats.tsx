import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ChatSidebarModal from "../../components/ChatSidebarModal";
import BottomNavBar from "../../components/Navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveUser {
  id: string;
  name: string;
  isOnline?: boolean;
  isSelf?: boolean;
}

interface ChatItem {
  id: string;
  name: string;
  snippet: string;
  time: string;
  unread?: number;
  status?: "read" | "delivered" | "draft" | null;
  isDraft?: boolean;
  online?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ACTIVE_USERS: ActiveUser[] = [
  { id: "1", name: "Me", isSelf: true, isOnline: true },
  { id: "2", name: "Apyao", isOnline: true },
  { id: "3", name: "Olie", isOnline: true },
  { id: "4", name: "Jonne", isOnline: true },
  { id: "5", name: "Leo", isOnline: true },
  { id: "6", name: "Kelra", isOnline: true },
  { id: "7", name: "Mark", isOnline: true },
  { id: "8", name: "Fritz", isOnline: true },
  { id: "9", name: "Romarch", isOnline: true },
  { id: "10", name: "Nathan", isOnline: true },
  { id: "11", name: "Cleo", isOnline: true },
  { id: "12", name: "Geneleen", isOnline: true },
  { id: "13", name: "Princess", isOnline: true },
  { id: "14", name: "Manny", isOnline: true },
];

const MOCK_CHATS: ChatItem[] = [
  {
    id: "1",
    name: "Mark Paul Cosido",
    snippet: "Tara na",
    time: "3:08PM",
    unread: 3,
    online: true,
  },
  {
    id: "2",
    name: "Kyle Saguban",
    snippet: "You: Asa ka boss?",
    time: "12:30PM",
    status: "read",
    online: true,
  },
  {
    id: "3",
    name: "Kentoy",
    snippet: "Thank you",
    time: "9:00 AM",
    unread: 2,
    online: true,
  },
  {
    id: "4",
    name: "Mark Angelo Orit",
    snippet: "Draft: Tagpila?",
    time: "2:00 AM",
    isDraft: true,
    status: null,
  },
  {
    id: "5",
    name: "Aaron Bayanban",
    snippet: "You: Sige bai",
    time: "Yesterday",
    status: "delivered",
  },
  {
    id: "6",
    name: "Rhena Hightower",
    snippet: "You: Libang pako",
    time: "May 8",
    status: "read",
  },
  {
    id: "7",
    name: "Aegon Targaryan",
    snippet: "Okay",
    time: "May 5",
    unread: 1,
  },
  {
    id: "8",
    name: "Rheynera Targaryan",
    snippet: "Sige",
    time: "May 1",
    unread: 1,
  },
  {
    id: "9",
    name: "Paul Salas",
    snippet: "...",
    time: "May 1",
    status: null,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActiveUserItem({ user }: { user: ActiveUser }) {
  return (
    <TouchableOpacity
      className="items-center mr-4 active:opacity-80"
      activeOpacity={0.8}
    >
      <View className="relative mb-1.5">
        {/* Big Avatar Circle */}
        <View className="w-18 h-18 rounded-full bg-gray-200 border-2 border-white items-center justify-center overflow-hidden shadow-2xs">
          <Ionicons name="person" size={36} color="#9CA3AF" />
        </View>

        {/* Online / Story Badge */}
        {user.isSelf ? (
          <View className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#72AF5B] items-center justify-center border-2 border-white">
            <Ionicons name="add" size={13} color="#FFFFFF" />
          </View>
        ) : user.isOnline ? (
          <View className="absolute bottom-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-[#22C55E] border-2 border-white" />
        ) : null}
      </View>

      <Text
        className={`text-xs ${
          user.isSelf ? "font-semibold" : "font-normal"
        } text-center max-w-[72px]`}
        style={{ color: "#343a40" }}
        numberOfLines={1}
      >
        {user.name}
      </Text>
    </TouchableOpacity>
  );
}

function ChatStatusBadge({ chat }: { chat: ChatItem }) {
  if (chat.unread && chat.unread > 0) {
    return (
      <View className="min-w-5 h-5 px-1.5 rounded-full bg-[#EF4444] items-center justify-center shadow-2xs">
        <Text className="text-white text-[11px] font-bold text-center leading-tight">
          {chat.unread}
        </Text>
      </View>
    );
  }

  if (chat.status === "read") {
    return <Ionicons name="checkmark-done" size={16} color="#9CA3AF" />;
  }

  if (chat.status === "delivered") {
    return <Text className="text-xs text-gray-400 font-medium">Delivered</Text>;
  }

  return null;
}

function ChatListItem({ chat }: { chat: ChatItem }) {
  const router = useRouter();
  const isUnread = !!chat.unread && chat.unread > 0;

  const renderSnippet = () => {
    if (chat.isDraft) {
      const parts = chat.snippet.split(": ");
      const prefix = parts[0];
      const rest = parts.slice(1).join(": ");
      return (
        <Text className="text-sm text-gray-500" numberOfLines={1}>
          <Text className="text-red-500 font-semibold">{prefix}: </Text>
          {rest}
        </Text>
      );
    }

    return (
      <Text
        className={`text-sm ${
          isUnread ? "font-bold text-gray-900" : "font-normal text-gray-500"
        }`}
        numberOfLines={1}
      >
        {chat.snippet}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      onPress={() => {
        try {
          router.push("/user/ChatConversation" as any);
        } catch (e) {
          console.warn("Navigation error", e);
        }
      }}
      className="flex-row items-center px-5 py-3 border-b border-gray-50 active:bg-gray-50"
      activeOpacity={0.7}
    >
      {/* Big Avatar with Online indicator */}
      <View className="relative mr-4">
        <View className="w-15 h-15 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-100 shadow-2xs">
          <Ionicons name="person" size={32} color="#9CA3AF" />
        </View>
        {chat.online && (
          <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#22C55E] border-2 border-white" />
        )}
      </View>

      {/* Main Info */}
      <View className="flex-1 pr-2 justify-center">
        <Text
          className={`text-base leading-tight mb-1 ${
            isUnread ? "font-semibold" : "font-semibold"
          }`}
          style={{ color: "#343a40" }}
          numberOfLines={1}
        >
          {chat.name}
        </Text>
        {renderSnippet()}
      </View>

      {/* Time & Status / Badge */}
      <View className="items-end justify-center min-w-[56px] flex-shrink-0">
        <Text
          className={`text-xs mb-1 ${
            isUnread
              ? "font-semibold text-[#EF4444]"
              : "font-normal text-gray-400"
          }`}
        >
          {chat.time}
        </Text>
        <View className="h-5 items-center justify-center">
          <ChatStatusBadge chat={chat} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Chats() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarVisible, setSidebarVisible] = useState(false);

  const filteredChats = MOCK_CHATS.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.snippet.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* 1. Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900 tracking-tight">
          Chats
        </Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/*  Search Bar */}
      <View className="flex-row items-center px-5 py-2.5 gap-2.5 mb-1">
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="w-11 h-11 rounded-2xl items-center justify-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu-outline" size={24} color="#374151" />
        </TouchableOpacity>

        {/* Search Input Box */}
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-base text-gray-800 pr-2 h-full"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          )}
        </View>
      </View>

      {/*  Active Users */}
      <View style={{ flexGrow: 0, flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 py-2"
          contentContainerStyle={{ paddingRight: 24, alignItems: "center" }}
          style={{ flexGrow: 0 }}
        >
          {ACTIVE_USERS.map((user) => (
            <ActiveUserItem key={user.id} user={user} />
          ))}
        </ScrollView>
      </View>

      {/*  Messages Vertical List */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} />
          ))
        ) : (
          <View className="items-center justify-center py-16 px-5">
            <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 font-semibold text-base mt-3">
              No conversations found
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              Try searching with a different name or message
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Chat Sidebar Drawer */}
      <ChatSidebarModal
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar showFab={false} activeTabName="chat" />
    </SafeAreaView>
  );
}
