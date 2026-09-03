import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Navigation from "../../components/Navigation";

export default function MenuProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/NewsFeed" as any);
      }
    } catch {
      router.push("/user/NewsFeed" as any);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      router.replace("/auth/Login" as any);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await signOut();
    } catch {
      router.replace("/auth/Login" as any);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FA] relative h-full"
      style={{ flex: 1, backgroundColor: "#F8F9FA", position: "relative" }}
    >
      {/*  Main Scrollable Content*/}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/*  Top Header */}
        <View className="relative items-center justify-center pt-4 pb-6">
          <TouchableOpacity
            onPress={handleBack}
            className="absolute left-0 top-4 p-1 active:opacity-70"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-undo" size={28} color="#000000" />
          </TouchableOpacity>

          <Text className="text-xl font-medium text-gray-900">Profile</Text>
        </View>

        {/*  User Profile Card  */}
        <TouchableOpacity
          onPress={() => router.push("/user/PersonalInformation" as any)}
          className="bg-white rounded-2xl p-4 shadow-sm elevation-2 flex-row items-center justify-between mb-6 border border-gray-100 active:bg-gray-50"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Show profile"
        >
          <View className="flex-row items-center gap-3 flex-1 pr-2">
            {/* Avatar */}
            <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200">
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={28} color="#9CA3AF" />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 leading-tight">
                {user?.name || user?.username || "Local Farmer"}
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {user?.email || "Show profile"}
              </Text>
            </View>
          </View>

          {/* Right Side: Chevron */}
          <Ionicons name="chevron-forward" size={20} color="#000000" />
        </TouchableOpacity>

        {/*  Settings Section */}
        <Text className="text-2xl font-bold text-black mb-4">Settings</Text>

        <View className="bg-white rounded-2xl shadow-sm elevation-2 mb-6 py-2 border border-gray-100 overflow-hidden">
          {/* Item 1: Personal Information */}
          <TouchableOpacity
            onPress={() => router.push("/user/PersonalInformation" as any)}
            className="flex-row items-center px-4 py-3 gap-4 border-b border-gray-50 active:bg-gray-50"
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={24} color="#000000" />
            <Text className="text-base text-gray-900 flex-1">
              Personal Information
            </Text>
          </TouchableOpacity>

          {/* Item 2: Security */}
          <TouchableOpacity
            onPress={() => router.push("/user/Security" as any)}
            className="flex-row items-center px-4 py-3 gap-4 border-b border-gray-50 active:bg-gray-50"
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={24} color="#000000" />
            <Text className="text-base text-gray-900 flex-1">Security</Text>
          </TouchableOpacity>

          {/* Item 3: Saved */}
          <TouchableOpacity
            onPress={() => router.push("/user/SavedPosts" as any)}
            className="flex-row items-center px-4 py-3 gap-4 border-b border-gray-50 active:bg-gray-50"
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark-outline" size={24} color="#000000" />
            <Text className="text-base text-gray-900 flex-1">Saved</Text>
          </TouchableOpacity>

          {/* Item 4: Darkmode */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 gap-4 active:bg-gray-50"
            activeOpacity={0.7}
          >
            <Ionicons name="moon" size={24} color="#000000" />
            <Text className="text-base text-gray-900 flex-1">Darkmode</Text>
          </TouchableOpacity>
        </View>

        {/*  Support Section Card  */}
        <View className="bg-white rounded-2xl shadow-sm elevation-2 mb-6 py-2 border border-gray-100 overflow-hidden">
          {/* Item 1: Help and support */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 gap-4 border-b border-gray-50 active:bg-gray-50"
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle" size={24} color="#000000" />
            <Text className="text-base font-medium text-gray-900 flex-1">
              Help and support
            </Text>
          </TouchableOpacity>

          {/* Item 2: Privacy & policy */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 gap-4 active:bg-gray-50"
            activeOpacity={0.7}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#000000"
            />
            <Text className="text-base font-medium text-gray-900 flex-1">
              Privacy & policy
            </Text>
          </TouchableOpacity>
        </View>

        {/*  6. Action Buttons  */}
        <View className="gap-3 mb-6">
          {/* Switch Account Button */}
          <TouchableOpacity
            className="w-full bg-[#77af5c] rounded-xl py-3.5 items-center justify-center active:bg-[#689d50] shadow-sm"
            activeOpacity={0.8}
            onPress={handleSwitchAccount}
            accessibilityRole="button"
            accessibilityLabel="Switch account"
          >
            <Text className="text-base font-bold text-white">
              Switch account
            </Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            className="w-full bg-[#a3a3a3] rounded-xl py-3.5 items-center justify-center active:bg-[#8e8e8e] shadow-sm"
            activeOpacity={0.8}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Text className="text-base font-bold text-white">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/*  Bottom Navigation Bar  */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
