import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function CurrentDeviceDetails() {
  const router = useRouter();

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/ManageDevices" as any);
      }
    } catch {
      router.push("/user/ManageDevices" as any);
    }
  };

  const handleLocationExplanationPress = () => {
    Alert.alert(
      "Location and Time Info",
      "Locations are approximate based on IP addresses and network activity. Times reflect when the device was last connected.",
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      {/* 1. Top Header Row */}
      <View className="flex-row items-center px-4 py-3 bg-white">
        {/* Left Side: Back Arrow */}
        <TouchableOpacity
          onPress={handleBack}
          className="p-1 active:opacity-70"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-undo" size={28} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* 2. Main Content ScrollView */}
      <ScrollView
        className="flex-1 bg-white px-6 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 3. Device Info Section */}
        <View className="flex-row mb-6">
          {/* Left: Device Icon Box */}
          <View
            className="bg-[#72AF5B] w-14 h-14 rounded-2xl items-center justify-center mr-5"
            style={{ backgroundColor: "#72AF5B" }}
          >
            <Ionicons name="phone-portrait-outline" size={28} color="#ffffff" />
          </View>

          {/* Right: Details Stack */}
          <View className="flex-1">
            <Text className="text-[22px] text-gray-900 font-normal mb-1">
              Honor X8d
            </Text>
            <Text className="text-base text-gray-700 mb-1">Philippines</Text>

            {/* Status Row */}
            <View className="flex-row items-center mb-4">
              <Ionicons name="checkmark-circle" color="#72AF5B" size={16} />
              <Text className="text-base text-[#72AF5B] ml-1.5">
                This phone
              </Text>
            </View>

            {/* Sign-in Date */}
            <Text className="text-sm text-gray-600">First sign-in: 22 Apr</Text>
          </View>
        </View>

        {/* 4. Divider */}
        <View className="w-full h-[1px] bg-gray-400 my-4" />

        {/* 5. Recent Activity Section */}
        <Text className="text-xs font-bold text-[#000000] tracking-wider mb-5">
          RECENT ACTIVITY
        </Text>

        {/* Activity Row */}
        <View className="flex-row items-center mb-6">
          <View className="w-2 h-2 rounded-full bg-[#72AF5B] mr-4" />
          <Text className="text-base text-gray-800">Philippines</Text>
          <Text className="text-sm text-gray-500 ml-4">1 minute ago</Text>
        </View>

        {/* Helper Link */}
        <TouchableOpacity
          onPress={handleLocationExplanationPress}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel="How locations and times are determined"
        >
          <Text className="text-md text-[#72AF5B] font-medium mb-4">
            How locations and times are determined
          </Text>
        </TouchableOpacity>

        {/* 6. Final Divider */}
        <View className="w-full h-[1px] bg-gray-200 my-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
