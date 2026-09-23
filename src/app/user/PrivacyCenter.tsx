import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIVACY_SETTINGS_KEY = "localfarm_user_privacy_settings_v2";

interface PrivacySettings {
  profileVisibility: "Public" | "Friends" | "Only me";
  postAudience: "Public" | "Friends" | "Only me";
  storyAudience: "Public" | "Friends" | "Only me";
  taggingPermission: "Everyone" | "Friends" | "No one";
  connectionsListVisibility: "Public" | "Friends" | "Only me";
  pricingVisibility: "Public" | "Verified Only";
  // Location & Safety
  preciseLocation: boolean;
  mapDiscovery: boolean;
  // Interactions
  messagingScope: "everyone" | "friends";
  showOnlineStatus: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  profileVisibility: "Public",
  postAudience: "Public",
  storyAudience: "Public",
  taggingPermission: "Everyone",
  connectionsListVisibility: "Public",
  pricingVisibility: "Public",
  preciseLocation: true,
  mapDiscovery: true,
  messagingScope: "everyone",
  showOnlineStatus: true,
};

interface AudienceOptionConfig {
  key: keyof PrivacySettings;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  options: {
    value: string;
    label: string;
    description: string;
  }[];
}

const AUDIENCE_OPTIONS: AudienceOptionConfig[] = [
  {
    key: "profileVisibility",
    title: "Profile Visibility",
    subtitle: "Who can see your farm details, bio, and contact info",
    icon: "person-circle-outline",
    iconBg: "bg-blue-50",
    iconColor: "#2563EB",
    options: [
      {
        value: "Public",
        label: "Public",
        description: "Visible to all farmers, buyers, and guests on Local Farm",
      },
      {
        value: "Friends",
        label: "Friends Only",
        description: "Only approved connected farmers & buyers can view",
      },
      {
        value: "Only me",
        label: "Only me",
        description: "Keep your farm details private and visible only to you",
      },
    ],
  },
  {
    key: "postAudience",
    title: "Posts & Harvests",
    subtitle: "Default audience for your harvest posts and updates",
    icon: "newspaper-outline",
    iconBg: "bg-emerald-50",
    iconColor: "#059669",
    options: [
      {
        value: "Public",
        label: "Public",
        description: "Anyone on Local Farm can view your harvest updates",
      },
      {
        value: "Friends",
        label: "Friends",
        description: "Only your connected friends can view your posts",
      },
      {
        value: "Only me",
        label: "Only me",
        description: "Visible only to you by default",
      },
    ],
  },
  {
    key: "storyAudience",
    title: "Stories",
    subtitle: "Who can view your 24-hour expiring farm stories",
    icon: "time-outline",
    iconBg: "bg-purple-50",
    iconColor: "#7C3AED",
    options: [
      {
        value: "Public",
        label: "Public",
        description: "Anyone on Local Farm can view your stories",
      },
      {
        value: "Friends",
        label: "Friends",
        description: "Only connected friends can see your stories",
      },
      {
        value: "Only me",
        label: "Only me",
        description: "Private to you only",
      },
    ],
  },
  {
    key: "taggingPermission",
    title: "Tagging & Mentions",
    subtitle: "Who can tag your farm in posts, harvests, and photos",
    icon: "pricetag-outline",
    iconBg: "bg-amber-50",
    iconColor: "#D97706",
    options: [
      {
        value: "Everyone",
        label: "Everyone",
        description: "Any grower or buyer can tag your farm in posts",
      },
      {
        value: "Friends",
        label: "Friends Only",
        description: "Only your connected friends can tag your farm",
      },
      {
        value: "No one",
        label: "No one",
        description: "Don't allow anyone to tag or mention your farm",
      },
    ],
  },
  {
    key: "connectionsListVisibility",
    title: "Connections List",
    subtitle: "Who can see your connected farmers and buyers list",
    icon: "people-outline",
    iconBg: "bg-teal-50",
    iconColor: "#0D9488",
    options: [
      {
        value: "Public",
        label: "Public",
        description: "Anyone can see your network of connected farmers & buyers",
      },
      {
        value: "Friends",
        label: "Friends Only",
        description: "Only connected friends can see your network",
      },
      {
        value: "Only me",
        label: "Only me",
        description: "Keep your connection network private to yourself",
      },
    ],
  },
  {
    key: "pricingVisibility",
    title: "Produce Pricing",
    subtitle: "Who can view wholesale and retail crop prices",
    icon: "cash-outline",
    iconBg: "bg-green-50",
    iconColor: "#16A34A",
    options: [
      {
        value: "Public",
        label: "Public to All",
        description: "All visitors and marketplace buyers can see your prices",
      },
      {
        value: "Verified Only",
        label: "Verified Buyers Only",
        description: "Only DA / RSBSA verified buyers can view crop prices",
      },
    ],
  },
];

