import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { INITIAL_NOTIFICATIONS, NotificationModal } from "./NotificationModal";

const UserHeader = () => {
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(
    INITIAL_NOTIFICATIONS.filter((n) => n.isUnread).length,
  );

  return (
    <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-100 z-30">
      {/* Left: Brand Logo */}
      <View className="flex-row items-center">
        <Image
          source={require("../../assets/images/LF3.png")}
          className="h-9 w-36"
          style={{ width: 135, height: 36 }}
          resizeMode="contain"
        />
      </View>

      {/* Right Side: Action Icons */}
      <View className="flex-row items-center gap-4">
        {/* Notification Bell Trigger */}
        <TouchableOpacity
          onPress={() => setNotifOpen(true)}
          className="relative p-1.5 rounded-full active:bg-gray-100"
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications" size={24} color="#72AF5B" />
          {unreadCount > 0 && (
            <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-4 h-4 items-center justify-center border border-white">
              <Text className="text-white text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Search Icon */}
        <TouchableOpacity
          className="p-1.5 rounded-full active:bg-gray-100"
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Ionicons name="search-outline" size={24} color="#333333" />
        </TouchableOpacity>

        {/* User Profile Avatar Icon */}
        <TouchableOpacity
          className="w-8 h-8 rounded-full border border-[#72AF5B] items-center justify-center active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <Ionicons name="person-outline" size={18} color="#333333" />
        </TouchableOpacity>
      </View>

      {/* Separated Notifications Modal Component */}
      <NotificationModal
        visible={isNotifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </View>
  );
};

export default UserHeader;
