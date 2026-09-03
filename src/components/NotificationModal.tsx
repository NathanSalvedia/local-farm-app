import {
  deleteNotificationApi,
  getNotificationsApi,
  markNotificationReadApi,
  NotificationItem,
} from "@/services/notification-service";
import { respondToConnectionRequestApi } from "@/services/connection-service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<string, boolean>>({});

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await getNotificationsApi();
      setNotifications(res.notifications || []);
      if (onUnreadCountChange) {
        onUnreadCountChange(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      getNotificationsApi()
        .then((res) => {
          if (isMounted) {
            setNotifications(res.notifications || []);
            if (onUnreadCountChange) {
              onUnreadCountChange(res.unreadCount || 0);
            }
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch notifications:", err);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [visible, onUnreadCountChange]);

  // Handle Respond to Friend Request in Notification
  const handleRespondToFriendRequest = async (
    item: NotificationItem,
    action: "confirm" | "declined"
  ) => {
    const connectionId = item.targetId || item.id;
    setActionLoadingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      if (connectionId) {
        await respondToConnectionRequestApi(connectionId, action);
      }
      await markNotificationReadApi(item.id).catch(() => {});

      setNotifications((prev) => {
        const updated = prev.map((n) => {
          if (n.id === item.id) {
            return {
              ...n,
              hasActionButtons: false,
              isUnread: false,
              content:
                action === "confirm"
                  ? "is now connected with you."
                  : "connection request removed.",
            };
          }
          return n;
        });

        if (onUnreadCountChange) {
          onUnreadCountChange(updated.filter((n) => n.isUnread).length);
        }
        return updated;
      });
    } catch (err) {
      console.warn("Error responding to connection in notification:", err);
    } finally {
      setActionLoadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationApi(id).catch(() => {});
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        if (onUnreadCountChange) {
          onUnreadCountChange(updated.filter((item) => item.isUnread).length);
        }
        return updated;
      });
    } catch (err) {
      console.warn("Error deleting notification:", err);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // Mark as read locally and in API
    if (item.isUnread) {
      markNotificationReadApi(item.id).catch(() => {});
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === item.id ? { ...n, isUnread: false } : n
        );
        if (onUnreadCountChange) {
          onUnreadCountChange(updated.filter((n) => n.isUnread).length);
        }
        return updated;
      });
    }

    // Navigation triggers based on type
    if (item.type === "connection_request") {
      onClose();
      router.push("/user/Friends" as any);
    } else if (item.type === "connection_accepted") {
      onClose();
      router.push({
        pathname: "/user/ChatConversation",
        params: {
          userId: item.actorId || "",
          name: item.user.name,
          avatarUrl: item.user.avatarUrl || "",
          online: "true",
        },
      } as any);
    }
  };

  const getReactionBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "connection_request":
        return (
          <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1877f2] items-center justify-center border-2 border-white shadow-xs">
            <Ionicons name="person-add" size={13} color="white" />
          </View>
        );
      case "connection_accepted":
        return (
          <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center border-2 border-white shadow-xs">
            <Ionicons name="people" size={14} color="white" />
          </View>
        );
      case "group_invite":
        return (
          <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1877f2] items-center justify-center border-2 border-white shadow-xs">
            <Ionicons name="people" size={14} color="white" />
          </View>
        );
      case "mention":
        return (
          <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#2e7d32] items-center justify-center border-2 border-white shadow-xs">
            <Ionicons name="chatbubble" size={13} color="white" />
          </View>
        );
      case "system":
        return (
          <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gray-600 items-center justify-center border-2 border-white shadow-xs">
            <Ionicons name="notifications" size={13} color="white" />
          </View>
        );
      case "challenge":
        return (
          <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#f59e0b] items-center justify-center border-2 border-white shadow-xs">
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
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* 1. Top Navigation Bar */}
        <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
          {/* Hamburger Menu Icon */}
          <TouchableOpacity
            onPress={onClose}
            className="p-1 -ml-1 active:opacity-70 flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="Close notifications"
          >
            <Ionicons name="menu" size={32} color="#72AF5B" />
          </TouchableOpacity>

          {/* Center/Left: Title Displaying 'Notifications' */}
          <Text className="text-2xl font-bold text-black ml-4 flex-1">
            Notifications
          </Text>

          {/* Right Action Icons: Search Icon & Close Icon */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={fetchNotifications}
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Refresh notifications"
            >
              <Ionicons name="refresh-outline" size={24} color="#374151" />
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
        <View className="px-4 py-2 bg-white flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">Earlier</Text>
          {notifications.some((n) => n.isUnread) && (
            <TouchableOpacity
              onPress={async () => {
                await markNotificationReadApi().catch(() => {});
                setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
                if (onUnreadCountChange) onUnreadCountChange(0);
              }}
            >
              <Text className="text-xs font-bold text-[#72AF5B]">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification List */}
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {isLoading ? (
            <View className="p-12 items-center justify-center">
              <ActivityIndicator size="large" color="#72AF5B" />
              <Text className="text-xs text-gray-500 mt-2 font-medium">
                Loading notifications...
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View className="p-12 items-center justify-center">
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color="#9CA3AF"
              />
              <Text className="text-gray-500 text-base mt-3 font-semibold">
                No notifications to show
              </Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                Friend requests and community updates will appear here!
              </Text>
            </View>
          ) : (
            notifications.map((item) => {
              const isActionLoading = actionLoadingIds[item.id];

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleNotificationPress(item)}
                  className={`flex-row px-4 py-3.5 border-b border-gray-100/60 items-start ${
                    item.isUnread ? "bg-[#e7f3ff]" : "bg-white"
                  }`}
                  activeOpacity={0.8}
                >
                  {/* Left Column (Avatar & Badge) */}
                  <View className="relative mr-3.5">
                    <View className="w-16 h-16 rounded-full bg-gray-200 border border-gray-300 items-center justify-center overflow-hidden">
                      {item.user.avatarUrl ? (
                        <Image
                          source={{ uri: item.user.avatarUrl }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={32} color="#6B7280" />
                      )}
                    </View>
                    {getReactionBadge(item.type)}
                  </View>

                  {/* Middle Column (Text Content & Actions) */}
                  <View className="flex-1 pr-2">
                    {/* Main Text Content */}
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

                    {/* Action Buttons for Connection Request (Confirm / Delete) */}
                    {item.hasActionButtons && item.type === "connection_request" && (
                      <View className="flex-row gap-2 mt-3">
                        <TouchableOpacity
                          onPress={() => handleRespondToFriendRequest(item, "confirm")}
                          disabled={isActionLoading}
                          className="flex-1 bg-[#72AF5B] rounded-lg py-2 items-center justify-center active:bg-[#5E9C4E]"
                          activeOpacity={0.8}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text className="text-white font-bold text-[14px]">
                              Confirm
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRespondToFriendRequest(item, "declined")}
                          disabled={isActionLoading}
                          className="flex-1 bg-gray-50 border border-red-300 rounded-lg py-2 items-center justify-center active:bg-gray-200"
                          activeOpacity={0.8}
                        >
                          <Text className="text-red-600 font-bold text-[14px]">
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Direct Message button for Accepted Connection */}
                    {item.type === "connection_accepted" && (
                      <View className="flex-row mt-2.5">
                        <TouchableOpacity
                          onPress={() => {
                            onClose();
                            router.push({
                              pathname: "/user/ChatConversation",
                              params: {
                                userId: item.actorId || "",
                                name: item.user.name,
                                avatarUrl: item.user.avatarUrl || "",
                                online: "true",
                              },
                            } as any);
                          }}
                          className="px-3 py-1.5 bg-[#EAF4E6] rounded-lg active:bg-[#DBECCF]"
                        >
                          <Text className="text-xs font-bold text-[#487E34]">
                            Send Message
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Right Column (Delete / Dismiss Option) */}
                  <TouchableOpacity
                    onPress={() => handleDeleteNotification(item.id)}
                    className="p-1 -mr-1 self-start"
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Delete notification"
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default NotificationModal;

