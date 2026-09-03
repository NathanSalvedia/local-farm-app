import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminHomeScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Redirection handled by auth context
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA] justify-between p-6">
      {/* Header */}
      <View className="items-center mt-8">
        <View className="w-20 h-20 bg-[#72AF5B]/10 rounded-full items-center justify-center mb-4">
          <Ionicons name="shield-checkmark" size={44} color="#72AF5B" />
        </View>
        <Text className="text-2xl font-black text-gray-900 mb-1">
          Admin Dashboard
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          Welcome back, {user?.name || "Administrator"} ({user?.email})
        </Text>
      </View>

      {/* Admin Quick Card */}
      <View className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm w-full max-w-[400px] self-center">
        <Text className="text-base font-bold text-gray-800 mb-2">
          Administrator Privileges Active
        </Text>
        <Text className="text-sm text-gray-600 leading-relaxed">
          You are currently signed in with the{" "}
          <Text className="font-bold text-[#72AF5B]">Admin Role</Text>. You can
          manage system settings, users, and oversee the Local Farm platform.
        </Text>
      </View>

      {/* Logout Button */}
      <View className="w-full max-w-[400px] self-center mb-6">
        <TouchableOpacity
          className="w-full bg-[#FF3B30] rounded-2xl py-4 items-center justify-center active:opacity-90 shadow-md shadow-[#FF3B30]/20 flex-row gap-2"
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          <Text className="text-base font-bold text-white">Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

