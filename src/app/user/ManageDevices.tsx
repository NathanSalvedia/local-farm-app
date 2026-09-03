import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Navigation from "../../components/Navigation";

interface OtherDeviceItem {
  id: string;
  name: string;
  lastActive: string;
}

const OTHER_DEVICES: OtherDeviceItem[] = [
  { id: "1", name: "Samsung A7", lastActive: "Last active: 10:45 AM" },
  { id: "2", name: "Iphone 17", lastActive: "Last active: 10:45 AM" },
  { id: "3", name: "Honor 600", lastActive: "Last active: 10:45 AM" },
];

export default function ManageDevices() {
  const router = useRouter();
  const [devices, setDevices] = useState<OtherDeviceItem[]>(OTHER_DEVICES);

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/Security" as any);
      }
    } catch {
      router.push("/user/Security" as any);
    }
  };

  const handleTerminateAll = () => {
    Alert.alert(
      "Terminate Sessions",
      "Are you sure you want to terminate all other active sessions?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Terminate",
          style: "destructive",
          onPress: () => {
            setDevices([]);
            Alert.alert("Success", "All other sessions have been terminated.");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      {/* Main Content ScrollView */}
      <ScrollView
        className="flex-1 px-4 pt-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Top Header */}
        <View className="relative items-center justify-center py-4 mb-4">
          <TouchableOpacity
            onPress={handleBack}
            className="absolute left-0 top-4 p-1 active:opacity-70"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-undo" size={28} color="#000000" />
          </TouchableOpacity>

          <Text className="text-xl font-medium text-gray-900">
            Manage Devices
          </Text>
        </View>

        {/* 'Your device' Section */}
        <Text className="text-lg font-medium text-gray-900 mb-3 mt-2 text-center">
          Your device
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/user/CurrentDeviceDetails" as any)}
          className="bg-[#f7f8f9] rounded-2xl py-5 px-4 mb-6 shadow-sm border border-gray-100 flex-row items-center active:bg-gray-100"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Your device details"
        >
          {/* Left Icon Container */}
          <View className="bg-[#72AF5B] w-14 h-14 rounded-2xl items-center justify-center mr-3.5">
            <Ionicons name="phone-portrait-outline" size={26} color="#ffffff" />
          </View>

          {/* Middle-Left Session Text */}
          <Text className="text-md font-normal text-gray-800 flex-1 pr-2">
            1 session
          </Text>

          {/* Middle-Right Device Info */}
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              HONOR X8d
            </Text>
            <Text className="text-xs text-gray-600 mt-0.5">
              Iligan City, Lanao Del Norte
            </Text>
          </View>

          {/* Right Chevron */}
          <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
        </TouchableOpacity>

        {/* 'Others Devices' Section */}
        <Text className="text-lg font-bold text-gray-900 mb-4 text-center">
          Others Devices
        </Text>

        <View className="w-full">
          {devices.map((device) => (
            <View
              key={device.id}
              className="flex-row items-center bg-[#f7f8f9] rounded-2xl py-4 px-4 mb-3.5 shadow-sm border border-gray-100"
            >
              {/* Left Icon */}
              <View className="bg-[#72AF5B] w-12 h-12 rounded-xl items-center justify-center mr-4">
                <Ionicons
                  name="phone-portrait-outline"
                  size={24}
                  color="#ffffff"
                />
              </View>

              {/* Middle Text */}
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-semibold">
                  {device.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {device.lastActive}
                </Text>
              </View>

              {/* Right Checkmark */}
              <View
                className="bg-[#77af5c] w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: "#77af5c" }}
              >
                <Ionicons name="checkmark" size={22} color="#ffffff" />
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Action Button & Text */}
        <TouchableOpacity
          onPress={handleTerminateAll}
          className="bg-[#77af5c] rounded-xl py-3.5 mt-4 flex-row justify-center items-center gap-2 active:opacity-90 shadow-sm"
          style={{ backgroundColor: "#77af5c" }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Terminate all other sessions"
        >
          <Ionicons name="hand-left" size={20} color="#ffffff" />
          <Text className="text-base font-bold text-white">
            Terminate all other session
          </Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-800 text-center mt-3 mb-6">
          Logout all devices, Except for this one.
        </Text>
      </ScrollView>

      {/* Bottom Navigation */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
