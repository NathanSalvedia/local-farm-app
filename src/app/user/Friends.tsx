import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNavBar from "../../components/Navigation";
import SidebarMenu from "../../components/SidebarMenu";

interface FriendItem {
  id: string;
  name: string;
  hasMutual: boolean;
}

const MOCK_FRIENDS: FriendItem[] = [
  { id: "1", name: "Mark Paul Cosido", hasMutual: true },
  { id: "2", name: "Paul Walker", hasMutual: true },
  { id: "3", name: "Tyson", hasMutual: false },
  { id: "4", name: "May Weather", hasMutual: true },
  { id: "5", name: "Jolido Fries", hasMutual: false },
  { id: "6", name: "Jack Jalaran", hasMutual: true },
  { id: "7", name: "Romarch Uchiha Landicho", hasMutual: true },
  { id: "8", name: "Nathan Manabilang Pitos", hasMutual: false },
  { id: "9", name: "Cleogardo Pitos", hasMutual: true },
  { id: "10", name: "Princess Jalaran", hasMutual: false },
  { id: "11", name: "Geneleen Caneda", hasMutual: true },
  { id: "12", name: "Manny More", hasMutual: false },
];

const SORT_OPTIONS = [
  "Newest first",
  "Oldest first",
  "Nearest first",
  "Farthest first",
];

export default function Friends() {
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [isFilterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState("Newest first");
  const [noMutualFilter, setNoMutualFilter] = useState(false);

  const filteredFriends = MOCK_FRIENDS.filter((friend) => {
    const matchesSearch = friend.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesMutual = noMutualFilter ? !friend.hasMutual : true;
    return matchesSearch && matchesMutual;
  });

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* 1. Header Section */}
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

      {/*  Sub-Header  */}
      <View className="flex-row justify-between items-center px-5 py-2 mb-1 z-10">
        <Text className="text-lg font-semibold text-gray-900">
          Friends{" "}
          <Text className="text-[#72AF5B] font-bold">
            {filteredFriends.length}k
          </Text>
        </Text>

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => setFilterVisible(!isFilterVisible)}
          className="flex-row items-center py-1 px-2 rounded-lg active:bg-gray-100"
        >
          <Text className="text-sm font-medium text-gray-700 mr-1">Filter</Text>
          <Ionicons
            name={
              isFilterVisible ? "chevron-up-outline" : "chevron-down-outline"
            }
            size={16}
            color="#4B5563"
          />
        </TouchableOpacity>
      </View>

      {/*  Filter / Sort Floating Dropdown Box */}
      {isFilterVisible && (
        <>
          <Pressable
            onPress={() => setFilterVisible(false)}
            className="absolute inset-0 z-40 bg-transparent"
          />

          {/* Floating Filter Card */}
          <View
            style={{
              position: "absolute",
              top: 155,
              right: 20,
              zIndex: 50,
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
              elevation: 10,
            }}
            className="bg-white p-4 rounded-2xl border border-gray-200 w-64"
          >
            {/* SORT BY SECTION */}
            <Text className="text-gray-600 font-bold text-xs tracking-wider mb-2.5">
              SORT BY
            </Text>

            <View className="space-y-1">
              {SORT_OPTIONS.map((option) => {
                const isSelected = selectedSort === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setSelectedSort(option)}
                    className="flex-row items-center py-1.5"
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#72AF5B" : "#9CA3AF"}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "font-bold text-gray-900"
                          : "font-normal text-gray-700"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="border-b border-gray-300 my-3" />

            {/* FILTER BY  */}
            <Text className="text-gray-600 font-bold text-xs tracking-wider mb-2">
              FILTER BY
            </Text>

            <View className="flex-row items-center justify-between py-1">
              <Text className="text-gray-800 text-sm font-medium">
                No mutual friend
              </Text>
              <Switch
                value={noMutualFilter}
                onValueChange={setNoMutualFilter}
                trackColor={{ false: "#E5E7EB", true: "#72AF5B" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </>
      )}

      {/*  Friends List  */}
      <ScrollView
        className="flex-1 bg-white z-0"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {filteredFriends.map((friend) => (
          <TouchableOpacity
            key={friend.id}
            className="flex-row items-center px-5 py-3 border-b border-gray-50 active:bg-gray-50"
          >
            <View className="h-12 w-12 rounded-full bg-gray-300 items-center justify-center mr-4 overflow-hidden">
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>

            {/* User Name */}
            <Text className="text-base font-semibold text-gray-800">
              {friend.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeTab="Your Friends"
      />
      <BottomNavBar showFab={false} />
    </SafeAreaView>
  );
}
