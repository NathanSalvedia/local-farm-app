import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export interface NotificationItem {
  id: string;
  type: "group_invite" | "mention" | "system" | "challenge";
  user: {
    name: string;
    avatarUrl?: string;
  };
  content: string;
  entityName?: string;
  time: string;
  isUnread: boolean;
  hasActionButtons?: boolean;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    type: "group_invite",
    user: {
      name: "Dae Pyo",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    },
    content: "invited you to join the public group",
    entityName: "Dae Pyo Community",
    time: "1d",
    isUnread: true,
    hasActionButtons: true,
  },
  {
    id: "2",
    type: "mention",
    user: {
      name: "Paulbert Landicho",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    },
    content: "mentioned you in a comment in",
    entityName: "Hydroponics Farming PH",
    time: "2d",
    isUnread: true,
    hasActionButtons: false,
  },
  {
    id: "3",
    type: "challenge",
    user: {
      name: "Local Farm Challenges",
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    },
    content: "congratulations! You completed the weekly harvest and earned the",
    entityName: "Golden Harvester Trophy",
    time: "5d",
    isUnread: false,
    hasActionButtons: false,
  },
  {
    id: "4",
    type: "group_invite",
    user: {
      name: "Nathan Salvedia",
      avatarUrl:
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
    },
    content: "invited you to join the private group",
    entityName: "Iligan Urban Farmers Group",
    time: "6d",
    isUnread: false,
    hasActionButtons: true,
  },
  {
    id: "5",
    type: "system",
    user: {
      name: "System Updates",
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    },
    content:
      "your marketplace listing for Organic Red Tomatoes is now active and live.",
    time: "1w",
    isUnread: false,
    hasActionButtons: false,
  },
];

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS,
  );

  const handleJoinGroup = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, hasActionButtons: false, isUnread: false } : n,
      );
      if (onUnreadCountChange) {
        onUnreadCountChange(updated.filter((item) => item.isUnread).length);
      }
      return updated;
    });
  };

  const handleDeleteInvite = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (onUnreadCountChange) {
        onUnreadCountChange(updated.filter((item) => item.isUnread).length);
      }
      return updated;
    });
  };

  const handleNotificationPress = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, isUnread: false } : n,
      );
      if (onUnreadCountChange) {
        onUnreadCountChange(updated.filter((item) => item.isUnread).length);
      }
      return updated;
    });
  };

  const getReactionBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "group_invite":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1877f2] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="people" size={14} color="white" />
          </View>
        );
      case "mention":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#2e7d32] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="chatbubble" size={13} color="white" />
          </View>
        );
      case "system":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gray-600 items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="notifications" size={13} color="white" />
          </View>
        );
      case "challenge":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#f59e0b] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="trophy" size={13} color="white" />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View
          className="flex-1 bg-white"
          style={{ flex: 1, backgroundColor: "#ffffff" }}
        >
          <SafeAreaView
            className="flex-1 bg-white"
            style={{ flex: 1, backgroundColor: "#ffffff" }}
            edges={["top", "bottom", "left", "right"]}
          >
            {/* 1. Top Navigation Bar */}
            <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
              {/* Hamburger Menu / Back Icon */}
              <TouchableOpacity
                onPress={onClose}
                className="p-1 -ml-1 active:opacity-70 flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <Ionicons name="arrow-back" size={28} color="#72AF5B" />
              </TouchableOpacity>

              {/* Center/Left: Title Displaying 'Notifications' */}
              <Text className="text-2xl font-bold text-black ml-4 flex-1">
                Notifications
              </Text>

              {/* Right Action Icons: Search Icon & Close Icon */}
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  className="p-1 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Search notifications"
                >
                  <Ionicons name="search" size={26} color="black" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="p-1 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Close notifications"
                >
                  <Ionicons name="close" size={28} color="black" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Section Header */}
            <View className="px-4 py-2 bg-white">
              <Text className="text-lg font-bold text-gray-900">Earlier</Text>
            </View>

            {/* Notification List */}
            <ScrollView
              className="flex-1 bg-white"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {notifications.length === 0 ? (
                <View className="p-12 items-center justify-center">
                  <Ionicons
                    name="notifications-off-outline"
                    size={48}
                    color="#9CA3AF"
                  />
                  <Text className="text-gray-500 text-base mt-3">
                    No notifications to show
                  </Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleNotificationPress(item.id)}
                    className={`flex-row px-4 py-3.5 border-b border-gray-100 items-start ${
                      item.isUnread ? "bg-[#e7f3ff]" : "bg-white"
                    }`}
                    activeOpacity={0.8}
                  >
                    {/* Left Column (Avatar Person Icon & Badge) */}
                    <View className="relative mr-3.5">
                      <View className="w-16 h-16 rounded-full bg-gray-200 border border-gray-300 items-center justify-center">
                        <Ionicons name="person" size={32} color="#6B7280" />
                      </View>
                      {getReactionBadge(item.type)}
                    </View>

                    {/* Middle Column (Text Content & Actions) */}
                    <View className="flex-1 pr-2">
                      {/* Main Text Content with Nested Bolds */}
                      <Text className="text-[15px] text-gray-900 leading-snug">
                        <Text className="font-bold text-black">
                          {item.user.name}
                        </Text>{" "}
                        {item.content}{" "}
                        {item.entityName ? (
                          <Text className="font-bold text-black">
                            {item.entityName}
                          </Text>
                        ) : null}
                      </Text>

                      {/* Timestamp */}
                      <Text className="text-sm text-gray-500 mt-1">
                        {item.time}
                      </Text>

                      {/* Action Buttons (Join / Delete) */}
                      {item.hasActionButtons && (
                        <View className="flex-row gap-2 mt-3">
                          {/* 'Join' Button */}
                          <TouchableOpacity
                            onPress={() => handleJoinGroup(item.id)}
                            className="flex-1 bg-[#72AF5B] rounded-lg py-2 items-center justify-center active:opacity-85"
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Join group"
                          >
                            <Text className="text-white font-bold text-[14px]">
                              Join
                            </Text>
                          </TouchableOpacity>

                          {/* 'Delete' Button */}
                          <TouchableOpacity
                            onPress={() => handleDeleteInvite(item.id)}
                            className="flex-1 bg-gray-50 border border-[#E63946] rounded-lg py-2 items-center justify-center active:bg-gray-300"
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Delete invitation"
                          >
                            <Text className="text-[#E63946] font-bold text-[14px]">
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Right Column (Options: Horizontal Ellipsis) */}
                    <TouchableOpacity
                      className="p-1 -mr-1 self-start"
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Notification options"
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={20}
                        color="#65676B"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
};

export default NotificationModal;
