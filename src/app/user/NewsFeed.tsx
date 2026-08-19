import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import CreatePostModal from "../../components/CreatePostModal";
import BottomNavBar from "../../components/Navigation";
import UserHeader from "../../components/UserHeader";

interface StoryItem {
  id: string;
  imageUrl: string;
  content?: string;
  isSeen: boolean;
  timeAgo?: string;
}

interface UserStory {
  userId: string;
  userName: string;
  userAvatar?: string;
  color: string;
  stories: StoryItem[];
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
  avatarUri?: string;
  timeAgo: string;
  content: string;
  likes: number;
  parentId?: string | null;
}

type ReactionType = "like" | "heart" | "care" | "wow";

interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

const REACTIONS: ReactionConfig[] = [
  { type: "like", emoji: "👍", label: "Like", color: "#1877F2" },
  { type: "heart", emoji: "❤️", label: "Love", color: "#EF4444" },
  { type: "care", emoji: "🥰", label: "Care", color: "#F59E0B" },
  { type: "wow", emoji: "😮", label: "Wow", color: "#EAB308" },
];

interface ShareOption {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SHARE_OPTIONS: ShareOption[] = [
  { id: "public", title: "Share Now (Public)", icon: "globe-outline" },
  { id: "group", title: "Share to a Group", icon: "people-outline" },
  {
    id: "message",
    title: "Send in Message",
    icon: "chatbubble-ellipses-outline",
  },
  { id: "copy", title: "Copy Link", icon: "link-outline" },
];

interface BookmarkCollection {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DEFAULT_BOOKMARK_COLLECTIONS: BookmarkCollection[] = [
  { id: "saved", name: "Saved Items", icon: "bookmark" },
];

const mockUserStories: UserStory[] = [
  {
    userId: "u1",
    userName: "Paulbert",
    userAvatar: "https://i.pravatar.cc/150?img=11",
    color: "#72AF5B",
    stories: [
      {
        id: "s1_1",
        imageUrl:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
        content: "Fresh harvest from our organic farm today! 🌿🍅",
        isSeen: false,
        timeAgo: "1h ago",
      },
      {
        id: "s1_2",
        imageUrl:
          "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
        content: "Organizing new seed packs for wholesale orders 🥕",
        isSeen: false,
        timeAgo: "30m ago",
      },
    ],
  },
  {
    userId: "u2",
    userName: "Pitos",
    userAvatar: "https://i.pravatar.cc/150?img=33",
    color: "#3B82F6",
    stories: [
      {
        id: "s2_1",
        imageUrl:
          "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&q=80",
        content: "New batch of hydroponic lettuce ready for order! 🥬",
        isSeen: false,
        timeAgo: "2h ago",
      },
      {
        id: "s2_2",
        imageUrl:
          "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=800&q=80",
        content: "Nutrient water levels checked! 🌱",
        isSeen: true,
        timeAgo: "4h ago",
      },
    ],
  },
  {
    userId: "u3",
    userName: "Cleo",
    userAvatar: "https://i.pravatar.cc/150?img=44",
    color: "#EC4899",
    stories: [
      {
        id: "s3_1",
        imageUrl:
          "https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?w=800&q=80",
        content: "Sunflowers blooming in full color! 🌻✨",
        isSeen: false,
        timeAgo: "3h ago",
      },
    ],
  },
  {
    userId: "u4",
    userName: "Maria",
    userAvatar: "https://i.pravatar.cc/150?img=47",
    color: "#F59E0B",
    stories: [
      {
        id: "s4_1",
        imageUrl:
          "https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=800&q=80",
        content: "Fresh dragon fruits & mangoes picked this morning! 🐉🍎",
        isSeen: true,
        timeAgo: "6h ago",
      },
    ],
  },
  {
    userId: "u5",
    userName: "Juan",
    userAvatar: "https://i.pravatar.cc/150?img=52",
    color: "#8B5CF6",
    stories: [
      {
        id: "s5_1",
        imageUrl:
          "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80",
        content: "Organic compost available for local gardens 🌱",
        isSeen: false,
        timeAgo: "45m ago",
      },
    ],
  },
  {
    userId: "u6",
    userName: "Elena",
    userAvatar: "https://i.pravatar.cc/150?img=26",
    color: "#10B981",
    stories: [
      {
        id: "s6_1",
        imageUrl:
          "https://images.unsplash.com/photo-1598511726623-d2e9996892f0?w=800&q=80",
        content: "Sweet corn harvest is live! 🌽🌽",
        isSeen: false,
        timeAgo: "5h ago",
      },
    ],
  },
  {
    userId: "u7",
    userName: "Carlos",
    userAvatar: "https://i.pravatar.cc/150?img=60",
    color: "#EF4444",
    stories: [
      {
        id: "s7_1",
        imageUrl:
          "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
        content: "Farm-fresh strawberry baskets 🍓🍓",
        isSeen: true,
        timeAgo: "8h ago",
      },
    ],
  },
  {
    userId: "u8",
    userName: "Sophia",
    userAvatar: "https://i.pravatar.cc/150?img=9",
    color: "#6366F1",
    stories: [
      {
        id: "s8_1",
        imageUrl:
          "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?w=800&q=80",
        content: "Join our weekend urban farming workshop! 🧑‍🌾",
        isSeen: false,
        timeAgo: "2h ago",
      },
    ],
  },
];

const MOCK_GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80",
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&q=80",
  "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&q=80",
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80",
  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=80",
  "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=400&q=80",
  "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80",
  "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?w=400&q=80",
  "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80",
  "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80",
  "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&q=80",
  "https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=400&q=80",
  "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&q=80",
  "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400&q=80",
  "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80",
  "https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?w=400&q=80",
  "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=400&q=80",
  "https://images.unsplash.com/photo-1557844352-761f2565b576?w=400&q=80",
  "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400&q=80",
  "https://images.unsplash.com/photo-1598511726623-d2e9996892f0?w=400&q=80",
  "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400&q=80",
  "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80",
  "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80",
  "https://images.unsplash.com/photo-1573246123716-6b1782bfc499?w=400&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400&q=80",
  "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=400&q=80",
  "https://images.unsplash.com/photo-1526344966-89049886b28d?w=400&q=80",
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
    authorRole: "Temprary",
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
    avatarUri: "https://i.pravatar.cc/150?img=12",
    timeAgo: "1hr ago",
    content:
      "These look incredible Maria! What soil amendment did you use? I struggled with blossom end rot this year.",
    likes: 34,
    parentId: null,
  },
  {
    id: "1_1",
    authorName: "Paulbert Landicho",
    avatarUri: "https://i.pravatar.cc/150?img=11",
    timeAgo: "45m ago",
    content:
      "@Nathan Salvedia Added crushed eggshells and calcium nitrate during vegetative stage! Worked wonders.",
    likes: 12,
    parentId: "1",
  },
  {
    id: "1_2",
    authorName: "Juan Dela Cruz",
    avatarUri: "https://i.pravatar.cc/150?img=8",
    timeAgo: "20m ago",
    content:
      "@Nathan Salvedia Make sure also to keep regular watering schedule to avoid calcium deficiency.",
    likes: 8,
    parentId: "1",
  },
  {
    id: "2",
    authorName: "Cleo Manabilang",
    avatarUri: "https://i.pravatar.cc/150?img=9",
    timeAgo: "9hrs ago",
    content:
      "Beautiful harvest! We switched to compost tea weekly and the tomatoes practically grew themselves.",
    likes: 81,
    parentId: null,
  },
  {
    id: "3",
    authorName: "Kent Zorel Elnas",
    avatarUri: "https://i.pravatar.cc/150?img=14",
    timeAgo: "3hrs ago",
    content:
      "Heirloom varieties are so worth the extra care. Do you have seeds available to sell?",
    likes: 11,
    parentId: null,
  },
];

