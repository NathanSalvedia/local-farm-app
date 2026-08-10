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

interface SentRequestItem {
  id: string;
  name: string;
  friendsCount: string;
  timeAgo: string;
}

const MOCK_SENT_REQUESTS: SentRequestItem[] = [
  {
    id: "1",
    name: "Marie",
    friendsCount: "1.6k friends",
    timeAgo: "1hr",
  },
  {
    id: "2",
    name: "Kint Salvedia",
    friendsCount: "50 mutual friends",
    timeAgo: "5hrs",
  },
  {
    id: "3",
    name: "Moscov Tri",
    friendsCount: "12 mutual friends",
    timeAgo: "1d",
  },
  {
    id: "4",
    name: "Killua Jay",
    friendsCount: "250 mutual friends",
    timeAgo: "4d",
  },
  {
    id: "5",
    name: "Zilong Too",
    friendsCount: "1 mutual friend",
    timeAgo: "1w",
  },
  {
    id: "6",
    name: "Alucard Light",
    friendsCount: "89 mutual friends",
    timeAgo: "2w",
  },
];

export default function SentRequests() {
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelledIds, setCancelledIds] = useState<Record<string, boolean>>({});

  const handleCancelRequest = (id: string) => {
    setCancelledIds((prev) => ({ ...prev, [id]: true }));
  };

  const filteredRequests = MOCK_SENT_REQUESTS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* Main Scrollable Content */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/*  Header Section */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-3xl font-bold text-gray-900">Connection</Text>
        </View>

        {/* 2. Search Bar */}
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
        <View className="flex-row items-center px-5 py-2 mb-2">
          <Text className="text-lg font-semibold text-gray-900">
            Sent Request <Text className="text-gray-400">·</Text>{" "}
            <Text className="text-[#72AF5B] font-bold">
              {filteredRequests.length}
            </Text>
          </Text>
        </View>

        {/* Sent Request List */}
        <View className="px-5">
          {filteredRequests.map((item) => {
            const isCancelled = cancelledIds[item.id];

            return (
              <View
                key={item.id}
                className="bg-[#F3F4F6] rounded-2xl p-4 mb-3.5 flex-row items-start justify-between"
              >
                <View className="h-16 w-16 rounded-full bg-gray-400 items-center justify-center mr-3.5 overflow-hidden">
                  <Ionicons name="person" size={42} color="#FFFFFF" />
                </View>

                {/* Card Main Info */}
                <View className="flex-1">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="font-bold text-gray-900 text-lg leading-6 mb-0.5">
                        {item.name}
                      </Text>
                      <View className="flex-row items-center mb-3">
                        <Ionicons
                          name="people"
                          size={14}
                          color="#6B7280"
                          style={{ marginRight: 4 }}
                        />
                        <Text className="text-gray-500 text-xs font-medium">
                          {item.friendsCount}
                        </Text>
                      </View>
                    </View>

                    {/* Time Sent */}
                    <Text className="text-[#72AF5B] font-medium text-sm">
                      {item.timeAgo}
                    </Text>
                  </View>

                  {/*  Cancel Request Button */}
                  {isCancelled ? (
                    <View className="bg-gray-200 py-2.5 rounded-xl items-center">
                      <Text className="text-gray-500 font-semibold text-sm">
                        Request Cancelled
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleCancelRequest(item.id)}
                      className="w-full bg-[#E5E7EB] py-2.5 rounded-xl items-center justify-center active:opacity-80"
                    >
                      <Text className="text-gray-700 font-semibold text-sm">
                        Cancel Request
                      </Text>
                    </TouchableOpacity>
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
        activeTab="Sent Request"
      />
      <BottomNavBar showFab={false} />
    </SafeAreaView>
  );
}
