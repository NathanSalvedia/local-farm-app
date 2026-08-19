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

interface RestrictedItem {
  id: string;
  name: string;
}

const MOCK_RESTRICTED: RestrictedItem[] = [
  {
    id: "1",
    name: "Luarence Sala",
  },
  {
    id: "2",
    name: "Johnclent Roma",
  },
];

function RestrictedListItem({
  item,
  onPress,
}: {
  item: RestrictedItem;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 mb-2 border-b border-gray-50 active:bg-gray-50"
      activeOpacity={0.7}
    >
      {/* Left Avatar: Circular gray placeholder */}
      <View className="w-14 h-14 rounded-full bg-gray-300 mr-4 items-center justify-center overflow-hidden shadow-2xs border border-gray-200">
        <Ionicons name="person" size={32} color="#FFFFFF" />
      </View>

      {/* Right: User Name (Vertically Centered with Avatar) */}
      <View className="flex-1 justify-center">
        <Text
          className="text-base font-bold text-gray-900 leading-tight"
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RestrictedAccounts() {
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

  const filteredRestricted = MOCK_RESTRICTED.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-4">
        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 ml-3 tracking-tight">
          Chats
        </Text>
      </View>

      {/*  Search Bar Container */}
      <View className="flex-row items-center px-4 mb-4 gap-3">
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

      {/*  Restricted Accounts Section Title */}
      <View className="px-4 py-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">
          Restricted Accounts
        </Text>
      </View>

      {/*   Restricted Accounts Vertical Scroll List */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {filteredRestricted.length > 0 ? (
          filteredRestricted.map((item) => (
            <RestrictedListItem
              key={item.id}
              item={item}
              onPress={() => {
                try {
                  router.push("/user/RestrictedChatConversation" as any);
                } catch (e) {
                  console.warn("Navigation error", e);
                }
              }}
            />
          ))
        ) : (
          <View className="items-center justify-center py-16 px-4">
            <Ionicons name="shield-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 font-semibold text-base mt-3">
              No restricted accounts
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              Restricted accounts will appear here
            </Text>
          </View>
        )}
      </ScrollView>

      {/*  Sidebar Drawer */}
      <ChatSidebarModal
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeItem="Restricted Accounts"
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar showFab={false} activeTabName="chat" />
    </SafeAreaView>
  );
}
