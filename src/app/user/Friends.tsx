import {
  ConnectionRequestItem,
  FriendItem,
  getFriendsApi,
  getConnectionRequestsApi,
  respondToConnectionRequestApi,
} from "@/services/connection-service";
import { useToast } from "@/context/toast-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Switch,
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

type SortCategory = "Request" | "Friends";

const SORT_OPTIONS = [
  "Newest first",
  "Oldest first",
  "Nearest first",
  "Farthest first",
];

export default function Friends() {
  const { showToast } = useToast();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [isSortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState("Newest first");
  const [noMutualFilter, setNoMutualFilter] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortCategory, setSortCategory] = useState<SortCategory>("Request");
  const [respondingIds, setRespondingIds] = useState<Record<string, boolean>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const friendsSectionRef = useRef<View>(null);

  const fetchAll = async (isPull = false) => {
    if (isPull) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriendsApi(),
        getConnectionRequestsApi(),
      ]);
      setFriends(friendsData);
      setConnectionRequests(requestsData);
    } catch (err) {
      console.warn("Failed to fetch connection data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchAll();
    };
    load();
  }, []);

  const handleRespondToRequest = async (
    request: ConnectionRequestItem,
    action: "confirm" | "declined"
  ) => {
    setRespondingIds((prev) => ({ ...prev, [request.id]: true }));
    try {
      await respondToConnectionRequestApi(request.id, action);
      setConnectionRequests((prev) => prev.filter((r) => r.id !== request.id));
      showToast(
        action === "confirm"
          ? "Connection request accepted."
          : "Connection request declined.",
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to respond to request.", "error");
    } finally {
      setRespondingIds((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesMutual = noMutualFilter ? !friend.hasMutual : true;
    return matchesSearch && matchesMutual;
  });

  const filteredRequests = connectionRequests.filter((req) =>
    req.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToCategory = (category: SortCategory) => {
    setSortCategory(category);
    setSortDropdownVisible(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (category === "Friends" && friendsSectionRef.current) {
      setTimeout(() => {
        friendsSectionRef.current?.measureLayout(
          scrollViewRef.current as any,
          (y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 100);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%", overflow: "hidden" }}
    >
      {/* 1. Header Section */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900">Connection</Text>
      </View>

      {/* 2. Search Bar */}
      <View className="flex-row items-center px-5 py-3 gap-3 mb-1">
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Open sidebar menu"
        >
          <Ionicons name="person-add-outline" size={26} color="#374151" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search users to add..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-base text-gray-800 pr-2 h-full"
          />
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        </View>
      </View>

      {/* Sort Dropdown Overlay */}
      {isSortDropdownVisible && (
        <>
          <Pressable
            onPress={() => setSortDropdownVisible(false)}
            className="absolute inset-0 z-40 bg-transparent"
          />

          <View
            style={{
              position: "absolute",
              top: 130,
              right: 20,
              zIndex: 50,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 10,
            }}
            className="bg-white p-4 rounded-2xl border border-gray-200 w-56"
          >
            <Text className="text-gray-500 font-bold text-xs tracking-wider mb-2.5">
              CATEGORY
            </Text>

            <View className="space-y-1 mb-3">
              {(["Request", "Friends"] as SortCategory[]).map((cat) => {
                const isSelected = sortCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => scrollToCategory(cat)}
                    className="flex-row items-center py-2"
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#72AF5B" : "#9CA3AF"}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "font-bold text-gray-900"
                          : "font-normal text-gray-600"
                      }`}
                    >
                      {cat}
                    </Text>
                    <Text className="text-xs text-gray-400 ml-auto">
                      {cat === "Request" ? filteredRequests.length : filteredFriends.length}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="border-b border-gray-200 mb-3" />

            <Text className="text-gray-500 font-bold text-xs tracking-wider mb-2.5">
              SORT BY
            </Text>

            <View className="space-y-1">
              {SORT_OPTIONS.map((option) => {
                const isSelected = selectedSort === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setSelectedSort(option);
                      setSortDropdownVisible(false);
                    }}
                    className="flex-row items-center py-2"
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#72AF5B" : "#9CA3AF"}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "font-bold text-gray-900"
                          : "font-normal text-gray-600"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="border-b border-gray-200 my-3" />

            <Text className="text-gray-500 font-bold text-xs tracking-wider mb-2">
              FILTER
            </Text>

            <View className="flex-row items-center justify-between py-1">
              <Text className="text-gray-700 text-sm">No mutual friend</Text>
              <Switch
                value={noMutualFilter}
                onValueChange={setNoMutualFilter}
                trackColor={{ false: "#E5E7EB", true: "#72AF5B" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </>
      )}

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-white z-0"
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
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#72AF5B" />
            <Text className="text-sm text-gray-500 mt-2 font-medium">
              Loading...
            </Text>
          </View>
        ) : (
          <>
            {/* ── REQUESTS SECTION ── */}
            <View className="flex-row justify-between items-center px-5 py-2 mb-1">
              <Text className="text-lg font-semibold text-gray-900">
                Request{" "}
                <Text className="text-[#72AF5B] font-bold">
                  {filteredRequests.length}
                </Text>
              </Text>

              <TouchableOpacity
                onPress={() => setSortDropdownVisible(!isSortDropdownVisible)}
                className="flex-row items-center py-1 px-2 rounded-lg active:bg-gray-100"
              >
                <Text className="text-sm font-medium text-gray-700 mr-1">Sort</Text>
                <Ionicons
                  name={
                    isSortDropdownVisible
                      ? "chevron-up-outline"
                      : "chevron-down-outline"
                  }
                  size={16}
                  color="#4B5563"
                />
              </TouchableOpacity>
            </View>

            {filteredRequests.length === 0 ? (
              <View className="py-14 items-center justify-center px-6 mb-4">
                <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
                  <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-base font-bold text-gray-800 mb-1">
                  No Connection Requests
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-5">
                  Use the search bar above to find farmers and send friend requests!
                </Text>
              </View>
            ) : (
              <View className="px-5 mb-2">
                {filteredRequests.map((request) => {
                  const isResponding = respondingIds[request.id];
                  return (
                    <View
                      key={request.id}
                      className="flex-row items-center py-3 border-b border-gray-100"
                    >
                      <View className="h-12 w-12 rounded-full bg-gray-200 items-center justify-center mr-4 overflow-hidden border border-gray-200">
                        {request.avatarUrl ? (
                          <Image
                            source={{ uri: request.avatarUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="person" size={26} color="#6B7280" />
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-800">
                          {request.name}
                        </Text>
                        {request.username ? (
                          <Text className="text-xs text-gray-400">
                            @{request.username}
                          </Text>
                        ) : null}
                        {request.mutualFriends ? (
                          <Text className="text-xs text-gray-400 mt-0.5">
                            {request.mutualFriends}
                          </Text>
                        ) : null}
                      </View>

                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handleRespondToRequest(request, "declined")}
                          disabled={isResponding}
                          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                        >
                          {isResponding ? (
                            <ActivityIndicator size="small" color="#6B7280" />
                          ) : (
                            <Ionicons name="close" size={18} color="#6B7280" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRespondToRequest(request, "confirm")}
                          disabled={isResponding}
                          className="w-9 h-9 rounded-full bg-[#72AF5B] items-center justify-center active:bg-[#5d9a4a]"
                        >
                          {isResponding ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── FRIENDS SECTION ── */}
            <View ref={friendsSectionRef} className="flex-row justify-between items-center px-5 py-2 mt-2 mb-1">
              <Text className="text-lg font-semibold text-gray-900">
                Friends{" "}
                <Text className="text-[#72AF5B] font-bold">
                  {filteredFriends.length}
                </Text>
              </Text>
            </View>

            {filteredFriends.length === 0 ? (
              <View className="py-14 items-center justify-center px-6">
                <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
                  <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-base font-bold text-gray-800 mb-1">
                  No Friends Found
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-5">
                  Confirm connection requests or add friends to see them here.
                </Text>
              </View>
            ) : (
              <View className="px-5">
                {filteredFriends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    className="flex-row items-center py-3 border-b border-gray-100 active:bg-gray-50"
                  >
                    <View className="h-12 w-12 rounded-full bg-gray-200 items-center justify-center mr-4 overflow-hidden border border-gray-200">
                      {friend.avatarUrl ? (
                        <Image
                          source={{ uri: friend.avatarUrl }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={26} color="#6B7280" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">
                        {friend.name}
                      </Text>
                      {friend.username ? (
                        <Text className="text-xs text-gray-400">
                          @{friend.username}
                        </Text>
                      ) : null}
                    </View>

                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#72AF5B" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeTab="Your Friends"
      />
      <BottomNavBar activeTab="Connection" showFab={false} />
    </SafeAreaView>
  );
}
