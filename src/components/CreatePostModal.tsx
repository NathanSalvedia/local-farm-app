import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import { createPostApi, PostItem } from "@/services/post-service";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import LeafletMap from "./LeafletMap";

export interface CreatePostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPost?: (post: PostItem) => void;
}

type ViewMode =
  | "POST_FORM"
  | "PRIVACY"
  | "LIVE_PERMISSION"
  | "TAG_PEOPLE"
  | "PHOTO_GALLERY"
  | "CAMERA"
  | "ADD_LOCATION";

type PrivacyType = "Public" | "Friends" | "Only me";

interface PrivacyOption {
  id: PrivacyType;
  title: PrivacyType;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Friend {
  id: string;
  fullName: string;
  firstName: string;
}

const CATEGORIES = ["Field", "Wholesaler", "Temporary"];

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    id: "Public",
    title: "Public",
    icon: "globe",
  },
  {
    id: "Friends",
    title: "Friends",
    icon: "people",
  },
  {
    id: "Only me",
    title: "Only me",
    icon: "lock-closed",
  },
];

const MOCK_FRIENDS: Friend[] = [
  { id: "1", fullName: "Mark Paul Cosido", firstName: "Mark" },
  { id: "2", fullName: "Paul Walker", firstName: "Paul" },
  { id: "3", fullName: "Tyson", firstName: "Tyson" },
  { id: "4", fullName: "May Weather", firstName: "May" },
  { id: "5", fullName: "Jolido Fries", firstName: "Jolido" },
  { id: "6", fullName: "Jack Jalaran", firstName: "Jack" },
  { id: "7", fullName: "Romarch Uchiha Landicho", firstName: "Romarch" },
  { id: "8", fullName: "Nathan Manabilang Pitos", firstName: "Nathan" },
  { id: "9", fullName: "Cleogardo Pitos", firstName: "Cleogardo" },
  { id: "10", fullName: "Princess Jalaran", firstName: "Princess" },
  { id: "11", fullName: "Geneleen Caneda", firstName: "Geneleen" },
];

const MOCK_GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1567306301408-9b74779a11af?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80",
];

