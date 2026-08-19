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

interface ConnectionRequest {
  id: string;
  name: string;
  mutualFriends: string;
  timeAgo: string;
}

const INITIAL_REQUESTS: ConnectionRequest[] = [
  {
    id: "1",
    name: "Mark Paul Cosido",
    mutualFriends: "50 mutual friends",
    timeAgo: "1hr",
  },
  {
    id: "2",
    name: "Fritz Subrabas",
    mutualFriends: "1.6k friends",
    timeAgo: "3hrs",
  },
  {
    id: "3",
    name: "Noel",
    mutualFriends: "18 mutual friends",
    timeAgo: "1d",
  },
  {
    id: "4",
    name: "Richard Laviña",
    mutualFriends: "1 mutual friend",
    timeAgo: "1d",
  },
  {
    id: "5",
    name: "Angelo Mijares",
    mutualFriends: "250 mutual friends",
    timeAgo: "1w",
  },
  {
    id: "6",
    name: "Tita",
    mutualFriends: "260 mutual friends",
    timeAgo: "1mon",
  },
  {
    id: "7",
    name: "Tiklo Tiboy",
    mutualFriends: "12 mutual friends",
    timeAgo: "3mon",
  },
];

export default function People() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("Request");
  const [requestStates, setRequestStates] = useState<
    Record<string, "confirmed" | "declined" | undefined>
  >({});

  const handleConfirm = (id: string) => {
    setRequestStates((prev) => ({ ...prev, [id]: "confirmed" }));
  };

  const handleDecline = (id: string) => {
    setRequestStates((prev) => ({ ...prev, [id]: "declined" }));
  };

  const filteredRequests = INITIAL_REQUESTS.filter((req) =>
    req.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* Main Content */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/*  Header Section */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-3xl font-bold text-gray-900">Connection</Text>
        </View>

        {/*  Search Bar*/}
        <View className="flex-row items-center px-5 py-3 gap-3">
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="person-add-outline" size={26} color="#374151" />
          </TouchableOpacity>

          {/* Search Input*/}
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
        {/*  Request Header */}
        <View className="flex-row justify-between items-center px-5 py-3 mb-1">
          <Text className="text-lg font-semibold text-gray-900">
            Request{" "}
            <Text className="text-[#72AF5B] font-bold">
              {filteredRequests.length}
            </Text>
          </Text>
          <TouchableOpacity>
            <Text className="text-sm font-medium text-gray-600">Sort</Text>
          </TouchableOpacity>
        </View>
        {/* 4. Request List */}
        <View className="px-5">
          {filteredRequests.map((item) => {
            const state = requestStates[item.id];

            return (
              <View
                key={item.id}
                className="py-3.5 border-b border-gray-100 flex-row items-start justify-between"
              >
                {/* Circular Avatar */}
                <View className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center mr-3.5 border border-gray-300 overflow-hidden">
                  <Ionicons name="person" size={30} color="#6B7280" />
                </View>

                {/* Main Info & Action Buttons */}
                <View className="flex-1">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="font-bold text-gray-900 text-base leading-tight mb-1">
                        {item.name}
                      </Text>
                      <View className="flex-row items-center mb-2.5">
                        <Ionicons
                          name="people"
                          size={13}
                          color="#6B7280"
                          style={{ marginRight: 4 }}
                        />
                        <Text className="text-gray-500 text-xs font-medium">
                          {item.mutualFriends}
                        </Text>
                      </View>
                    </View>

                    {/* Time Received */}
                    <Text className="text-[#72AF5B] font-medium text-xs">
                      {item.timeAgo}
                    </Text>
                  </View>

                  {/* Card Bottom Buttons */}
                  {state === "confirmed" ? (
                    <View className="bg-white border border-[#72AF5B] py-2 rounded-xl items-center">
                      <Text className="text-[#72AF5B] font-bold text-xs">
                        Request Confirmed
                      </Text>
                    </View>
                  ) : state === "declined" ? (
                    <View className="bg-white border border-[#E63946] py-2 rounded-xl items-center">
                      <Text className="text-[#E63946] font-semibold text-xs">
                        Request Removed
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      {/* Confirm Button */}
                      <TouchableOpacity
                        onPress={() => handleConfirm(item.id)}
                        className="flex-1 bg-[#72AF5B] py-2.5 rounded-xl items-center justify-center active:bg-[#62974e] shadow-2xs"
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Confirm friend request"
                      >
                        <Text className="text-white font-bold text-xs sm:text-sm">
                          Confirm
                        </Text>
                      </TouchableOpacity>

                      {/* Decline Button */}
                      <TouchableOpacity
                        onPress={() => handleDecline(item.id)}
                        className="flex-1 bg-[#E5E7EB] py-2.5 rounded-xl items-center justify-center active:bg-gray-300"
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Decline friend request"
                      >
                        <Text className="text-gray-700 font-semibold text-xs sm:text-sm">
                          Decline
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
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />
      {/* 5. Bottom Navigation Component */}
      <BottomNavBar showFab={false} />
    </SafeAreaView>
  );
}
