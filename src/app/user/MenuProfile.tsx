import { useAuth } from "@/hooks/use-auth";
import { getRSBSAApplication, RSBSAApplication } from "@/services/rsbsa-service";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navigation from "../../components/Navigation";

export default function MenuProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [rsbsaApp, setRsbsaApp] = useState<RSBSAApplication | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getRSBSAApplication()
        .then((app) => {
          if (isMounted) setRsbsaApp(app);
        })
        .catch((err) => console.log("[MenuProfile] Failed to load RSBSA in MenuProfile:", err));
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const isRSBSAVerified = rsbsaApp?.status === "verified";

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

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            router.replace("/auth/Login" as any);
          }
        },
      },
    ]);
  };

  const handleSwitchAccount = () => {
    Alert.alert("Switch Account", "Do you want to switch accounts?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            router.replace("/auth/Login" as any);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FA] relative h-full"
      style={{ flex: 1, backgroundColor: "#F8F9FA", position: "relative" }}
    >
      {/* Main Scrollable Content */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingBottom: 90,
        }}
      >
        <View className="w-full max-w-md self-center flex-1 justify-between">
          {/* Top Sections Container */}
          <View className="w-full">
            {/* Top Header */}
            <View className="relative items-center justify-center pt-3 pb-5">
              <TouchableOpacity
                onPress={handleBack}
                className="absolute left-0 top-3 p-1 active:opacity-70"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-undo" size={28} color="#000000" />
              </TouchableOpacity>

              <Text className="text-xl font-bold text-gray-900">Profile</Text>
            </View>

            {/* User Profile Card */}
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/user/UserProfile",
                  params: {
                    userId: user?.id,
                    userName: user?.name || user?.username || "Local Farmer",
                    userAvatar: user?.avatarUrl,
                    userRole: isRSBSAVerified
                      ? "RSBSA Verified Farmer"
                      : (user as any)?.role || "Farmer",
                    isVerified: isRSBSAVerified ? "true" : "false",
                  },
                } as any)
              }
              className="bg-white rounded-2xl p-4 shadow-sm elevation-2 flex-row items-center justify-between mb-5 border border-gray-100 active:bg-gray-50"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Show profile"
            >
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                {/* Avatar */}
                <View className="relative">
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
                  {isRSBSAVerified && (
                    <View className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full items-center justify-center shadow-xs border border-white">
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-base font-bold text-gray-900 leading-tight">
                      {user?.name || user?.username || "Local Farmer"}
                    </Text>
                    {isRSBSAVerified && (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    )}
                  </View>
                  <Text
                    className={`text-xs mt-0.5 ${
                      isRSBSAVerified
                        ? "text-emerald-700 font-semibold"
                        : "text-gray-500"
                    }`}
                    numberOfLines={1}
                  >
                    {isRSBSAVerified
                      ? "RSBSA Verified Grower ✓"
                      : user?.email || "Show profile"}
                  </Text>
                </View>
              </View>

              {/* Right Side: Chevron */}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Settings Section */}
            <Text className="text-xl font-bold text-gray-900 mb-3 px-1">
              Settings
            </Text>

            <View className="bg-white rounded-2xl shadow-sm elevation-2 mb-5 py-1 border border-gray-100 overflow-hidden">
              {/* Item 1: Personal Information */}
              <TouchableOpacity
                onPress={() => router.push("/user/PersonalInformation" as any)}
                className="flex-row items-center px-4 py-3.5 gap-3.5 border-b border-gray-100 active:bg-gray-50"
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={22} color="#1F2937" />
                <Text className="text-base text-gray-800 flex-1 font-medium">
                  Personal Information
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Item 2: Security & Verification */}
              <TouchableOpacity
                onPress={() => router.push("/user/Security" as any)}
                className="flex-row items-center px-4 py-3.5 gap-3.5 border-b border-gray-100 active:bg-gray-50"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Security and Verification"
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="#1F2937"
                />
                <View className="flex-1">
                  <Text className="text-base text-gray-800 font-medium">
                    Security & Verification
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Password, 2FA & RSBSA Grower Badge
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Item 3: Saved */}
              <TouchableOpacity
                onPress={() => router.push("/user/SavedPosts" as any)}
                className="flex-row items-center px-4 py-3.5 gap-3.5 border-b border-gray-100 active:bg-gray-50"
                activeOpacity={0.7}
              >
                <Ionicons name="bookmark-outline" size={22} color="#1F2937" />
                <Text className="text-base text-gray-800 flex-1 font-medium">
                  Saved
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Item 4: Darkmode */}
              <View className="flex-row items-center px-4 py-2.5 gap-3.5">
                <Ionicons name="moon-outline" size={22} color="#1F2937" />
                <Text className="text-base text-gray-800 flex-1 font-medium">
                  Darkmode
                </Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={setIsDarkMode}
                  trackColor={{ false: "#E5E7EB", true: "#77af5c" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Support Section Card */}
            <View className="bg-white rounded-2xl shadow-sm elevation-2 mb-6 py-1 border border-gray-100 overflow-hidden">
              {/* Item 1: Help and support */}
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Help & Support",
                    "Help & Support features are currently being updated. Please check back soon!",
                    [{ text: "OK" }]
                  )
                }
                className="flex-row items-center px-4 py-3.5 gap-3.5 border-b border-gray-100 active:bg-gray-50"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Help and support"
              >
                <Ionicons
                  name="help-circle-outline"
                  size={22}
                  color="#1F2937"
                />
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-800">
                    Help & support
                  </Text>
                  <Text className="text-xs text-gray-400">
                    FAQs, reporting & grower guides
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Item 2: Privacy Center */}
              <TouchableOpacity
                onPress={() => router.push("/user/PrivacyCenter" as any)}
                className="flex-row items-center px-4 py-3.5 gap-3.5 active:bg-gray-50"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Privacy Center"
              >
                <Ionicons name="shield-checkmark-outline" size={22} color="#1F2937" />
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-800">
                    Privacy Center
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Location safety, audience & policies
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Action Buttons */}
          <View className="gap-3 mt-4 mb-2">
            {/* Switch Account Button */}
            <TouchableOpacity
              className="w-full bg-[#77af5c] rounded-xl py-3.5 items-center justify-center active:bg-[#689d50] shadow-sm flex-row gap-2"
              activeOpacity={0.8}
              onPress={handleSwitchAccount}
              accessibilityRole="button"
              accessibilityLabel="Switch account"
            >
              <Ionicons name="swap-horizontal" size={19} color="#FFFFFF" />
              <Text className="text-base font-bold text-white">
                Switch account
              </Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              className="w-full bg-[#a3a3a3] rounded-xl py-3.5 items-center justify-center active:bg-[#8e8e8e] shadow-sm flex-row gap-2  hover:bg-[#E73F1E]"
              activeOpacity={0.8}
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
              <Text className="text-base font-bold text-white">Logout</Text>
            </TouchableOpacity>

            {/* Footer */}
            <Text className="text-xs text-gray-400 text-center mt-1">
              Local Farm • v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