const ILIGAN_REGION = {
  latitude: 8.228,
  longitude: 124.2452,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function CreatePostModal({
  isVisible,
  onClose,
  onPost,
}: CreatePostModalProps) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewMode>("POST_FORM");
  const [privacySetting, setPrivacySetting] = useState<PrivacyType>("Public");
  const [isDefaultAudience, setIsDefaultAudience] = useState(false);
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Field");
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("Current Location");
  const [flashMode, setFlashMode] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  const handleClose = () => {
    setActiveView("POST_FORM");
    onClose();
  };

  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && selectedPhotos.length === 0) {
      showToast("Please enter some text or select a photo.", "info");
      return;
    }

    setIsSubmitting(true);
    try {
      const newPost = await createPostApi({
        content: trimmedContent,
        category: selectedCategory,
        privacy: privacySetting,
        location: selectedLocation,
        photos: selectedPhotos,
      });

      showToast("Post shared to community!", "success");
      if (onPost) {
        onPost(newPost);
      }
      setContent("");
      setTaggedUserIds([]);
      setSelectedPhotos([]);
      setSelectedLocation(null);
      handleClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to create post.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTagUser = (userId: string) => {
    setTaggedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectPhoto = (uri: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(uri) ? prev.filter((p) => p !== uri) : [...prev, uri],
    );
  };

  const handleCapturePhoto = () => {
    const newPhoto =
      MOCK_GALLERY_IMAGES[selectedPhotos.length % MOCK_GALLERY_IMAGES.length];
    setSelectedPhotos((prev) => [...prev, newPhoto]);
    setActiveView("POST_FORM");
  };

  const filteredFriends = MOCK_FRIENDS.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getPrivacyIcon = (
    setting: PrivacyType,
  ): keyof typeof Ionicons.glyphMap => {
    switch (setting) {
      case "Friends":
        return "people";
      case "Only me":
        return "lock-closed";
      case "Public":
      default:
        return "globe";
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={activeView === "POST_FORM"}
      animationType="slide"
      onRequestClose={handleClose}
    >
      {activeView === "POST_FORM" ? (
        /* 1. POST FORM VIEW (Bottom Sheet) */
        <Pressable
          onPress={handleClose}
          className="flex-1 bg-transparent justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl border-t border-gray-100"
          >
            {/* Header Section */}
            <View className="flex-row justify-between items-center pb-3 mb-3 border-b border-gray-200">
              {/* Close Button */}
              <TouchableOpacity onPress={handleClose} className="p-1">
                <Ionicons name="close" size={26} color="#374151" />
              </TouchableOpacity>

              {/* Title */}
              <Text className="font-bold text-lg text-gray-900">
                Create Post
              </Text>

              {/* Post Button */}
              <TouchableOpacity
                onPress={handlePostSubmit}
                disabled={isSubmitting}
                className="bg-[#72AF5B] px-4 py-1.5 rounded-full active:opacity-80 flex-row items-center justify-center min-w-[60px]"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-medium text-sm">Post</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* User Profile & Settings */}
            <View className="flex-row items-center mb-4">
              {/* Avatar */}
              <View className="bg-gray-200 h-12 w-12 rounded-full items-center justify-center mr-3 overflow-hidden border border-gray-200">
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={24} color="#9CA3AF" />
                )}
              </View>

              {/* Info Stack */}
              <View className="flex-1">
                <Text className="font-bold text-base text-gray-900">
                  {user?.name || user?.fullName || user?.username || "Local Farmer"}
                </Text>

                <View className="flex-row items-center gap-1.5 mt-1">
                  {/* Privacy Selector Trigger */}
                  <TouchableOpacity
                    onPress={() => setActiveView("PRIVACY")}
                    className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full border border-gray-200 gap-1 active:bg-gray-200"
                  >
                    <Ionicons
                      name={getPrivacyIcon(privacySetting)}
                      size={12}
                      color="#4B5563"
                    />
                    <Text className="text-[11px] text-gray-700 font-medium">
                      {privacySetting}
                    </Text>
                    <Ionicons name="chevron-down" size={10} color="#4B5563" />
                  </TouchableOpacity>

                  {/*  Add Location Trigger */}
                  <TouchableOpacity
                    onPress={() => setActiveView("ADD_LOCATION")}
                    className={`flex-row items-center px-2 py-1 rounded-full border gap-1 active:opacity-80 ${
                      selectedLocation
                        ? "bg-green-50 border-[#72AF5B]"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name="location"
                      size={12}
                      color={selectedLocation ? "#72AF5B" : "#4B5563"}
                    />
                    <Text
                      className={`text-[11px] font-medium ${
                        selectedLocation
                          ? "text-[#72AF5B] font-bold"
                          : "text-gray-700"
                      }`}
                      numberOfLines={1}
                    >
                      {selectedLocation || "Add location"}
                    </Text>
                  </TouchableOpacity>

                  {/*  Live Permission Trigger */}
                  <TouchableOpacity
                    onPress={() => setActiveView("LIVE_PERMISSION")}
                    className="flex-row items-center bg-[#D90000] px-2 py-1 rounded-full border border-gray-200 gap-1 active:bg-gray-200"
                  >
                    <Ionicons name="videocam" size={12} color="#FFFFFF" />
                    <Text className="text-[11px] text-[#FFFFFF] font-medium">
                      Live
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Text Input Area */}
            <View className="min-h-[100px] mb-2">
              <TextInput
                multiline={true}
                value={content}
                onChangeText={setContent}
                placeholder="What's growing on ? Share with your farming community ..."
                placeholderTextColor="#9CA3AF"
                className="text-base text-gray-800 leading-6 min-h-[90px] h-auto text-left"
                style={{ textAlignVertical: "top" }}
              />
            </View>

            {/* Selected Photos Preview */}
            {selectedPhotos.length > 0 && (
              <View className="mb-3">
                <Text className="text-xs font-semibold text-gray-600 mb-1.5">
                  Attached Photos ({selectedPhotos.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row"
                >
                  {selectedPhotos.map((photoUri, idx) => (
                    <View
                      key={idx}
                      className="mr-2.5 relative rounded-xl overflow-hidden border border-gray-200 shadow-2xs"
                    >
                      <Image
                        source={{ uri: photoUri }}
                        className="w-20 h-20 rounded-xl"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setSelectedPhotos((prev) =>
                            prev.filter((p) => p !== photoUri),
                          )
                        }
                        className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 items-center justify-center"
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {/* Add more button */}
                  <TouchableOpacity
                    onPress={() => setActiveView("PHOTO_GALLERY")}
                    className="w-20 h-20 rounded-xl border border-dashed border-gray-300 bg-gray-50 items-center justify-center active:bg-gray-100"
                  >
                    <Ionicons name="add" size={24} color="#72AF5B" />
                    <Text className="text-[10px] text-gray-500 font-medium mt-0.5">
                      Add more
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

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
              {/* Photo Action Trigger */}
              <TouchableOpacity
                onPress={() => setActiveView("PHOTO_GALLERY")}
                className="flex-row items-center py-1 px-3 rounded-lg active:bg-gray-100"
              >
                <Ionicons name="images-outline" size={20} color="#72AF5B" />
                <Text className="text-[#72AF5B] font-medium text-sm ml-2">
                  {selectedPhotos.length > 0
                    ? `Photos (${selectedPhotos.length})`
                    : "Photo"}
                </Text>
              </TouchableOpacity>

              {/* Camera Action Trigger */}
              <TouchableOpacity
                onPress={() => setActiveView("CAMERA")}
                className="flex-row items-center py-1 px-3 rounded-lg active:bg-gray-100"
              >
                <Ionicons name="camera-outline" size={20} color="#72AF5B" />
                <Text className="text-[#72AF5B] font-medium text-sm ml-2">
                  Camera
                </Text>
              </TouchableOpacity>

              {/* Tag people Action Trigger */}
              <TouchableOpacity
                onPress={() => setActiveView("TAG_PEOPLE")}
                className="flex-row items-center py-1 px-3 rounded-lg active:bg-gray-100"
              >
                <Ionicons name="person-add-outline" size={20} color="#72AF5B" />
                <Text className="text-[#72AF5B] font-medium text-sm ml-2">
                  {taggedUserIds.length > 0
                    ? `Tag people (${taggedUserIds.length})`
                    : "Tag people"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      ) : activeView === "PRIVACY" ? (
        /* 2. WHO CAN SEE POST ? (PRIVACY) VIEW */
        <View className="flex-1 bg-white justify-between px-5 pt-3 pb-3 h-full">
          {/* Top Content */}
          <View>
            {/* Back Arrow Button */}
            <TouchableOpacity
              onPress={() => setActiveView("POST_FORM")}
              className="p-1 -ml-2 mb-2 self-start active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={28} color="#111827" />
            </TouchableOpacity>

            {/* Header Title */}
            <Text className="text-2xl font-bold text-gray-900 mb-1.5">
              Who can see post ?
            </Text>
            <Text className="text-sm text-gray-500 mb-8 leading-5">
              Your post will show up in Feed, on your profile and search result
            </Text>

            {/* Privacy Options List */}
            <View className="space-y-4">
              {PRIVACY_OPTIONS.map((option) => {
                const isSelected = privacySetting === option.title;

                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setPrivacySetting(option.title)}
                    className="flex-row items-center py-3.5 active:opacity-70"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon}
                      size={23}
                      color={isSelected ? "#111827" : "#4B5563"}
                    />
                    <Text
                      className={`text-md ml-4 ${
                        isSelected
                          ? "font-bold text-gray-900"
                          : "font-semibold text-gray-800"
                      }`}
                    >
                      {option.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom Actions */}
          <View className="mt-auto">
            {/* Set as default audience Row */}
            <View className="flex-row justify-between items-center mb-3 px-1">
              <Text className="text-sm text-gray-600 font-medium">
                Set as default audience
              </Text>
              <Switch
                value={isDefaultAudience}
                onValueChange={setIsDefaultAudience}
                trackColor={{ false: "#E5E7EB", true: "#72AF5B" }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Done Button */}
            <TouchableOpacity
              onPress={() => setActiveView("POST_FORM")}
              className="w-full bg-[#72AF5B] py-3.5 rounded-xl items-center justify-center active:opacity-80"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-base">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : activeView === "LIVE_PERMISSION" ? (
        /* 3. GO LIVE CAMERA ACCESS PERMISSION VIEW */
        <View className="flex-1 bg-white justify-between px-5 pt-3 pb-3 h-full">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "space-between",
            }}
          >
            {/* Header & Main Content */}
            <View>
              {/* Header Section */}
              <View className="flex-row items-center pt-1 pb-2">
                <TouchableOpacity
                  onPress={() => setActiveView("POST_FORM")}
                  className="p-1 -ml-2 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 ml-3">
                  Live
                </Text>
              </View>

              {/* Main Graphic */}
              <View className="items-center mt-6">
                <View className="bg-green-100 p-5 rounded-3xl items-center justify-center">
                  <Ionicons name="videocam" size={68} color="#16a34a" />
                </View>
              </View>

              {/* Typography */}
              <Text className="text-2xl font-bold text-center mt-5 text-gray-800 leading-8">
                Access Your Camera{"\n"}to{" "}
                <Text className="text-[#72AF5B]">Cast Live</Text>
              </Text>

              <Text className="text-sm text-gray-600 text-center px-4 mt-3 leading-5">
                Allow access to your camera to cast live and connect with your
                friends in real time. Your privacy is important to us.
              </Text>

              {/* Feature Info Box */}
              <View className="bg-gray-100 rounded-2xl mx-1 mt-6 p-4">
                {/* Feature 1 */}
                <View className="flex-row items-start mb-4">
                  <View className="bg-gray-300 p-2 rounded-full mr-3.5 items-center justify-center">
                    <Ionicons name="videocam" size={16} color="#374151" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Go Live with Friends
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Stream live video and share moments instantly.
                    </Text>
                  </View>
                </View>

                {/* Feature 2 */}
                <View className="flex-row items-start mb-4">
                  <View className="bg-gray-300 p-2 rounded-full mr-3.5 items-center justify-center">
                    <Ionicons
                      name="shield-checkmark"
                      size={16}
                      color="#374151"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      Safe & Secure
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      We do not record or store your live videos.
                    </Text>
                  </View>
                </View>

                {/* Feature 3 */}
                <View className="flex-row items-start">
                  <View className="bg-gray-300 p-2 rounded-full mr-3.5 items-center justify-center">
                    <Ionicons name="lock-closed" size={16} color="#374151" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      {"You're in Control"}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      You can change or revoke camera access anytime in
                      settings.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Action Buttons */}
            <View className="mt-6 pb-2">
              {/* Allow Button */}
              <TouchableOpacity
                onPress={() => setActiveView("POST_FORM")}
                className="w-full bg-[#72AF5B] rounded-xl py-3.5 flex-row justify-center items-center mb-3 active:opacity-80 shadow-xs"
                activeOpacity={0.8}
              >
                <Ionicons name="videocam" size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-base ml-2">
                  Allow camera access
                </Text>
              </TouchableOpacity>

              {/* Not Now Button */}
              <TouchableOpacity
                onPress={() => setActiveView("POST_FORM")}
                className="w-full bg-white rounded-xl py-3.5 items-center justify-center shadow-xs border border-gray-200 active:bg-gray-50"
                activeOpacity={0.8}
              >
                <Text className="text-gray-800 font-bold text-base">
                  Not Now
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      ) : activeView === "TAG_PEOPLE" ? (
        /* 4. TAG AND COLLABORATE VIEW */
        <View className="flex-1 bg-gray-50 h-full w-full relative">
          {/* Header Section */}
          <View className="flex-row items-center pt-3 pb-3 px-5 bg-gray-50">
            <TouchableOpacity
              onPress={() => setActiveView("POST_FORM")}
              className="p-1 -ml-2 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900 flex-1 text-center mr-6">
              Tag and collaborate
            </Text>
          </View>

          {/* Tagged People Preview (Horizontal Scroll) */}
          {taggedUserIds.length > 0 && (
            <View className="mb-2">
              <Text className="text-sm font-medium text-gray-700 px-5 mb-3">
                Tagged People ({taggedUserIds.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-5"
              >
                {taggedUserIds.map((userId) => {
                  const user = MOCK_FRIENDS.find((f) => f.id === userId);
                  if (!user) return null;

                  return (
                    <View key={user.id} className="items-center mr-4">
                      <View className="bg-gray-300 h-12 w-12 rounded-full mb-1 items-center justify-center overflow-hidden border border-gray-200">
                        <Ionicons name="person" size={24} color="#FFFFFF" />
                      </View>
                      <Text className="text-xs text-gray-700 font-medium">
                        {user.firstName}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search Bar */}
          <View className="bg-white rounded-2xl flex-row items-center px-4 py-2.5 mx-5 my-3 border border-gray-200 shadow-xs">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-base text-gray-800 p-0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* User List (Vertical Mapping) */}
          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {filteredFriends.map((friend) => {
              const isSelected = taggedUserIds.includes(friend.id);

              return (
                <TouchableOpacity
                  key={friend.id}
                  onPress={() => toggleTagUser(friend.id)}
                  className="flex-row items-center bg-white rounded-2xl mb-2.5 p-3 shadow-xs border border-gray-100 active:opacity-80"
                  activeOpacity={0.7}
                >
                  {/* Left (Avatar) */}
                  <View className="bg-gray-300 h-12 w-12 rounded-full mr-3 items-center justify-center overflow-hidden border border-gray-200">
                    <Ionicons name="person" size={24} color="#FFFFFF" />
                  </View>

                  {/* Middle (Info) */}
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800">
                      {friend.fullName}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Friend</Text>
                  </View>

                  {/* Right (Checkbox) */}
                  <View
                    className={`h-6 w-6 rounded-md items-center justify-center ${
                      isSelected
                        ? "bg-[#72AF5B]"
                        : "border border-[#72AF5B] bg-white"
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bottom Finished Action Button */}
          <View className="absolute bottom-0 left-0 right-0 p-5 bg-gray-50 border-t border-gray-200/60">
            <TouchableOpacity
              onPress={() => setActiveView("POST_FORM")}
              className="w-full bg-[#72AF5B] rounded-xl py-3.5 items-center justify-center active:opacity-80 shadow-sm"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-base">Finished</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : activeView === "PHOTO_GALLERY" ? (
        /* 5. MULTI-PHOTO GALLERY VIEW */
        <View className="flex-1 bg-white h-full w-full relative">
          {/* Header Section */}
          <View className="flex-row justify-between items-center pt-3 pb-3 px-5 bg-white border-b border-gray-100">
            <TouchableOpacity
              onPress={() => setActiveView("POST_FORM")}
              className="p-1 -ml-2 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Close gallery"
            >
              <Ionicons name="close" size={28} color="#374151" />
            </TouchableOpacity>

            <Text className="text-lg font-semibold text-gray-900">Gallery</Text>

            {/* Top Right Done / Camera Button */}
            {selectedPhotos.length > 0 ? (
              <TouchableOpacity
                onPress={() => setActiveView("POST_FORM")}
                className="bg-[#72AF5B] px-3.5 py-1.5 rounded-full active:opacity-80 shadow-xs"
              >
                <Text className="text-white font-bold text-xs">
                  Next ({selectedPhotos.length})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setActiveView("CAMERA")}
                className="p-1 -mr-2 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Open camera"
              >
                <Ionicons name="camera-outline" size={26} color="#374151" />
              </TouchableOpacity>
            )}
          </View>

          {/* Helper Subheader */}
          <View className="px-5 py-2.5 flex-row justify-between items-center bg-gray-50/80 border-b border-gray-100">
            <Text className="text-xs font-medium text-gray-600">
              Tap images to select multiple ({selectedPhotos.length} selected)
            </Text>
            {selectedPhotos.length > 0 && (
              <TouchableOpacity
                onPress={() => setSelectedPhotos([])}
                className="active:opacity-70"
              >
                <Text className="text-xs font-semibold text-[#72AF5B]">
                  Clear all
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Photo Grid (2-Column Layout) */}
          <ScrollView
            className="flex-1 px-3 pt-3"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
          >
            <View className="flex-row flex-wrap justify-between">
              {MOCK_GALLERY_IMAGES.map((imgUri, index) => {
                const isSelected = selectedPhotos.includes(imgUri);
                const selectedIndex = selectedPhotos.indexOf(imgUri) + 1;
                const itemHeight =
                  index % 3 === 0 ? 230 : index % 2 === 0 ? 190 : 210;

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleSelectPhoto(imgUri)}
                    className={`w-[48.5%] mb-3 rounded-xl overflow-hidden relative shadow-xs border ${
                      isSelected
                        ? "border-2 border-[#72AF5B]"
                        : "border-gray-200"
                    } active:opacity-90`}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: imgUri }}
                      style={{ width: "100%", height: itemHeight }}
                      resizeMode="cover"
                    />

                    {/* Dark overlay when selected */}
                    {isSelected && (
                      <View className="absolute inset-0 bg-black/20" />
                    )}

                    {/* Selection Badge (Top-Right) */}
                    <View className="absolute top-2.5 right-2.5">
                      {isSelected ? (
                        <View className="w-6 h-6 rounded-full bg-[#72AF5B] items-center justify-center border-2 border-white shadow-sm">
                          <Text className="text-white text-xs font-bold">
                            {selectedIndex}
                          </Text>
                        </View>
                      ) : (
                        <View className="w-6 h-6 rounded-full bg-black/35 border-2 border-white/90 items-center justify-center shadow-xs" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Docked 'Add Photos' Button */}
          {selectedPhotos.length > 0 && (
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 border-t border-gray-200/80 shadow-lg">
              <TouchableOpacity
                onPress={() => setActiveView("POST_FORM")}
                className="w-full bg-[#72AF5B] py-3.5 rounded-xl flex-row items-center justify-center active:opacity-80 shadow-sm"
                activeOpacity={0.8}
              >
                <Ionicons name="images" size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-base ml-2">
                  Add {selectedPhotos.length}{" "}
                  {selectedPhotos.length === 1 ? "Photo" : "Photos"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : activeView === "CAMERA" ? (
        /* 6. CAMERA SCREEN VIEW */
        <View className="flex-1 bg-black h-full w-full justify-between relative">
          {/* Top Controls Bar */}
          <View className="flex-row justify-between items-center pt-5 pb-3 px-5 z-20 absolute top-0 w-full bg-black/30">
            {/* Close 'X' Button */}
            <TouchableOpacity
              onPress={() => setActiveView("POST_FORM")}
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Close camera"
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Flash Toggle Button */}
            <TouchableOpacity
              onPress={() => setFlashMode((prev) => !prev)}
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Toggle flash"
            >
              <Ionicons
                name={flashMode ? "flash" : "flash-off-outline"}
                size={28}
                color={flashMode ? "#FACC15" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>

          {/* Viewfinder Area (Mock) */}
          <View className="flex-1 items-center justify-center relative">
            {/* Faint Viewfinder Frame */}
            <View className="w-[85%] h-[65%] border border-white/20 rounded-3xl relative items-center justify-center">
              {/* Corner framing brackets */}
              <View className="w-10 h-10 border-t-2 border-l-2 border-white/70 absolute top-0 left-0 rounded-tl-2xl" />
              <View className="w-10 h-10 border-t-2 border-r-2 border-white/70 absolute top-0 right-0 rounded-tr-2xl" />
              <View className="w-10 h-10 border-b-2 border-l-2 border-white/70 absolute bottom-0 left-0 rounded-bl-2xl" />
              <View className="w-10 h-10 border-b-2 border-r-2 border-white/70 absolute bottom-0 right-0 rounded-br-2xl" />

              {/* Center Focus Reticle */}
              <View className="w-16 h-16 border border-white/30 rounded-full items-center justify-center">
                <View className="w-2.5 h-2.5 bg-white/60 rounded-full" />
              </View>

              <Text className="text-white/40 text-xs font-medium mt-6">
                {isFrontCamera ? "Front Camera" : "Back Camera"}
              </Text>
            </View>
          </View>

          {/* Bottom Controls Bar */}
          <View className="absolute bottom-0 w-full pb-10 pt-5 px-8 flex-row justify-between items-center bg-black/50 z-20">
            {/* Left (Gallery Shortcut) */}
            <TouchableOpacity
              onPress={() => setActiveView("PHOTO_GALLERY")}
              className="w-12 h-12 bg-gray-800 rounded-md border border-white/50 overflow-hidden items-center justify-center active:opacity-75"
              activeOpacity={0.75}
            >
              {selectedPhotos.length > 0 ? (
                <Image
                  source={{ uri: selectedPhotos[selectedPhotos.length - 1] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="images-outline" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {/* Center (Capture Button) */}
            <TouchableOpacity
              onPress={handleCapturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white items-center justify-center active:scale-95"
              activeOpacity={0.8}
            >
              <View className="w-16 h-16 bg-white rounded-full" />
            </TouchableOpacity>

            {/* Right (Flip Camera) */}
            <TouchableOpacity
              onPress={() => setIsFrontCamera((prev) => !prev)}
              className="p-1 active:opacity-75"
              activeOpacity={0.75}
            >
              <Ionicons
                name="camera-reverse-outline"
                size={32}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* 7. ADD LOCATION VIEW (Leaflet Map) */
        <View className="flex-1 bg-white h-full w-full relative">
          {/* Header Section */}
          <View className="flex-row items-center pt-3 pb-3 px-5 bg-white z-10 border-b border-gray-100">
            <TouchableOpacity
              onPress={() => setActiveView("POST_FORM")}
              className="p-1 -ml-2 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900 flex-1 text-center mr-6">
              Add Location
            </Text>
          </View>

          {/* Map Container */}
          <View className="flex-1 relative overflow-hidden">
            <LeafletMap
              latitude={ILIGAN_REGION.latitude}
              longitude={ILIGAN_REGION.longitude}
              zoom={14}
              popupImage="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80"
            />

            {/* Floating Top Search Bar */}
            <View className="absolute top-4 left-5 right-5 z-20">
              <View className="bg-white border border-[#72AF5B] rounded-full flex-row items-center px-4 py-2 shadow-sm">
                <TextInput
                  value={locationSearch}
                  onChangeText={setLocationSearch}
                  placeholder="Current Location"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-base text-gray-700 p-0"
                />
                <Ionicons name="search-outline" size={20} color="#6B7280" />
              </View>
            </View>

            {/* Floating Bottom Info Card with Select & Cancel Location Buttons */}
            <View className="absolute bottom-6 left-5 right-5 z-20 bg-[#f8f9fa] rounded-2xl p-4 shadow-xl border border-white/10">
              <View className="mb-3">
                <Text className="text-base font-bold text-[#000000] mb-1">
                  {locationSearch || "Current Location"}
                </Text>
                <Text className="text-xs text-[#000000] leading-4">
                  Your selected location will be attached to your post and
                  visible to your community.
                </Text>
              </View>
              {/* Action Buttons Row */}
              <View className="flex-row justify-end gap-2.5 pt-1">
                {/* Cancel Location Button */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedLocation(null);
                    setActiveView("POST_FORM");
                  }}
                  className="bg-gray-100 px-4 py-2.5 rounded-xl border border-[#72AF5B] items-center justify-center active:bg-white/25"
                  activeOpacity={0.7}
                >
                  <Text className="text-[#000000] font-semibold text-xs">
                    Cancel Location
                  </Text>
                </TouchableOpacity>

                {/* Select Location Button */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedLocation(locationSearch || "Iligan City");
                    setActiveView("POST_FORM");
                  }}
                  className="bg-[#72AF5B] px-5 py-2.5 rounded-xl items-center justify-center active:opacity-80 shadow-sm"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-xs">
                    Select Location
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
