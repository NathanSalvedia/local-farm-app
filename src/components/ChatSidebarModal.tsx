import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  SafeAreaView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export interface ChatSidebarModalProps {
  isVisible: boolean;
  onClose: () => void;
  activeItem?: string;
  onSelectItem?: (item: string) => void;
}

const MENU_ITEMS = [
  "Messages",
  "Message Request",
  "Spam",
  "Archived",
  "Restricted Accounts",
];

const ROUTE_MAP: Record<string, string> = {
  Messages: "/user/Chats",
  "Message Request": "/user/MessageRequests",
  Spam: "/user/SpamMessages",
  Archived: "/user/ArchivedMessages",
  "Restricted Accounts": "/user/RestrictedAccounts",
};

export default function ChatSidebarModal({
  isVisible,
  onClose,
  activeItem: controlledActiveItem,
  onSelectItem,
}: ChatSidebarModalProps) {
  const router = useRouter();
  const [internalActiveItem, setInternalActiveItem] = useState("Messages");
  const activeItem = controlledActiveItem ?? internalActiveItem;

  const handleSelectItem = (item: string) => {
    setInternalActiveItem(item);
    if (onSelectItem) {
      onSelectItem(item);
    }
    onClose();

    const targetRoute = ROUTE_MAP[item];
    if (targetRoute) {
      try {
        router.push(targetRoute as any);
      } catch (e) {
        console.warn("Navigation error", e);
      }
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/30">
          {/* Sidebar Container */}
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View className="absolute left-0 top-0 bottom-0 w-4/5 max-w-[320px] bg-white shadow-2xl flex-col">
              <SafeAreaView className="flex-1">
                {/* Header Section (Placed at Top Corners) */}
                <View className="flex-row justify-between items-center px-5 pt-4 pb-3 mb-2">
                  <Text className="text-2xl font-semibold text-black">
                    Chats
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    className="p-1 -mr-2 active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel="Close sidebar"
                  >
                    <Ionicons name="close-outline" size={32} color="#000000" />
                  </TouchableOpacity>
                </View>

                {/* Menu Items List */}
                <View className="px-3 flex-col">
                  {MENU_ITEMS.map((item) => {
                    const isActive = activeItem === item;

                    return (
                      <TouchableOpacity
                        key={item}
                        onPress={() => handleSelectItem(item)}
                        activeOpacity={0.8}
                        className={`py-3.5 px-4 mb-2 rounded-lg ${
                          isActive ? "bg-[#77af5c]" : "bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-base ${
                            isActive
                              ? "font-bold text-white"
                              : "font-medium text-gray-800"
                          }`}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SafeAreaView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
