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

interface SpamItem {
  id: string;
  name: string;
  snippet: string;
  time: string;
  unreadCount?: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SPAM: SpamItem[] = [
  {
    id: "1",
    name: "Juan Dela Cruz",
    snippet: "Open minded ka po ba?",
    time: "3:08PM",
    unreadCount: 1,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpamListItem({
  item,
  onPress,
}: {
  item: SpamItem;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 border-b border-gray-50 active:bg-gray-50"
      activeOpacity={0.7}
    >
      {/* Left Avatar: Circular gray placeholder */}
      <View className="w-14 h-14 rounded-full bg-gray-300 mr-4 items-center justify-center overflow-hidden shadow-2xs border border-gray-200">
        <Ionicons name="person" size={32} color="#FFFFFF" />
      </View>

      {/* Middle Text Content: Name & Snippet */}
      <View className="flex-1 min-w-0 pr-2">
        <Text
          className="text-base font-bold text-gray-900 mb-0.5 leading-tight"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          className="text-sm font-semibold text-gray-800 truncate"
          numberOfLines={1}
        >
          {item.snippet}
        </Text>
      </View>

      {/* Right: Time & Unread Badge */}
      <View className="items-end justify-center min-w-[56px] flex-shrink-0">
        <Text className="text-xs font-bold text-gray-800 mb-1.5">
          {item.time}
        </Text>
        {item.unreadCount !== undefined && item.unreadCount > 0 && (
          <View className="bg-red-600 h-5 min-w-[20px] rounded-full items-center justify-center px-1 shadow-2xs">
            <Text className="text-white text-[11px] font-bold text-center leading-tight">
              {item.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SpamMessages() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarVisible, setSidebarVisible] = useState(false);

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/Chats" as any);
      }
    } catch {
      router.push("/user/Chats" as any);
    }
  };

  const filteredSpam = MOCK_SPAM.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/*  1. Header  */}
      <View className="flex-row items-center px-4 pt-4 pb-4">
        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 ml-3 tracking-tight">
          Chats
        </Text>
      </View>

      {/* Search Bar Container */}
      <View className="flex-row items-center px-4 mb-4 gap-3">
        {/* Left Drawer*/}
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="w-11 h-11 rounded-2xl items-center justify-center "
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu-outline" size={22} color="#6B7280" />
        </TouchableOpacity>

        {/* Search Input Box */}
        <View className="flex-1 bg-gray-100 rounded-full flex-row items-center px-4 py-2.5 border border-gray-100">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-base text-gray-800 pr-2 p-0"
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

      {/*  Spam Title  */}
      <View className="px-4 py-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Spam</Text>
      </View>

      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {filteredSpam.length > 0 ? (
          filteredSpam.map((item) => (
            <SpamListItem
              key={item.id}
              item={item}
              onPress={() => {
                try {
                  router.push("/user/SpamChatConversation" as any);
                } catch (e) {
                  console.warn("Navigation error", e);
                }
              }}
            />
          ))
        ) : (
          <View className="items-center justify-center py-16 px-4">
            <Ionicons
              name="shield-checkmark-outline"
              size={48}
              color="#D1D5DB"
            />
            <Text className="text-gray-500 font-semibold text-base mt-3">
              No spam messages
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              Your spam folder is clean
            </Text>
          </View>
        )}
      </ScrollView>

      {/*  Sidebar Drawer */}
      <ChatSidebarModal
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeItem="Spam"
      />

      {/*  Bottom Navigation Bar  */}
      <BottomNavBar showFab={false} activeTabName="chat" />
    </SafeAreaView>
  );
}
