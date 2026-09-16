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

// Main Screen

export default function SpamChatConversation() {
  const router = useRouter();
  const [isActionTaken, setIsActionTaken] = useState<string | null>(null);

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/SpamMessages" as any);
      }
    } catch {
      router.push("/user/SpamMessages" as any);
    }
  };

  const handleAction = (actionType: "Archived" | "Delete" | "Accept") => {
    setIsActionTaken(actionType);
    setTimeout(() => {
      handleBack();
    }, 400);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      {/*  Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-2xs z-10">
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
            Recuiter
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

      {/*  Messages List  */}
      <ScrollView
        className="flex-1 bg-[#F9F9F9] px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-end",
          paddingBottom: 24,
        }}
      >
        {/* Single Received Spam Message */}
        <View className="flex-row items-end justify-start mb-2">
          {/* Sender Avatar */}
          <View className="w-8 h-8 rounded-full bg-gray-400 mr-2 items-center justify-center overflow-hidden self-end shadow-2xs border border-gray-300">
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>

          {/* Message Bubble */}
          <View className="bg-[#F0F0F0] rounded-2xl rounded-bl-xs px-4 py-2.5 max-w-[76%] shadow-2xs">
            <Text className="text-sm leading-snug text-gray-800 font-normal">
              open minded ka po ba?
            </Text>
          </View>
        </View>
      </ScrollView>

      {/*  Bottom Action Area (Three Equal Width Buttons)  */}
      <View className="flex-row justify-between px-4 pt-4 pb-8 bg-white border-t border-gray-100 gap-3">
        {/* Button 1: Archived */}
        <TouchableOpacity
          onPress={() => handleAction("Archived")}
          className="flex-1 bg-gray-50 border border-[#72AF5B] rounded-xl py-3.5 items-center justify-center shadow-2xs"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Archive spam message"
        >
          <Text className="text-base font-bold text-[#72AF5B] text-center">
            {isActionTaken === "Archived" ? "Archived ✓" : "Archived"}
          </Text>
        </TouchableOpacity>

        {/* Button 2: Delete */}
        <TouchableOpacity
          onPress={() => handleAction("Delete")}
          className="flex-1 bg-gray-50 border border-[#E63946] rounded-xl py-3.5 items-center justify-center shadow-2xs"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Delete spam message"
        >
          <Text className="text-base font-bold text-[#E63946] text-center">
            {isActionTaken === "Delete" ? "Deleted ✓" : "Delete"}
          </Text>
        </TouchableOpacity>

        {/* Button 3: Accept */}
        <TouchableOpacity
          onPress={() => handleAction("Accept")}
          className="flex-1 bg-[#72AF5B] rounded-xl py-3.5 items-center justify-center active:bg-gray-600 shadow-2xs"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Accept message"
        >
          <Text className="text-base font-bold text-white text-center">
            {isActionTaken === "Accept" ? "Accepted ✓" : "Accept"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