const STORY_DURATION = 4000;

export default function NewsFeed() {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeSubStoryIndex, setActiveSubStoryIndex] = useState<number>(0);
  const [isStoryModalVisible, setStoryModalVisible] = useState(false);
  const [storyStep, setStoryStep] = useState<
    "SELECT_MEDIA" | "EDIT_STORY" | "PRIVACY_SETTINGS"
  >("SELECT_MEDIA");
  const [selectedStoryImage, setSelectedStoryImage] = useState<string | null>(
    null,
  );
  const [storyPrivacy, setStoryPrivacy] = useState<"Public" | "Friends" | "Only me">(
    "Public",
  );
  const [isDefaultStoryAudience, setIsDefaultStoryAudience] = useState(false);
  const [isCreatePostVisible, setCreatePostVisible] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [activeReactionPostId, setActiveReactionPostId] = useState<
    string | null
  >(null);
  const [activeSharePostId, setActiveSharePostId] = useState<string | null>(
    null,
  );
  const [bookmarkPostId, setBookmarkPostId] = useState<string | null>(null);
  const [isNewCollectionModalVisible, setNewCollectionModalVisible] =
    useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [bookmarkCollections, setBookmarkCollections] = useState<
    BookmarkCollection[]
  >(DEFAULT_BOOKMARK_COLLECTIONS);

  const [selectedReactions, setSelectedReactions] = useState<
    Record<string, ReactionType | null>
  >({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<
    Record<string, string>
  >({});
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>(
    {},
  );
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const commentInputRef = useRef<TextInput>(null);
  const [commentReactions, setCommentReactions] = useState<
    Record<string, ReactionType | null>
  >({});
  const [activeReactionCommentId, setActiveReactionCommentId] = useState<
    string | null
  >(null);
  const [expandedReplyCommentIds, setExpandedReplyCommentIds] = useState<
    Record<string, boolean>
  >({});

  const handleQuickLike = (postId: string) => {
    if (activeReactionPostId) setActiveReactionPostId(null);
    if (activeSharePostId) setActiveSharePostId(null);

    setSelectedReactions((prev) => {
      const current = prev[postId];
      return {
        ...prev,
        [postId]: current ? null : "like",
      };
    });
  };

  const handleSelectReaction = (postId: string, reaction: ReactionType) => {
    setSelectedReactions((prev) => ({
      ...prev,
      [postId]: prev[postId] === reaction ? null : reaction,
    }));
    setActiveReactionPostId(null);
  };

  const handleToggleShare = (postId: string) => {
    if (activeReactionPostId) setActiveReactionPostId(null);
    setActiveSharePostId((prev) => (prev === postId ? null : postId));
  };

  const handleShareOptionClick = (postId: string, optionId: string) => {
    console.log(`Post ${postId} shared via option: ${optionId}`);
    setActiveSharePostId(null);
  };

  const handleCreateCollection = () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;

    const newId = `col_${Date.now()}`;
    const newCol: BookmarkCollection = {
      id: newId,
      name: trimmed,
      icon: "folder",
    };

    setBookmarkCollections((prev) => [...prev, newCol]);

    if (bookmarkPostId) {
      setBookmarkedPosts((prev) => ({
        ...prev,
        [bookmarkPostId]: newId,
      }));
    }

    setNewCollectionName("");
    setNewCollectionModalVisible(false);
    setBookmarkPostId(null);
  };

  const toggleCommentLike = (commentId: string) => {
    if (activeReactionCommentId) setActiveReactionCommentId(null);
    setCommentReactions((prev) => {
      const current = prev[commentId];
      return {
        ...prev,
        [commentId]: current ? null : "heart",
      };
    });
  };

  const handleQuickCommentReaction = (commentId: string) => {
    if (activeReactionCommentId) setActiveReactionCommentId(null);
    setCommentReactions((prev) => {
      const current = prev[commentId];
      return {
        ...prev,
        [commentId]: current ? null : "heart",
      };
    });
  };

  const handleSelectCommentReaction = (
    commentId: string,
    reaction: ReactionType,
  ) => {
    setCommentReactions((prev) => ({
      ...prev,
      [commentId]: prev[commentId] === reaction ? null : reaction,
    }));
    setActiveReactionCommentId(null);
  };

  const toggleRepliesVisibility = (commentId: string) => {
    setExpandedReplyCommentIds((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const storyScrollViewRef = useRef<ScrollView>(null);

  const handlePrevStory = () => {
    if (activeStoryIndex === null) return;
    if (activeSubStoryIndex > 0) {
      setActiveSubStoryIndex((prev) => prev - 1);
    } else if (activeStoryIndex > 0) {
      const prevUserStories = mockUserStories[activeStoryIndex - 1].stories;
      setActiveStoryIndex(activeStoryIndex - 1);
      setActiveSubStoryIndex(prevUserStories.length - 1);
    }
  };

  const handleNextStory = () => {
    if (activeStoryIndex === null) return;
    const currentUser = mockUserStories[activeStoryIndex];
    if (activeSubStoryIndex < currentUser.stories.length - 1) {
      setActiveSubStoryIndex((prev) => prev + 1);
    } else if (activeStoryIndex < mockUserStories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setActiveSubStoryIndex(0);
    } else {
      setActiveStoryIndex(null);
      setActiveSubStoryIndex(0);
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
        handleNextRef.current();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [activeStoryIndex, activeSubStoryIndex]);

  const currentStoryUser =
    activeStoryIndex !== null ? mockUserStories[activeStoryIndex] : null;
  const currentSubStory =
    currentStoryUser && currentStoryUser.stories[activeSubStoryIndex]
      ? currentStoryUser.stories[activeSubStoryIndex]
      : null;

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      <Pressable
        className="flex-1"
        onPress={() => {
          if (activeReactionPostId) setActiveReactionPostId(null);
          if (activeSharePostId) setActiveSharePostId(null);
        }}
      >
        <View className="flex-1">
          {/* UserHeader Component */}
          <UserHeader />

          {/* Main Content */}
          <ScrollView
            className="flex-1 bg-gray-100"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              if (activeReactionPostId) setActiveReactionPostId(null);
              if (activeSharePostId) setActiveSharePostId(null);
              if (activeReactionCommentId) setActiveReactionCommentId(null);
            }}
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
                {/* Item 1: "Your story" (The Trigger) */}
                <View className="items-center mr-4 ml-4">
                  <TouchableOpacity
                    onPress={() => {
                      setStoryStep("SELECT_MEDIA");
                      setStoryModalVisible(true);
                    }}
                    activeOpacity={0.8}
                    className="items-center"
                  >
                    {/* Avatar Container */}
                    <View className="relative">
                      <View className="w-16 h-16 rounded-full bg-gray-300 items-center justify-center">
                        <Ionicons name="person" size={32} color="#6B7280" />
                      </View>
                      {/* The '+' Badge */}
                      <View className="absolute bottom-0 right-0 bg-blue-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white">
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text className="text-xs font-medium text-gray-700 mt-1">
                      Your story
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Items 2+: Other Users' Stories (Grouped per User) */}
                {mockUserStories.map((userStory, index) => {
                  const hasUnseen = userStory.stories.some((s) => !s.isSeen);

                  return (
                    <View key={userStory.userId} className="items-center mr-4">
                      <TouchableOpacity
                        onPress={() => {
                          setActiveStoryIndex(index);
                          setActiveSubStoryIndex(0);
                        }}
                        activeOpacity={0.8}
                        className="items-center"
                      >
                        {/* Avatar with unseen story colored border (#72AF5B) */}
                        <View
                          className={`w-16 h-16 rounded-full p-[2px] items-center justify-center bg-white ${
                            hasUnseen
                              ? "border-2 border-[#72AF5B]"
                              : "border border-gray-300"
                          }`}
                          style={
                            hasUnseen ? { borderColor: "#72AF5B" } : undefined
                          }
                        >
                          <View className="w-full h-full rounded-full bg-gray-200 items-center justify-center">
                            <Ionicons name="person" size={28} color="#6B7280" />
                          </View>
                        </View>
                        <Text
                          className="text-xs font-medium text-gray-700 mt-1 truncate w-16 text-center"
                          numberOfLines={1}
                        >
                          {userStory.userName}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Feed Posts Section */}
            <View className="pb-24 pt-2">
              {POSTS.map((post) => {
                const isExpanded = expandedPostId === post.id;
                const isReactionMenuOpen = activeReactionPostId === post.id;
                const isShareMenuOpen = activeSharePostId === post.id;
                const isCardElevated = isReactionMenuOpen || isShareMenuOpen;

                const currentReaction = selectedReactions[post.id];
                const currentReactionConfig = REACTIONS.find(
                  (r) => r.type === currentReaction,
                );

                const isBookmarked = !!bookmarkedPosts[post.id];

                return (
                  <View
                    key={post.id}
                    className={`bg-white mx-2 mb-4 rounded-xl shadow-sm border border-gray-100 relative ${
                      isCardElevated ? "z-50" : "z-0"
                    }`}
                    style={{
                      zIndex: isCardElevated ? 50 : 1,
                      elevation: isCardElevated ? 10 : 1,
                    }}
                  >
                    {/* Inline Reaction Popover (Absolute Positioning) */}
                    {isReactionMenuOpen && (
                      <View
                        className="absolute bottom-12 left-4 z-50 bg-white rounded-full shadow-lg border border-gray-100 flex-row items-center px-4 py-2 gap-4"
                        style={{
                          elevation: 8,
                          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                        }}
                      >
                        {REACTIONS.map((r) => (
                          <TouchableOpacity
                            key={r.type}
                            onPress={() =>
                              handleSelectReaction(post.id, r.type)
                            }
                            className="items-center justify-center active:scale-125"
                            activeOpacity={0.7}
                          >
                            <Text className="text-2xl">{r.emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Inline Share Popover Menu (Absolute Positioning) */}
                    {isShareMenuOpen && (
                      <View
                        className="absolute bottom-12 right-4 z-50 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1"
                        style={{
                          elevation: 8,
                          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                        }}
                      >
                        {SHARE_OPTIONS.map((option, idx) => {
                          const isLast = idx === SHARE_OPTIONS.length - 1;

                          return (
                            <TouchableOpacity
                              key={option.id}
                              onPress={() =>
                                handleShareOptionClick(post.id, option.id)
                              }
                              className={`flex-row items-center px-4 py-3 active:bg-gray-50 ${
                                !isLast ? "border-b border-gray-100" : ""
                              }`}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={option.icon}
                                size={20}
                                color="#374151"
                              />
                              <Text className="text-sm font-medium text-gray-800 ml-3">
                                {option.title}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

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
                              <Ionicons
                                name="location"
                                size={12}
                                color="#72AF5B"
                              />
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
                          style={{
                            width: "100%",
                            height: 224,
                            borderRadius: 8,
                          }}
                          resizeMode="cover"
                        />
                      )}

                      {/* Post Interaction Bar */}
                      <View className="flex-row justify-between items-center pt-1 border-t border-gray-100">
                        <View className="flex-row gap-6">
                          {/* Like / Reaction Button Trigger */}
                          <TouchableOpacity
                            onPress={() => handleQuickLike(post.id)}
                            onLongPress={() => {
                              if (activeSharePostId) setActiveSharePostId(null);
                              setActiveReactionPostId(post.id);
                            }}
                            delayLongPress={250}
                            className="flex-row items-center gap-1.5 active:opacity-70"
                          >
                            {currentReaction ? (
                              <>
                                <Text className="text-base leading-none">
                                  {currentReactionConfig?.emoji}
                                </Text>
                                <Text
                                  className="font-bold text-sm"
                                  style={{
                                    color:
                                      currentReactionConfig?.color || "#72AF5B",
                                  }}
                                >
                                  {currentReactionConfig?.label} (
                                  {post.likes + 1})
                                </Text>
                              </>
                            ) : (
                              <>
                                <Ionicons
                                  name="heart-outline"
                                  size={24}
                                  color="#6b7280"
                                />
                                <Text className="font-medium text-gray-500">
                                  {post.likes}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          {/* Comment Toggle Button */}
                          <TouchableOpacity
                            onPress={() => {
                              if (activeReactionPostId)
                                setActiveReactionPostId(null);
                              if (activeSharePostId) setActiveSharePostId(null);
                              setExpandedPostId(isExpanded ? null : post.id);
                            }}
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

                          {/* Share Button Trigger */}
                          <TouchableOpacity
                            onPress={() => handleToggleShare(post.id)}
                            className="flex-row items-center gap-1.5 active:opacity-70"
                          >
                            <Ionicons
                              name="share-social-outline"
                              size={22}
                              color={isShareMenuOpen ? "#72AF5B" : "#6b7280"}
                            />
                            <Text
                              className={`font-medium ${
                                isShareMenuOpen
                                  ? "text-[#72AF5B] font-bold"
                                  : "text-gray-500"
                              }`}
                            >
                              {post.shares}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Bookmark / Save Button Trigger */}
                        <TouchableOpacity
                          onPress={() => setBookmarkPostId(post.id)}
                          className="active:opacity-70"
                          accessibilityRole="button"
                          accessibilityLabel="Save post"
                        >
                          <Ionicons
                            name={
                              isBookmarked ? "bookmark" : "bookmark-outline"
                            }
                            size={24}
                            color={isBookmarked ? "#72AF5B" : "#6b7280"}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Inline Comments Section */}
                    {isExpanded && (
                      <View className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
                        {/* Header */}
                        <Text className="text-sm font-semibold text-gray-900 mb-4">
                          22 Comments
                        </Text>

                        {/* Individual Comment & Nested Reply Layout */}
                        {COMMENTS.filter((c) => !c.parentId).map(
                          (rootComment) => {
                            const childReplies = COMMENTS.filter(
                              (c) => c.parentId === rootComment.id,
                            );
                            const areRepliesExpanded =
                              !!expandedReplyCommentIds[rootComment.id];

                            const renderCommentItem = (
                              comment: CommentItem,
                              isReply: boolean,
                            ) => {
                              const currentCommentReaction =
                                commentReactions[comment.id];
                              const currentCommentReactionConfig =
                                REACTIONS.find(
                                  (r) => r.type === currentCommentReaction,
                                );
                              const hasCommentReaction =
                                !!currentCommentReaction;
                              const commentLikesCount =
                                comment.likes + (hasCommentReaction ? 1 : 0);
                              const isReactionOpen =
                                activeReactionCommentId === comment.id;

                              return (
                                <View
                                  key={comment.id}
                                  className={`flex-row items-start mb-3.5 relative ${
                                    isReply
                                      ? "ml-12 pl-3 border-l-2 border-gray-200"
                                      : ""
                                  }`}
                                >
                                  {/* Floating Comment/Reply Reaction Popover */}
                                  {isReactionOpen && (
                                    <View
                                      className="absolute -top-10 left-6 z-50 bg-white rounded-full px-3.5 py-1.5 flex-row items-center gap-3 shadow-lg border border-gray-100"
                                      style={{
                                        elevation: 10,
                                        boxShadow:
                                          "0 3px 6px rgba(0, 0, 0, 0.2)",
                                      }}
                                    >
                                      {REACTIONS.map((r) => (
                                        <TouchableOpacity
                                          key={r.type}
                                          onPress={() =>
                                            handleSelectCommentReaction(
                                              comment.id,
                                              r.type,
                                            )
                                          }
                                          className="items-center justify-center active:scale-125"
                                          activeOpacity={0.7}
                                        >
                                          <Text className="text-xl">
                                            {r.emoji}
                                          </Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  )}

                                  {/* Left Column (Avatar) */}
                                  <View
                                    className={`${
                                      isReply ? "h-7 w-7" : "h-8 w-8"
                                    } rounded-full mr-3 bg-gray-300 items-center justify-center overflow-hidden`}
                                  >
                                    <Ionicons
                                      name="person"
                                      size={isReply ? 14 : 16}
                                      color="#FFFFFF"
                                    />
                                  </View>

                                  {/* Right Column */}
                                  <View className="flex-1">
                                    {/* Author Row */}
                                    <View className="flex-row justify-between items-center mb-1">
                                      <Text
                                        className={`${
                                          isReply ? "text-xs" : "text-sm"
                                        } font-bold text-gray-800`}
                                      >
                                        {comment.authorName}
                                      </Text>
                                      <Text className="text-xs text-gray-400">
                                        {comment.timeAgo}
                                      </Text>
                                    </View>

                                    {/* Comment Text */}
                                    <Text className="text-sm text-gray-700 leading-5 mb-1">
                                      {comment.content}
                                    </Text>

                                    {/* Interaction Bar */}
                                    <View className="flex-row items-center gap-4 mt-1">
                                      {/* Reaction Button Trigger */}
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleQuickCommentReaction(comment.id)
                                        }
                                        onLongPress={() =>
                                          setActiveReactionCommentId(comment.id)
                                        }
                                        delayLongPress={200}
                                        className="flex-row items-center gap-1 active:opacity-70"
                                      >
                                        {hasCommentReaction ? (
                                          <>
                                            <Text className="text-sm leading-none">
                                              {
                                                currentCommentReactionConfig?.emoji
                                              }
                                            </Text>
                                            <Text
                                              className="text-xs font-bold"
                                              style={{
                                                color:
                                                  currentCommentReactionConfig?.color ||
                                                  "#EF4444",
                                              }}
                                            >
                                              {
                                                currentCommentReactionConfig?.label
                                              }{" "}
                                              {commentLikesCount}
                                            </Text>
                                          </>
                                        ) : (
                                          <>
                                            <Ionicons
                                              name="heart-outline"
                                              size={16}
                                              color="#6b7280"
                                            />
                                            <Text className="text-xs text-gray-500 font-medium">
                                              {comment.likes}
                                            </Text>
                                          </>
                                        )}
                                      </TouchableOpacity>

                                      {/* Reply Action Trigger */}
                                      <TouchableOpacity
                                        onPress={() => {
                                          setReplyingTo({
                                            commentId: comment.id,
                                            username: comment.authorName,
                                          });
                                          commentInputRef.current?.focus();
                                        }}
                                        className="active:opacity-70"
                                      >
                                        <Text className="text-xs text-gray-500 font-medium hover:text-[#72AF5B]">
                                          Reply
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </View>
                              );
                            };

                            return (
                              <View key={rootComment.id}>
                                {/* Top-level Comment */}
                                {renderCommentItem(rootComment, false)}

                                {/* View Replies Toggle Button */}
                                {childReplies.length > 0 &&
                                  !areRepliesExpanded && (
                                    <TouchableOpacity
                                      onPress={() =>
                                        toggleRepliesVisibility(rootComment.id)
                                      }
                                      className="flex-row items-center ml-12 mb-3.5 active:opacity-70"
                                      activeOpacity={0.7}
                                    >
                                      <View className="w-5 h-[1.5px] bg-gray-300 mr-2 rounded-full" />

                                      <Text className="text-xs font-semibold text-gray-600 ml-1 hover:text-[#72AF5B]">
                                        View {childReplies.length}{" "}
                                        {childReplies.length === 1
                                          ? "reply"
                                          : "replies"}
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                {/* Expanded Replies List */}
                                {childReplies.length > 0 &&
                                  areRepliesExpanded && (
                                    <View className="mb-1">
                                      {childReplies.map((reply) =>
                                        renderCommentItem(reply, true),
                                      )}

                                      {/* Hide Replies Button */}
                                      <TouchableOpacity
                                        onPress={() =>
                                          toggleRepliesVisibility(
                                            rootComment.id,
                                          )
                                        }
                                        className="flex-row items-center ml-12 mb-3.5 active:opacity-70"
                                        activeOpacity={0.7}
                                      >
                                        <View className="w-5 h-[1.5px] bg-gray-300 mr-2 rounded-full" />
                                        <Text className="text-xs font-semibold text-gray-500 hover:text-[#72AF5B]">
                                          Hide replies
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                              </View>
                            );
                          },
                        )}

                        {/* Bottom 'Add a comment...' Input Section */}
                        <View className="mt-3 pt-2">
                          {/* Replying Indicator (Conditional) */}
                          {replyingTo && (
                            <View className="bg-gray-100 px-4 py-2 flex-row justify-between items-center rounded-t-lg border-b border-gray-200">
                              <Text className="text-xs text-gray-600">
                                Replying to{" "}
                                <Text className="font-bold text-gray-900">
                                  @{replyingTo.username}
                                </Text>
                              </Text>
                              <TouchableOpacity
                                onPress={() => setReplyingTo(null)}
                                className="p-0.5 active:opacity-70"
                                accessibilityRole="button"
                                accessibilityLabel="Cancel reply"
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={16}
                                  color="#6B7280"
                                />
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* Main Text Input Container */}
                          <View
                            className={`bg-white border border-gray-200 px-4 py-2.5 flex-row items-center shadow-xs ${
                              replyingTo
                                ? "rounded-b-xl rounded-t-none"
                                : "rounded-xl"
                            }`}
                          >
                            <TextInput
                              ref={commentInputRef}
                              value={commentInputs[post.id] || ""}
                              onChangeText={(text) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [post.id]: text,
                                }))
                              }
                              placeholder={
                                replyingTo
                                  ? `Reply to @${replyingTo.username}...`
                                  : "Add a comment..."
                              }
                              placeholderTextColor="#9CA3AF"
                              className="flex-1 text-sm text-gray-800 p-0"
                            />
                            <TouchableOpacity
                              onPress={() => {
                                if ((commentInputs[post.id] || "").trim()) {
                                  setCommentInputs((prev) => ({
                                    ...prev,
                                    [post.id]: "",
                                  }));
                                  setReplyingTo(null);
                                }
                              }}
                              className="ml-2 bg-[#72AF5B] p-1.5 rounded-full items-center justify-center active:opacity-80"
                            >
                              <Ionicons name="send" size={13} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Pressable>

      {/* Bookmark / Save Post Modal (Bottom Sheet) */}
      <Modal
        visible={bookmarkPostId !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBookmarkPostId(null)}
      >
        <Pressable
          className="flex-1 justify-end"
          onPress={() => setBookmarkPostId(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl">
              {/* Top Drag Indicator */}
              <View className="items-center mb-3">
                <View className="w-10 h-1 bg-gray-300 rounded-full" />
              </View>

              {/* Modal Header */}
              <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <Text className="text-lg font-semibold text-gray-900">
                  Save Post
                </Text>
                <TouchableOpacity
                  onPress={() => setBookmarkPostId(null)}
                  className="p-1 rounded-full active:bg-gray-100"
                  accessibilityRole="button"
                  accessibilityLabel="Close save modal"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Save Options (Vertical List) */}
              <View className="mb-2">
                {bookmarkCollections.map((col) => {
                  const isSelected =
                    bookmarkPostId !== null &&
                    bookmarkedPosts[bookmarkPostId] === col.id;

                  return (
                    <TouchableOpacity
                      key={col.id}
                      onPress={() => {
                        if (bookmarkPostId) {
                          setBookmarkedPosts((prev) => ({
                            ...prev,
                            [bookmarkPostId]:
                              prev[bookmarkPostId] === col.id ? "" : col.id,
                          }));
                        }
                        setBookmarkPostId(null);
                      }}
                      className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-3 ${
                        isSelected
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-100"
                      }`}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center flex-1">
                        <Ionicons
                          name={col.icon}
                          size={20}
                          color={isSelected ? "#72AF5B" : "#374151"}
                        />
                        <Text
                          className={`text-base font-medium ml-3 ${
                            isSelected
                              ? "text-green-800 font-bold"
                              : "text-gray-800"
                          }`}
                        >
                          {col.name}
                        </Text>
                      </View>
                      {/* Plus Button Action on Right */}
                      <View
                        className={`w-8 h-8 rounded-full items-center justify-center ${
                          isSelected
                            ? "bg-green-600 shadow-xs"
                            : "bg-white border border-gray-300"
                        }`}
                      >
                        <Ionicons
                          name={isSelected ? "checkmark" : "add"}
                          size={20}
                          color={isSelected ? "#FFFFFF" : "#374151"}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* New Collection Button */}
              <TouchableOpacity
                onPress={() => {
                  setNewCollectionName("");
                  setNewCollectionModalVisible(true);
                }}
                className="flex-row items-center mt-2 p-2 active:opacity-70"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color="#16a34a" />
                <Text className="text-base font-medium text-green-600 ml-1">
                  + New Collection
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create New Collection Modal (Slide-up Bottom Sheet) */}
      <Modal
        visible={isNewCollectionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewCollectionModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end"
          onPress={() => setNewCollectionModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl">
              {/* Top Drag Indicator */}
              <View className="items-center mb-3">
                <View className="w-10 h-1 bg-gray-300 rounded-full" />
              </View>

              {/* Modal Header */}
              <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-gray-100">
                <Text className="text-lg font-semibold text-gray-900">
                  New Collection
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setNewCollectionName("");
                    setNewCollectionModalVisible(false);
                  }}
                  className="p-1 rounded-full active:bg-gray-100"
                  accessibilityRole="button"
                  accessibilityLabel="Close new collection modal"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text className="text-sm text-gray-500 mb-4">
                Create a collection to organize your saved posts.
              </Text>

              <TextInput
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="Collection name (e.g. My Favorites)"
                placeholderTextColor="#9CA3AF"
                autoFocus={true}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-800 mb-6"
              />

              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setNewCollectionName("");
                    setNewCollectionModalVisible(false);
                  }}
                  className="px-5 py-3 rounded-xl border border-gray-300 bg-white active:bg-gray-100"
                >
                  <Text className="text-sm font-semibold text-gray-700">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreateCollection}
                  disabled={!newCollectionName.trim()}
                  className={`px-6 py-3 rounded-xl ${
                    newCollectionName.trim()
                      ? "bg-[#72AF5B] active:opacity-80"
                      : "bg-gray-300 opacity-60"
                  }`}
                >
                  <Text className="text-sm font-bold text-white">
                    Create & Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Animated Fullscreen Story Viewer Modal */}
      {currentStoryUser && currentSubStory && (
        <Modal
          visible={activeStoryIndex !== null}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setActiveStoryIndex(null)}
        >
          <SafeAreaView
            {...panResponder.panHandlers}
            className="flex-1 bg-black relative"
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#000000",
            }}
          >
            {/* Fullscreen Background Story Image */}
            <View className="absolute inset-0 w-full h-full">
              <Image
                source={{ uri: currentSubStory.imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
              {/* Subtle Dark Gradient Overlay */}
              <View className="absolute inset-0 bg-black/30" />
            </View>

            {/* Top Overlay Controls (Progress bars & Header) */}
            <View className="pt-3 px-4 z-20 w-full">
              {/* Progress bars for current user's sub-stories */}
              <View className="flex-row mb-3 gap-1.5 w-full">
                {currentStoryUser.stories.map((s, idx) => {
                  const isCurrent = idx === activeSubStoryIndex;
                  const isPast = idx < activeSubStoryIndex;

                  return (
                    <View
                      key={s.id}
                      className="flex-1 h-1 bg-white/40 rounded-full overflow-hidden"
                    >
                      {isPast ? (
                        <View className="h-full w-full bg-white" />
                      ) : isCurrent ? (
                        <Animated.View
                          className="h-full bg-white"
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
              <View className="flex-row items-center justify-between w-full">
                <View className="flex-row items-center">
                  <View
                    className="h-10 w-10 rounded-full border-2 items-center justify-center bg-gray-800 mr-3"
                    style={{ borderColor: "#72AF5B" }}
                  >
                    <Ionicons name="person" size={20} color="#9CA3AF" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-base">
                      {currentStoryUser.userName}
                    </Text>
                    {currentSubStory.timeAgo && (
                      <Text className="text-white/80 text-xs">
                        {currentSubStory.timeAgo}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setActiveStoryIndex(null)}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center active:bg-black/60"
                  accessibilityRole="button"
                  accessibilityLabel="Close story viewer"
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Story Text Content (Centered / Bottom Overlay) */}
            {currentSubStory.content ? (
              <View className="flex-1 justify-end items-center pb-24 px-5 z-10 w-full">
                <Animated.View
                  style={{
                    transform: [{ scale: cardScaleAnim }],
                    opacity: cardOpacityAnim,
                    width: "100%",
                    maxWidth: 500,
                  }}
                  className="bg-black/60 px-5 py-3.5 rounded-2xl border border-white/10"
                >
                  <Text className="text-white text-base font-semibold text-center leading-6">
                    {currentSubStory.content}
                  </Text>
                </Animated.View>
              </View>
            ) : (
              <View className="flex-1" />
            )}

            {/* Left & Right Tap Zones for Quick Navigation */}
            <View
              className="absolute inset-0 flex-row z-10"
              style={{ pointerEvents: "box-none" }}
            >
              {/* Left Tap Zone */}
              <TouchableOpacity
                onPress={handlePrevStory}
                className="w-1/3 h-full justify-center items-start pl-2"
                activeOpacity={1}
              >
                {(activeStoryIndex! > 0 || activeSubStoryIndex > 0) && (
                  <View className="w-10 h-10 rounded-full bg-black/30 items-center justify-center">
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Center Zone */}
              <View className="w-1/3 h-full" />

              {/* Right Tap Zone */}
              <TouchableOpacity
                onPress={handleNextStory}
                className="w-1/3 h-full justify-center items-end pr-2"
                activeOpacity={1}
              >
                <View className="w-10 h-10 rounded-full bg-black/30 items-center justify-center">
                  <Ionicons name="chevron-forward" size={24} color="white" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom Navigation Guidance */}
            <View className="absolute bottom-6 left-4 right-4 flex-row justify-between items-center z-20">
              <TouchableOpacity
                disabled={activeStoryIndex === 0 && activeSubStoryIndex === 0}
                onPress={handlePrevStory}
                className={`flex-row items-center bg-black/40 px-3 py-1.5 rounded-full ${
                  activeStoryIndex === 0 && activeSubStoryIndex === 0
                    ? "opacity-30"
                    : "opacity-100"
                }`}
              >
                <Ionicons name="arrow-back" size={16} color="white" />
                <Text className="text-white text-xs ml-1 font-medium">
                  Prev
                </Text>
              </TouchableOpacity>

              <View className="bg-black/50 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-medium">
                  {activeSubStoryIndex + 1} of {currentStoryUser.stories.length}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleNextStory}
                className="flex-row items-center bg-black/40 px-3 py-1.5 rounded-full"
              >
                <Text className="text-white text-xs mr-1 font-medium">
                  {activeStoryIndex === mockUserStories.length - 1 &&
                  activeSubStoryIndex === currentStoryUser.stories.length - 1
                    ? "Close"
                    : "Next"}
                </Text>
                <Ionicons
                  name={
                    activeStoryIndex === mockUserStories.length - 1 &&
                    activeSubStoryIndex === currentStoryUser.stories.length - 1
                      ? "close"
                      : "arrow-forward"
                  }
                  size={16}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Create & Edit Story Full-Screen Modal */}
      <Modal
        visible={isStoryModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          if (storyStep === "PRIVACY_SETTINGS") {
            setStoryStep("EDIT_STORY");
          } else if (storyStep === "EDIT_STORY") {
            setStoryStep("SELECT_MEDIA");
          } else {
            setStoryModalVisible(false);
          }
        }}
      >
        {storyStep === "SELECT_MEDIA" ? (
          /* Step 1: Full-Screen Gallery Picker */
          <SafeAreaView className="flex-1 bg-white px-2">
            {/* Header */}
            <View className="flex-row justify-between items-center px-3 pt-2 mb-4">
              <Text className="text-2xl font-bold text-gray-900">
                Create Story
              </Text>
              <TouchableOpacity
                onPress={() => setStoryModalVisible(false)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                accessibilityRole="button"
                accessibilityLabel="Close create story modal"
              >
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Top Option Buttons */}
            <View className="flex-row gap-3 px-3 mb-5">
              {/* Option 1: Text */}
              <TouchableOpacity
                onPress={() => {
                  console.log("Create text story selected");
                  setSelectedStoryImage(null);
                  setStoryStep("EDIT_STORY");
                }}
                className="flex-1 bg-gray-100 rounded-xl p-4 items-center justify-center active:bg-gray-200"
                activeOpacity={0.7}
              >
                <Text className="text-xl font-bold text-gray-800 mb-1 font-serif">
                  Aa
                </Text>
                <Text className="text-xs font-semibold text-gray-700">
                  Text
                </Text>
              </TouchableOpacity>

              {/* Option 2: Camera */}
              <TouchableOpacity
                onPress={() => {
                  console.log("Create camera story selected");
                  setSelectedStoryImage(MOCK_GALLERY_IMAGES[0]);
                  setStoryStep("EDIT_STORY");
                }}
                className="flex-1 bg-gray-100 rounded-xl p-4 items-center justify-center active:bg-gray-200"
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={24} color="#1F2937" />
                <Text className="text-xs font-semibold text-gray-700 mt-1">
                  Camera
                </Text>
              </TouchableOpacity>

              {/* Option 3: Music */}
              <TouchableOpacity
                onPress={() => {
                  console.log("Create music story selected");
                  setSelectedStoryImage(MOCK_GALLERY_IMAGES[1]);
                  setStoryStep("EDIT_STORY");
                }}
                className="flex-1 bg-gray-100 rounded-xl p-4 items-center justify-center active:bg-gray-200"
                activeOpacity={0.7}
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={24}
                  color="#1F2937"
                />
                <Text className="text-xs font-semibold text-gray-700 mt-1">
                  Music
                </Text>
              </TouchableOpacity>
            </View>

            {/* Gallery Section */}
            <View className="flex-1 px-1">
              <View className="flex-row justify-between items-center px-2 mb-3">
                <Text className="text-base font-bold text-gray-900">
                  Gallery
                </Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-sm font-semibold text-green-600">
                    Select Multiple
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Gallery Grid */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 32 }}
              >
                <View className="flex-row flex-wrap justify-between px-1">
                  {MOCK_GALLERY_IMAGES.map((imgUri, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedStoryImage(imgUri);
                        setStoryStep("EDIT_STORY");
                      }}
                      className="w-[32%] aspect-square rounded-md mb-2 bg-gray-300 overflow-hidden active:opacity-80 relative"
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        ) : storyStep === "PRIVACY_SETTINGS" ? (
          /* Step 3: WHO CAN SEE POST ? (PRIVACY) VIEW */
          <View
            className="flex-1 bg-white justify-between px-5 pt-3 pb-4 h-full"
            style={{
              flex: 1,
              height: "100%",
              minHeight: "100%",
              justifyContent: "space-between",
            }}
          >
            {/* Top Content */}
            <View>
              {/* Back Arrow Button */}
              <TouchableOpacity
                onPress={() => setStoryStep("EDIT_STORY")}
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
                {[
                  { id: "Public", title: "Public", icon: "globe" as const },
                  { id: "Friends", title: "Friends", icon: "people" as const },
                  { id: "Only me", title: "Only me", icon: "lock-closed" as const },
                ].map((option) => {
                  const isSelected = storyPrivacy === option.title;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setStoryPrivacy(option.title as any)}
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
            <View className="mt-auto pb-2">
              {/* Set as default audience Row */}
              <View className="flex-row justify-between items-center mb-3 px-1">
                <Text className="text-sm text-gray-600 font-medium">
                  Set as default audience
                </Text>
                <Switch
                  value={isDefaultStoryAudience}
                  onValueChange={setIsDefaultStoryAudience}
                  trackColor={{ false: "#E5E7EB", true: "#72AF5B" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Done Button */}
              <TouchableOpacity
                onPress={() => setStoryStep("EDIT_STORY")}
                className="w-full bg-[#72AF5B] py-3.5 rounded-xl items-center justify-center active:opacity-80 shadow-md"
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-base">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Step 2: Full Screen Edit Story View */
          <View className="flex-1 bg-black relative">
            {/* Main Media */}
            {selectedStoryImage ? (
              <Image
                source={{ uri: selectedStoryImage }}
                className="flex-1 w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 w-full bg-[#1e293b] items-center justify-center p-8">
                <Text className="text-white text-2xl font-bold text-center">
                  Start typing your story... ✍️
                </Text>
              </View>
            )}

            {/* Top Controls (Absolute) */}
            <View className="absolute top-6 left-4 right-4 flex-row justify-between items-center z-10">
              {/* Left: Back Arrow */}
              <TouchableOpacity
                onPress={() => setStoryStep("SELECT_MEDIA")}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center active:bg-black/60"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Back to gallery"
              >
                <Ionicons name="arrow-back" size={28} color="white" />
              </TouchableOpacity>

              {/* Right: Edit Icons */}
              <View className="flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={() => console.log("Text tool clicked")}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center active:bg-black/60"
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-lg font-bold font-serif">
                    Aa
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => console.log("Stickers clicked")}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center active:bg-black/60"
                  activeOpacity={0.7}
                >
                  <Ionicons name="happy-outline" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => console.log("Draw clicked")}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center active:bg-black/60"
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => console.log("Music tool clicked")}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center active:bg-black/60"
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="musical-notes-outline"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Controls (Absolute) */}
            <View className="absolute bottom-8 left-4 right-4 flex-row justify-between items-center z-10">
              {/* Left: Who can see your story / Privacy button */}
              <TouchableOpacity
                onPress={() => setStoryStep("PRIVACY_SETTINGS")}
                className="flex-row items-center bg-black/60 border border-white/20 px-3.5 py-2.5 rounded-full active:bg-black/80 shadow-md"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Who can see your story"
              >
                <Ionicons
                  name={
                    storyPrivacy === "Public"
                      ? "globe-outline"
                      : storyPrivacy === "Friends"
                      ? "people-outline"
                      : "lock-closed-outline"
                  }
                  size={16}
                  color="white"
                />
                <View className="ml-2">
                  <Text className="text-white/70 text-[10px] uppercase font-semibold tracking-wider">
                    Privacy
                  </Text>
                  <Text className="text-white text-xs font-bold">
                    {storyPrivacy}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="white"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>

              {/* Right: Primary Share Button */}
              <TouchableOpacity
                onPress={() => {
                  console.log("Story Shared with privacy:", storyPrivacy);
                  setStoryModalVisible(false);
                  setSelectedStoryImage(null);
                  setStoryStep("SELECT_MEDIA");
                }}
                className="bg-blue-500 px-6 py-3 rounded-full flex-row items-center active:bg-blue-600 shadow-lg"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Share story"
              >
                <Text className="text-white font-bold text-base mr-2">
                  Share
                </Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

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
