import { useToast } from "@/context/toast-context";
import {
  createSavedCollectionApi,
  deleteSavedCollectionApi,
  getSavedCollectionsApi,
  getSavedPostsApi,
  renameSavedCollectionApi,
  SavedPostItem,
  toggleSavePostApi,
} from "@/services/post-service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SaveToCollectionModal from "@/components/SaveToCollectionModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 1.5;
const NUM_COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

const COLLECTION_PADDING = 16;
const COLLECTION_GAP = 12;
const COLLECTION_CARD_WIDTH =
  (SCREEN_WIDTH - COLLECTION_PADDING * 2 - COLLECTION_GAP) / 2;

export default function SavedPosts() {
  const router = useRouter();
  const { showToast } = useToast();

  const [savedPosts, setSavedPosts] = useState<SavedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active view: 'collections' (2-column folders) or 'grid' (3-column photo grid)
  const [activeTab, setActiveTab] = useState<"collections" | "grid">("collections");
  // Currently opened collection in grid view (null means All Posts)
  const [activeCollectionName, setActiveCollectionName] = useState<string | null>(null);

  // Collections list from API
  const [collections, setCollections] = useState<string[]>(["All Saved"]);

  // Modals
  const [isCreateCollectionVisible, setIsCreateCollectionVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<SavedPostItem | null>(null);
  const [selectedPostForFolder, setSelectedPostForFolder] = useState<SavedPostItem | null>(null);
  const [isFolderPickerVisible, setIsFolderPickerVisible] = useState(false);
  const [collectionMenuTarget, setCollectionMenuTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const loadData = async () => {
    try {
      const [postsData, collectionsData] = await Promise.all([
        getSavedPostsApi(),
        getSavedCollectionsApi(),
      ]);
      setSavedPosts(postsData);
      setCollections(collectionsData);
    } catch (err: any) {
      console.warn("Failed to load saved posts:", err);
      showToast(err?.message || "Failed to load saved posts.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const data = await getSavedCollectionsApi();
      setCollections(data);
    } catch (err) {
      console.log("Failed to fetch collections:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getSavedPostsApi(), getSavedCollectionsApi()])
      .then(([postsData, collectionsData]) => {
        if (isMounted) {
          setSavedPosts(postsData);
          setCollections(collectionsData);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.warn("Failed to load saved posts:", err);
          showToast(err?.message || "Failed to load saved posts.", "error");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUnsave = async (postId: string) => {
    try {
      const res = await toggleSavePostApi(postId);
      if (!res.isSaved) {
        setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
        showToast("Removed from Saved", "info");
      }
      if (selectedPostForDetail?.id === postId) {
        setSelectedPostForDetail(null);
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to unsave post.", "error");
    }
  };

  const handleSaveToCollection = async (collection: string) => {
    if (!selectedPostForFolder) return;
    try {
      await toggleSavePostApi(selectedPostForFolder.id, collection);
      setSavedPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPostForFolder.id
            ? { ...p, collectionName: collection }
            : p
        )
      );
      if (selectedPostForDetail?.id === selectedPostForFolder.id) {
        setSelectedPostForDetail((prev) =>
          prev ? { ...prev, collectionName: collection } : null
        );
      }
      showToast(`Saved to "${collection}"`, "success");
      setIsFolderPickerVisible(false);
      setSelectedPostForFolder(null);
      fetchCollections();
    } catch (err: any) {
      showToast(err?.message || "Failed to update collection.", "error");
    }
  };

  const handleCreateCollection = async () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;
    try {
      await createSavedCollectionApi(trimmed, selectedPostForFolder?.id);
      if (!collections.includes(trimmed)) {
        setCollections((prev) => [...prev, trimmed]);
      }
      if (selectedPostForFolder) {
        setSavedPosts((prev) =>
          prev.map((p) =>
            p.id === selectedPostForFolder.id
              ? { ...p, collectionName: trimmed }
              : p
          )
        );
        showToast(`Saved to "${trimmed}"`, "success");
      } else {
        showToast(`Collection "${trimmed}" created`, "success");
      }
      setNewCollectionName("");
      setIsCreateCollectionVisible(false);
      setSelectedPostForFolder(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to create collection", "error");
    }
  };

  const handleConfirmRename = async () => {
    if (!renameTarget || !renameInput.trim()) return;
    const trimmed = renameInput.trim();
    if (trimmed.toLowerCase() === renameTarget.toLowerCase()) {
      setRenameTarget(null);
      return;
    }
    setIsRenaming(true);
    try {
      await renameSavedCollectionApi(renameTarget, trimmed);
      showToast(`Collection renamed to "${trimmed}"`, "success");
      if (activeCollectionName === renameTarget) {
        setActiveCollectionName(trimmed);
      }
      setRenameTarget(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to rename collection", "error");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteCollection = (name: string) => {
    setCollectionMenuTarget(null);
    const executeDelete = async () => {
      try {
        await deleteSavedCollectionApi(name);
        showToast(`Collection "${name}" deleted. Posts moved to All Saved.`, "info");
        if (activeCollectionName === name) {
          setActiveCollectionName(null);
          setActiveTab("collections");
        }
        await loadData();
      } catch (err: any) {
        showToast(err?.message || "Failed to delete collection", "error");
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          `Delete "${name}"?\nPosts in this collection will not be deleted and will remain in All Saved.`
        )
      ) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Delete Collection?",
        `Posts in "${name}" will still be kept in All Saved.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ]
      );
    }
  };

  // Extract distinct collection names
  const allCollectionNames = useMemo(() => {
    const set = new Set<string>();
    collections.forEach((c) => {
      if (c && c !== "All Saved") set.add(c);
    });
    savedPosts.forEach((p) => {
      if (p.collectionName && p.collectionName !== "All Saved") {
        set.add(p.collectionName);
      }
    });
    return Array.from(set);
  }, [collections, savedPosts]);

  // Posts filtered by collection (if in grid view) and search
  const visiblePosts = useMemo(() => {
    return savedPosts.filter((post) => {
      if (activeCollectionName) {
        const pCol = (post.collectionName || "All Saved").toLowerCase();
        if (pCol !== activeCollectionName.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const cMatch = (post.content || "").toLowerCase().includes(q);
        const aMatch = (post.authorName || "").toLowerCase().includes(q);
        const rMatch = (post.authorRole || "").toLowerCase().includes(q);
        const catMatch = (post.category || "").toLowerCase().includes(q);
        return cMatch || aMatch || rMatch || catMatch;
      }

      return true;
    });
  }, [savedPosts, activeCollectionName, searchQuery]);

  // Helper to get preview images for collection collage
  const getCollectionPreviewImages = (colName: string | null): string[] => {
    const matching = savedPosts.filter((p) => {
      if (!colName) return true;
      return (p.collectionName || "All Saved").toLowerCase() === colName.toLowerCase();
    });

    const urls: string[] = [];
    matching.forEach((p) => {
      const url = p.imageUrl || p.originalPost?.imageUrl || p.avatarUri;
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    });
    return urls.slice(0, 4);
  };

  // Helper for quad collage preview
  const renderCollageCover = (imageUrls: string[], size: number) => {
    if (imageUrls.length === 0) {
      return (
        <View
          style={{ width: size, height: size }}
          className="bg-[#FAFAFA] items-center justify-center rounded-lg border border-gray-200"
        >
          <Ionicons name="bookmark-outline" size={36} color="#DBDBDB" />
        </View>
      );
    }

    if (imageUrls.length < 4) {
      return (
        <Image
          source={{ uri: imageUrls[0] }}
          style={{ width: size, height: size, borderRadius: 8 }}
          resizeMode="cover"
        />
      );
    }

    // 2x2 Collage (Instagram signature look)
    const half = (size - 1) / 2;
    return (
      <View
        style={{ width: size, height: size, borderRadius: 8 }}
        className="overflow-hidden bg-gray-100 flex-row flex-wrap gap-[1px]"
      >
        {imageUrls.slice(0, 4).map((url, idx) => (
          <Image
            key={idx}
            source={{ uri: url }}
            style={{ width: half, height: half }}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* 1. Instagram Saved Header */}
      <View className="px-4 py-2.5 bg-white border-b border-gray-200 flex-row items-center justify-between z-10">
        <TouchableOpacity
          onPress={() => {
            if (activeCollectionName) {
              setActiveCollectionName(null);
            } else if (activeTab === "grid") {
              setActiveTab("collections");
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/user/MenuProfile" as any);
            }
          }}
          className="p-1 -ml-1 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="#000000" />
        </TouchableOpacity>

        {/* Header Title */}
        <Text className="text-base font-bold text-gray-900 tracking-tight">
          {activeCollectionName ? activeCollectionName : "Saved"}
        </Text>

        {/* Right Action Icons: Search & + New Collection & Options */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => setIsSearchOpen((prev) => !prev)}
            className="p-1 active:opacity-60"
            accessibilityLabel="Search saved posts"
          >
            <Ionicons
              name={isSearchOpen ? "close" : "search-outline"}
              size={22}
              color="#000000"
            />
          </TouchableOpacity>

          {Boolean(
            activeCollectionName &&
              activeCollectionName.toLowerCase() !== "all saved"
          ) && (
            <TouchableOpacity
              onPress={() => setCollectionMenuTarget(activeCollectionName)}
              className="p-1 active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel="Collection options"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#000000" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              setSelectedPostForFolder(null);
              setIsCreateCollectionVisible(true);
            }}
            className="p-1 active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Create collection"
          >
            <Ionicons name="add" size={28} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar (Dropdown when active) */}
      {isSearchOpen && (
        <View className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <View className="flex-row items-center bg-gray-200/70 rounded-lg px-3 h-9">
            <Ionicons name="search" size={16} color="#8E8E8E" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search saved posts..."
              placeholderTextColor="#8E8E8E"
              autoFocus
              className="flex-1 text-sm text-gray-900 ml-2 pr-2 h-full font-normal"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#8E8E8E" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* 2. Instagram Tab Switcher (Collections vs All Posts) */}
      {!activeCollectionName && (
        <View className="flex-row border-b border-gray-200 bg-white">
          <TouchableOpacity
            onPress={() => setActiveTab("collections")}
            className={`flex-1 py-3 items-center justify-center border-b-2 ${
              activeTab === "collections"
                ? "border-black"
                : "border-transparent"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-sm font-semibold tracking-wide ${
                activeTab === "collections" ? "text-black" : "text-gray-400"
              }`}
            >
              Collections
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("grid")}
            className={`flex-1 py-3 items-center justify-center border-b-2 ${
              activeTab === "grid"
                ? "border-black"
                : "border-transparent"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-sm font-semibold tracking-wide ${
                activeTab === "grid" ? "text-black" : "text-gray-400"
              }`}
            >
              All Posts
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Privacy Hint Notice (Signature Instagram element) */}
      <View className="px-4 py-2 bg-white flex-row items-center justify-center">
        <Ionicons name="lock-closed" size={11} color="#737373" />
        <Text className="text-[11px] text-[#737373] ml-1 font-normal">
          Only you can see what you&apos;ve saved
        </Text>
      </View>

      {/* 4. Main Content Area */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000000"]}
            tintColor="#000000"
          />
        }
      >
        {loading ? (
          <View className="py-28 items-center justify-center">
            <ActivityIndicator size="small" color="#000000" />
          </View>
        ) : savedPosts.length === 0 ? (
          /* Empty State */
          <View className="py-24 items-center justify-center px-8">
            <View className="w-20 h-20 rounded-full border-2 border-black items-center justify-center mb-5">
              <Ionicons name="bookmark-outline" size={38} color="#000000" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Save Posts
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
              Save photos and updates from local growers and farmers to your collections.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/user/NewsFeed" as any)}
              className="bg-black px-6 py-2.5 rounded-lg active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">
                Explore Feed
              </Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === "collections" && !activeCollectionName ? (
          /* COLLECTIONS VIEW: 2-Column Square Cards */
          <View className="p-4">
            <View className="flex-row flex-wrap gap-3">
              {/* Card 1: All Posts Collection */}
              <TouchableOpacity
                onPress={() => {
                  setActiveCollectionName(null);
                  setActiveTab("grid");
                }}
                style={{ width: COLLECTION_CARD_WIDTH }}
                className="active:opacity-85"
              >
                {renderCollageCover(
                  getCollectionPreviewImages(null),
                  COLLECTION_CARD_WIDTH
                )}
                <View className="mt-2 px-0.5">
                  <Text
                    className="text-sm font-semibold text-gray-900"
                    numberOfLines={1}
                  >
                    All Posts
                  </Text>
                  <Text className="text-xs text-gray-500 font-normal mt-0.5">
                    {savedPosts.length} {savedPosts.length === 1 ? "post" : "posts"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* User Collections */}
              {allCollectionNames.map((colName) => {
                const count = savedPosts.filter(
                  (p) =>
                    (p.collectionName || "All Saved").toLowerCase() ===
                    colName.toLowerCase()
                ).length;
                const previewImgs = getCollectionPreviewImages(colName);

                return (
                  <TouchableOpacity
                    key={colName}
                    onPress={() => {
                      setActiveCollectionName(colName);
                      setActiveTab("grid");
                    }}
                    style={{ width: COLLECTION_CARD_WIDTH }}
                    className="active:opacity-85"
                  >
                    {renderCollageCover(previewImgs, COLLECTION_CARD_WIDTH)}
                    <View className="mt-2 px-0.5 flex-row items-center justify-between">
                      <View className="flex-1 mr-1">
                        <Text
                          className="text-sm font-semibold text-gray-900"
                          numberOfLines={1}
                        >
                          {colName}
                        </Text>
                        <Text className="text-xs text-gray-500 font-normal mt-0.5">
                          {count} {count === 1 ? "post" : "posts"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setCollectionMenuTarget(colName);
                        }}
                        className="p-1 -mr-1 rounded-full active:bg-gray-100"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={15}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Card 3: "+ New Collection" Placeholder Tile */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedPostForFolder(null);
                  setIsCreateCollectionVisible(true);
                }}
                style={{
                  width: COLLECTION_CARD_WIDTH,
                  height: COLLECTION_CARD_WIDTH,
                }}
                className="border border-dashed border-gray-300 rounded-lg items-center justify-center bg-gray-50 active:bg-gray-100"
              >
                <Ionicons name="add-circle-outline" size={32} color="#8E8E8E" />
                <Text className="text-xs font-semibold text-gray-600 mt-2">
                  New Collection
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* GRID VIEW: Instagram 3-Column Square Photo Grid */
          <View>
            {visiblePosts.length === 0 ? (
              <View className="py-24 items-center justify-center px-6">
                <Ionicons name="images-outline" size={44} color="#C7C7C7" />
                <Text className="text-base font-semibold text-gray-800 mt-3 mb-1">
                  No Posts Saved
                </Text>
                <Text className="text-xs text-gray-500 text-center max-w-xs">
                  {searchQuery
                    ? `No matches for "${searchQuery}".`
                    : "Bookmark posts to see them in this collection."}
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap">
                {visiblePosts.map((post, index) => {
                  const mediaUri =
                    post.imageUrl ||
                    post.originalPost?.imageUrl ||
                    post.avatarUri ||
                    null;

                  // Determine right margin for 3-column grid alignment
                  const isRightEdge = (index + 1) % NUM_COLUMNS === 0;

                  return (
                    <TouchableOpacity
                      key={post.savedId || post.id}
                      activeOpacity={0.88}
                      onPress={() => setSelectedPostForDetail(post)}
                      style={{
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        marginRight: isRightEdge ? 0 : GRID_GAP,
                        marginBottom: GRID_GAP,
                      }}
                      className="bg-gray-100 relative overflow-hidden"
                    >
                      {mediaUri ? (
                        <Image
                          source={{ uri: mediaUri }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        /* Text Post Fallback Tile */
                        <View className="w-full h-full bg-[#FAFAFA] p-2 justify-between border border-gray-100">
                          <Text
                            className="text-[10px] text-gray-800 leading-3 font-medium"
                            numberOfLines={4}
                          >
                            {post.content || "Post update"}
                          </Text>
                          <Text
                            className="text-[9px] text-gray-400 font-semibold"
                            numberOfLines={1}
                          >
                            @{post.authorName}
                          </Text>
                        </View>
                      )}

                      {/* Top-Right Badge: Shared Post Indicator */}
                      {post.isShared && (
                        <View className="absolute top-1 right-1 bg-black/50 rounded-sm p-0.5">
                          <Ionicons name="arrow-redo" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 5. Instagram-Style Post Detail Modal (When a photo tile is tapped) */}
      <Modal
        visible={!!selectedPostForDetail}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelectedPostForDetail(null)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setSelectedPostForDetail(null)}
              className="p-1 -ml-1 active:opacity-60"
            >
              <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>

            <Text className="text-base font-bold text-gray-900">Post</Text>

            <TouchableOpacity
              onPress={() => {
                if (selectedPostForDetail) {
                  setSelectedPostForFolder(selectedPostForDetail);
                  setIsFolderPickerVisible(true);
                }
              }}
              className="p-1 active:opacity-60"
            >
              <Ionicons name="folder-outline" size={22} color="#000000" />
            </TouchableOpacity>
          </View>

          {selectedPostForDetail && (
            <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
              {/* Author Header */}
              <View className="px-4 py-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden items-center justify-center border border-gray-300/40">
                    {selectedPostForDetail.avatarUri ? (
                      <Image
                        source={{ uri: selectedPostForDetail.avatarUri }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={16} color="#737373" />
                    )}
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-gray-900">
                      {selectedPostForDetail.authorName}
                    </Text>
                    <Text className="text-[11px] text-gray-500">
                      {selectedPostForDetail.location || selectedPostForDetail.authorRole || "Local Farm"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setSelectedPostForFolder(selectedPostForDetail);
                    setIsFolderPickerVisible(true);
                  }}
                  className="p-1 active:opacity-60"
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Main Post Media (Square aspect ratio like Instagram) */}
              {(selectedPostForDetail.imageUrl ||
                selectedPostForDetail.originalPost?.imageUrl) ? (
                <View
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  className="bg-black items-center justify-center"
                >
                  <Image
                    source={{
                      uri:
                        selectedPostForDetail.imageUrl ||
                        selectedPostForDetail.originalPost?.imageUrl,
                    }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Instagram Action Icons Bar */}
              <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-4">
                  <TouchableOpacity
                    onPress={() => router.push("/user/NewsFeed" as any)}
                    className="active:opacity-60"
                  >
                    <Ionicons
                      name={selectedPostForDetail.isLiked ? "heart" : "heart-outline"}
                      size={26}
                      color={selectedPostForDetail.isLiked ? "#ED4956" : "#000000"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPostForDetail(null);
                      router.push("/user/NewsFeed" as any);
                    }}
                    className="active:opacity-60"
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={24}
                      color="#000000"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPostForDetail(null);
                      router.push("/user/NewsFeed" as any);
                    }}
                    className="active:opacity-60"
                  >
                    <Ionicons
                      name="paper-plane-outline"
                      size={24}
                      color="#000000"
                    />
                  </TouchableOpacity>
                </View>

                {/* Bookmark Saved Icon (Active = filled bookmark) */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPostForFolder(selectedPostForDetail);
                    setIsFolderPickerVisible(true);
                  }}
                  className="active:opacity-60"
                  accessibilityLabel="Save to collection"
                >
                  <Ionicons name="bookmark" size={24} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Likes Count */}
              <View className="px-4 mb-1">
                <Text className="text-sm font-bold text-gray-900">
                  {selectedPostForDetail.likes || 0} likes
                </Text>
              </View>

              {/* Caption */}
              <View className="px-4 mb-2">
                <Text className="text-sm text-gray-900 leading-5">
                  <Text className="font-bold">
                    {selectedPostForDetail.authorName}{" "}
                  </Text>
                  {selectedPostForDetail.content}
                </Text>
              </View>

              {/* Comments & Timestamp */}
              <View className="px-4 pb-8">
                {selectedPostForDetail.comments > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPostForDetail(null);
                      router.push("/user/NewsFeed" as any);
                    }}
                    className="mb-1.5"
                  >
                    <Text className="text-xs text-gray-500">
                      View all {selectedPostForDetail.comments} comments
                    </Text>
                  </TouchableOpacity>
                )}
                <Text className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {selectedPostForDetail.timeAgo} • Saved in{" "}
                  {selectedPostForDetail.collectionName || "All Saved"}
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* 6. Instagram-Style "New Collection" Modal */}
      <Modal
        visible={isCreateCollectionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateCollectionVisible(false)}
      >
        <Pressable
          onPress={() => setIsCreateCollectionVisible(false)}
          className="flex-1 bg-black/60 items-center justify-center p-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl items-center"
          >
            <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-3">
              <Ionicons name="folder-outline" size={26} color="#000000" />
            </View>

            <Text className="text-base font-bold text-gray-900 text-center mb-1">
              New Collection
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-4">
              Give your collection a memorable name
            </Text>

            <TextInput
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="Collection name"
              placeholderTextColor="#8E8E8E"
              autoFocus
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 mb-5 border border-gray-200"
            />

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => {
                  setNewCollectionName("");
                  setIsCreateCollectionVisible(false);
                }}
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className={`flex-1 py-3 rounded-xl items-center justify-center ${
                  newCollectionName.trim()
                    ? "bg-[#0095F6] active:bg-[#0081D6]"
                    : "bg-[#0095F6]/50"
                }`}
              >
                <Text className="text-sm font-bold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 7. Instagram Save to Collection Modal */}
      <SaveToCollectionModal
        visible={isFolderPickerVisible && selectedPostForFolder !== null}
        postId={selectedPostForFolder?.id || null}
        postImageUrl={
          selectedPostForFolder?.imageUrl ||
          selectedPostForFolder?.originalPost?.imageUrl ||
          selectedPostForFolder?.avatarUri
        }
        currentCollectionName={selectedPostForFolder?.collectionName || "All Saved"}
        onClose={() => {
          setIsFolderPickerVisible(false);
          setSelectedPostForFolder(null);
        }}
        onSaveToCollection={async (collectionName) => {
          if (selectedPostForFolder) {
            await handleSaveToCollection(collectionName);
          }
        }}
        onCollectionCreated={() => {
          loadData();
        }}
        onShowToast={showToast}
      />

      {/* 8. Collection Context / Options Bottom Sheet */}
      {collectionMenuTarget && (
        <Modal
          visible={Boolean(collectionMenuTarget)}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCollectionMenuTarget(null)}
        >
          <Pressable
            className="flex-1 bg-black/40 justify-end"
            onPress={() => setCollectionMenuTarget(null)}
          >
            <Pressable
              className="bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="items-center mb-3">
                <View className="w-10 h-1 bg-gray-300 rounded-full" />
              </View>

              <Text className="text-base font-bold text-gray-900 mb-4 text-center">
                {collectionMenuTarget}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const target = collectionMenuTarget;
                  setCollectionMenuTarget(null);
                  setRenameTarget(target);
                  setRenameInput(target);
                }}
                className="flex-row items-center py-3 px-3 rounded-xl active:bg-gray-100"
              >
                <Ionicons name="pencil-outline" size={20} color="#374151" />
                <Text className="text-sm font-semibold text-gray-800 ml-3">
                  Rename Collection
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const target = collectionMenuTarget;
                  handleDeleteCollection(target);
                }}
                className="flex-row items-center py-3 px-3 rounded-xl active:bg-red-50 mt-1"
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text className="text-sm font-semibold text-red-600 ml-3">
                  Delete Collection
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCollectionMenuTarget(null)}
                className="mt-4 py-3 rounded-xl bg-gray-100 items-center justify-center"
              >
                <Text className="text-sm font-bold text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* 9. Rename Collection Modal */}
      {renameTarget && (
        <Modal
          visible={Boolean(renameTarget)}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRenameTarget(null)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-center items-center p-5"
            onPress={() => setRenameTarget(null)}
          >
            <Pressable
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-base font-bold text-gray-900 mb-2">
                Rename Collection
              </Text>
              <TextInput
                value={renameInput}
                onChangeText={setRenameInput}
                autoFocus={true}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-5"
                placeholder="Collection name"
                placeholderTextColor="#9CA3AF"
              />
              <View className="flex-row justify-end gap-2">
                <TouchableOpacity
                  onPress={() => setRenameTarget(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100"
                >
                  <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmRename}
                  disabled={!renameInput.trim() || isRenaming}
                  className={`px-4 py-2 rounded-xl ${
                    renameInput.trim() && !isRenaming
                      ? "bg-[#72AF5B]"
                      : "bg-gray-200 opacity-60"
                  }`}
                >
                  {isRenaming ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}
