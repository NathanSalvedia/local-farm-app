import { useAuth } from "@/hooks/use-auth";
import {
  ActiveChatUser,
  ConversationItem,
  getActiveChatUsersApi,
  getConversationsApi,
} from "@/services/chat-service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ChatSidebarModal from "../../components/ChatSidebarModal";
import BottomNavBar from "../../components/Navigation";

export default function Chats() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchChatsData = async (isPull = false) => {
    if (isPull) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [convsData, usersData] = await Promise.all([
        getConversationsApi(),
        getActiveChatUsersApi(),
      ]);
      setConversations(convsData);
      setActiveUsers(usersData);
    } catch (err) {
      console.warn("Error fetching chat data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChatsData();
  }, []);

  const handleOpenConversation = (chat: ConversationItem) => {
    router.push({
      pathname: "/user/ChatConversation",
      params: {
        conversationId: chat.id,
        userId: chat.otherUserId,
        name: chat.name,
        avatarUrl: chat.avatarUrl || "",
        online: "true",
      },
    } as any);
  };

  const handleOpenUserChat = (activeUser: ActiveChatUser) => {
    router.push({
      pathname: "/user/ChatConversation",
      params: {
        userId: activeUser.id,
        name: activeUser.fullName || activeUser.name,
        avatarUrl: activeUser.avatarUrl || "",
        online: "true",
      },
    } as any);
  };

  const filteredConversations = conversations.filter((chat) => {
    const q = searchQuery.toLowerCase();
    return (
      chat.name.toLowerCase().includes(q) ||
      (chat.username && chat.username.toLowerCase().includes(q)) ||
      chat.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%", overflow: "hidden" }}
    >
      {/* 1. Header Section */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2 bg-white">
        <Text className="text-3xl font-bold text-gray-900">Chats</Text>
        <TouchableOpacity
          onPress={() => router.push("/user/People" as any)}
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="New message"
        >
          <Ionicons name="create-outline" size={26} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar */}
      <View className="flex-row items-center px-5 py-3 gap-3">
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Open chat sidebar menu"
        >
          <Ionicons name="menu-outline" size={28} color="#374151" />
        </TouchableOpacity>

        {/* Search Input */}
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-base text-gray-800 pr-2 h-full font-medium"
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="p-1 mr-1"
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        alwaysBounceVertical={false}
        alwaysBounceHorizontal={false}
        directionalLockEnabled={true}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchChatsData(true)}
            colors={["#72AF5B"]}
            tintColor="#72AF5B"
          />
        }
      >
        {/* 3. Active Users Horizontal Carousel */}
        <View className="py-2 border-b border-gray-50">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-5"
          >
            {/* Self "Me (+)" Item */}
            <View className="items-center mr-4">
              <View className="relative">
                <View className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center border border-gray-200 overflow-hidden">
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={28} color="#9CA3AF" />
                  )}
                </View>
                <View className="absolute bottom-0 right-0 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white" />
              </View>
              <Text className="text-xs font-semibold text-gray-800 mt-1.5">
                Me
              </Text>
            </View>

            {/* Other Active Users */}
            {activeUsers.map((activeUser) => (
              <TouchableOpacity
                key={activeUser.id}
                onPress={() => handleOpenUserChat(activeUser)}
                className="items-center mr-4"
                activeOpacity={0.8}
              >
                <View className="relative">
                  <View className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center border border-gray-200 overflow-hidden">
                    {activeUser.avatarUrl ? (
                      <Image
                        source={{ uri: activeUser.avatarUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={28} color="#9CA3AF" />
                    )}
                  </View>
                  {activeUser.isOnline && (
                    <View className="absolute bottom-0 right-0 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white" />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-medium text-gray-700 mt-1.5 max-w-[60px] text-center"
                >
                  {activeUser.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 4. Conversations List */}
        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#72AF5B" />
            <Text className="text-sm text-gray-500 mt-2 font-medium">
              Loading chats...
            </Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View className="py-16 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
              <Ionicons name="chatbubbles-outline" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-base font-bold text-gray-800 mb-1">
              No Conversations Yet
            </Text>
            <Text className="text-xs text-gray-500 text-center">
              Tap on an active user above or search for farmers to start chatting.
            </Text>
          </View>
        ) : (
          <View className="px-5 pt-1">
            {filteredConversations.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                onPress={() => handleOpenConversation(chat)}
                className="py-3.5 border-b border-gray-100 flex-row items-center justify-between active:bg-gray-50 rounded-xl px-1"
                activeOpacity={0.7}
              >
                {/* Left: Avatar with Online Indicator */}
                <View className="relative mr-3.5">
                  <View className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center border border-gray-200 overflow-hidden">
                    {chat.avatarUrl ? (
                      <Image
                        source={{ uri: chat.avatarUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={28} color="#6B7280" />
                    )}
                  </View>
                  {chat.online && (
                    <View className="absolute bottom-0 right-0 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white" />
                  )}
                </View>

                {/* Middle: Name & Last Message Snippet */}
                <View className="flex-1 pr-2">
                  <Text className="font-bold text-gray-900 text-base leading-tight mb-1">
                    {chat.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className={`text-sm ${
                      chat.unread > 0
                        ? "font-bold text-gray-900"
                        : "text-gray-500 font-normal"
                    }`}
                  >
                    {chat.snippet || "Start a conversation"}
                  </Text>
                </View>

                {/* Right: Time & Status / Badge */}
                <View className="items-end justify-center gap-1.5 min-w-[50px]">
                  <Text
                    className={`text-xs ${
                      chat.unread > 0
                        ? "text-red-500 font-bold"
                        : "text-gray-400 font-medium"
                    }`}
                  >
                    {chat.time}
                  </Text>

                  {chat.unread > 0 ? (
                    <View className="bg-red-500 rounded-full h-5 min-w-[20px] px-1.5 items-center justify-center">
                      <Text className="text-white text-[11px] font-bold">
                        {chat.unread > 9 ? "9+" : chat.unread}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="checkmark-done"
                      size={16}
                      color="#9CA3AF"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 5. Chat Sidebar Modal Component */}
      <ChatSidebarModal
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeItem="Messages"
      />

      {/* 6. Bottom Navigation Component */}
      <BottomNavBar activeTab="Chat" showFab={false} />
    </SafeAreaView>
  );
}
