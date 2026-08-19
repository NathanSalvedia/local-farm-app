import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Navigation from "../../components/Navigation";

interface FormFieldItem {
  id: string;
  label: string;
  value: string;
  iconType: "person" | "mail" | "call" | "male" | "location";
}

const INITIAL_FIELDS: FormFieldItem[] = [
  {
    id: "1",
    label: "Full name:",
    value: "Nathan Luna Salvedia",
    iconType: "person",
  },
  {
    id: "2",
    label: "Username",
    value: "nathanluna",
    iconType: "person",
  },
  {
    id: "3",
    label: "Email Address:",
    value: "nathan@example.com",
    iconType: "mail",
  },
  {
    id: "4",
    label: "Phone #:",
    value: "123 4567 8990",
    iconType: "call",
  },
  {
    id: "5",
    label: "Gender:",
    value: "Male",
    iconType: "male",
  },
  {
    id: "6",
    label: "Location",
    value: "Iligan City, Northern Mindanao",
    iconType: "location",
  },
];

export default function PersonalInformation() {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>({
    "1": "Nathan Luna Salvedia",
    "2": "nathanluna",
    "3": "nathan@example.com",
    "4": "123 4567 8990",
    "5": "Male",
    "6": "Iligan City, Northern Mindanao",
  });

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

  const handleInputChange = (id: string, text: string) => {
    setFormData((prev) => ({ ...prev, [id]: text }));
  };

  const renderFieldIcon = (type: FormFieldItem["iconType"]) => {
    switch (type) {
      case "person":
        return <Ionicons name="person" size={20} color="#72AF5B" />;
      case "mail":
        return <Ionicons name="mail" size={20} color="#72AF5B" />;
      case "call":
        return <Ionicons name="call" size={20} color="#72AF5B" />;
      case "male":
        return (
          <MaterialCommunityIcons
            name="gender-male"
            size={22}
            color="#72AF5B"
          />
        );
      case "location":
        return <Ionicons name="location" size={20} color="#72AF5B" />;
      default:
        return <Ionicons name="person" size={20} color="#72AF5B" />;
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      {/* ── Main Scrollable Content ────────────────────────────────────────── */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── 1. Top Green Header Banner (Flat bottom, rounded top) ───────── */}
        <View className="mx-3.5 mt-2 bg-[#6EA352] h-40 pt-4 px-4 rounded-t-[28px] relative">
          {/* Navigation Row */}
          <View className="flex-row justify-between items-center">
            {/* Left Back Arrow */}
            <TouchableOpacity
              onPress={handleBack}
              className="p-1 active:opacity-70"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-undo" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Center Header Title */}
            <Text className="text-white text-lg font-bold tracking-wide">
              Profile
            </Text>

            {/* Right Bell Notification Icon */}
            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. Overlapping Avatar (Exact Silhouette Icon & White Border) ─── */}
        <View className="items-center z-50 -mt-16">
          {/* Relative Avatar Wrapper with Online Dot */}
          <View className="relative">
            {/* Circular Avatar with Thick White Border */}
            <View className="w-32 h-32 rounded-full border-[5px] border-white bg-[#E5E7EB] items-center justify-end overflow-hidden shadow-md">
              <Ionicons
                name="person"
                size={92}
                color="#555B66"
                style={{ marginBottom: -8 }}
              />
            </View>

            {/* Online Green Badge on bottom right edge */}
            <View className="absolute bottom-1 right-1 w-6 h-6 bg-[#72AF5B] rounded-full border-[3px] border-white shadow-2xs" />
          </View>

          {/* Edit Profile Title */}
          <Text className="text-xl font-bold text-gray-900 mt-2.5 text-center">
            Edit Profile
          </Text>
        </View>

        {/* ── 3. Form Fields List ─────────────────────────────────────────── */}
        <View className="px-5 mt-5">
          {INITIAL_FIELDS.map((field) => {
            const currentValue = formData[field.id] ?? field.value;

            return (
              <View key={field.id} className="mb-3.5">
                {/* Field Label */}
                <Text className="text-sm font-medium text-gray-800 mb-1.5 ml-1">
                  {field.label}
                </Text>

                {/* Input Card Container */}
                <View className="flex-row items-center bg-[#F2F4F5] rounded-2xl py-2.5 px-3 border border-gray-100 shadow-2xs">
                  {/* Circular Light-Green Icon Badge */}
                  <View className="bg-[#E2F0D9] w-10 h-10 rounded-full items-center justify-center mr-3.5">
                    {renderFieldIcon(field.iconType)}
                  </View>

                  {/* Input / Text Value */}
                  <TextInput
                    value={currentValue}
                    onChangeText={(text) => handleInputChange(field.id, text)}
                    className="text-sm sm:text-base font-medium text-gray-900 flex-1 p-0"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── 4. Bottom Navigation Bar ──────────────────────────────────────── */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
