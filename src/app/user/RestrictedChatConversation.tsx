import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  sender: "user" | "other";
  text: string;
  showAvatar?: boolean;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "other",
    text: "boanga ato uy swak ang gatas unya milo diay HAHHAHAHAAHAHAHA",
    showAvatar: false,
  },
  {
    id: "2",
    sender: "user",
    text: "HAHHAHAHAAHAHAHAH",
  },
  {
    id: "3",
    sender: "user",
    text: "taga aha diay daw to ana sya?",
  },
  {
    id: "4",
    sender: "other",
    text: "wala ko kabalo raba. ask sya",
    showAvatar: true,
  },
  {
    id: "5",
    sender: "user",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis",
  },
  {
    id: "6",
    sender: "other",
    text: "AJAHAJ DUHHHHHHHHHH",
    showAvatar: true,
  },
];

export default function RestrictedChatConversation() {
  const router = useRouter();
  const [isRestricted, setIsRestricted] = useState(true);

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/RestrictedAccounts" as any);
      }
    } catch {
      router.push("/user/RestrictedAccounts" as any);
    }
  };

  const handleUnrestrict = () => {
    setIsRestricted(false);
    setTimeout(() => {
      handleBack();
    }, 400);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      {/*  Top Header  */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-2xs z-10">
        {/* Left Section: Back & Profile */}
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBack}
            className="p-1 -ml-2 active:opacity-70"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>

          {/* Profile Avatar */}
          <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center overflow-hidden border border-gray-200">
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>

          {/* User Name */}
          <Text
            className="text-base font-bold text-gray-900 leading-tight"
            numberOfLines={1}
          >
            Baby2
          </Text>
        </View>

        <TouchableOpacity
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Information"
        >
          <Ionicons name="information-circle" size={28} color="#77af5c" />
        </TouchableOpacity>
      </View>

      {/*  Messages List (Scroll Area)  */}
      <ScrollView
        className="flex-1 bg-[#F9F9F9] px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {MOCK_MESSAGES.map((item) => {
          const isUser = item.sender === "user";

          return (
            <View key={item.id} className="mb-2">
              <View
                className={`flex-row items-end ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {/* Left Avatar for Received Messages */}
                {!isUser && (
                  <View className="w-7 h-7 mr-2 items-center justify-center">
                    {item.showAvatar ? (
                      <View className="w-7 h-7 rounded-full bg-gray-300 items-center justify-center overflow-hidden border border-gray-200 shadow-2xs">
                        <Ionicons name="person" size={16} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View className="w-7 h-7" />
                    )}
                  </View>
                )}

                {/* Message Bubble */}
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
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/*  Bottom Action */}
      <View className="px-4 pt-3 pb-6">
        <Text className="text-sm text-gray-800 text-center mb-2.5 font-normal">
          {isRestricted
            ? "You restricted Baby2"
            : "Baby2 has been unrestricted"}
        </Text>

        <TouchableOpacity
          onPress={handleUnrestrict}
          disabled={!isRestricted}
          className={`w-full rounded-lg py-2 items-center justify-center shadow-2xs ${
            isRestricted ? "bg-gray-500 active:bg-gray-600" : "bg-green-600"
          }`}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Unrestrict user"
        >
          <Text className="text-sm font-bold text-white">
            {isRestricted ? "Unrestrict" : "Unrestricted"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
