import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { FriendItem, getFriendsApi } from "@/services/connection-service";
import { createGroupChatApi } from "@/services/chat-service";

interface InitialUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface CreateGroupChatModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated: (conversation: {
    id: string;
    title: string;
    avatarUrl?: string;
    isGroup: boolean;
  }) => void;
  initialSelectedUser?: InitialUser | null;
}

export default function CreateGroupChatModal({
  visible,
  onClose,
  onGroupCreated,
  initialSelectedUser,
}: CreateGroupChatModalProps) {
  const [groupTitle, setGroupTitle] = useState("");
  const [groupAvatarUri, setGroupAvatarUri] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<
    { id: string; name: string; avatarUrl?: string }[]
  >([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (visible) {
      setGroupTitle("");
      setGroupAvatarUri(null);
      setSearchQuery("");
      setIsSubmitting(false);

      if (initialSelectedUser && initialSelectedUser.id) {
        setSelectedFriends([initialSelectedUser]);
      } else {
        setSelectedFriends([]);
      }

      fetchFriends();
    }
  }, [visible, initialSelectedUser]);

  const fetchFriends = async () => {
    setIsLoadingFriends(true);
    try {
      const data = await getFriendsApi();
      setFriends(data);
    } catch (err) {
      console.warn("[CreateGroupChatModal] Failed to load friends:", err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed to set a group photo."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGroupAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Avatar pick error:", err);
    }
  };

  const handleToggleFriend = (friend: FriendItem) => {
    const isSelected = selectedFriends.some((f) => String(f.id) === String(friend.id));
    if (isSelected) {
      setSelectedFriends((prev) =>
        prev.filter((f) => String(f.id) !== String(friend.id))
      );
    } else {
      setSelectedFriends((prev) => [
        ...prev,
        {
          id: String(friend.id),
          name: friend.name,
          avatarUrl: friend.avatarUrl || undefined,
        },
      ]);
    }
  };

  const handleRemoveSelected = (id: string) => {
    setSelectedFriends((prev) => prev.filter((f) => String(f.id) !== String(id)));
  };

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.username && f.username.toLowerCase().includes(q))
    );
  }, [friends, searchQuery]);

  const canCreate = groupTitle.trim().length > 0 && selectedFriends.length > 0;

  const handleCreateGroup = async () => {
    if (!canCreate || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await createGroupChatApi({
        title: groupTitle.trim(),
        participantIds: selectedFriends.map((f) => f.id),
        avatarUrl: groupAvatarUri || undefined,
      });

      if (res && res.conversation) {
        onGroupCreated({
          id: res.conversation.id,
          title: res.conversation.title,
          avatarUrl: res.conversation.avatarUrl,
          isGroup: true,
        });
        onClose();
      } else {
        Alert.alert("Error", "Could not create group. Please try again.");
      }
    } catch (err: any) {
      console.warn("Failed to create group:", err);
      const msg = err?.message || "Failed to create group. Please check your connection.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* 1. Header Bar */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity
            onPress={onClose}
            className="py-1 px-2 -ml-2 active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Cancel group creation"
          >
            <Text className="text-[16px] text-gray-600 font-medium">Cancel</Text>
          </TouchableOpacity>

          <Text className="text-[17px] font-bold text-gray-900">New Group Chat</Text>

          <TouchableOpacity
            onPress={handleCreateGroup}
            disabled={!canCreate || isSubmitting}
            className={`py-1.5 px-3.5 rounded-full ${
              canCreate && !isSubmitting
                ? "bg-[#72AF5B] active:opacity-80"
                : "bg-gray-200 opacity-60"
            }`}
            accessibilityRole="button"
            accessibilityLabel="Create group"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className={`text-[15px] font-bold ${
                  canCreate ? "text-white" : "text-gray-400"
                }`}
              >
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Group Profile Info Section */}
        <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <TouchableOpacity
            onPress={handlePickAvatar}
            className="relative w-14 h-14 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200 mr-3 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Pick group photo"
          >
            {groupAvatarUri ? (
              <Image
                source={{ uri: groupAvatarUri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="people" size={26} color="#9CA3AF" />
            )}
            <View className="absolute bottom-0 right-0 left-0 bg-black/40 py-0.5 items-center justify-center">
              <Ionicons name="camera" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View className="flex-1">
            <TextInput
              value={groupTitle}
              onChangeText={setGroupTitle}
              placeholder="Group name (e.g. Benguet Farmers)"
              placeholderTextColor="#9CA3AF"
              className="text-[16px] text-gray-900 font-semibold py-1.5 px-1"
              maxLength={60}
              returnKeyType="done"
            />
            <Text className="text-[11px] text-gray-400 ml-1">
              {groupTitle.length}/60 characters
            </Text>
          </View>
        </View>

        {/* 3. Selected Members Chips */}
        {selectedFriends.length > 0 && (
          <View className="py-2.5 px-4 border-b border-gray-100 bg-white">
            <Text className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Selected Members ({selectedFriends.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {selectedFriends.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center bg-gray-100 rounded-full pl-1 pr-2.5 py-1"
                >
                  <View className="w-6 h-6 rounded-full bg-gray-300 items-center justify-center overflow-hidden mr-1.5">
                    {member.avatarUrl ? (
                      <Image
                        source={{ uri: member.avatarUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    className="text-[13px] font-medium text-gray-800 mr-1.5"
                    numberOfLines={1}
                  >
                    {member.name.split(" ")[0]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveSelected(member.id)}
                    className="p-0.5 active:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.name}`}
                  >
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 4. Search Bar */}
        <View className="px-4 py-2.5 bg-white border-b border-gray-100">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search friends..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-[15px] text-gray-900 py-0"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} className="p-0.5">
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 5. Friends List */}
        <View className="flex-1 bg-white">
          <Text className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
            Suggested Friends
          </Text>

          {isLoadingFriends ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator size="small" color="#72AF5B" />
              <Text className="text-gray-400 text-sm mt-2">Loading friends...</Text>
            </View>
          ) : filteredFriends.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12 px-6">
              <Ionicons name="people-outline" size={44} color="#D1D5DB" />
              <Text className="text-gray-500 font-semibold text-base mt-2">
                No friends found
              </Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                {searchQuery
                  ? "Try searching with a different name."
                  : "Connect with farmers and buyers to invite them to group chats."}
              </Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1 px-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {filteredFriends.map((friend) => {
                const isSelected = selectedFriends.some(
                  (f) => String(f.id) === String(friend.id)
                );
                return (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => handleToggleFriend(friend)}
                    className="flex-row items-center py-3 border-b border-gray-50 active:bg-gray-50 rounded-xl px-2"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    {/* Avatar */}
                    <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center overflow-hidden mr-3">
                      {friend.avatarUrl ? (
                        <Image
                          source={{ uri: friend.avatarUrl }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={24} color="#FFFFFF" />
                      )}
                    </View>

                    {/* Name & username */}
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-gray-900">
                        {friend.name}
                      </Text>
                      {friend.username ? (
                        <Text className="text-xs text-gray-500 mt-0.5">
                          @{friend.username}
                        </Text>
                      ) : (
                        <Text className="text-xs text-gray-400 mt-0.5">Local farmer</Text>
                      )}
                    </View>

                    {/* Checkbox indicator */}
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center border ${
                        isSelected
                          ? "bg-[#72AF5B] border-[#72AF5B]"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
