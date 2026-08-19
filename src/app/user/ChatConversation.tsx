import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  sender: "user" | "other";
  type?: "text" | "image";
  text?: string;
  showAvatar?: boolean;
  timestamp?: string; // If set, renders centered timestamp
  isSeen?: boolean; // If set, renders seen indicator below
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "other",
    type: "text",
    text: "boanga ato uy swak ang gatas unya milo diay HAHHAHAHAAHAHAHA",
    showAvatar: true,
  },
  {
    id: "2",
    sender: "user",
    type: "text",
    text: "HAHHAHAHAAHAHAHAH",
  },
  {
    id: "3",
    sender: "user",
    type: "text",
    text: "taga aha diay daw to ana sya?",
  },
  {
    id: "4",
    sender: "other",
    type: "text",
    text: "wala ko kabalo raba. ask sya",
    showAvatar: true,
  },
  {
    id: "5",
    sender: "user",
    type: "text",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis",
  },
  {
    id: "6",
    sender: "other",
    type: "text",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna",
    showAvatar: false,
  },
  {
    id: "7",
    sender: "other",
    type: "text",
    text: "AJAHAJ DUHHHHHHHHHH",
    showAvatar: true,
  },
  {
    id: "8",
    sender: "other",
    timestamp: "8:35 AM",
  },
  {
    id: "9",
    sender: "other",
    type: "image",
    showAvatar: false,
  },
  {
    id: "10",
    sender: "other",
    type: "text",
    text: "kinsa daw ni bi?????",
    showAvatar: true,
  },
  {
    id: "11",
    sender: "user",
    type: "text",
    text: "Asa ka boss?",
    isSeen: true,
  },
];

