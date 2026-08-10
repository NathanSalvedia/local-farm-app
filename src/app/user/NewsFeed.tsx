import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import CreatePostModal from "../../components/CreatePostModal";
import BottomNavBar from "../../components/Navigation";
import UserHeader from "../../components/UserHeader";

interface Story {
  id: string;
  name: string;
  color: string;
  content: string;
}

interface Post {
  id: string;
  authorName: string;
  authorRole: string;
  avatarUri: string;
  location: string;
  timeAgo: string;
  content: string;
  imageSource: any;
  likes: number;
  comments: number;
  shares: number;
}

interface CommentItem {
  id: string;
  authorName: string;
  timeAgo: string;
  content: string;
  likes: number;
}

const STORIES: Story[] = [
  {
    id: "1",
    name: "Paulbert",
    color: "#72AF5B",
    content: "Fresh harvest from our organic farm today! 🌿🍅",
  },
  {
    id: "2",
    name: "Pitos",
    color: "#3B82F6",
    content: "New batch of hydroponic lettuce ready for order! 🥬",
  },
  {
    id: "3",
    name: "Cleo",
    color: "#EC4899",
    content: "Sunflowers blooming in full color! 🌻✨",
  },
  {
    id: "4",
    name: "Maria",
    color: "#F59E0B",
    content: "Fresh dragon fruits picked this morning! 🐉🍎",
  },
  {
    id: "5",
    name: "Juan",
    color: "#8B5CF6",
    content: "Organic compost available for local gardens 🌱",
  },
  {
    id: "6",
    name: "Elena",
    color: "#10B981",
    content: "Sweet corn harvest is live! 🌽🌽",
  },
  {
    id: "7",
    name: "Carlos",
    color: "#EF4444",
    content: "Farm-fresh strawberry baskets 🍓🍓",
  },
  {
    id: "8",
    name: "Sophia",
    color: "#6366F1",
    content: "Join our weekend urban farming workshop! 🧑‍🌾",
  },
];

const POSTS: Post[] = [
  {
    id: "1",
    authorName: "Paulbert Landicho",
    authorRole: "Wholesaler",
    avatarUri: "https://i.pravatar.cc/150?img=11",
    location: "Iligan City, Philippines",
    timeAgo: "2h ago",
    content:
      "Mga suki! Naa tay presko ug tam-is nga apple karon.🍎 Puno sa vitamins ug perfect para sa tibuok pamilya!",
    imageSource: require("../../../assets/images/products/apple.jpg"),
    likes: 142,
    comments: 22,
    shares: 55,
  },
  {
    id: "2",
    authorName: "Nez Uy",
    authorRole: "wholesaler",
    avatarUri: "https://i.pravatar.cc/150?img=5",
    location: "Iligan City, Philippines",
    timeAgo: "4h ago",
    content:
      "Mga suki! Naa tay presko nga durian karon. Puno sa vitamins ug perfect para sa tibuok pamilya!",
    imageSource: require("../../../assets/images/products/durian.jpg"),
    likes: 289,
    comments: 41,
    shares: 18,
  },
  {
    id: "3",
    authorName: "Juan Dela Cruz",
    authorRole: "Wholesaler",
    avatarUri: "https://i.pravatar.cc/150?img=8",
    location: "Iligan City, Philippines",
    timeAgo: "6h ago",
    content:
      "Mga suki! Naa tay presko ug tam-is nga mga orange karon. 🍊 Puno sa vitamins ug perfect para sa tibuok pamilya!",
    imageSource: require("../../../assets/images/products/orange.jpg"),
    likes: 310,
    comments: 34,
    shares: 62,
  },
  {
    id: "4",
    authorName: "Kent Zorel Elnas",
    authorRole: "field",
    avatarUri: "https://i.pravatar.cc/150?img=9",
    location: "Iligan City, Philippines",
    timeAgo: "1d ago",
    content:
      "Mga suki! Naa tay presko ug tam-is nga mga pineapple karon. 🍍 Puno sa vitamins ug perfect para sa tibuok pamilya!",
    imageSource: require("../../../assets/images/products/pineapple.jpg"),
    likes: 524,
    comments: 89,
    shares: 104,
  },
];