export default function PrivacyCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAudienceConfig, setSelectedAudienceConfig] =
    useState<AudienceOptionConfig | null>(null);

  const [activePolicyModal, setActivePolicyModal] = useState<
    "data_privacy" | "rsbsa_safety" | "export_data" | null
  >(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load saved privacy preferences
  useEffect(() => {
    AsyncStorage.getItem(PRIVACY_SETTINGS_KEY)
      .then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSettings((prev) => ({ ...prev, ...parsed }));
          } catch (e) {
            console.warn("Failed to parse privacy settings:", e);
          }
        }
      })
      .catch((err) => console.warn("Error loading privacy settings:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const updateSetting = async <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K],
    toastMessage?: string,
  ) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(next));
      if (key === "storyAudience") {
        await AsyncStorage.setItem("localfarm_default_story_privacy", String(value));
      }
      if (toastMessage) {
        showToast(toastMessage, "success");
      }
    } catch (err) {
      console.warn("Failed to save privacy setting:", err);
      showToast("Failed to update setting.", "error");
    }
  };

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setActivePolicyModal(null);
      Alert.alert(
        "Data Archive Ready",
        `An encrypted archive of your account activity, farm profile, and transaction history has been scheduled for delivery to ${
          user?.email || "your email address"
        }.`,
        [{ text: "Done" }],
      );
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA] h-full" style={{ flex: 1 }}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3.5 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/user/MenuProfile" as any);
            }
          }}
          activeOpacity={0.7}
          className="p-1 -ml-1"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-undo" size={26} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Privacy Center</Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Rich Hero Banner with verified vibrant LinearGradient */}
        <LinearGradient
          colors={["#1b4332", "#2d6a4f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            padding: 18,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">
                Your Privacy & Safety
              </Text>
              <Text className="text-emerald-100 text-xs">
                Control farm visibility, location, and data security
              </Text>
            </View>
          </View>
          <Text className="text-emerald-50 text-xs leading-5 mt-1">
            Local Farm gives you full autonomy over who sees your farm location,
            produce prices, posts, and agricultural registry records.
          </Text>
        </LinearGradient>

        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#72AF5B" />
            <Text className="text-xs text-gray-400 mt-2">
              Loading privacy preferences...
            </Text>
          </View>
        ) : (
          <>
            {/* Section 1: Audience & Visibility (List of Options) */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Audience & Visibility
              </Text>
              <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {AUDIENCE_OPTIONS.map((item, index) => {
                  const currentValue = String(settings[item.key] || "");
                  const isLast = index === AUDIENCE_OPTIONS.length - 1;

                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setSelectedAudienceConfig(item)}
                      activeOpacity={0.7}
                      className={`flex-row items-center justify-between p-4 active:bg-gray-50 ${
                        !isLast ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <View className="flex-row items-center gap-3 flex-1 mr-3">
                        <View
                          className={`w-9 h-9 rounded-xl ${item.iconBg} items-center justify-center`}
                        >
                          <Ionicons
                            name={item.icon}
                            size={20}
                            color={item.iconColor}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-800">
                            {item.title}
                          </Text>
                          <Text
                            className="text-xs text-gray-500 mt-0.5"
                            numberOfLines={1}
                          >
                            {item.subtitle}
                          </Text>
                        </View>
                      </View>

                      {/* Current Value Pill + Chevron */}
                      <View className="flex-row items-center gap-1.5">
                        <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <Text className="text-xs font-semibold text-emerald-700">
                            {currentValue}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#9CA3AF"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Farm Location & Safety */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Location & Safety
              </Text>
              <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
                {/* Precise GPS Coordinates */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Ionicons name="location-outline" size={18} color="#374151" />
                      <Text className="text-sm font-semibold text-gray-800">
                        Exact Farm Gate GPS
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      When enabled, pinpoint GPS coordinates are included for pickup
                      directions. When disabled, only your barangay is displayed.
                    </Text>
                  </View>
                  <Switch
                    value={settings.preciseLocation}
                    onValueChange={(val) =>
                      updateSetting(
                        "preciseLocation",
                        val,
                        val
                          ? "Exact GPS enabled for farm pickups."
                          : "Location limited to general barangay.",
                      )
                    }
                    trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                    thumbColor={settings.preciseLocation ? "#16A34A" : "#9CA3AF"}
                  />
                </View>

                {/* Explore Map Presence */}
                <View className="pt-3 border-t border-gray-100 flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Ionicons name="map-outline" size={18} color="#374151" />
                      <Text className="text-sm font-semibold text-gray-800">
                        Explore Map Discovery
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      Allow your farm pin and fresh harvests to appear on the
                      Local Farm community map.
                    </Text>
                  </View>
                  <Switch
                    value={settings.mapDiscovery}
                    onValueChange={(val) =>
                      updateSetting(
                        "mapDiscovery",
                        val,
                        val
                          ? "Farm visible on Explore Map."
                          : "Farm hidden from Explore Map.",
                      )
                    }
                    trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                    thumbColor={settings.mapDiscovery ? "#16A34A" : "#9CA3AF"}
                  />
                </View>
              </View>
            </View>

            {/* Section 3: Social & Messaging Controls */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Interactions & Accounts
              </Text>
              <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Who Can Message You */}
                <View className="p-4 border-b border-gray-100">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color="#374151"
                    />
                    <Text className="text-sm font-semibold text-gray-800">
                      Message Inquiries
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 mb-2.5">
                    Choose who can start direct chats or inquiries with your farm.
                  </Text>
                  <View className="flex-row bg-gray-100 p-1 rounded-xl gap-1">
                    {(
                      [
                        { id: "everyone", label: "Everyone" },
                        { id: "friends", label: "Connected Friends" },
                      ] as const
                    ).map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() =>
                          updateSetting(
                            "messagingScope",
                            opt.id,
                            `Messaging inquiries set to ${opt.label}`,
                          )
                        }
                        className={`flex-1 py-2 rounded-lg items-center ${
                          settings.messagingScope === opt.id
                            ? "bg-white shadow-xs"
                            : ""
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            settings.messagingScope === opt.id
                              ? "text-emerald-700 font-bold"
                              : "text-gray-600"
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Show Online Activity Status */}
                <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-semibold text-gray-800">
                      Show Online Status
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Let other growers and buyers see when you are active.
                    </Text>
                  </View>
                  <Switch
                    value={settings.showOnlineStatus}
                    onValueChange={(val) =>
                      updateSetting(
                        "showOnlineStatus",
                        val,
                        val ? "Online status visible." : "Online status hidden.",
                      )
                    }
                    trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                    thumbColor={settings.showOnlineStatus ? "#16A34A" : "#9CA3AF"}
                  />
                </View>

                {/* Blocked Accounts Navigation */}
                <TouchableOpacity
                  onPress={() => router.push("/user/BlockedAccounts" as any)}
                  className="flex-row items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="ban-outline" size={20} color="#EF4444" />
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        Blocked Accounts
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Manage blocked users and spam restrictions
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Restricted Accounts Navigation */}
                <TouchableOpacity
                  onPress={() => router.push("/user/RestrictedAccounts" as any)}
                  className="flex-row items-center justify-between p-4 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="hand-left-outline" size={20} color="#F59E0B" />
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        Restricted Accounts
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Limit interactions without blocking
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 4: Data Security & Policies */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Data & Policies
              </Text>
              <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <TouchableOpacity
                  onPress={() => setActivePolicyModal("data_privacy")}
                  className="flex-row items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#2563EB"
                    />
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        Data Privacy Policy
                      </Text>
                      <Text className="text-xs text-gray-400">
                        How your agricultural and contact data is secured
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActivePolicyModal("rsbsa_safety")}
                  className="flex-row items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name="ribbon-outline"
                      size={20}
                      color="#059669"
                    />
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        RSBSA Registry & ID Protection
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Government verification document safety guidelines
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActivePolicyModal("export_data")}
                  className="flex-row items-center justify-between p-4 active:bg-gray-50"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name="cloud-download-outline"
                      size={20}
                      color="#7C3AED"
                    />
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        Download Your Farm Data
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Export an archive of listings, transactions & profile
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Audience Option Selection Bottom Sheet Modal */}
      <Modal
        visible={selectedAudienceConfig !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedAudienceConfig(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[75%] p-5 shadow-2xl">
            {/* Drag Handle */}
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 rounded-full bg-gray-300" />
            </View>

            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <View className="flex-row items-center gap-2.5">
                {selectedAudienceConfig && (
                  <View
                    className={`w-9 h-9 rounded-xl ${selectedAudienceConfig.iconBg} items-center justify-center`}
                  >
                    <Ionicons
                      name={selectedAudienceConfig.icon}
                      size={20}
                      color={selectedAudienceConfig.iconColor}
                    />
                  </View>
                )}
                <View>
                  <Text className="text-base font-bold text-gray-900">
                    {selectedAudienceConfig?.title}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Select who can view or interact
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedAudienceConfig(null)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView showsVerticalScrollIndicator={false} className="mb-2">
              <View className="gap-2.5">
                {selectedAudienceConfig?.options.map((opt) => {
                  const isSelected =
                    String(settings[selectedAudienceConfig.key]) === opt.value;

                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        updateSetting(
                          selectedAudienceConfig.key,
                          opt.value as any,
                          `${selectedAudienceConfig.title} updated to ${opt.label}`,
                        );
                        setSelectedAudienceConfig(null);
                      }}
                      activeOpacity={0.7}
                      className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                        isSelected
                          ? "bg-emerald-50/60 border-emerald-500"
                          : "bg-gray-50/70 border-gray-200"
                      }`}
                    >
                      <View className="flex-1 mr-3">
                        <Text
                          className={`text-sm font-bold ${
                            isSelected ? "text-emerald-800" : "text-gray-900"
                          }`}
                        >
                          {opt.label}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1 leading-4">
                          {opt.description}
                        </Text>
                      </View>

                      {/* Custom Radio Circle */}
                      <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setSelectedAudienceConfig(null)}
              className="w-full bg-gray-100 py-3.5 rounded-xl items-center justify-center active:bg-gray-200 mt-2"
            >
              <Text className="text-gray-700 font-bold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Policy & Info Modals */}
      <Modal
        visible={activePolicyModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActivePolicyModal(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[80%] p-6 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <Text className="text-lg font-bold text-gray-900">
                {activePolicyModal === "data_privacy"
                  ? "Local Farm Data Privacy"
                  : activePolicyModal === "rsbsa_safety"
                    ? "RSBSA Document Security"
                    : "Download Your Data"}
              </Text>
              <TouchableOpacity
                onPress={() => setActivePolicyModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {activePolicyModal === "data_privacy" && (
                <View className="gap-3.5">
                  <Text className="text-sm text-gray-700 leading-6">
                    Local Farm is dedicated to protecting the rights, privacy, and
                    agricultural livelihoods of Filipino farmers and buyers.
                  </Text>
                  <View className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                    <Text className="text-xs font-bold text-emerald-800 mb-1">
                      1. Encryption & Safeguards
                    </Text>
                    <Text className="text-xs text-emerald-700 leading-5">
                      All account passwords, session tokens, and personal farm
                      contact information are secured using industry-standard
                      cryptographic protocols.
                    </Text>
                  </View>
                  <View className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <Text className="text-xs font-bold text-gray-800 mb-1">
                      2. Commercial Non-Exploitation
                    </Text>
                    <Text className="text-xs text-gray-600 leading-5">
                      We never sell, rent, or lease your harvest pricing, farm
                      yield records, or buyer transaction histories to third-party
                      advertisers or brokers.
                    </Text>
                  </View>
                  <View className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <Text className="text-xs font-bold text-gray-800 mb-1">
                      3. Granular Farm Privacy
                    </Text>
                    <Text className="text-xs text-gray-600 leading-5">
                      You maintain continuous control over whether your farm gate
                      GPS coordinates are publicly navigable or blurred to
                      barangay-level approximations.
                    </Text>
                  </View>
                </View>
              )}

              {activePolicyModal === "rsbsa_safety" && (
                <View className="gap-3.5">
                  <Text className="text-sm text-gray-700 leading-6">
                    RSBSA stubs and government farmer identity credentials are
                    confidential administrative records.
                  </Text>
                  <View className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                    <Text className="text-xs font-bold text-emerald-800 mb-1">
                      Verification Purpose Only
                    </Text>
                    <Text className="text-xs text-emerald-700 leading-5">
                      Uploaded RSBSA certificates and DA stubs are strictly utilized
                      for municipal verification and awarding the official green
                      checkmark badge.
                    </Text>
                  </View>
                  <View className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <Text className="text-xs font-bold text-gray-800 mb-1">
                      Never Shared Publicly
                    </Text>
                    <Text className="text-xs text-gray-600 leading-5">
                      Your government RSBSA registration number and raw certificate
                      photos are never exposed on your public newsfeed, profile, or
                      search results.
                    </Text>
                  </View>
                </View>
              )}

              {activePolicyModal === "export_data" && (
                <View className="gap-4">
                  <Text className="text-sm text-gray-700 leading-6">
                    Request an export of all information associated with your Local
                    Farm account, including:
                  </Text>
                  <View className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 gap-1.5">
                    <Text className="text-xs text-gray-700">• Farm profile & bio</Text>
                    <Text className="text-xs text-gray-700">• Posted harvests & media</Text>
                    <Text className="text-xs text-gray-700">• Message histories & inquiries</Text>
                    <Text className="text-xs text-gray-700">• RSBSA verification records</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleExportData}
                    disabled={isExporting}
                    className="w-full bg-[#72AF5B] py-3.5 rounded-xl items-center justify-center active:opacity-90 shadow-sm"
                  >
                    {isExporting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-bold text-sm">
                        Request Data Archive
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActivePolicyModal(null)}
              className="w-full bg-gray-100 py-3 rounded-xl items-center justify-center active:bg-gray-200 mt-2"
            >
              <Text className="text-gray-700 font-semibold text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
