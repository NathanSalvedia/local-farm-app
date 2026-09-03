import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import {
  getSavedPostsApi,
  getSavedCollectionsApi,
  SavedPostItem,
  toggleSavePostApi,
} from "@/services/post-service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SavedPosts() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [savedPosts, setSavedPosts] = useState<SavedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected post for 3-dots action menu
  const [selectedPost, setSelectedPost] = useState<SavedPostItem | null>(null);
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);

  // Collection modal state
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [selectedPostForCollection, setSelectedPostForCollection] = useState<SavedPostItem | null>(null);
  const [collections, setCollections] = useState<string[]>(["All Saved"]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const fetchCollections = async () => {
    try {
      const data = await getSavedCollectionsApi();
      setCollections(data);
    } catch (err) {
      console.warn("Failed to fetch collections:", err);
    }
  };

  const fetchSavedPosts = async () => {
    try {
      const data = await getSavedPostsApi();
      setSavedPosts(data);
    } catch (err: any) {
      console.warn("Failed to fetch saved posts:", err);
      showToast(err?.message || "Failed to load saved posts.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
    fetchCollections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSavedPosts();
  };

  const handleUnsave = async (postId: string) => {
    try {
      const res = await toggleSavePostApi(postId);
      if (!res.isSaved) {
        setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
        showToast("Removed from saved posts.", "info");
      }
      setIsActionMenuVisible(false);
      setSelectedPost(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to unsave post.", "error");
    }
  };

  const handleOpenCollectionModal = (post: SavedPostItem) => {
    setSelectedPostForCollection(post);
    setIsCollectionModalVisible(true);
  };

  const handleSaveToCollection = async (collection: string) => {
    if (!selectedPostForCollection) return;
    try {
      await toggleSavePostApi(selectedPostForCollection.id, collection);
      setSavedPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPostForCollection.id
            ? { ...p, collectionName: collection }
            : p
        )
      );
      showToast(`Added to "${collection}"!`, "success");
      setIsCollectionModalVisible(false);
      setSelectedPostForCollection(null);
      fetchCollections();
    } catch (err: any) {
      showToast(err?.message || "Failed to update collection.", "error");
    }
  };

  const handleCreateNewCollection = () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;
    if (!collections.includes(trimmed)) {
      setCollections((prev) => [...prev, trimmed]);
    }
    if (selectedPostForCollection) {
      handleSaveToCollection(trimmed);
    }
    setNewCollectionName("");
    setIsCreatingCollection(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white shadow-xs">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/user/MenuProfile" as any);
            }
          }}
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-undo" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-gray-900">Saved</Text>

        <View className="w-8" />
      </View>

      {/* Section Subheader */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">All</Text>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 px-4 py-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#72AF5B"]}
            tintColor="#72AF5B"
          />
        }
      >
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#72AF5B" />
            <Text className="text-gray-500 text-sm mt-3 font-medium">
              Loading saved posts...
            </Text>
          </View>
        ) : savedPosts.length === 0 ? (
          <View className="py-16 items-center justify-center px-6">
            <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-4">
              <Ionicons name="bookmark-outline" size={40} color="#72AF5B" />
            </View>
            <Text className="text-lg font-bold text-gray-900 text-center mb-1">
              No Saved Posts
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
              Posts and updates you save will appear here in your cards list.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/user/NewsFeed" as any)}
              className="bg-[#72AF5B] px-6 py-3 rounded-full flex-row items-center active:opacity-80 shadow-sm"
            >
              <Ionicons
                name="newspaper-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text className="text-white font-bold text-sm">
                Explore Feed
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {savedPosts.map((post) => {
              // Determine thumbnail image
              const thumbnailUri =
                post.imageUrl ||
                post.originalPost?.imageUrl ||
                post.avatarUri ||
                null;

              // Determine display title
              const displayTitle =
                post.content && post.content.trim().length > 0
                  ? post.content.length > 45
                    ? post.content.substring(0, 45).trim() + "..."
                    : post.content.trim()
                  : `${post.authorName}'s Post`;

              return (
                <View
                  key={post.savedId || post.id}
                  className="bg-white rounded-2xl p-3 shadow-sm flex-row"
                >
                  {/* Left Column: Media Thumbnail */}
                  <View className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden mr-3.5 relative items-center justify-center">
                    {thumbnailUri ? (
                      <Image
                        source={{ uri: thumbnailUri }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full bg-green-50 items-center justify-center">
                        <Ionicons name="leaf-outline" size={32} color="#72AF5B" />
                      </View>
                    )}

                    {/* Badge on bottom of thumbnail if shared */}
                    {post.isShared && (
                      <View className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
                        <Ionicons name="arrow-redo" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  {/* Right Column: Details & Actions */}
                  <View className="flex-1 justify-between py-0.5">
                    {/* Top Text Info */}
                    <View>
                      {/* Post Title */}
                      <Text
                        className="text-base font-bold text-gray-900 leading-5 mb-0.5"
                        numberOfLines={2}
                      >
                        {displayTitle}
                      </Text>

                      {/* Subtitle / Category */}
                      <Text className="text-xs text-gray-500 mb-1.5 font-medium">
                        Post • {post.category || post.authorRole || "General"}
                      </Text>

                      {/* Author Source Row */}
                      <View className="flex-row items-center">
                        <View className="w-4 h-4 rounded-full bg-gray-200 overflow-hidden mr-1.5 items-center justify-center">
                          {post.avatarUri ? (
                            <Image
                              source={{ uri: post.avatarUri }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="person" size={10} color="#9CA3AF" />
                          )}
                        </View>
                        <Text
                          className="text-xs text-gray-600 flex-1"
                          numberOfLines={1}
                        >
                          Saved from{" "}
                          <Text className="font-semibold text-gray-800">
                            {post.authorName}
                          </Text>
                          's post
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Action Row */}
                    <View className="flex-row items-center gap-2 mt-2">
                      {/* Add to Collection Button */}
                      <TouchableOpacity
                        onPress={() => handleOpenCollectionModal(post)}
                        className="flex-1 bg-gray-100 py-1.5 px-3 rounded-lg items-center justify-center active:bg-gray-200"
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Add to collection"
                      >
                        <Text className="text-xs font-semibold text-gray-800">
                          Add to Collection
                        </Text>
                      </TouchableOpacity>

                      {/* 3-Dots Options Button */}
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedPost(post);
                          setIsActionMenuVisible(true);
                        }}
                        className="w-9 h-8 bg-gray-100 rounded-lg items-center justify-center active:bg-gray-200"
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={18}
                          color="#374151"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 3-Dots Action Sheet Modal */}
      <Modal
        visible={isActionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActionMenuVisible(false)}
      >
        <Pressable
          onPress={() => setIsActionMenuVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
          >
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />

            <Text className="text-base font-bold text-gray-900 mb-3 px-1">
              Saved Post Options
            </Text>

            <View className="gap-1">
              {/* Add to Collection */}
              <TouchableOpacity
                onPress={() => {
                  setIsActionMenuVisible(false);
                  if (selectedPost) handleOpenCollectionModal(selectedPost);
                }}
                className="flex-row items-center py-3 px-2 rounded-xl active:bg-gray-100"
              >
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                  <Ionicons name="folder-outline" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    Add to Collection
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Organize into custom folders
                  </Text>
                </View>
              </TouchableOpacity>

              {/* View in Feed */}
              <TouchableOpacity
                onPress={() => {
                  setIsActionMenuVisible(false);
                  router.push("/user/NewsFeed" as any);
                }}
                className="flex-row items-center py-3 px-2 rounded-xl active:bg-gray-100"
              >
                <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                  <Ionicons name="newspaper-outline" size={20} color="#72AF5B" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    View in Feed
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Go to community newsfeed
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Unsave / Remove from Saved */}
              <TouchableOpacity
                onPress={() => {
                  if (selectedPost) handleUnsave(selectedPost.id);
                }}
                className="flex-row items-center py-3 px-2 rounded-xl active:bg-red-50"
              >
                <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-3">
                  <Ionicons name="bookmark" size={20} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-red-600">
                    Unsave Post
                  </Text>
                  <Text className="text-xs text-red-400">
                    Remove this item from your saved list
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setIsActionMenuVisible(false)}
              className="mt-3 py-3 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add to Collection Modal */}
      <Modal
        visible={isCollectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCollectionModalVisible(false)}
      >
        <Pressable
          onPress={() => setIsCollectionModalVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
          >
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />

            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-base font-bold text-gray-900">
                Add to Collection
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreatingCollection(true)}
                className="flex-row items-center"
              >
                <Ionicons name="add" size={18} color="#72AF5B" />
                <Text className="text-xs font-bold text-[#72AF5B] ml-1">
                  New Collection
                </Text>
              </TouchableOpacity>
            </View>

            {isCreatingCollection && (
              <View className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <TextInput
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  placeholder="Collection name (e.g. Favorite Produce)"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                  className="bg-white px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 mb-2"
                />
                <View className="flex-row justify-end gap-2">
                  <TouchableOpacity
                    onPress={() => setIsCreatingCollection(false)}
                    className="px-3 py-1.5 rounded-lg bg-gray-200"
                  >
                    <Text className="text-xs font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateNewCollection}
                    disabled={!newCollectionName.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-[#72AF5B]"
                  >
                    <Text className="text-xs font-bold text-white">Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View className="gap-2 mb-3">
              {collections.map((col) => {
                const isSelected =
                  selectedPostForCollection?.collectionName === col;

                return (
                  <TouchableOpacity
                    key={col}
                    onPress={() => handleSaveToCollection(col)}
                    className={`flex-row items-center justify-between p-3 rounded-xl border ${
                      isSelected
                        ? "bg-green-50/70 border-[#72AF5B]"
                        : "bg-gray-50 border-gray-200"
                    } active:opacity-80`}
                  >
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-white items-center justify-center mr-3 border border-gray-100">
                        <Ionicons
                          name="folder"
                          size={16}
                          color={isSelected ? "#72AF5B" : "#6B7280"}
                        />
                      </View>
                      <Text className="text-sm font-semibold text-gray-900">
                        {col}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#72AF5B"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setIsCollectionModalVisible(false)}
              className="mt-2 py-3 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-700">Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
