import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Navigation from "../../components/Navigation";

interface SecurityOption {
  id: string;
  title: string;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const SECURITY_OPTIONS: SecurityOption[] = [
  {
    id: "1",
    title: "Change Password",
    subtitle: "Last changed: July 21, 2026",
    iconName: "ellipsis-horizontal",
  },
  {
    id: "2",
    title: "Two-factor Authentication",
    iconName: "shield-checkmark",
  },
  {
    id: "3",
    title: "Your Devices",
    iconName: "phone-portrait-outline",
  },
  {
    id: "4",
    title: "Activity logs",
    iconName: "clipboard-outline",
  },
];

export default function Security() {
  const router = useRouter();

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/MenuProfile" as any);
      }
    } catch {
      router.push("/user/MenuProfile" as any);
    }
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

          <Text className="text-xl font-medium text-gray-900">Security</Text>
        </View>

        {/* Security Options List */}
        <View className="w-full">
          {SECURITY_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                if (item.id === "1") {
                  router.push("/user/ChangePassword" as any);
                } else if (item.id === "2") {
                  router.push("/user/TwoFactorAuth" as any);
                } else if (item.id === "3") {
                  router.push("/user/ManageDevices" as any);
                }
              }}
              className="flex-row items-center bg-gray-100 rounded-2xl p-4 mb-4 shadow-sm elevation-2 border border-gray-50 active:bg-gray-50"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              {/* Left Icon Container with Light Green Background */}
              <View className="bg-[#72AF5B] w-12 h-12 rounded-full items-center justify-center mr-4">
                <Ionicons name={item.iconName} size={24} color="#ffffff" />
              </View>

              {/* Middle Text Stack */}
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium">
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text className="text-[10px] text-gray-500 mt-1">
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>

              {/* Right Chevron */}
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
