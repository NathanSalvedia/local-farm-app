import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNavBar from "../../components/Navigation";
import SidebarMenu from "../../components/SidebarMenu";

interface SuggestionUserItem {
  id: string;
  name: string;
  mutualFriends: string;
}

const MOCK_SUGGESTIONS: SuggestionUserItem[] = [
  { id: "1", name: "Kiara Mae", mutualFriends: "10 mutual friends" },
  { id: "2", name: "Princess Bea", mutualFriends: "1.6k friends" },
  { id: "3", name: "Jasmine Mi", mutualFriends: "1 mutual friend" },
  { id: "4", name: "Yamimis", mutualFriends: "5 mutual friends" },
  { id: "5", name: "Ala wa balo", mutualFriends: "120 mutual friends" },
  { id: "6", name: "Mao bakol", mutualFriends: "4 mutual friends" },
  { id: "7", name: "kung ang saging", mutualFriends: "2 mutual friends" },
  { id: "8", name: "Harley Queen", mutualFriends: "88 mutual friends" },
];

export default function Suggestions() {
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionStates, setSuggestionStates] = useState<
    Record<string, "added" | "hidden" | undefined>
  >({});

  const handleAddFriend = (id: string) => {
    setSuggestionStates((prev) => ({ ...prev, [id]: "added" }));
  };

  const handleNotInterested = (id: string) => {
    setSuggestionStates((prev) => ({ ...prev, [id]: "hidden" }));
  };

  const filteredSuggestions = MOCK_SUGGESTIONS.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* 1. Header Section */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900">Connection</Text>
      </View>

      {/* 2. Search Bar Section (With Sidebar Trigger) */}
      <View className="flex-row items-center px-5 py-3 gap-3 mb-1">
        {/* Sidebar Trigger Icon */}
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="p-1 active:opacity-70"
        >
          <Ionicons name="person-add-outline" size={26} color="#374151" />
        </TouchableOpacity>

        {/* Search Input Container */}
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-base text-gray-800 pr-2 h-full"
          />
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        </View>
      </View>

      {/* 3. Sub-Header Section */}
      <View className="px-5 mb-4">
        <Text className="text-lg font-semibold text-gray-800">Suggestions</Text>
      </View>

      {/* 4. Suggestions List (Cards) */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-5">
          {filteredSuggestions.map((item) => {
            const state = suggestionStates[item.id];
            if (state === "hidden") return null;

            return (
              <View
                key={item.id}
                className="py-3.5 border-b border-gray-100 flex-row items-start justify-between"
              >
                {/* Circular Gray Avatar Placeholder */}
                <View className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center mr-3.5 border border-gray-300 overflow-hidden">
                  <Ionicons name="person" size={30} color="#6B7280" />
                </View>

                {/* Info & Action Buttons Container */}
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-base leading-tight mb-1">
                    {item.name}
                  </Text>

                  {/* Mutual Friends Info */}
                  <View className="flex-row items-center mb-3">
                    <Ionicons
                      name="people"
                      size={13}
                      color="#6B7280"
                      style={{ marginRight: 4 }}
                    />
                    <Text className="text-xs font-semibold text-gray-500">
                      {item.mutualFriends}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  {state === "added" ? (
                    <TouchableOpacity
                      onPress={() =>
                        setSuggestionStates((prev) => ({
                          ...prev,
                          [item.id]: undefined,
                        }))
                      }
                      className="w-full bg-gray-50 border border-[#72AF5B] py-2.5 rounded-xl items-center justify-center active:bg-gray-300"
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel friend request"
                    >
                      <Text className="text-[#000000] font-semibold text-xs sm:text-sm">
                        Cancel Request
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      {/* Add Friend Button */}
                      <TouchableOpacity
                        onPress={() => handleAddFriend(item.id)}
                        className="flex-1 bg-[#72AF5B] py-2.5 px-3 rounded-xl flex-row items-center justify-center active:bg-[#62974e] shadow-2xs"
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${item.name} as friend`}
                      >
                        <Text className="text-white font-bold text-xs sm:text-sm">
                          Add friend
                        </Text>
                      </TouchableOpacity>

                      {/* Not Interested Button */}
                      <TouchableOpacity
                        onPress={() => handleNotInterested(item.id)}
                        className="flex-1 bg-gray-200 py-2.5 px-2 rounded-xl flex-row items-center justify-center active:bg-gray-300"
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Not interested"
                      >
                        <Text
                          className="text-gray-700 font-semibold text-xs sm:text-sm text-center"
                          numberOfLines={1}
                        >
                          Not Interested
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Reusable Sidebar Drawer Menu */}
      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeTab="Suggestions"
      />

      {/* Bottom Navigation Component */}
      <BottomNavBar showFab={false} />
    </SafeAreaView>
  );
}
