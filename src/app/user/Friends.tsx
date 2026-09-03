import {
  ActiveUserItem,
  cancelFriendRequestApi,
  ConnectionRequestItem,
  FriendItem,
  getActiveUsersApi,
  getConnectionRequestsApi,
  getFriendsApi,
  getSuggestionsApi,
  respondToConnectionRequestApi,
  SearchedUserItem,
  searchUsersToConnectApi,
  sendFriendRequestApi,
  SuggestionUserItem,
} from "@/services/connection-service";
import { useToast } from "@/context/toast-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import BottomNavBar from "../../components/Navigation";
import SidebarMenu from "../../components/SidebarMenu";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type TabFilter = "all" | "active" | "suggestions" | "friends";

const INITIAL_SAMPLE_SUGGESTIONS: SuggestionUserItem[] = [];

export default function Friends() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showAllRequests, setShowAllRequests] = useState(false);

  // Connection data from MySQL
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequestItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionUserItem[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUserItem[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);

  // Search state
  const [searchResults, setSearchResults] = useState<SearchedUserItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchActionLoading, setSearchActionLoading] = useState<Record<string, boolean>>({});
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // States per card
  const [requestStates, setRequestStates] = useState<Record<string, "confirmed" | "declined" | undefined>>({});
  const [sentSuggestionIds, setSentSuggestionIds] = useState<Record<string, boolean>>({});
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Record<string, boolean>>({});
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = async (isPull = false) => {
    if (isPull) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [friendsData, requestsData, suggestionsData, activeData] = await Promise.all([
        getFriendsApi().catch(() => []),
        getConnectionRequestsApi().catch(() => []),
        getSuggestionsApi().catch(() => []),
        getActiveUsersApi().catch(() => ({ activeUsers: [], count: 0 })),
      ]);

      if (friendsData) setFriends(friendsData);
      if (requestsData) setConnectionRequests(requestsData);
      if (suggestionsData) setSuggestions(suggestionsData);
      if (activeData) {
        setActiveUsers(activeData.activeUsers || []);
        setActiveCount(activeData.count || (activeData.activeUsers || []).length);
      }
    } catch (err) {
      console.warn("Failed to fetch connection data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Search Debounce Effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsersToConnectApi(q);
        setSearchResults(results.filter((u) => !u.name?.toLowerCase().includes("admin")));
      } catch (err) {
        console.warn("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle Search Result Add Request
  const handleSearchSendRequest = async (targetUserId: string) => {
    setSearchActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      const res = await sendFriendRequestApi(targetUserId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, relationship: "pending_sent", connectionId: res.connectionId || null }
            : u
        )
      );
      showToast("Connection request sent!", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to send request.", "error");
    } finally {
      setSearchActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  // Handle Search Result Cancel Request
  const handleSearchCancelRequest = async (connectionId: string, targetUserId: string) => {
    setSearchActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      await cancelFriendRequestApi(targetUserId, connectionId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, relationship: "none", connectionId: null }
            : u
        )
      );
      showToast("Connection request canceled.", "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to cancel request.", "error");
    } finally {
      setSearchActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  // 1. Respond to Friend Request (Confirm / Delete)
  const handleRespondToRequest = async (
    request: ConnectionRequestItem,
    action: "confirm" | "declined"
  ) => {
    setActionLoadingIds((prev) => ({ ...prev, [request.id]: true }));
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    try {
      await respondToConnectionRequestApi(request.id, action).catch(() => {});

      setRequestStates((prev) => ({
        ...prev,
        [request.id]: action === "confirm" ? "confirmed" : "declined",
      }));

      if (action === "confirm") {
        setFriends((prev) => [
          {
            id: request.userId || request.id,
            connectionId: request.id,
            name: request.name,
            username: request.username,
            avatarUrl: request.avatarUrl,
            hasMutual: true,
          },
          ...prev,
        ]);
        showToast(`You and ${request.name} are now connected!`, "success");
      } else {
        showToast("Request removed", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to respond to request.", "error");
    } finally {
      setActionLoadingIds((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  // 2. Add Friend from Suggestions
  const handleSendSuggestionRequest = async (suggestedUser: SuggestionUserItem) => {
    setActionLoadingIds((prev) => ({ ...prev, [suggestedUser.id]: true }));
    try {
      await sendFriendRequestApi(suggestedUser.id).catch(() => {});
      setSentSuggestionIds((prev) => ({ ...prev, [suggestedUser.id]: true }));
      showToast(`Connection request sent to ${suggestedUser.name}!`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to send connection request.", "error");
    } finally {
      setActionLoadingIds((prev) => ({ ...prev, [suggestedUser.id]: false }));
    }
  };

  // 3. Dismiss Suggestion
  const handleDismissSuggestion = (suggestedUserId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDismissedSuggestionIds((prev) => ({ ...prev, [suggestedUserId]: true }));
  };

  // 4. Open Direct Chat with user
  const handleOpenChat = (targetUserId?: string | number, userName?: string, userAvatar?: string) => {
    router.push({
      pathname: "/user/ChatConversation",
      params: {
        userId: targetUserId ? String(targetUserId) : "",
        name: userName || "Farmer",
        avatarUrl: userAvatar || "",
        online: "true",
      },
    } as any);
  };

  // Filtered Lists
  const activeRequests = connectionRequests.filter(
    (req) =>
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      requestStates[req.id] !== "declined"
  );

  const displayedRequests = showAllRequests
    ? activeRequests
    : activeRequests.slice(0, 10);

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuggestions = suggestions.filter(
    (sug) =>
      !dismissedSuggestionIds[sug.id] &&
      !sug.name.toLowerCase().includes("admin") &&
      sug.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActiveUsers = activeUsers.filter(
    (user) =>
      !user.name.toLowerCase().includes("admin") &&
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = activeRequests.filter((r) => requestStates[r.id] !== "confirmed").length;

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{
        flex: 1,
        position: "relative",
        minHeight: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── 1. Top Header Bar (Uniform with Chats Header) ── */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2 bg-white">
        <Text className="text-3xl font-bold text-gray-900">Connections</Text>
        <TouchableOpacity
          onPress={() => setIsSearchOpen((prev) => !prev)}
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Search connections"
        >
          <Ionicons name="search-outline" size={26} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* ── 2. Search Bar ── */}
      {isSearchOpen && (
        <View className="px-5 py-3 bg-white border-b border-gray-100">
          <View className="w-full flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search connections..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-base text-gray-800 pr-2 h-full font-medium"
              autoCapitalize="none"
              autoFocus
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
      )}

      {/* ── 3. Top Filter Chips (active, Suggestions, Your connections) ── */}
      <View className="px-5 py-2.5 bg-white border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {/* Chip 1: Active Online Indicator */}
          <TouchableOpacity
            onPress={() => setActiveTab(activeTab === "active" ? "all" : "active")}
            activeOpacity={0.8}
            className={`flex-row items-center px-4 py-2 rounded-full border ${
              activeTab === "active"
                ? "bg-[#72AF5B] border-[#72AF5B]"
                : "bg-gray-100 border-transparent"
            }`}
          >
            <View
              className={`w-2.5 h-2.5 rounded-full mr-2 ${
                activeTab === "active" ? "bg-white" : "bg-[#72AF5B]"
              }`}
            />
            <Text
              className={`text-sm font-bold ${
                activeTab === "active" ? "text-white" : "text-gray-900"
              }`}
            >
              {activeCount || activeUsers.length || 0} active
            </Text>
          </TouchableOpacity>

          {/* Chip 2: Suggestions */}
          <TouchableOpacity
            onPress={() => setActiveTab(activeTab === "suggestions" ? "all" : "suggestions")}
            activeOpacity={0.8}
            className={`px-4 py-2 rounded-full border ${
              activeTab === "suggestions"
                ? "bg-[#72AF5B] border-[#72AF5B]"
                : "bg-gray-100 border-transparent"
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                activeTab === "suggestions" ? "text-white" : "text-gray-900"
              }`}
            >
              Suggestions
            </Text>
          </TouchableOpacity>

          {/* Chip 3: Your connections */}
          <TouchableOpacity
            onPress={() => setActiveTab(activeTab === "friends" ? "all" : "friends")}
            activeOpacity={0.8}
            className={`px-4 py-2 rounded-full border ${
              activeTab === "friends"
                ? "bg-[#72AF5B] border-[#72AF5B]"
                : "bg-gray-100 border-transparent"
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                activeTab === "friends" ? "text-white" : "text-gray-900"
              }`}
            >
              Your connections
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── 4. Main Content ScrollView (Matching Chats ScrollView Props) ── */}
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
            onRefresh={() => fetchAll(true)}
            colors={["#72AF5B"]}
            tintColor="#72AF5B"
          />
        }
      >
        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#72AF5B" />
            <Text className="text-xs text-gray-500 mt-2 font-medium">
              Loading requests...
            </Text>
          </View>
        ) : searchQuery.trim().length > 0 ? (
          /* ── Search Results View (Real-time DB Search) ── */
          <View className="px-5 pt-3">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-gray-900">
                Search Results ({searchResults.length})
              </Text>
              {isSearching && <ActivityIndicator size="small" color="#72AF5B" />}
            </View>

            {searchResults.length === 0 && !isSearching ? (
              <View className="py-16 items-center justify-center">
                <Ionicons name="search-outline" size={44} color="#9CA3AF" />
                <Text className="text-sm font-bold text-gray-700 mt-2">
                  No users found
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  Try searching with a different name or username
                </Text>
              </View>
            ) : (
              searchResults.map((user) => {
                const isActionLoading = searchActionLoading[user.id];

                return (
                  <View
                    key={user.id}
                    className="flex-row items-center py-3.5 border-b border-gray-100"
                  >
                    <View className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden mr-3.5 border border-gray-200 items-center justify-center">
                      {user.avatarUrl ? (
                        <Image
                          source={{ uri: user.avatarUrl }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={28} color="#9CA3AF" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900">
                        {user.name}
                      </Text>
                      {user.username ? (
                        <Text className="text-xs text-gray-400">
                          @{user.username}
                        </Text>
                      ) : null}
                    </View>

                    {/* Relationship Action Button */}
                    {user.relationship === "accepted" ? (
                      <TouchableOpacity
                        onPress={() => handleOpenChat(user.id, user.name, user.avatarUrl)}
                        className="px-3.5 py-1.5 bg-[#EAF4E6] rounded-lg active:bg-[#DBECCF]"
                      >
                        <Text className="text-xs font-bold text-[#487E34]">Message</Text>
                      </TouchableOpacity>
                    ) : user.relationship === "pending_sent" ? (
                      <TouchableOpacity
                        onPress={() =>
                          user.connectionId &&
                          handleSearchCancelRequest(user.connectionId, user.id)
                        }
                        disabled={isActionLoading}
                        className="px-3.5 py-1.5 bg-gray-200 rounded-lg active:bg-gray-300"
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color="#374151" />
                        ) : (
                          <Text className="text-xs font-bold text-gray-700">Cancel</Text>
                        )}
                      </TouchableOpacity>
                    ) : user.relationship === "pending_received" ? (
                      <TouchableOpacity
                        onPress={() => {
                          if (user.connectionId) {
                            handleRespondToRequest(
                              {
                                id: user.connectionId,
                                userId: user.id,
                                name: user.name,
                                status: "pending",
                              },
                              "confirm"
                            );
                            setSearchResults((prev) =>
                              prev.map((u) =>
                                u.id === user.id ? { ...u, relationship: "accepted" } : u
                              )
                            );
                          }
                        }}
                        disabled={isActionLoading}
                        className="px-3.5 py-1.5 bg-[#72AF5B] rounded-lg active:bg-[#5E9C4E]"
                      >
                        <Text className="text-xs font-bold text-white">Accept</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleSearchSendRequest(user.id)}
                        disabled={isActionLoading}
                        className="flex-row items-center px-3.5 py-1.5 bg-[#72AF5B] rounded-lg active:bg-[#5E9C4E]"
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="person-add" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text className="text-xs font-bold text-white">Add</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : activeTab === "active" ? (
          /* ── "Active Community" View ── */
          <View className="px-5 pt-3">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Active Now ({filteredActiveUsers.length})
            </Text>
            {filteredActiveUsers.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons name="radio-outline" size={48} color="#9CA3AF" />
                <Text className="text-sm font-bold text-gray-700 mt-2">
                  No active users right now
                </Text>
              </View>
            ) : (
              filteredActiveUsers.map((user) => {
                const isSent = sentSuggestionIds[user.id];
                const isActionLoading = actionLoadingIds[user.id];

                return (
                  <View
                    key={user.id}
                    className="flex-row items-center py-3.5 border-b border-gray-100"
                  >
                    <View className="relative mr-3.5">
                      <View className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border border-gray-200 items-center justify-center">
                        {user.avatarUrl ? (
                          <Image
                            source={{ uri: user.avatarUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="person" size={28} color="#9CA3AF" />
                        )}
                      </View>
                      <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#72AF5B] border-2 border-white" />
                    </View>

                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900">{user.name}</Text>
                      <Text className="text-xs text-[#5E9C4E] font-medium">Active now</Text>
                    </View>

                    {user.isConnected ? (
                      <TouchableOpacity
                        onPress={() => handleOpenChat(user.id, user.name, user.avatarUrl)}
                        className="px-3.5 py-1.5 bg-[#EAF4E6] rounded-lg active:bg-[#DBECCF]"
                      >
                        <Text className="text-xs font-bold text-[#487E34]">Message</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() =>
                          handleSendSuggestionRequest({
                            id: user.id,
                            name: user.name,
                            avatarUrl: user.avatarUrl,
                          })
                        }
                        disabled={isSent || isActionLoading}
                        className={`px-3.5 py-1.5 rounded-lg ${
                          isSent ? "bg-gray-200" : "bg-[#72AF5B] active:bg-[#5E9C4E]"
                        }`}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color={isSent ? "#374151" : "#FFFFFF"} />
                        ) : (
                          <Text className={`text-xs font-bold ${isSent ? "text-gray-700" : "text-white"}`}>
                            {isSent ? "Requested" : "Add friend"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : activeTab === "friends" ? (
          /* ── "Your Friends" View ── */
          <View className="px-5 pt-3">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Your Connections ({filteredFriends.length})
            </Text>
            {filteredFriends.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                <Text className="text-sm font-bold text-gray-700 mt-2">
                  No connections added yet
                </Text>
                <Text className="text-xs text-gray-500 text-center mt-1">
                  Confirm pending requests or add suggestions to connect!
                </Text>
              </View>
            ) : (
              filteredFriends.map((f) => (
                <View key={f.id} className="flex-row items-center py-3 border-b border-gray-100">
                  <View className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden mr-3 border border-gray-200">
                    {f.avatarUrl ? (
                      <Image source={{ uri: f.avatarUrl }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Ionicons name="person" size={28} color="#9CA3AF" className="m-auto" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">{f.name}</Text>
                    <Text className="text-xs text-gray-500">Connected</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenChat(f.id, f.name, f.avatarUrl)}
                    className="px-3.5 py-1.5 bg-[#EAF4E6] rounded-lg active:bg-[#DBECCF]"
                  >
                    <Text className="text-xs font-bold text-[#487E34]">Message</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : activeTab === "suggestions" ? (
          /* ── "Suggestions" View ── */
          <View className="px-5 pt-3">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              People You May Know ({filteredSuggestions.length})
            </Text>
            {filteredSuggestions.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons name="sparkles-outline" size={48} color="#9CA3AF" />
                <Text className="text-sm font-bold text-gray-700 mt-2">
                  No more suggestions
                </Text>
              </View>
            ) : (
              filteredSuggestions.map((sug) => {
                const isSent = sentSuggestionIds[sug.id];
                const isActionLoading = actionLoadingIds[sug.id];

                return (
                  <View
                    key={sug.id}
                    className="flex-row items-start py-3.5 border-b border-gray-100"
                  >
                    <View className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mr-3.5 border border-gray-200">
                      {sug.avatarUrl ? (
                        <Image source={{ uri: sug.avatarUrl }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <Ionicons name="person" size={38} color="#9CA3AF" className="m-auto" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900 mb-0.5">
                        {sug.name}
                      </Text>
                      <Text className="text-xs text-gray-500 mb-2.5">
                        {sug.mutualFriends || "Local Farm member"}
                      </Text>

                      <View className="flex-row gap-2.5">
                        <TouchableOpacity
                          onPress={() => handleSendSuggestionRequest(sug)}
                          disabled={isSent || isActionLoading}
                          className={`flex-1 h-10 rounded-xl items-center justify-center ${
                            isSent ? "bg-gray-200" : "bg-[#72AF5B] active:bg-[#5E9C4E]"
                          }`}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color={isSent ? "#374151" : "#FFFFFF"} />
                          ) : (
                            <Text className={`font-bold text-sm ${isSent ? "text-gray-700" : "text-white"}`}>
                              {isSent ? "Requested" : "Add friend"}
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDismissSuggestion(sug.id)}
                          className="flex-1 h-10 bg-[#E4E6EB] rounded-xl items-center justify-center active:bg-gray-300"
                        >
                          <Text className="text-gray-900 font-bold text-sm">Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* ── Standard "Connection Requests" View (Matches Reference Screenshot) ── */
          <View className="px-5 pt-3">
            {/* Section Header: Connection requests (count) + See all */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-gray-900">
                Connection requests ({pendingCount})
              </Text>
              {activeRequests.length > 5 && (
                <TouchableOpacity
                  onPress={() => setShowAllRequests((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text className="text-sm font-semibold text-[#72AF5B]">
                    {showAllRequests ? "Show less" : "See all"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Connection Requests List */}
            {activeRequests.length === 0 ? (
              <View className="py-16 items-center justify-center">
                <View className="w-16 h-16 rounded-full bg-[#EAF4E6] items-center justify-center mb-3">
                  <Ionicons name="checkmark-circle-outline" size={36} color="#72AF5B" />
                </View>
                <Text className="text-base font-bold text-gray-900 mb-1">
                  No pending connection requests
                </Text>
                <Text className="text-xs text-gray-500 text-center">
                  You're all caught up with connection requests!
                </Text>
              </View>
            ) : (
              displayedRequests.map((request) => {
                const isConfirmed = requestStates[request.id] === "confirmed";
                const isActionLoading = actionLoadingIds[request.id];

                return (
                  <View
                    key={request.id}
                    className="flex-row items-start py-3.5 border-b border-gray-100"
                  >
                    {/* Large Circular Avatar (with optional online green dot) */}
                    <View className="relative mr-3.5">
                      <View className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                        {request.avatarUrl ? (
                          <Image
                            source={{ uri: request.avatarUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full bg-gray-200 items-center justify-center">
                            <Ionicons name="person" size={38} color="#9CA3AF" />
                          </View>
                        )}
                      </View>
                      {/* Active Online Indicator */}
                      <View className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-[#72AF5B] border-2 border-white" />
                    </View>

                    {/* Right Content */}
                    <View className="flex-1">
                      {/* Name & Time Ago Row */}
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-base font-bold text-gray-900">
                          {request.name}
                        </Text>
                        <Text className="text-xs text-gray-400 font-medium">
                          {request.timeAgo || "2w"}
                        </Text>
                      </View>

                      {/* Mutual Friends Row (Overlapping avatar bubbles + text) */}
                      {request.mutualFriends ? (
                        <View className="flex-row items-center mb-3 mt-0.5">
                          <View className="flex-row -space-x-1.5 mr-2">
                            <View className="w-5 h-5 rounded-full bg-[#2F5E24] overflow-hidden border border-white items-center justify-center">
                              <Ionicons name="leaf" size={10} color="#FFFFFF" />
                            </View>
                            <View className="w-5 h-5 rounded-full bg-[#659C51] overflow-hidden border border-white items-center justify-center">
                              <Ionicons name="person" size={10} color="#FFFFFF" />
                            </View>
                          </View>
                          <Text className="text-xs text-gray-500 font-medium">
                            {request.mutualFriends}
                          </Text>
                        </View>
                      ) : (
                        <View className="mb-3" />
                      )}

                      {/* Action Buttons: Confirm & Delete OR Accepted State */}
                      {isConfirmed ? (
                        <View className="flex-row items-center justify-between bg-[#EAF4E6] p-2.5 rounded-xl border border-[#CDE5C4]">
                          <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#72AF5B" />
                            <Text className="text-xs font-bold text-[#3D702C] ml-1.5">
                              Request accepted
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleOpenChat(request.userId || request.id, request.name, request.avatarUrl)}
                            className="bg-[#72AF5B] px-3 py-1 rounded-lg active:bg-[#5E9C4E]"
                          >
                            <Text className="text-white text-xs font-bold">
                              Message
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="flex-row gap-2.5">
                          {/* Confirm Button */}
                          <TouchableOpacity
                            onPress={() => handleRespondToRequest(request, "confirm")}
                            disabled={isActionLoading}
                            activeOpacity={0.8}
                            className="flex-1 h-10 bg-[#72AF5B] rounded-xl items-center justify-center active:bg-[#5E9C4E]"
                          >
                            {isActionLoading ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text className="text-white font-bold text-sm">
                                Confirm
                              </Text>
                            )}
                          </TouchableOpacity>

                          {/* Delete Button */}
                          <TouchableOpacity
                            onPress={() => handleRespondToRequest(request, "declined")}
                            disabled={isActionLoading}
                            activeOpacity={0.8}
                            className="flex-1 h-10 bg-[#E4E6EB] rounded-xl items-center justify-center active:bg-gray-300"
                          >
                            <Text className="text-gray-900 font-bold text-sm">
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeTab="Your Friends"
      />
      <BottomNavBar activeTab="Friends" showFab={false} />
    </SafeAreaView>
  );
}
