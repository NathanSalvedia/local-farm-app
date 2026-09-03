import { useAuth } from "@/hooks/use-auth";
import {
  ChatMessage,
  getMessagesApi,
  sendMessageApi,
} from "@/services/chat-service";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatConversation() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    conversationId?: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
    online?: string;
  }>();

  const otherUserName = params.name || "Farmer";
  const otherUserAvatar = params.avatarUrl || "";
  const isOnline = params.online === "true";

  const [conversationId, setConversationId] = useState<string | null>(
    params.conversationId || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    isOpen: boolean;
    isVideo: boolean;
    roomName: string;
    roomUrl: string;
  }>({
    isOpen: false,
    isVideo: false,
    roomName: "",
    roomUrl: "",
  });

  const handleStartCall = async (isVideo: boolean) => {
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, "");
    const myName = sanitize(user?.username || user?.fullName || `user_${user?.id || "1"}`);
    const peerName = sanitize(otherUserName || `peer_${params.userId || "2"}`);
    const roomName = `LocalFarm_${[myName, peerName].sort().join("_")}`;

    const displayName = encodeURIComponent(user?.fullName || user?.username || "Local Farmer");
    const roomUrl = isVideo
      ? `https://meet.jit.si/${roomName}#config.startWithVideoMuted=false&config.prejoinPageEnabled=false&userInfo.displayName="${displayName}"`
      : `https://meet.jit.si/${roomName}#config.startWithVideoMuted=true&config.startWithAudioMuted=false&config.prejoinPageEnabled=false&userInfo.displayName="${displayName}"`;

    setActiveCall({
      isOpen: true,
      isVideo,
      roomName,
      roomUrl,
    });

    // Send call invite message in chat so the other user can join immediately
    try {
      await sendMessageApi({
        receiverId: params.userId,
        conversationId: conversationId || undefined,
        messageText: isVideo
          ? `📹 Started a Video Call on Jitsi Meet. Tap to join: https://meet.jit.si/${roomName}`
          : `📞 Started a Voice Call on Jitsi Meet. Tap to join: https://meet.jit.si/${roomName}`,
      });
      fetchMessages();
    } catch (e) {}
  };

  const handleJoinCallFromUrl = (url: string, isVideo: boolean) => {
    const match = url.match(/https:\/\/meet\.jit\.si\/([a-zA-Z0-9_-]+)/);
    const roomName = match ? match[1] : "LocalFarm_Room";
    const displayName = encodeURIComponent(user?.fullName || user?.username || "Local Farmer");
    const roomUrl = isVideo
      ? `https://meet.jit.si/${roomName}#config.startWithVideoMuted=false&config.prejoinPageEnabled=false&userInfo.displayName="${displayName}"`
      : `https://meet.jit.si/${roomName}#config.startWithVideoMuted=true&config.startWithAudioMuted=false&config.prejoinPageEnabled=false&userInfo.displayName="${displayName}"`;

    setActiveCall({
      isOpen: true,
      isVideo,
      roomName,
      roomUrl,
    });
  };

  const scrollViewRef = useRef<ScrollView>(null);

  const fetchMessages = async () => {
    try {
      const data = await getMessagesApi({
        conversationId: conversationId || undefined,
        userId: params.userId || undefined,
      });
      setMessages(data.messages);
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err) {
      console.warn("Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Polling interval for live incoming messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [params.conversationId, params.userId]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText("");
    setIsSending(true);

    // Optimistic message preview
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: "user",
      senderId: user?.id ? String(user.id) : undefined,
      receiverId: params.userId,
      type: "text",
      text,
      time: "Just now",
      isSeen: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await sendMessageApi({
        receiverId: params.userId,
        conversationId: conversationId || undefined,
        messageText: text,
      });

      if (res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.data : m))
        );
        if (res.data.id && !conversationId) {
          fetchMessages();
        }
      }
    } catch (err) {
      console.warn("Send message error:", err);
    } finally {
      setIsSending(false);
    }
  };

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

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        style={{ flex: 1 }}
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-3 py-3 bg-white border-b border-gray-100 shadow-2xs z-10">
          {/* Left Section: Back, Avatar, Name & Status */}
          <View className="flex-row items-center flex-1 pr-1">
            <TouchableOpacity
              onPress={handleBack}
              className="p-1 -ml-1 mr-2 active:opacity-70 flex-row items-center"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={28} color="#000000" />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <View className="w-11 h-11 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200 shadow-2xs">
              {otherUserAvatar ? (
                <Image
                  source={{ uri: otherUserAvatar }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={24} color="#6B7280" />
              )}
            </View>

            {/* Name and Active Status */}
            <View className="flex-1 ml-3 justify-center">
              <Text
                className="font-bold text-base text-gray-900 leading-tight"
                numberOfLines={1}
              >
                {otherUserName}
              </Text>
              <View className="flex-row items-center mt-0.5">
                {isOnline && (
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                )}
                <Text className="text-xs text-gray-500">
                  {isOnline ? "Active Now" : "Local Farmer"}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Section: Call, Video, Info Icons */}
          <View className="flex-row items-center gap-3.5">
            <TouchableOpacity
              onPress={() => handleStartCall(false)}
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Voice Call"
            >
              <Ionicons name="call" size={22} color="#72AF5B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleStartCall(true)}
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Video Call"
            >
              <Ionicons name="videocam" size={24} color="#72AF5B" />
            </TouchableOpacity>

            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color="#72AF5B"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 bg-white"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
            paddingTop: 16,
            paddingBottom: 16,
          }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() =>
            scrollViewRef.current?.scrollToEnd({ animated: false })
          }
        >
          {isLoading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#72AF5B" />
              <Text className="text-xs text-gray-400 mt-2 font-medium">
                Loading messages...
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="py-20 items-center justify-center px-6">
              <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-3">
                <Ionicons name="chatbubble-ellipses" size={32} color="#72AF5B" />
              </View>
              <Text className="text-base font-bold text-gray-800 mb-1">
                Say hello to {otherUserName}!
              </Text>
              <Text className="text-xs text-gray-400 text-center">
                Start your conversation about crops, seeds, or local farming.
              </Text>
            </View>
          ) : (
            messages.map((item, index) => {
              // Exact match: if sender is user or senderId equals logged in user's ID
              const isUser =
                item.sender === "user" ||
                (Boolean(user?.id) &&
                  (String(item.senderId) === String(user?.id) ||
                    Number(item.senderId) === Number(user?.id)));

              return (
                <View key={item.id || index} className="mb-3">
                  {/* Message Row */}
                  <View
                    className={`flex-row items-end ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Other User Avatar */}
                    {!isUser && (
                      <View className="mr-2 mb-0.5">
                        <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200">
                          {otherUserAvatar ? (
                            <Image
                              source={{ uri: otherUserAvatar }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="person" size={16} color="#6B7280" />
                          )}
                        </View>
                      </View>
                    )}

                    {/* Message Bubble or Image or Call Card */}
                    {item.type === "image" && item.imageUrl ? (
                      <View className="w-48 h-36 rounded-2xl bg-gray-200 mb-1 items-center justify-center overflow-hidden border border-gray-200">
                        <Image
                          source={{ uri: item.imageUrl }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </View>
                    ) : item.text?.includes("meet.jit.si") ? (
                      (() => {
                        const isVideoCall = item.text.toLowerCase().includes("video");
                        const match = item.text.match(/(https:\/\/meet\.jit\.si\/[^\s]+)/);
                        const callUrl = match ? match[0] : "";

                        return (
                          <View
                            className={`p-3 rounded-2xl max-w-[82%] border shadow-xs ${
                              isUser
                                ? "bg-[#5D9649] border-[#4D823A]"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <View className="flex-row items-center mb-2">
                              <View className="w-8 h-8 rounded-full bg-white/90 items-center justify-center mr-2 shadow-2xs">
                                <Ionicons
                                  name={isVideoCall ? "videocam" : "call"}
                                  size={16}
                                  color="#72AF5B"
                                />
                              </View>
                              <View className="flex-1">
                                <Text
                                  className={`font-bold text-xs ${
                                    isUser ? "text-white" : "text-gray-900"
                                  }`}
                                >
                                  {isVideoCall ? "Video Call Invite" : "Voice Call Invite"}
                                </Text>
                                <Text
                                  className={`text-[10px] ${
                                    isUser ? "text-green-100" : "text-gray-500"
                                  }`}
                                >
                                  Jitsi Meet Live Call
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              onPress={() =>
                                callUrl && handleJoinCallFromUrl(callUrl, isVideoCall)
                              }
                              className="bg-white py-2 px-3 rounded-xl flex-row items-center justify-center border border-gray-200 active:bg-gray-50 shadow-2xs"
                              activeOpacity={0.85}
                            >
                              <Ionicons
                                name={isVideoCall ? "videocam" : "call"}
                                size={14}
                                color="#72AF5B"
                                style={{ marginRight: 6 }}
                              />
                              <Text className="text-[#72AF5B] font-bold text-xs">
                                Join Call Now
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })()
                    ) : (
                      <View
                        className={`px-4 py-2.5 max-w-[76%] ${
                          isUser
                            ? "bg-[#72AF5B] rounded-2xl rounded-br-xs"
                            : "bg-[#F0F0F0] rounded-2xl rounded-bl-xs"
                        }`}
                      >
                        <Text
                          className={`text-sm leading-snug ${
                            isUser ? "text-white font-medium" : "text-gray-900"
                          }`}
                        >
                          {item.text}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Seen & Timestamp indicator */}
                  <View
                    className={`flex-row items-center mt-1 px-1 ${
                      isUser ? "justify-end" : "justify-start ml-10"
                    }`}
                  >
                    <Text className="text-[10px] text-gray-400 font-medium">
                      {item.time || "Now"}
                    </Text>
                    {isUser && item.isSeen && (
                      <Text className="text-[10px] text-[#72AF5B] font-bold ml-1.5">
                        • Seen
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <View
            className="absolute bottom-16 left-4 z-50 bg-white rounded-2xl p-1.5 shadow-2xl elevation-10 w-44 border border-gray-100"
            style={{
              position: "absolute",
              bottom: 60,
              left: 16,
              zIndex: 50,
            }}
          >
            {/* Camera Option */}
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(false)}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">Camera</Text>
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(false)}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="image" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">Gallery</Text>
            </TouchableOpacity>

            {/* Voice Message Option */}
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(false)}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="mic" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">Voice</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Input Bar */}
        <View className="flex-row items-center px-4 py-3 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={() => setShowAttachmentMenu((prev) => !prev)}
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 active:opacity-80 shadow-2xs ${
              showAttachmentMenu ? "bg-gray-700" : "bg-[#72AF5B]"
            }`}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Attachments"
          >
            <Ionicons
              name={showAttachmentMenu ? "close" : "add"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Text Input Pill */}
          <View className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-3 flex-row items-center border border-gray-200">
            <TextInput
              value={inputText}
              onChangeText={(t) => {
                setInputText(t);
                if (showAttachmentMenu) setShowAttachmentMenu(false);
              }}
              placeholder="Aa"
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-base text-gray-800 p-0 font-medium"
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={inputText.trim() ? handleSend : undefined}
            disabled={!inputText.trim() || isSending}
            className="active:opacity-70 p-1"
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#72AF5B" />
            ) : inputText.trim() ? (
              <Ionicons name="send" size={22} color="#72AF5B" />
            ) : (
              <MaterialCommunityIcons
                name="flower-tulip"
                size={24}
                color="#EC4899"
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Jitsi Meet Live Call Modal */}
      <Modal
        visible={activeCall.isOpen}
        animationType="slide"
        onRequestClose={() => setActiveCall((prev) => ({ ...prev, isOpen: false }))}
        transparent={false}
      >
        <SafeAreaView className="flex-1 bg-gray-900" style={{ flex: 1, backgroundColor: "#111827" }}>
          {/* Call Header */}
          <View className="flex-row items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-20">
            <View className="flex-row items-center flex-1 pr-2">
              <TouchableOpacity
                onPress={() => setActiveCall((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 -ml-1 mr-3"
                accessibilityLabel="Minimize call"
              >
                <Ionicons name="chevron-down" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <View className="w-9 h-9 rounded-full bg-gray-800 items-center justify-center overflow-hidden mr-2.5 border border-gray-700">
                {otherUserAvatar ? (
                  <Image
                    source={{ uri: otherUserAvatar }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={20} color="#9CA3AF" />
                )}
              </View>

              <View className="flex-1">
                <Text
                  className="text-white font-bold text-base"
                  numberOfLines={1}
                >
                  {otherUserName}
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                  <Text className="text-xs text-green-400 font-medium">
                    {activeCall.isVideo ? "Jitsi Video Call" : "Jitsi Voice Call"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Header Actions: Browser & End Call */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => Linking.openURL(activeCall.roomUrl)}
                className="bg-gray-800 px-3 py-1.5 rounded-lg flex-row items-center border border-gray-700 active:bg-gray-700"
                accessibilityLabel="Open in full browser / Jitsi app"
              >
                <Ionicons
                  name="open-outline"
                  size={15}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-white text-xs font-semibold">Browser</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveCall((prev) => ({ ...prev, isOpen: false }))}
                className="w-9 h-9 rounded-full bg-red-600 items-center justify-center active:bg-red-700"
                accessibilityLabel="End call"
              >
                <Ionicons
                  name="call"
                  size={18}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: "135deg" }] }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Call Content Area */}
          <View className="flex-1 bg-gray-950 items-center justify-center relative" style={{ flex: 1 }}>
            {Platform.OS === "web" ? (
              <iframe
                src={activeCall.roomUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  backgroundColor: "#030712",
                }}
              />
            ) : (
              <View className="items-center justify-center p-6">
                <View className="w-28 h-28 rounded-full bg-gray-800 items-center justify-center border-4 border-[#72AF5B] mb-4 overflow-hidden shadow-lg">
                  {otherUserAvatar ? (
                    <Image
                      source={{ uri: otherUserAvatar }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={56} color="#9CA3AF" />
                  )}
                </View>

                <Text className="text-white text-xl font-bold mb-1">
                  {otherUserName}
                </Text>
                <Text className="text-gray-400 text-sm mb-6">
                  {activeCall.isVideo
                    ? "Video Call in progress..."
                    : "Voice Call in progress..."}
                </Text>

                <TouchableOpacity
                  onPress={() => Linking.openURL(activeCall.roomUrl)}
                  className="bg-[#72AF5B] px-6 py-3 rounded-full flex-row items-center active:bg-[#5E9C4E] shadow-md mb-3"
                >
                  <Ionicons
                    name={activeCall.isVideo ? "videocam" : "call"}
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-bold text-sm">
                    Open Jitsi Meet Room
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveCall((prev) => ({ ...prev, isOpen: false }))}
                  className="bg-red-600 px-6 py-3 rounded-full flex-row items-center active:bg-red-700 shadow-md"
                >
                  <Ionicons
                    name="call"
                    size={20}
                    color="#FFFFFF"
                    style={{ transform: [{ rotate: "135deg" }], marginRight: 8 }}
                  />
                  <Text className="text-white font-bold text-sm">
                    End Call
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
