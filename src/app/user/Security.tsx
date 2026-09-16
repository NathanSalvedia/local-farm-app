import {
  DEFAULT_RSBSA_STATE,
  RSBSAApplication,
  getRSBSAApplication,
} from "@/services/rsbsa-service";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    subtitle: "Add an extra layer of login protection",
    iconName: "shield-checkmark",
  },
  {
    id: "3",
    title: "Your Devices",
    subtitle: "Manage active logins across your phones",
    iconName: "phone-portrait-outline",
  },
  {
    id: "4",
    title: "Activity logs",
    subtitle: "Review security events and session logins",
    iconName: "clipboard-outline",
  },
];

export default function Security() {
  const router = useRouter();

  const [rsbsaApp, setRsbsaApp] = useState<RSBSAApplication>(DEFAULT_RSBSA_STATE);
  const [isBenefitsModalVisible, setBenefitsModalVisible] = useState(false);

  const handleRsbsaCardPress = () => {
    if (rsbsaApp.status === "verified" || rsbsaApp.status === "pending") {
      router.push("/user/RSBSAVerification" as any);
    } else {
      setBenefitsModalVisible(true);
    }
  };

  const handleProceedToApply = () => {
    setBenefitsModalVisible(false);
    router.push("/user/RSBSAVerification" as any);
  };

  const loadRsbsaData = async () => {
    try {
      const data = await getRSBSAApplication();
      setRsbsaApp(data);
    } catch (err) {
      console.warn("Failed to load RSBSA data:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRsbsaData();
    }, [])
  );

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

  const getStatusBadge = () => {
    switch (rsbsaApp.status) {
      case "verified":
        return {
          label: "Verified ✓",
          bg: "bg-emerald-100",
          text: "text-emerald-800",
          iconColor: "#059669",
        };
      case "pending":
        return {
          label: "Under Review ⏳",
          bg: "bg-amber-100",
          text: "text-amber-800",
          iconColor: "#D97706",
        };
      default:
        return {
          label: "Not Verified",
          bg: "bg-gray-200",
          text: "text-gray-700",
          iconColor: "#9CA3AF",
        };
    }
  };

  const badgeConfig = getStatusBadge();

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FA] relative"
      style={{ flex: 1, backgroundColor: "#F8F9FA" }}
    >
      {/* Header */}
      <View className="relative items-center justify-center py-4 px-4 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={handleBack}
          className="absolute left-4 top-3.5 p-1 active:opacity-70"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-undo" size={28} color="#000000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Security &amp; Verification</Text>
      </View>

      {/* Main Content ScrollView */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* SECTION 1: FEATURED RSBSA GROWER VERIFICATION CARD */}
        <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1">
          Agricultural Identity &amp; Badges
        </Text>

        <TouchableOpacity
          onPress={handleRsbsaCardPress}
          activeOpacity={0.85}
          className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 relative overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 2,
          }}
          accessibilityRole="button"
          accessibilityLabel="RSBSA Grower Verification"
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="bg-[#72AF5B] w-11 h-11 rounded-full items-center justify-center">
                <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-base font-bold text-gray-900 leading-tight">
                  RSBSA Grower Verification
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Department of Agriculture registry
                </Text>
              </View>
            </View>

            <View className={`px-2.5 py-1 rounded-full ${badgeConfig.bg}`}>
              <Text className={`text-xs font-bold ${badgeConfig.text}`}>
                {badgeConfig.label}
              </Text>
            </View>
          </View>

          <Text className="text-xs text-gray-600 leading-5 mb-3">
            {rsbsaApp.status === "verified"
              ? "Your farm identity is officially verified. You enjoy the green verified badge and priority placement on the Explore Map."
              : rsbsaApp.status === "pending"
              ? "Your RSBSA reference number is currently under review by our agricultural team. Tap to view status."
              : "Register your RSBSA reference number from the Municipal/City Agriculture Office to earn the official green checkmark badge."}
          </Text>

          <View className="flex-row items-center justify-between pt-2.5 border-t border-gray-100">
            <Text
              numberOfLines={1}
              className="text-xs font-bold text-[#72AF5B] flex-1 mr-2"
            >
              {rsbsaApp.status === "verified"
                ? "View Verified Credentials"
                : rsbsaApp.status === "pending"
                ? "View Application Status"
                : "View Benefits & Apply"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#72AF5B" />
          </View>
        </TouchableOpacity>

        {/* SECTION 2: STANDARD ACCOUNT SECURITY OPTIONS */}
        <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1">
          Account Login &amp; Protection
        </Text>

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
              className="flex-row items-center bg-white rounded-2xl p-4 mb-3.5 shadow-sm border border-gray-100 active:bg-gray-50"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              {/* Left Icon Container */}
              <View className="bg-gray-100 w-11 h-11 rounded-full items-center justify-center mr-3.5 border border-gray-100">
                <Ionicons name={item.iconName} size={20} color="#1F2937" />
              </View>

              {/* Middle Text Stack */}
              <View className="flex-1 pr-2">
                <Text className="text-base text-gray-900 font-semibold leading-tight">
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>

              {/* Right Chevron */}
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* RSBSA Benefits Modal */}
      <Modal
        visible={isBenefitsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBenefitsModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4 py-8">
          <View
            className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex-col"
            style={{ maxHeight: "88%" }}
          >
            {/* Modal Header */}
            <View className="bg-[#2D4F28] p-5 relative">
              <TouchableOpacity
                onPress={() => setBenefitsModalVisible(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
                accessibilityRole="button"
                accessibilityLabel="Close benefits modal"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <Ionicons name="shield-checkmark" size={18} color="#A7F3D0" />
                </View>
                <Text className="text-xs uppercase tracking-wider font-bold text-green-200">
                  Department of Agriculture
                </Text>
              </View>

              <Text className="text-xl font-extrabold text-white leading-tight mb-1">
                RSBSA Grower Benefits
              </Text>
              <Text className="text-xs text-green-100 leading-relaxed pr-6">
                Discover what you gain when you verify your farm identity with the Registry System for Basic Sectors in Agriculture.
              </Text>
            </View>

            {/* Scrollable Benefits List */}
            <ScrollView
              className="px-5 py-4 flex-1"
              showsVerticalScrollIndicator={false}
            >
              {/* Group 1: Local Farm In-App Perks */}
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                Local Farm App Advantages
              </Text>

              <View className="gap-3 mb-5">
                {/* Perk 1 */}
                <View className="flex-row items-start gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Official Green Checkmark Badge (✓)
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Distinguishes you across your profile, newsfeed posts, harvest listings, and comments as a legitimate local producer.
                    </Text>
                  </View>
                </View>

                {/* Perk 2 */}
                <View className="flex-row items-start gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                    <Ionicons name="people" size={20} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Maximum Buyer &amp; Wholesaler Trust
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Restaurants, grocery retailers, and bulk wholesalers prioritize purchasing directly from verified growers.
                    </Text>
                  </View>
                </View>

                {/* Perk 3 */}
                <View className="flex-row items-start gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                    <Ionicons name="trending-up" size={20} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Priority Map &amp; Discovery Placement
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Your harvests appear higher on the Explore Map and member recommendations, giving you more inquiries.
                    </Text>
                  </View>
                </View>

                {/* Perk 4 */}
                <View className="flex-row items-start gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                    <Ionicons name="shield" size={20} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Protection from Farm Impersonation
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Locks and validates your farm name and barangay so unverified accounts cannot falsely represent your farm.
                    </Text>
                  </View>
                </View>

                {/* Perk 5 */}
                <View className="flex-row items-start gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                    <Ionicons name="videocam" size={20} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Exclusive Live Video Broadcasting
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Broadcast live harvest updates and farm tours directly to buyers. Gated strictly to verified growers to keep streams genuine and scam-free.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Group 2: Government & DA Real-World Benefits */}
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                Government (DA) Support &amp; Safety Nets
              </Text>

              <View className="gap-3 mb-5">
                {/* DA 1 */}
                <View className="flex-row items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <View className="w-8 h-8 rounded-full bg-blue-100/70 items-center justify-center mt-0.5">
                    <Ionicons name="umbrella" size={18} color="#2563EB" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Free Crop &amp; Livestock Insurance (PCIC)
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Automatic qualification for compensation in case of typhoons, droughts, pests, and floods.
                    </Text>
                  </View>
                </View>

                {/* DA 2 */}
                <View className="flex-row items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <View className="w-8 h-8 rounded-full bg-amber-100/70 items-center justify-center mt-0.5">
                    <Ionicons name="leaf" size={18} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Subsidized Seeds &amp; Fertilizer Vouchers
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Access to seasonal certified planting materials and fertilizer discount cards distributed by the MAO/CAO.
                    </Text>
                  </View>
                </View>

                {/* DA 3 */}
                <View className="flex-row items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <View className="w-8 h-8 rounded-full bg-purple-100/70 items-center justify-center mt-0.5">
                    <Ionicons name="cash-outline" size={18} color="#7C3AED" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Financial Grants &amp; Low-Interest Loans
                    </Text>
                    <Text className="text-xs text-gray-600 leading-4 mt-0.5">
                      Access to DA/LandBank financial assistance (RFFA, fuel discount) and collateral-free agricultural credit.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Free Enrollment Info */}
              <View className="bg-amber-50 rounded-2xl p-3.5 border border-amber-100/80 mb-2">
                <View className="flex-row items-center gap-2 mb-1">
                  <Ionicons name="information-circle" size={18} color="#D97706" />
                  <Text className="text-xs font-bold text-amber-900">
                    Registration is 100% Free
                  </Text>
                </View>
                <Text className="text-xs text-amber-800 leading-4">
                  Enrollment in RSBSA is completely free at your City Agriculture Office (CAO) or Municipal Agriculture Office (MAO).
                </Text>
              </View>
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View className="p-4 border-t border-gray-100 bg-white">
              <TouchableOpacity
                onPress={handleProceedToApply}
                activeOpacity={0.85}
                className="w-full bg-[#72AF5B] py-3.5 rounded-xl items-center justify-center active:bg-[#62974e] shadow-sm mb-2"
                accessibilityRole="button"
                accessibilityLabel="Proceed to RSBSA verification application"
              >
                <Text className="text-sm font-bold text-white">
                  Proceed to Application
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBenefitsModalVisible(false)}
                activeOpacity={0.7}
                className="w-full py-2.5 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Close benefits modal"
              >
                <Text className="text-xs font-semibold text-gray-500">
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
