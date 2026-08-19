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

interface NearbyUserItem {
  id: string;
  name: string;
  distance: string;
}

const MOCK_NEARBY_USERS: NearbyUserItem[] = [
  { id: "1", name: "Molbert Uzumaki", distance: "300m away" },
  { id: "2", name: "Niel", distance: "330m away" },
  { id: "3", name: "Zorel Salvedia", distance: "350m away" },
  { id: "4", name: "Chris Manuel Tuburan", distance: "530m away" },
  { id: "5", name: "Katinko", distance: "1km away" },
  { id: "6", name: "Cleagarda Harley Cabasagan", distance: "2km away" },
  { id: "7", name: "Belerick Teele", distance: "2.5km away" },
  { id: "8", name: "Aldous Peak", distance: "3.1km away" },
];

export default function NearbyUsers() {
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userStates, setUserStates] = useState<
    Record<string, "added" | "hidden" | undefined>
  >({});

  const handleAddFriend = (id: string) => {
    setUserStates((prev) => ({ ...prev, [id]: "added" }));
  };

  const handleNotInterested = (id: string) => {
    setUserStates((prev) => ({ ...prev, [id]: "hidden" }));
  };

  const filteredUsers = MOCK_NEARBY_USERS.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/*  Header Section */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900">Connection</Text>
      </View>

      {/*  Search Bar */}
      <View className="flex-row items-center px-5 py-3 gap-3 mb-1">
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="p-1 active:opacity-70"
        >
          <Ionicons name="person-add-outline" size={26} color="#374151" />
        </TouchableOpacity>

        {/* Search Input */}
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

      {/*  Sub-Header */}
      <View className="px-5 mb-4">
        <Text className="text-lg font-semibold text-gray-800">
          Nearby Users
        </Text>
      </View>

      {/*  Nearby Users List */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-5">
          {filteredUsers.map((item) => {
            const state = userStates[item.id];

            return (
              <View
                key={item.id}
                className="py-3.5 border-b border-gray-100 flex-row items-start justify-between"
              >
                {/* Circular Avatar */}
                <View className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center mr-3.5 border border-gray-300 overflow-hidden">
                  <Ionicons name="person" size={30} color="#6B7280" />
                </View>

                {/* Info & Action Buttons Container */}
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-base leading-tight mb-1">
                    {item.name}
                  </Text>

                  {/* Distance Indicator */}
                  <View className="flex-row items-center mb-3">
                    <Ionicons
                      name="location"
                      size={13}
                      color="#72AF5B"
                      style={{ marginRight: 3 }}
                    />
                    <Text className="text-xs font-semibold text-gray-500">
                      {item.distance}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  {state === "added" ? (
                    <TouchableOpacity
                      onPress={() =>
                        setUserStates((prev) => ({
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
                  ) : state === "hidden" ? null : (
                    <View className="flex-row items-center gap-2">
                      {/* Add Friend Button */}
                      <TouchableOpacity
                        onPress={() => handleAddFriend(item.id)}
                        className="flex-1 bg-[#72AF5B] py-2.5 px-3 rounded-xl flex-row items-center justify-center active:bg-[#62974e] shadow-2xs"
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${item.name} as friend`}
                      >
                        <Text className="text-white font-bold text-sm sm:text-sm">
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
      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeTab="Nearby Users"
      />
      <BottomNavBar showFab={false} />
    </SafeAreaView>
  );
}