export default function ChatConversation() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      type: "text",
      text: inputText.trim(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
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
        {/*   Top Header  */}
        <View className="flex-row items-center justify-between px-3 py-3 bg-white border-b border-gray-100 shadow-2xs z-10">
          {/* Left Section: Back, Unread Badge, Avatar, Name & Status */}
          <View className="flex-row items-center flex-1 pr-1">
            {/* Back Button with Unread Badge */}
            <TouchableOpacity
              onPress={handleBack}
              className="p-1 -ml-1 mr-1.5 active:opacity-70 flex-row items-center"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={28} color="#000000" />
              <View className="bg-red-500 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 -ml-1 shadow-2xs">
                <Text className="text-white text-[10px] font-bold text-center">
                  7
                </Text>
              </View>
            </TouchableOpacity>

            {/* Profile Avatar (Bigger Round Background) */}
            <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center overflow-hidden border border-gray-200 shadow-2xs">
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>

            {/* Name and Active Status */}
            <View className="flex-1 ml-3 justify-center">
              <Text
                className="font-bold text-base text-gray-900 leading-tight"
                numberOfLines={1}
              >
                Mark Paul Cosido
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">Active Now</Text>
            </View>
          </View>

          {/* Right Section: Call, Video, Info Icons */}
          <View className="flex-row items-center gap-3.5">
            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Audio call"
            >
              <Ionicons name="call" size={22} color="#77af5c" />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Video call"
            >
              <Ionicons name="videocam" size={24} color="#77af5c" />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Information"
            >
              <Ionicons name="information-circle" size={24} color="#77af5c" />
            </TouchableOpacity>
          </View>
        </View>

        {/*   Messages List (Scroll Area)  */}
        <ScrollView
          className="flex-1 bg-[#F9F9F9] px-4 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {messages.map((item) => {
            // Render Centered Timestamp
            if (item.timestamp) {
              return (
                <Text
                  key={item.id}
                  className="text-xs text-gray-400 text-center my-4 font-medium"
                >
                  {item.timestamp}
                </Text>
              );
            }

            const isUser = item.sender === "user";

            return (
              <View key={item.id} className="mb-2">
                <View
                  className={`flex-row items-end ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Left Avatar for Received Messages (Bigger Round Background) */}
                  {!isUser && (
                    <View className="w-9 h-9 mr-2 items-center justify-center">
                      {item.showAvatar ? (
                        <View className="w-9 h-9 rounded-full bg-gray-300 items-center justify-center overflow-hidden border border-gray-200 shadow-2xs">
                          <Ionicons name="person" size={20} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View className="w-9 h-9" />
                      )}
                    </View>
                  )}

                  {/* Message Bubble or Image */}
                  {item.type === "image" ? (
                    <View className="w-48 h-32 rounded-xl bg-gray-300 mb-1 items-center justify-center overflow-hidden border border-gray-300">
                      <Ionicons name="image" size={36} color="#9CA3AF" />
                    </View>
                  ) : (
                    <View
                      className={`px-4 py-2.5 max-w-[76%] ${
                        isUser
                          ? "bg-[#77af5c] rounded-2xl rounded-br-xs"
                          : "bg-[#F0F0F0] rounded-2xl rounded-bl-xs"
                      }`}
                    >
                      <Text
                        className={`text-sm leading-snug ${
                          isUser ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {item.text}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Seen Indicator  */}
                {item.isSeen && (
                  <View className="flex-row items-center justify-end gap-1.5 mt-1 mr-1">
                    <Text className="text-[11px] text-gray-400 font-normal">
                      Seen
                    </Text>
                    <View className="w-3.5 h-3.5 rounded-full bg-gray-300 items-center justify-center overflow-hidden">
                      <Ionicons name="person" size={10} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {showAttachmentMenu && (
          <View
            className="absolute bottom-16 left-4 z-50 bg-white rounded-2xl p-1.5 shadow-2xl elevation-10 w-44"
            style={{
              position: "absolute",
              bottom: 60,
              left: 16,
              zIndex: 50,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Camera Option */}
            <TouchableOpacity
              onPress={() => {
                setShowAttachmentMenu(false);
              }}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Camera"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">
                Camera
              </Text>
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              onPress={() => {
                setShowAttachmentMenu(false);
                const imgMessage: Message = {
                  id: Date.now().toString(),
                  sender: "user",
                  type: "image",
                };
                setMessages((prev) => [...prev, imgMessage]);
              }}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Gallery"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="image" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">
                Gallery
              </Text>
            </TouchableOpacity>

            {/* Voice Message Option */}
            <TouchableOpacity
              onPress={() => {
                setShowAttachmentMenu(false);
              }}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Voice message"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="mic" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">Voice</Text>
            </TouchableOpacity>

            {/* Location Option */}
            <TouchableOpacity
              onPress={() => {
                setShowAttachmentMenu(false);
              }}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Location"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="location" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">
                Location
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/*  Bottom Input Bar  */}
        <View className="flex-row items-center px-4 py-3 bg-white border-t border-gray-100">
          {/* Left Action: Plus Icon with Round Background (Toggles Camera/Gallery Menu) */}
          <TouchableOpacity
            onPress={() => setShowAttachmentMenu((prev) => !prev)}
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 active:opacity-80 shadow-2xs ${
              showAttachmentMenu ? "bg-gray-700" : "bg-[#77af5c]"
            }`}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              showAttachmentMenu
                ? "Close attachment menu"
                : "Open attachments (Camera, Gallery, Voice)"
            }
          >
            <Ionicons
              name={showAttachmentMenu ? "close" : "add"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Text Input Pill */}
          <View className="flex-1 bg-gray-200 rounded-full px-4 py-2 mr-3 flex-row items-center">
            <TextInput
              value={inputText}
              onChangeText={(t) => {
                setInputText(t);
                if (showAttachmentMenu) setShowAttachmentMenu(false);
              }}
              placeholder="Aa"
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-base text-gray-800 p-0"
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
          </View>

          {/* Right Action */}
          <TouchableOpacity
            onPress={inputText.trim() ? handleSend : undefined}
            className="active:opacity-70 p-1"
            accessibilityRole="button"
            accessibilityLabel={inputText.trim() ? "Send" : "Sticker"}
          >
            {inputText.trim() ? (
              <Ionicons name="send" size={22} color="#77af5c" />
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
    </SafeAreaView>
  );
}
