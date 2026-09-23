import {
  deleteNotificationApi,
  getNotificationsApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
  NotificationItem,
} from "@/services/notification-service";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export { NotificationItem };
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

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
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications: list, unreadCount } = await getNotificationsApi();
      // Filter out any self-notifications (e.g. user commented/liked/shared their own post)
      const filtered = list.filter((n) => {
        if (!user) return true;
        const isSelfActorId =
          n.user?.id && String(n.user.id) === String(user.id);
        const isSelfActorName =
          user.name &&
          n.user?.name &&
          n.user.name.trim().toLowerCase() === user.name.trim().toLowerCase();
        return !isSelfActorId && !isSelfActorName;
      });
      setNotifications(filtered);
      if (onUnreadCountChange) {
        onUnreadCountChange(filtered.filter((n) => n.isUnread).length);
      }
    } catch (err) {
      console.warn("[NotificationModal] Load error:", err);
    }
  }, [onUnreadCountChange, user]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      loadNotifications().finally(() => setIsLoading(false));
    } else {
      setShowSearch(false);
      setSearchQuery("");
    }
  }, [visible, loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    if (onUnreadCountChange) {
      onUnreadCountChange(0);
    }
    await markAllNotificationsAsReadApi();
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (item.isUnread) {
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === item.id ? { ...n, isUnread: false } : n,
        );
        if (onUnreadCountChange) {
          onUnreadCountChange(updated.filter((n) => n.isUnread).length);
        }
        return updated;
      });
      await markNotificationAsReadApi(item.id);
    }

    if (item.type === "friend_request" || item.type === "friend_accepted") {
      onClose();
      router.push("/user/Friends" as any);
    } else if (
      item.type === "tag" ||
      item.type === "like" ||
      item.type === "comment"
    ) {
      onClose();
    }
  };

  const handleDeleteNotification = (id: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setNotifications((prev) => {
              const updated = prev.filter((n) => n.id !== id);
              if (onUnreadCountChange) {
                onUnreadCountChange(updated.filter((n) => n.isUnread).length);
              }
              return updated;
            });
            await deleteNotificationApi(id);
          },
        },
      ],
    );
  };

  const handleOptionsPress = (item: NotificationItem) => {
    Alert.alert("Notification Options", item.title || "Options", [
      { text: "Cancel", style: "cancel" },
      item.isUnread
        ? {
            text: "Mark as read",
            onPress: async () => {
              setNotifications((prev) => {
                const updated = prev.map((n) =>
                  n.id === item.id ? { ...n, isUnread: false } : n,
                );
                if (onUnreadCountChange) {
                  onUnreadCountChange(updated.filter((n) => n.isUnread).length);
                }
                return updated;
              });
              await markNotificationAsReadApi(item.id);
            },
          }
        : {
            text: "Close",
            style: "cancel",
          },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteNotification(item.id),
      },
    ]);
  };

  const getReactionBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "tag":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#6366F1] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="pricetag" size={11} color="white" />
          </View>
        );
      case "like":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#EF4444] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="heart" size={11} color="white" />
          </View>
        );
      case "comment":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#10B981] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="chatbubble" size={11} color="white" />
          </View>
        );
      case "friend_request":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1877f2] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="person-add" size={11} color="white" />
          </View>
        );
      case "friend_accepted":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#10B981] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="checkmark-circle" size={11} color="white" />
          </View>
        );
      case "group_invite":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1877f2] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="people" size={12} color="white" />
          </View>
        );
      case "mention":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2e7d32] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="at" size={12} color="white" />
          </View>
        );
      case "challenge":
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#f59e0b] items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="trophy" size={11} color="white" />
          </View>
        );
      case "system":
      default:
        return (
          <View
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-600 items-center justify-center border-2 border-white"
            style={{ elevation: 2 }}
          >
            <Ionicons name="notifications" size={11} color="white" />
          </View>
        );
    }
  };

  const filteredNotifications = searchQuery.trim()
    ? notifications.filter((n) => {
        const q = searchQuery.toLowerCase();
        return (
          n.user.name.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.entityName && n.entityName.toLowerCase().includes(q))
        );
      })
    : notifications;

  const unreadCount = notifications.filter((n) => n.isUnread).length;

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
              {/* Back Icon */}
              <TouchableOpacity
                onPress={onClose}
                className="p-1 -ml-1 active:opacity-70 flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <Ionicons name="arrow-back" size={26} color="#72AF5B" />
              </TouchableOpacity>

              {/* Title */}
              <Text className="text-xl font-bold text-black ml-3 flex-1">
                Notifications
              </Text>

              {/* Right Action Icons */}
              <View className="flex-row items-center gap-3">
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    className="py-1 px-2 rounded-md bg-white border border-[#72AF5B]"
                    accessibilityRole="button"
                    accessibilityLabel="Mark all as read"
                  >
                    <Text className="text-xs font-semibold text-[#000000]">
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setShowSearch((prev) => !prev)}
                  className="p-1 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Search notifications"
                >
                  <Ionicons
                    name={showSearch ? "close-circle" : "search"}
                    size={22}
                    color="black"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  className="p-1 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Close notifications"
                >
                  <Ionicons name="close" size={26} color="black" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Optional Search Bar */}
            {showSearch && (
              <View className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex-row items-center">
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search notifications..."
                  className="flex-1 ml-2 text-sm text-gray-800"
                  autoFocus={true}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Notification List */}
            {isLoading ? (
              <View className="flex-1 items-center justify-center p-12">
                <ActivityIndicator size="large" color="#72AF5B" />
                <Text className="text-gray-500 text-sm mt-3">
                  Loading notifications...
                </Text>
              </View>
            ) : (
              <ScrollView
                className="flex-1 bg-white"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    colors={["#72AF5B"]}
                    tintColor="#72AF5B"
                  />
                }
              >
                {filteredNotifications.length === 0 ? (
                  <View className="p-12 items-center justify-center">
                    <Ionicons
                      name="notifications-off-outline"
                      size={48}
                      color="#9CA3AF"
                    />
                    <Text className="text-gray-500 text-base mt-3">
                      {searchQuery
                        ? "No matching notifications"
                        : "No notifications to show"}
                    </Text>
                  </View>
                ) : (
                  filteredNotifications.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleNotificationPress(item)}
                      className={`flex-row px-4 py-3.5 border-b border-gray-100 items-start ${
                        item.isUnread ? "bg-[#e7f3ff]" : "bg-white"
                      }`}
                      activeOpacity={0.8}
                    >
                      {/* Left Column (Avatar Person Icon & Badge) */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose();
                          router.push("/user/Friends" as any);
                        }}
                        className="relative mr-3.5"
                      >
                        <View className="w-14 h-14 rounded-full bg-gray-200 border border-gray-300 items-center justify-center overflow-hidden">
                          {item.user.avatarUrl ? (
                            <Image
                              source={{ uri: item.user.avatarUrl }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="person" size={28} color="#6B7280" />
                          )}
                        </View>
                        {getReactionBadge(item.type)}
                      </TouchableOpacity>

                      {/* Middle Column (Text Content) */}
                      <View className="flex-1 pr-2">
                        {/* Main Text Content */}
                        {(() => {
                          let bodyText = item.content || "";
                          if (
                            item.user.name &&
                            bodyText
                              .toLowerCase()
                              .startsWith(item.user.name.toLowerCase())
                          ) {
                            bodyText = bodyText
                              .slice(item.user.name.length)
                              .trim();
                          }

                          const showEntityName =
                            item.entityName &&
                            !["connection", "post"].includes(
                              item.entityName.toLowerCase(),
                            );

                          return (
                            <Text className="text-[14px] text-gray-900 leading-snug">
                              <Text
                                className="font-bold text-black"
                                onPress={() => {
                                  onClose();
                                  router.push("/user/Friends" as any);
                                }}
                              >
                                {item.user.name}
                              </Text>{" "}
                              {bodyText}
                              {showEntityName ? (
                                <Text className="font-bold text-black">
                                  {" "}
                                  {item.entityName}
                                </Text>
                              ) : null}
                            </Text>
                          );
                        })()}

                        {/* Timestamp */}
                        <Text className="text-xs text-gray-500 mt-1">
                          {item.time}
                        </Text>
                      </View>

                      {/* Right Column (Options: Horizontal Ellipsis) */}
                      <TouchableOpacity
                        onPress={() => handleOptionsPress(item)}
                        className="p-1 -mr-1 self-start"
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Notification options"
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={18}
                          color="#65676B"
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
};

export default NotificationModal;
