import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navigation from "../../components/Navigation";

interface DeviceItem {
  id: string;
  name: string;
  deviceType: "phone" | "tablet" | "desktop";
  location: string;
  browserOrApp: string;
  lastActive: string;
  isCurrent?: boolean;
}

const INITIAL_OTHER_DEVICES: DeviceItem[] = [
  {
    id: "d1",
    name: "Samsung Galaxy A71",
    deviceType: "phone",
    location: "Cagayan de Oro, Misamis Oriental",
    browserOrApp: "LocalFarm Android App v1.2",
    lastActive: "Active 2 hours ago",
  },
  {
    id: "d2",
    name: "iPhone 15 Pro",
    deviceType: "phone",
    location: "Cebu City, Central Visayas",
    browserOrApp: "Safari Mobile • iOS 17.5",
    lastActive: "Active yesterday, 4:15 PM",
  },
  {
    id: "d3",
    name: 'MacBook Pro 14"',
    deviceType: "desktop",
    location: "Davao City, Davao del Sur",
    browserOrApp: "Chrome 128.0 • macOS",
    lastActive: "Active 3 days ago",
  },
];

export default function ManageDevices() {
  const [otherDevices, setOtherDevices] = useState<DeviceItem[]>(
    INITIAL_OTHER_DEVICES,
  );

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

  const handleTerminateDevice = (device: DeviceItem) => {
    Alert.alert(
      "Log Out Device",
      `Are you sure you want to end the active session on "${device.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            setOtherDevices((prev) => prev.filter((d) => d.id !== device.id));
            Alert.alert(
              "Session Ended",
              `Logged out of ${device.name} successfully.`,
            );
          },
        },
      ],
    );
  };

  const handleTerminateAll = () => {
    Alert.alert(
      "Log Out All Other Devices",
      "Are you sure you want to terminate all active sessions except this current phone?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out All",
          style: "destructive",
          onPress: () => {
            setOtherDevices([]);
            Alert.alert(
              "All Sessions Terminated",
              "You have been logged out of all other devices. This device remains signed in.",
            );
          },
        },
      ],
    );
  };

  const getDeviceIcon = (
    type: "phone" | "tablet" | "desktop",
  ): keyof typeof Ionicons.glyphMap => {
    if (type === "desktop") return "laptop-outline";
    if (type === "tablet") return "tablet-portrait-outline";
    return "phone-portrait-outline";
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FA] relative h-full"
      style={{ flex: 1, backgroundColor: "#F8F9FA" }}
    >
      {/* Top Header */}
      <View className="relative items-center justify-center pt-3 pb-4 px-4 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          className="absolute left-4 top-3 p-1"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-undo" size={28} color="#000000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Manage Devices</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Security Overview Hero Card */}
        <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-2xs flex-row items-center gap-3.5">
          <View className="w-12 h-12 rounded-2xl bg-[#72AF5B]/10 items-center justify-center ">
            <Ionicons name="shield-checkmark" size={24} color="#72AF5B" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-900">
              Where You&apos;re Logged In
            </Text>
            <Text className="text-sm text-gray-500 mt-0.5 leading-4.5">
              Review active sessions connected to your account. If you spot an
              unrecognized device, log it out immediately.
            </Text>
          </View>
        </View>

        {/* Section 1: This Current Device */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Current Device
            </Text>
            <View className="flex-row items-center gap-1.5 bg-[#72AF5B]/10 px-2 py-0.5 rounded-full">
              <View className="w-2 h-2 rounded-full bg-[#72AF5B]" />
              <Text className="text-[10px] font-bold text-[#2D4F28]">
                Active Now
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/user/CurrentDeviceDetails" as any)}
            activeOpacity={0.8}
            className="bg-white rounded-2xl p-4 border border-[#72AF5B]/30 shadow-xs flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="Current device details"
          >
            {/* Device Icon */}
            <View className="w-12 h-12 rounded-2xl bg-[#72AF5B] items-center justify-center mr-3.5 shadow-2xs">
              <Ionicons
                name="phone-portrait-outline"
                size={24}
                color="#FFFFFF"
              />
            </View>

            {/* Device Details */}
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-gray-900">
                  HONOR X8d
                </Text>
                <View className="bg-white px-2 py-0.5 rounded-md border border-[#72AF5B]">
                  <Text className="text-xs font-bold text-[#72AF5B]">
                    This Phone
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-gray-600 mt-0.5 font-medium">
                Iligan City, Lanao Del Norte
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                LocalFarm App • Active session
              </Text>
            </View>

            {/* Chevron Link */}
            <View className="flex-row items-center gap-0.5 pl-2">
              <Text className="text-xs font-semibold text-[#72AF5B]">
                Details
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#72AF5B" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 2: Other Active Sessions */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Other Active Sessions ({otherDevices.length})
            </Text>
            {otherDevices.length > 0 && (
              <Text className="text-[11px] text-gray-400">
                Tap to terminate
              </Text>
            )}
          </View>

          {otherDevices.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center justify-center border border-gray-100 shadow-2xs">
              <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2.5">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={26}
                  color="#059669"
                />
              </View>
              <Text className="text-sm font-bold text-gray-900">
                No other devices connected
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1 leading-4.5 px-4">
                Your account is currently signed in on this phone only. All
                previous sessions have been ended.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {otherDevices.map((device) => (
                <View
                  key={device.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex-row items-center justify-between"
                >
                  {/* Left Device Icon */}
                  <View className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center mr-3.5">
                    <Ionicons
                      name={getDeviceIcon(device.deviceType)}
                      size={22}
                      color="#4B5563"
                    />
                  </View>

                  {/* Center Details */}
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-bold text-gray-900 leading-snug">
                      {device.name}
                    </Text>
                    <Text className="text-xs text-gray-600 mt-0.5">
                      {device.location}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text className="text-[11px] text-gray-400">
                        {device.lastActive}
                      </Text>
                    </View>
                  </View>

                  {/* Log out Single Session Button */}
                  <TouchableOpacity
                    onPress={() => handleTerminateDevice(device)}
                    activeOpacity={0.7}
                    className="bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 flex-row items-center gap-1 active:bg-red-100"
                    accessibilityRole="button"
                    accessibilityLabel={`Log out ${device.name}`}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={14}
                      color="#DC2626"
                    />
                    <Text className="text-xs font-bold text-red-600">
                      Log Out
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 3: Bulk Terminate Action */}
        {otherDevices.length > 0 && (
          <View className="mb-6">
            <TouchableOpacity
              onPress={handleTerminateAll}
              activeOpacity={0.8}
              className="bg-[#72AF5B] rounded-2xl py-4 flex-row justify-center items-center gap-2 shadow-sm active:bg-[#5f974b]"
              accessibilityRole="button"
              accessibilityLabel="Terminate all other sessions"
            >
              <Ionicons name="log-out" size={20} color="#FFFFFF" />
              <Text className="text-base font-bold text-white">
                Log Out of All Other Sessions
              </Text>
            </TouchableOpacity>

            <Text className="text-xs text-gray-500 text-center mt-3 leading-4">
              This will safely end sessions on all {otherDevices.length} other
              devices while keeping you signed in on this phone.
            </Text>
          </View>
        )}

        {/* Security Recommendation Footer Card */}
        <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs mb-4">
          <View className="flex-row items-center gap-2 mb-1.5">
            <Ionicons name="lock-closed-outline" size={16} color="#72AF5B" />
            <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Security Recommendation
            </Text>
          </View>
          <Text className="text-xs text-gray-500 leading-5">
            If you see a session or city you don&apos;t recognize, end the
            session immediately and update your password to protect your
            account.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/user/ChangePassword" as any)}
            className="mt-2.5 self-start flex-row items-center gap-1"
          >
            <Text className="text-xs font-bold text-[#72AF5B]">
              Go to Change Password
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#72AF5B" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
