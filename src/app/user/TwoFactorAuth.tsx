import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Navigation from "../../components/Navigation";

export default function TwoFactorAuth() {
  const router = useRouter();
  const [isSmsEnabled, setIsSmsEnabled] = useState(true);

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

  const handleSave = () => {
    Alert.alert("Success", "Two-factor authentication settings saved!", [
      { text: "OK", onPress: handleBack },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      {/* Main Content ScrollView */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Top Header */}
        <View className="relative items-center justify-center py-4 mt-2">
          <TouchableOpacity
            onPress={handleBack}
            className="absolute left-4 p-1 active:opacity-70"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-undo" size={28} color="#000000" />
          </TouchableOpacity>

          <Text className="text-lg font-medium text-gray-900">
            Two Factor Authentication
          </Text>
        </View>

        {/* Hero Section (Icon & Description) */}
        <View className="bg-[#e6f4ea] w-20 h-20 rounded-full items-center justify-center mx-auto mt-8 mb-4">
          <Ionicons name="shield-checkmark" size={40} color="#77af5c" />
        </View>

        <Text className="text-lg font-bold text-gray-500 text-center mb-2">
          Two-factor Authentication
        </Text>

        <Text className="text-sm text-gray-400 text-center px-8 mb-8 leading-5">
          Enhance your security by setting up two-factor authentication (2FA)
          using an authenticator app or SMS on your mobile phone
        </Text>

        {/* Options Section */}
        <View className="px-5">
          {/* Option 1: Authenticator App */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="mb-6"
            accessibilityRole="button"
            accessibilityLabel="Authenticator App option"
          >
            <Text className="text-base font-bold text-gray-500">
              Authenticator App
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5">
              Receive a temporary one-time passcode using an app
            </Text>
          </TouchableOpacity>

          {/* Option 2: Text Message (with Toggle) */}
          <View className="flex-row justify-between items-center mb-10">
            <View className="flex-1 pr-4">
              <Text className="text-base font-bold text-gray-500">
                Text Message
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                Get a one-time passcode through txt message
              </Text>
            </View>

            <Switch
              trackColor={{ false: "#d1d5db", true: "#77af5c" }}
              thumbColor="#FFFFFF"
              value={isSmsEnabled}
              onValueChange={setIsSmsEnabled}
            />
          </View>
        </View>

        {/* Bottom Action Buttons */}
        <View className="flex-row justify-between items-center border border-[#77af5c] rounded-full p-1.5 mx-5 mb-8">
          <TouchableOpacity
            onPress={handleBack}
            className="active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text className="text-base font-bold text-gray-400 ml-4">
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            className="bg-[#77af5c] rounded-full px-4 py-2 active:bg-[#66984e]"
            style={{ backgroundColor: "#77af5c" }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Save Changes"
          >
            <Text className="text-sm font-bold text-white">Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
