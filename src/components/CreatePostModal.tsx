import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface CreatePostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPost?: (postData: { content: string; category: string }) => void;
}

const CATEGORIES = ["Field", "Store", "Temporary"];

export default function CreatePostModal({
  isVisible,
  onClose,
  onPost,
}: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Field");

  const handlePostSubmit = () => {
    if (onPost) {
      onPost({ content, category: selectedCategory });
    }
    setContent("");
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      
      <Pressable
        onPress={onClose}
        className="flex-1 bg-transparent justify-end"
      >
        {/* Main Content*/}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full bg-white rounded-t-3xl p-5 shadow-2xl border-t border-gray-100"
        >
          {/* Header Section */}
          <View className="flex-row justify-between items-center pb-3 mb-3 border-b border-gray-200">
            {/* Close Button */}
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={26} color="#374151" />
            </TouchableOpacity>

            {/* Title */}
            <Text className="font-bold text-lg text-gray-900">
              Create Post
            </Text>

            {/* Post Button */}
            <TouchableOpacity
              onPress={handlePostSubmit}
              className="bg-[#72AF5B] px-4 py-1.5 rounded-full active:opacity-80"
            >
              <Text className="text-white font-medium text-sm">Post</Text>
            </TouchableOpacity>
          </View>

          {/* User Profile & Settings */}
          <View className="flex-row items-center mb-4">
            {/* Avatar */}
            <View className="bg-gray-300 h-12 w-12 rounded-full items-center justify-center mr-3 overflow-hidden">
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>

            {/* Info Stack */}
            <View>
              <Text className="font-bold text-base text-gray-900">
                Juan Dela Cruz
              </Text>

              {/* Pills Row */}
              <View className="flex-row gap-2 mt-1 flex-wrap">
                {/* Pill 1: Public */}
                <TouchableOpacity className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 gap-1">
                  <Ionicons name="earth" size={12} color="#4B5563" />
                  <Text className="text-xs text-gray-700 font-medium">
                    Public
                  </Text>
                </TouchableOpacity>

                {/* Pill 2: Add location */}
                <TouchableOpacity className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 gap-1">
                  <Ionicons name="location" size={12} color="#4B5563" />
                  <Text className="text-xs text-gray-700 font-medium">
                    Add location
                  </Text>
                </TouchableOpacity>

                {/* Pill 3: Live */}
                <TouchableOpacity className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 gap-1">
                  <Ionicons name="videocam" size={12} color="#4B5563" />
                  <Text className="text-xs text-gray-700 font-medium">
                    Live
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Text Input Area */}
          <View className="min-h-[120px] mb-2">
            <TextInput
              multiline={true}
              value={content}
              onChangeText={setContent}
              placeholder="What's growing on ? Share with your farming community ..."
              placeholderTextColor="#9CA3AF"
              className="text-base text-gray-800 leading-6 min-h-[100px] h-auto text-left"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* Category Selection */}
          <View className="mb-4">
            <Text className="font-bold text-sm text-gray-800 mb-2 mt-2">
              Category
            </Text>
            <View className="flex-row gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;

                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full border ${
                      isSelected
                        ? "bg-green-50 border-[#72AF5B]"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "text-[#72AF5B] font-bold"
                          : "text-gray-700 font-medium"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom Action Bar */}
          <View className="border-t border-gray-200 pt-4 mt-2 flex-row justify-around items-center">
            {/* Photo Action */}
            <TouchableOpacity className="flex-row items-center py-1 px-3 rounded-lg active:bg-gray-100">
              <Ionicons name="images-outline" size={20} color="#72AF5B" />
              <Text className="text-[#72AF5B] font-medium text-sm ml-2">
                Photo
              </Text>
            </TouchableOpacity>

            {/* Camera Action */}
            <TouchableOpacity className="flex-row items-center py-1 px-3 rounded-lg active:bg-gray-100">
              <Ionicons name="camera-outline" size={20} color="#72AF5B" />
              <Text className="text-[#72AF5B] font-medium text-sm ml-2">
                Camera
              </Text>
            </TouchableOpacity>

            {/* Tag people Action */}
            <TouchableOpacity className="flex-row items-center py-1 px-3 rounded-lg active:bg-gray-100">
              <Ionicons name="person-add-outline" size={20} color="#72AF5B" />
              <Text className="text-[#72AF5B] font-medium text-sm ml-2">
                Tag people
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
