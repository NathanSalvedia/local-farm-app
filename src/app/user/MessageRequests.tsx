import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ChatSidebarModal from "../../components/ChatSidebarModal";
import BottomNavBar from "../../components/Navigation";

interface MessageRequestItem {
  id: string;
  name: string;
  snippet: string;
  time: string;
}

const MOCK_REQUESTS: MessageRequestItem[] = [
  {
    id: "1",
    name: "Ample Cero",
    snippet: "Hello",
    time: "3:08PM",
  },
  {
    id: "2",
    name: "Jayson Bohol",
    snippet: "mao na nimo",
    time: "12:30PM",
  },
  {
    id: "3",
    name: "Ralph Canoy",
    snippet: "Hi",
    time: "Yesterday",
  },
  {
    id: "4",
    name: "Cathy Amamangpang",
    snippet: "Jejejeje mon kaymo",
    time: "THU",
  },
  {
    id: "5",
    name: "Harley Cabasagan",
    snippet: "Way mga angay",
    time: "May 1",
  },
];

function RequestListItem({
  item,
  onPress,
}: {
  item: MessageRequestItem;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 border-b border-gray-50 active:bg-gray-50"
      activeOpacity={0.7}
    >
      <View className="w-14 h-14 rounded-full bg-gray-300 mr-4 items-center justify-center overflow-hidden shadow-2xs border border-gray-200">
        <Ionicons name="person" size={32} color="#FFFFFF" />
      </View>

      <View className="flex-1 min-w-0 pr-2">
        <Text
          className="text-base font-bold text-gray-900 mb-0.5 leading-tight"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          className="text-sm text-gray-600 font-medium truncate"
          numberOfLines={1}
        >
          {item.snippet}
        </Text>
      </View>

      <View className="items-end justify-center min-w-[56px] flex-shrink-0">
        <Text className="text-xs text-gray-800 font-medium">{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MessageRequests() {
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

  const filteredRequests = MOCK_REQUESTS.filter(
    (req) =>
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.snippet.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/*  Header  */}
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
          className="w-11 h-11 rounded-2xl  items-center justify-center "
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu-outline" size={22} color="#6B7280" />
        </TouchableOpacity>

        {/* Search Input Box */}
        <View className="flex-1 bg-gray-100 rounded-full flex-row items-center px-4 py-2.5 ">
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

      {/* Message Requests Title  */}
      <View className="px-4 py-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Message Request</Text>
      </View>

      {/*  Message Requests Vertical Scroll List  */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {filteredRequests.length > 0 ? (
          filteredRequests.map((item) => (
            <RequestListItem
              key={item.id}
              item={item}
              onPress={() => {
                try {
                  router.push("/user/ChatConversation" as any);
                } catch (e) {
                  console.warn("Navigation error", e);
                }
              }}
            />
          ))
        ) : (
          <View className="items-center justify-center py-16 px-4">
            <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 font-semibold text-base mt-3">
              No message requests
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              You have no pending requests at this time
            </Text>
          </View>
        )}
      </ScrollView>

      {/*  Bottom Navigation Bar  */}
      <BottomNavBar showFab={false} activeTabName="chat" />

      {/*  Sidebar Drawer */}
      <ChatSidebarModal
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeItem="Message Request"
      />
    </SafeAreaView>
  );
}
