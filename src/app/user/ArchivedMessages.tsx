import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import ChatSidebarModal from "../../components/ChatSidebarModal";
import BottomNavBar from "../../components/Navigation";

interface ArchivedItem {
  id: string;
  name: string;
  snippet: string;
  time: string;
  unreadCount?: number;
}

const INITIAL_ARCHIVED: ArchivedItem[] = [
  {
    id: "1",
    name: "Jacklourence Broca",
    snippet: "Hello, how are you?",
    time: "May 1",
  },
  {
    id: "2",
    name: "Amer Macaan",
    snippet: "Salamat sa order bai!",
    time: "Apr 28",
  },
  {
    id: "3",
    name: "Jian Julito",
    snippet: "Kita ta puhon sa reunion",
    time: "Mar 15",
  },
];

function ArchivedListItem({
  item,
  onPress,
  onLongPress,
}: {
  item: ArchivedItem;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
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
          className="text-sm text-gray-600 font-medium truncate"
          numberOfLines={1}
        >
          {item.snippet}
        </Text>
      </View>

      {/* Right: Time & Badge */}
      <View className="items-end justify-center min-w-[56px] flex-shrink-0">
        <Text className="text-xs text-gray-800 font-medium mb-1">
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

export default function ArchivedMessages() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [archivedList, setArchivedList] =
    useState<ArchivedItem[]>(INITIAL_ARCHIVED);
  const [activeMenuChatId, setActiveMenuChatId] = useState<
    string | number | null
  >(null);

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

  const handleUnarchive = (id: string | number | null) => {
    if (!id) return;
    setArchivedList((prev) => prev.filter((item) => item.id !== String(id)));
    setActiveMenuChatId(null);
  };

  const handleRestrict = (_id: string | number | null) => {
    setActiveMenuChatId(null);
  };

  const handleBlock = (_id: string | number | null) => {
    setActiveMenuChatId(null);
  };

  const handleDelete = (id: string | number | null) => {
    if (!id) return;
    setArchivedList((prev) => prev.filter((item) => item.id !== String(id)));
    setActiveMenuChatId(null);
  };

  const filteredArchived = archivedList.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchQuery.toLowerCase()),
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

      {/*   Search Bar Container  */}
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

      {/*   Section Title  */}
      <View className="px-4 py-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Archived</Text>
      </View>

      {/*   Archived Vertical Scroll List  */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {filteredArchived.length > 0 ? (
          filteredArchived.map((item) => (
            <ArchivedListItem
              key={item.id}
              item={item}
              onPress={() => {
                try {
                  router.push("/user/ChatConversation" as any);
                } catch (e) {
                  console.warn("Navigation error", e);
                }
              }}
              onLongPress={() => setActiveMenuChatId(item.id)}
            />
          ))
        ) : (
          <View className="items-center justify-center py-16 px-4">
            <Ionicons name="archive-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 font-semibold text-base mt-3">
              No archived messages
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              Your archived conversations will appear here
            </Text>
          </View>
        )}
      </ScrollView>

      {/*    Context Menu Modal Overlay (Long Press)   */}
      <Modal
        visible={activeMenuChatId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveMenuChatId(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActiveMenuChatId(null)}>
          <View className="flex-1 bg-black/25 items-center justify-center">
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View className="bg-white rounded-2xl shadow-2xl elevation-10 py-2 w-60 border border-gray-100 z-50 overflow-hidden">
                {/* Item 1: Unarchive */}
                <TouchableOpacity
                  onPress={() => handleUnarchive(activeMenuChatId)}
                  className="flex-row items-center px-4 py-3.5 gap-4 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <Ionicons name="archive" size={20} color="#4B5563" />
                  <Text className="text-base text-gray-800 font-medium">
                    Unarchive
                  </Text>
                </TouchableOpacity>

                {/* Item 2: Restrict */}
                <TouchableOpacity
                  onPress={() => handleRestrict(activeMenuChatId)}
                  className="flex-row items-center px-4 py-3.5 gap-4 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye-off" size={20} color="#4B5563" />
                  <Text className="text-base text-gray-800 font-medium">
                    Restrict
                  </Text>
                </TouchableOpacity>

                {/* Item 3: Block */}
                <TouchableOpacity
                  onPress={() => handleBlock(activeMenuChatId)}
                  className="flex-row items-center px-4 py-3.5 gap-4 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-redo" size={20} color="#4B5563" />
                  <Text className="text-base text-gray-800 font-medium">
                    Block
                  </Text>
                </TouchableOpacity>

                {/* Item 4: Delete all chat */}
                <TouchableOpacity
                  onPress={() => handleDelete(activeMenuChatId)}
                  className="flex-row items-center px-4 py-3.5 gap-4 active:bg-red-50 border-t border-gray-100 mt-1"
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash" size={20} color="#DC2626" />
                  <Text className="text-base text-red-600 font-medium">
                    Delete all chat
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/*  Sidebar Drawer  */}
      <ChatSidebarModal
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeItem="Archived"
      />

      {/*  Bottom Navigation Bar  */}
      <BottomNavBar showFab={false} activeTabName="chat" />
    </SafeAreaView>
  );
}