const COMMENTS: CommentItem[] = [
  {
    id: "1",
    authorName: "Nathan Salvedia",
    timeAgo: "1hr ago",
    content: "Fresh pa kaayo, tag pila?.",
    likes: 34,
  },
  {
    id: "2",
    authorName: "Cleo Manabilang",
    timeAgo: "9hrs ago",
    content: "Available pa ba ang durian? Ganahan kaayo ko ani.",
    likes: 81,
  },
  {
    id: "3",
    authorName: "Kent Zorel Elnas",
    timeAgo: "3hrs ago",
    content: "Available pa?",
    likes: 11,
  },
];

const STORY_DURATION = 4000;

export default function NewsFeed() {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isCreatePostVisible, setCreatePostVisible] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<
    Record<string, boolean>
  >({});
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>(
    {},
  );

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleBookmark = (postId: string) => {
    setBookmarkedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleCommentLike = (commentId: string) => {
    setLikedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const storyScrollViewRef = useRef<ScrollView>(null);

  const handlePrevStory = () => {
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    }
  };

  const handleNextStory = () => {
    if (activeStoryIndex !== null && activeStoryIndex < STORIES.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handlePrevRef = useRef(handlePrevStory);
  const handleNextRef = useRef(handleNextStory);

  useEffect(() => {
    handlePrevRef.current = handlePrevStory;
    handleNextRef.current = handleNextStory;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -30) {
          handleNextRef.current();
        } else if (gestureState.dx > 30) {
          handlePrevRef.current();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (activeStoryIndex === null) return;

    progressAnim.setValue(0);
    cardScaleAnim.setValue(0.92);
    cardOpacityAnim.setValue(0);

    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: STORY_DURATION,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.spring(cardScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        if (activeStoryIndex < STORIES.length - 1) {
          setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : null));
        } else {
          setActiveStoryIndex(null);
        }
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [activeStoryIndex]);

  const currentStory =
    activeStoryIndex !== null ? STORIES[activeStoryIndex] : null;

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* UserHeader Component */}
      <UserHeader />

      {/* Main Content */}
      <ScrollView
        className="flex-1 bg-gray-100"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Stories Section */}
        <View className="bg-white py-4 border-b border-gray-200">
          <ScrollView
            ref={storyScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
            className="px-4"
          >
            {/* New Post Button */}
            <View className="items-center mr-4">
              <TouchableOpacity
                onPress={() => setCreatePostVisible(true)}
                className="h-16 w-16 rounded-full border-2 border-dashed border-green-500 items-center justify-center mb-1 bg-green-50 active:opacity-80"
              >
                <Ionicons name="add" size={32} color="#22c55e" />
              </TouchableOpacity>
              <Text className="text-xs text-black font-medium">New post</Text>
            </View>

            {/* Story Items */}
            {STORIES.map((story, index) => (
              <View key={story.id} className="items-center mr-4">
                <TouchableOpacity
                  onPress={() => setActiveStoryIndex(index)}
                  className="h-16 w-16 rounded-full border-2 border-green-500 items-center justify-center bg-gray-100 mb-1 active:opacity-80"
                >
                  <Ionicons name="person" size={30} color={story.color} />
                </TouchableOpacity>
                <Text className="text-xs text-black font-medium">
                  {story.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Feed Posts Section */}
        <View className="pb-24 pt-2">
          {POSTS.map((post) => {
            const isExpanded = expandedPostId === post.id;

            return (
              <View
                key={post.id}
                className="bg-white mx-2 mb-3 rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <View className="p-4">
                  {/* Post Header */}
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 rounded-full border border-green-500 items-center justify-center bg-gray-100 mr-3">
                        <Ionicons name="person" size={20} color="#72AF5B" />
                      </View>
                      <View>
                        <View className="flex-row items-center">
                          <Text className="font-bold text-gray-900 mr-2 text-base">
                            {post.authorName}
                          </Text>
                          <Text className="text-green-600 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded">
                            {post.authorRole}
                          </Text>
                        </View>
                        <View className="flex-row items-center mt-0.5">
                          <Ionicons name="location" size={12} color="#72AF5B" />
                          <Text className="text-xs text-gray-500 ml-1">
                            {post.location} • {post.timeAgo}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity className="p-1">
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Post Content */}
                  <Text className="text-gray-800 text-sm mb-3 leading-5">
                    {post.content}
                  </Text>

                  {/* Post Image */}
                  {post.imageSource && (
                    <Image
                      source={post.imageSource}
                      className="w-full rounded-lg mb-4 bg-gray-100"
                      style={{ width: "100%", height: 224, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  )}

                  {/* Post Interaction Bar */}
                  <View className="flex-row justify-between items-center pt-1 border-t border-gray-100">
                    <View className="flex-row gap-6">
                      <TouchableOpacity
                        onPress={() => toggleLike(post.id)}
                        className="flex-row items-center gap-1.5 active:opacity-70"
                      >
                        <Ionicons
                          name={likedPosts[post.id] ? "heart" : "heart-outline"}
                          size={24}
                          color={likedPosts[post.id] ? "#ef4444" : "#6b7280"}
                        />
                        <Text
                          className={`font-medium ${
                            likedPosts[post.id]
                              ? "text-red-500 font-bold"
                              : "text-gray-500"
                          }`}
                        >
                          {post.likes + (likedPosts[post.id] ? 1 : 0)}
                        </Text>
                      </TouchableOpacity>

                      {/* Comment Toggle Button */}
                      <TouchableOpacity
                        onPress={() =>
                          setExpandedPostId(isExpanded ? null : post.id)
                        }
                        className="flex-row items-center gap-1.5 active:opacity-70"
                      >
                        <Ionicons
                          name={
                            isExpanded ? "chatbubble" : "chatbubble-outline"
                          }
                          size={22}
                          color={isExpanded ? "#72AF5B" : "#6b7280"}
                        />
                        <Text
                          className={`font-medium ${
                            isExpanded
                              ? "text-[#72AF5B] font-bold"
                              : "text-gray-500"
                          }`}
                        >
                          {post.comments}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity className="flex-row items-center gap-1.5 active:opacity-70">
                        <Ionicons
                          name="share-social-outline"
                          size={22}
                          color="#6b7280"
                        />
                        <Text className="text-gray-500 font-medium">
                          {post.shares}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => toggleBookmark(post.id)}
                      className="active:opacity-70"
                    >
                      <Ionicons
                        name={
                          bookmarkedPosts[post.id]
                            ? "bookmark"
                            : "bookmark-outline"
                        }
                        size={24}
                        color={bookmarkedPosts[post.id] ? "#72AF5B" : "#6b7280"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Inline Comments Section (Conditionally Rendered) */}
                {isExpanded && (
                  <View className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
                    {/* Header */}
                    <Text className="text-sm font-semibold text-gray-900 mb-4">
                      22 Comments
                    </Text>

                    {/* Individual Comment Layout */}
                    {COMMENTS.map((comment) => {
                      const isCommentLiked = !!likedComments[comment.id];
                      const commentLikesCount =
                        comment.likes + (isCommentLiked ? 1 : 0);

                      return (
                        <View
                          key={comment.id}
                          className="flex-row items-start mb-4"
                        >
                          {/* Left Column (Avatar) */}
                          <View className="h-8 w-8 rounded-full mr-3 bg-gray-300 items-center justify-center overflow-hidden">
                            <Ionicons name="person" size={16} color="#FFFFFF" />
                          </View>

                          {/* Right Column */}
                          <View className="flex-1">
                            {/* Author Row */}
                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="text-sm font-bold text-gray-800">
                                {comment.authorName}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {comment.timeAgo}
                              </Text>
                            </View>

                            {/* Comment Text */}
                            <Text className="text-sm text-gray-700 leading-5 mb-1">
                              {comment.content}
                            </Text>

                            {/* Interaction */}
                            <View className="flex-row items-center gap-4 mt-1">
                              <TouchableOpacity
                                onPress={() => toggleCommentLike(comment.id)}
                                className="flex-row items-center gap-1 active:opacity-70"
                              >
                                <Ionicons
                                  name={
                                    isCommentLiked ? "heart" : "heart-outline"
                                  }
                                  size={16}
                                  color={isCommentLiked ? "#ef4444" : "#6b7280"}
                                />
                                <Text
                                  className={`text-xs ${
                                    isCommentLiked
                                      ? "text-red-500 font-bold"
                                      : "text-gray-500 font-medium"
                                  }`}
                                >
                                  {commentLikesCount}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity className="active:opacity-70">
                                <Text className="text-xs text-gray-500 font-medium">
                                  Reply
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Animated & Touch-Swipeable Story Viewer Modal */}
      {currentStory && (
        <Modal
          visible={activeStoryIndex !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActiveStoryIndex(null)}
        >
          <View
            {...panResponder.panHandlers}
            className="flex-1 bg-black/90 justify-between py-10 px-4"
          >
            <View>
              <View className="flex-row space-x-1.5 mb-4">
                {STORIES.map((s, idx) => {
                  const isCurrent = idx === activeStoryIndex;
                  const isPast = idx < (activeStoryIndex ?? 0);

                  return (
                    <View
                      key={s.id}
                      className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                    >
                      {isPast ? (
                        <View className="h-full w-full bg-green-500" />
                      ) : isCurrent ? (
                        <Animated.View
                          className="h-full bg-green-500"
                          style={{
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            }),
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {/* User Header Story */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 rounded-full border-2 border-green-500 items-center justify-center bg-gray-100 mr-3">
                    <Ionicons
                      name="person"
                      size={20}
                      color={currentStory.color}
                    />
                  </View>
                  <Text className="text-white font-bold text-base">
                    {currentStory.name}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setActiveStoryIndex(null)}
                  className="p-2"
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Animated Story Main Content & Touch Navigation Controls */}
            <View className="flex-1 justify-center items-center my-6 relative px-4">
              {activeStoryIndex! > 0 && (
                <TouchableOpacity
                  onPress={handlePrevStory}
                  className="absolute left-0 z-20 p-3 bg-black/40 rounded-full"
                >
                  <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
              )}

              {/* Animated Story Content Card */}
              <Animated.View
                style={{
                  transform: [{ scale: cardScaleAnim }],
                  opacity: cardOpacityAnim,
                }}
                className="w-full max-w-sm bg-white/10 p-6 rounded-2xl border border-white/20 items-center shadow-2xl"
              >
                <View className="h-20 w-20 rounded-full border-2 border-green-500 items-center justify-center bg-white/20 mb-4">
                  <Ionicons
                    name="person"
                    size={44}
                    color={currentStory.color}
                  />
                </View>
                <Text className="text-white text-lg font-semibold text-center mb-2">
                  {currentStory.name}'s Story
                </Text>
                <Text className="text-gray-200 text-center text-base">
                  "{currentStory.content}"
                </Text>
              </Animated.View>

              {/* Right Touch Area / Chevron */}
              <TouchableOpacity
                onPress={handleNextStory}
                className="absolute right-0 z-20 p-3 bg-black/40 rounded-full"
              >
                <Ionicons name="chevron-forward" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* Bottom Navigation Guidance */}
            <View className="flex-row justify-between items-center px-4">
              <TouchableOpacity
                disabled={activeStoryIndex === 0}
                onPress={handlePrevStory}
                className={`flex-row items-center ${
                  activeStoryIndex === 0 ? "opacity-30" : "opacity-100"
                }`}
              >
                <Ionicons name="arrow-back" size={18} color="white" />
                <Text className="text-white text-xs ml-1 font-medium">
                  Prev
                </Text>
              </TouchableOpacity>

              <Text className="text-gray-400 text-xs">
                {activeStoryIndex! + 1} of {STORIES.length}
              </Text>

              <TouchableOpacity
                onPress={handleNextStory}
                className="flex-row items-center"
              >
                <Text className="text-white text-xs mr-1 font-medium">
                  {activeStoryIndex === STORIES.length - 1 ? "Close" : "Next"}
                </Text>
                <Ionicons
                  name={
                    activeStoryIndex === STORIES.length - 1
                      ? "close"
                      : "arrow-forward"
                  }
                  size={18}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isVisible={isCreatePostVisible}
        onClose={() => setCreatePostVisible(false)}
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar onFabPress={() => setCreatePostVisible(true)} />
    </SafeAreaView>
  );
}
