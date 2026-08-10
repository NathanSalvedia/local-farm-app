import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

export interface SidebarMenuProps {
  isVisible: boolean;
  onClose: () => void;
  activeTab?: string;
  onSelectTab?: (tabName: string) => void;
}

const MENU_ITEMS = [
  "Request",
  "Your Friends",
  "Suggestions",
  "Nearby Users",
  "Sent Request",
];

const ROUTE_MAP: Record<string, string> = {
  Request: "/user/People",
  "Your Friends": "/user/Friends",
  Suggestions: "/user/Suggestions",
  "Nearby Users": "/user/NearbyUsers",
  "Sent Request": "/user/SentRequests",
};

export default function SidebarMenu({
  isVisible,
  onClose,
  activeTab = "Request",
  onSelectTab,
}: SidebarMenuProps) {
  const router = useRouter();

  const handlePressItem = (item: string) => {
    if (onSelectTab) onSelectTab(item);
    onClose();

    const targetRoute = ROUTE_MAP[item];
    if (targetRoute) {
      try {
        router.push(targetRoute as any);
      } catch (e) {
        console.warn("Sidebar navigation error", e);
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
      <Pressable onPress={onClose} className="flex-1 bg-black/50 flex-row">
        {/* Main Sidebar View */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-3/4 max-w-xs h-full bg-white pt-12 shadow-2xl flex-col"
        >
          {/* Header Section */}
          <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100 mb-4">
            <Text className="text-2xl font-bold text-gray-900">Connection</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={26} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Navigation Menu List */}
          <View className="px-3 space-y-1.5 flex-1">
            {MENU_ITEMS.map((item) => {
              const isActive = activeTab === item;

              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => handlePressItem(item)}
                  className={`py-3.5 px-4 rounded-xl flex-row items-center ${
                    isActive ? "bg-[#72AF5B]" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-base pl-1 ${
                      isActive
                        ? "text-white font-bold"
                        : "text-gray-800 font-medium"
                    }`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
