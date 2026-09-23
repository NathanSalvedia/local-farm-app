import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import {
  addPostCommentApi,
  CommentItem,
  deletePostApi,
  getPostCommentsApi,
  getPostsApi,
  PostItem,
  sharePostApi,
  toggleLikeCommentApi,
  toggleLikePostApi,
  toggleSavePostApi,
  updatePostApi,
} from "@/services/post-service";
import {
  getRSBSAApplication,
  RSBSAApplication,
} from "@/services/rsbsa-service";
import {
  createStoryApi,
  getStoriesApi,
  getStoryViewersApi,
  markStoryViewedApi,
  StoryViewerItem,
  UserStory,
} from "@/services/story-service";
import { sendMessageApi } from "@/services/chat-service";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library/legacy";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LogBox,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import CreatePostModal, {
  STATIC_POST_LOCATIONS,
} from "../../components/CreatePostModal";
import LeafletMap from "../../components/LeafletMap";
import BottomNavBar from "../../components/Navigation";
import UserHeader from "../../components/UserHeader";
import LiveViewerModal from "../../components/LiveViewerModal";
import SharePostModal from "../../components/SharePostModal";
import PostImageGrid from "../../components/PostImageGrid";
import SaveToCollectionModal from "../../components/SaveToCollectionModal";
import { LinearGradient } from "expo-linear-gradient";

// Suppress known Expo Go sandbox media library warning, service log warnings, and empty uri warnings
LogBox.ignoreLogs([
  "Due to changes in Androids permission requirements",
  "[StoryService]",
  "source.uri should not be an empty string",
]);

export const STORY_GRADIENT_PRESETS: Record<string, [string, string, ...string[]]> = {
  emerald: ["#064e3b", "#065f46", "#047857"],
  forest: ["#1b4332", "#2d6a4f", "#40916c"],
  ocean: ["#0f172a", "#1e293b", "#334155"],
  sunset: ["#78350f", "#b45309", "#d97706"],
  berry: ["#4c1d95", "#6d28d9", "#8b5cf6"],
  harvest: ["#881337", "#9f1239", "#be123c"],
};

export const DEFAULT_STORY_GRADIENT: [string, string, ...string[]] = [
  "#064e3b",
  "#065f46",
  "#047857",
];

export const getStoryGradient = (bgColor?: string): [string, string, ...string[]] => {
  if (!bgColor) return DEFAULT_STORY_GRADIENT;
  const key = bgColor.toLowerCase().trim();
  if (STORY_GRADIENT_PRESETS[key]) {
    return STORY_GRADIENT_PRESETS[key];
  }
  if (key.startsWith("#") || key.startsWith("rgb")) {
    return [key, "#0f172a"];
  }
  return DEFAULT_STORY_GRADIENT;
};

const STORY_PRIVACY_OPTIONS = [
  {
    id: "Public",
    title: "Public",
    subtitle: "Anyone on LocalFarm can see your story",
    icon: "globe-outline" as const,
  },
  {
    id: "Friends",
    title: "Friends",
    subtitle: "Only your connected friends on LocalFarm can see your story",
    icon: "people-outline" as const,
  },
  {
    id: "Only me",
    title: "Only me",
    subtitle: "Only you will be able to see this story",
    icon: "lock-closed-outline" as const,
  },
] as const;

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
  category?: string;
  expiresAt?: number | string | null;
  durationLabel?: string;
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




const getPostLocationCoords = (
  locationName?: string,
  latitude?: number | null,
  longitude?: number | null,
) => {
  if (
    latitude !== undefined &&
    latitude !== null &&
    !isNaN(Number(latitude)) &&
    longitude !== undefined &&
    longitude !== null &&
    !isNaN(Number(longitude))
  ) {
    return { latitude: Number(latitude), longitude: Number(longitude) };
  }
  if (!locationName) {
    return { latitude: 8.2283, longitude: 124.2452 };
  }
  const match = STATIC_POST_LOCATIONS.find(
    (loc) =>
      locationName.toLowerCase().includes(loc.barangay.toLowerCase()) ||
      loc.name.toLowerCase().includes(locationName.toLowerCase()),
  );
  if (match) {
    return { latitude: match.latitude, longitude: match.longitude };
  }
  return { latitude: 8.2283, longitude: 124.2452 };
};

const getStaticLocationCoords = (locationName?: string) => {
  return getPostLocationCoords(locationName);
};

const formatTemporaryRemainingTime = (expiresAt?: number | string | null) => {
  if (!expiresAt) return "24h left";
  const exp =
    typeof expiresAt === "number" ? expiresAt : new Date(expiresAt).getTime();
  const diff = exp - Date.now();
  if (diff <= 0) return "Expired";
  const totalSeconds = Math.floor(diff / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s left`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s left`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMins}m left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
};

const isPostExpired = (post: PostItem | Post) => {
  if (post.category !== "Temporary") return false;
  if (!post.expiresAt) return false;
  const exp =
    typeof post.expiresAt === "number"
      ? post.expiresAt
      : new Date(post.expiresAt).getTime();
  return Date.now() >= exp;
};

const STORY_DURATION = 4000;

export default function NewsFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rsbsaApp, setRsbsaApp] = useState<RSBSAApplication | null>(null);
  const [, setCurrentTime] = useState(() => Date.now());

  // 1-second countdown ticker for temporary flash posts
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen Image Lightbox Modal State
  const [previewImage, setPreviewImage] = useState<{
    uri?: string;
    images?: string[];
    currentIndex?: number;
    source?: any;
    caption?: string;
    authorName?: string;
    authorRole?: string;
    avatarUri?: string;
    timeAgo?: string;
    postId?: string;
    isVerified?: boolean;
    likes?: number;
    comments?: number;
    shares?: number;
    isLiked?: boolean;
    isSaved?: boolean;
  } | null>(null);
  const screenWidth = Dimensions.get("window").width;
  const lightboxListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (previewImage && previewImage.currentIndex !== undefined && previewImage.currentIndex > 0) {
      setTimeout(() => {
        lightboxListRef.current?.scrollToOffset({
          offset: (previewImage.currentIndex ?? 0) * screenWidth,
          animated: false,
        });
      }, 50);
    }
  }, [previewImage?.uri, previewImage?.currentIndex]);

  const [activeCommentsPostId, setActiveCommentsPostId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isMounted = true;
    getRSBSAApplication()
      .then((app) => {
        if (isMounted) setRsbsaApp(app);
      })
      .catch((err) => console.log("[NewsFeed] Failed to load RSBSA:", err));
    return () => {
      isMounted = false;
    };
  }, []);

  const isRSBSAVerified = rsbsaApp?.status === "verified";
  const [isLiveViewerVisible, setIsLiveViewerVisible] = useState(false);
  const [liveViewerData, setLiveViewerData] = useState<{
    authorName: string;
    authorAvatar?: string;
    streamTitle: string;
    location?: string;
    isReplay?: boolean;
  }>({
    authorName: "Juan Santos",
    streamTitle: "Morning Sweet Corn Harvest at Tipanoy 🌾",
    location: "Tipanoy, Iligan City",
  });
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [storyTextContent, setStoryTextContent] = useState("");
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeSubStoryIndex, setActiveSubStoryIndex] = useState<number>(0);
  const [isStoryViewersModalVisible, setIsStoryViewersModalVisible] =
    useState(false);
  const [storyViewersList, setStoryViewersList] = useState<StoryViewerItem[]>(
    [],
  );
  const [isLoadingStoryViewers, setIsLoadingStoryViewers] = useState(false);
  const [isStoryModalVisible, setStoryModalVisible] = useState(false);
  const [storyStep, setStoryStep] = useState<
    "SELECT_MEDIA" | "EDIT_STORY" | "PRIVACY_SETTINGS"
  >("SELECT_MEDIA");
  const [selectedStoryImage, setSelectedStoryImage] = useState<string | null>(
    null,
  );
  const [devicePhotos, setDevicePhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loadingDevicePhotos, setLoadingDevicePhotos] = useState(false);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);
  const [storyPrivacy, setStoryPrivacy] = useState<
    "Public" | "Friends" | "Only me"
  >("Public");
  const [selectedStoryBg, setSelectedStoryBg] = useState<string>("emerald");
  const [isDefaultStoryAudience, setIsDefaultStoryAudience] = useState(false);
  const [isCreatePostVisible, setCreatePostVisible] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [activeReactionPostId, setActiveReactionPostId] = useState<
    string | null
  >(null);
  const [activeSharePostId, setActiveSharePostId] = useState<string | null>(
    null,
  );
  const [saveModalPost, setSaveModalPost] = useState<{
    id: string;
    imageUrl?: string;
    collectionName?: string;
  } | null>(null);

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
  const { showToast } = useToast();
  const [postComments, setPostComments] = useState<
    Record<string, CommentItem[]>
  >({});
  const [loadingComments, setLoadingComments] = useState<
    Record<string, boolean>
  >({});
  const [submittingComments, setSubmittingComments] = useState<
    Record<string, boolean>
  >({});

  // Swipe-to-dismiss gesture handling for comments sheets
  const standaloneCommentsTranslateY = useRef(new Animated.Value(0)).current;
  const standaloneCommentsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          standaloneCommentsTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.5) {
          Animated.timing(standaloneCommentsTranslateY, {
            toValue: Dimensions.get("window").height,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setActiveCommentsPostId(null);
            setReplyingTo(null);
            standaloneCommentsTranslateY.setValue(0);
          });
        } else {
          Animated.spring(standaloneCommentsTranslateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(standaloneCommentsTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const handleCloseLightbox = () => {
    setPreviewImage(null);
  };

  const handleOpenPreview = (data: {
    uri?: string;
    images?: string[];
    initialIndex?: number;
    source?: any;
    caption?: string;
    authorName?: string;
    authorRole?: string;
    avatarUri?: string;
    timeAgo?: string;
    postId?: string;
    isVerified?: boolean;
    likes?: number;
    comments?: number;
    shares?: number;
    isLiked?: boolean;
    isSaved?: boolean;
  }) => {
    const list =
      data.images && data.images.length > 0
        ? data.images
        : data.uri
          ? [data.uri]
          : [];
    const idx =
      data.initialIndex !== undefined &&
      data.initialIndex >= 0 &&
      data.initialIndex < list.length
        ? data.initialIndex
        : 0;

    setPreviewImage({
      ...data,
      images: list,
      currentIndex: idx,
      uri: list[idx] || data.uri,
    });
  };

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);

  const fetchFeedPosts = async () => {
    try {
      const data = await getPostsApi();
      setPosts(data);
      const initialReactions: Record<string, ReactionType | null> = {};
      data.forEach((p) => {
        if (p.userReaction) {
          initialReactions[p.id] = p.userReaction as ReactionType;
        } else if (p.isLiked) {
          initialReactions[p.id] = "like";
        }
      });
      setSelectedReactions((prev) => ({ ...prev, ...initialReactions }));
    } catch (err) {
      console.log("[NewsFeed] Failed to fetch posts:", err);
    } finally {
      setIsLoadingPosts(false);
      setIsRefreshingPosts(false);
    }
  };

  const fetchFeedStories = async () => {
    try {
      setIsLoadingStories(true);
      const data = await getStoriesApi();
      setUserStories(data);
    } catch (err) {
      console.log("[NewsFeed] Failed to fetch stories:", err);
    } finally {
      setIsLoadingStories(false);
    }
  };

  useEffect(() => {
    fetchFeedPosts();
    fetchFeedStories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeedPosts();
      fetchFeedStories();
    }, []),
  );

  // Auto-mark story as viewed when viewed by user
  useEffect(() => {
    if (activeStoryIndex !== null && userStories[activeStoryIndex]) {
      const activeStory =
        userStories[activeStoryIndex].stories[activeSubStoryIndex];
      if (activeStory && !activeStory.isSeen) {
        markStoryViewedApi(activeStory.id);
        setUserStories((prev) =>
          prev.map((u, uIdx) => {
            if (uIdx !== activeStoryIndex) return u;
            return {
              ...u,
              stories: u.stories.map((s, sIdx) =>
                sIdx === activeSubStoryIndex ? { ...s, isSeen: true } : s,
              ),
            };
          }),
        );
      }
    }
  }, [activeStoryIndex, activeSubStoryIndex]);

  // Dynamically load saved default story privacy preference
  useEffect(() => {
    AsyncStorage.getItem("localfarm_default_story_privacy")
      .then((saved) => {
        if (saved && ["Public", "Friends", "Only me"].includes(saved)) {
          setStoryPrivacy(saved as "Public" | "Friends" | "Only me");
          setIsDefaultStoryAudience(true);
        }
      })
      .catch((err) =>
        console.log("[NewsFeed] Error loading default story privacy:", err),
      );
  }, []);

  const handleSaveStoryPrivacy = async () => {
    try {
      if (isDefaultStoryAudience) {
        await AsyncStorage.setItem(
          "localfarm_default_story_privacy",
          storyPrivacy,
        );
      } else {
        await AsyncStorage.removeItem("localfarm_default_story_privacy");
      }
    } catch (err) {
      console.log("[NewsFeed] Error saving story privacy:", err);
    }
    setStoryStep("EDIT_STORY");
  };


  const handlePickCamera = async () => {
    try {
      if (Platform.OS !== "web") {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          showToast("Permission to access camera is required.", "warning");
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedStoryImage(result.assets[0].uri);
        setStoryStep("EDIT_STORY");
      }
    } catch (error) {
      console.error("Error taking story photo:", error);
      showToast("Could not open camera.", "error");
    }
  };

  const handlePickGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showToast("Permission to access gallery is required.", "warning");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedStoryImage(result.assets[0].uri);
        setStoryStep("EDIT_STORY");
      }
    } catch (error) {
      console.error("Error picking story photo:", error);
      showToast("Could not open photo gallery.", "error");
    }
  };

  const loadDevicePhotos = async (requestIfMissing = false) => {
    if (Platform.OS === "web") return;
    try {
      setLoadingDevicePhotos(true);
      let perm = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
      if (!perm.granted && requestIfMissing) {
        perm = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      }
      if (!perm.granted) {
        setMediaPermissionDenied(true);
        setLoadingDevicePhotos(false);
        return;
      }
      setMediaPermissionDenied(false);

      let fetchedList: MediaLibrary.Asset[] = [];
      try {
        const assets = await MediaLibrary.getAssetsAsync({
          first: 90,
          mediaType: [MediaLibrary.MediaType.photo],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        fetchedList = assets.assets || [];
      } catch (err) {
        console.log("[NewsFeed] Sort query failed, retrying without sort:", err);
        try {
          const fallback = await MediaLibrary.getAssetsAsync({
            first: 90,
            mediaType: [MediaLibrary.MediaType.photo],
          });
          fetchedList = fallback.assets || [];
        } catch (fallbackErr) {
          console.log("[NewsFeed] Fallback query failed:", fallbackErr);
        }
      }

      setDevicePhotos(fetchedList);
    } catch (err) {
      console.log("[NewsFeed] Error loading device photos:", err);
    } finally {
      setLoadingDevicePhotos(false);
    }
  };

  useEffect(() => {
    if (isStoryModalVisible && storyStep === "SELECT_MEDIA") {
      loadDevicePhotos(true);
    }
  }, [isStoryModalVisible, storyStep]);

  const storyGridItems = useMemo(() => {
    return [
      { id: "__camera_tile__", uri: "" } as MediaLibrary.Asset,
      ...devicePhotos,
    ];
  }, [devicePhotos]);

  const handleShareStory = async () => {
    if (!selectedStoryImage && !storyTextContent.trim()) {
      showToast("Please add a photo or text for your story.", "warning");
      return;
    }
    try {
      setIsSharingStory(true);
      await createStoryApi({
        mediaUrl: selectedStoryImage || undefined,
        textContent: storyTextContent.trim() || undefined,
        backgroundColor: !selectedStoryImage ? selectedStoryBg : undefined,
        privacy: storyPrivacy,
      });
      showToast("Story shared successfully!", "success");
      setStoryModalVisible(false);
      setSelectedStoryImage(null);
      setStoryTextContent("");
      setSelectedStoryBg("emerald");
      setStoryStep("SELECT_MEDIA");
      fetchFeedStories();
    } catch (err: any) {
      console.error("[NewsFeed] Error sharing story:", err);
      showToast(err.message || "Failed to share story.", "error");
    } finally {
      setIsSharingStory(false);
    }
  };

  const handleNewPostCreated = (newPost: PostItem) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleQuickLike = async (postId: string) => {
    if (activeReactionPostId) setActiveReactionPostId(null);
    if (activeSharePostId) setActiveSharePostId(null);

    const targetPost = posts.find((p) => p.id === postId);
    const wasLiked = Boolean(
      selectedReactions[postId] || targetPost?.isLiked,
    );

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: !wasLiked,
            userReaction: wasLiked ? null : "like",
            likes: wasLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
          };
        }
        return p;
      }),
    );

    setSelectedReactions((prev) => ({
      ...prev,
      [postId]: wasLiked ? null : "like",
    }));

    try {
      const res = await toggleLikePostApi(postId, "like");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: res.isLiked,
                likes: res.likesCount,
                userReaction: res.userReaction,
              }
            : p,
        ),
      );
      setSelectedReactions((prev) => ({
        ...prev,
        [postId]: (res.userReaction as ReactionType) || null,
      }));
    } catch (err) {
      console.log("[NewsFeed] Error toggling like:", err);
    }
  };

  const handleSelectReaction = async (
    postId: string,
    reaction: ReactionType,
  ) => {
    setActiveReactionPostId(null);
    const targetPost = posts.find((p) => p.id === postId);
    const prevReaction =
      selectedReactions[postId] || targetPost?.userReaction;
    const isRemoving = prevReaction === reaction;

    setSelectedReactions((prev) => ({
      ...prev,
      [postId]: isRemoving ? null : reaction,
    }));

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const currentLikes = p.likes || 0;
          return {
            ...p,
            isLiked: !isRemoving,
            userReaction: isRemoving ? null : reaction,
            likes: isRemoving
              ? Math.max(0, currentLikes - 1)
              : p.isLiked
                ? currentLikes
                : currentLikes + 1,
          };
        }
        return p;
      }),
    );

    try {
      const res = await toggleLikePostApi(postId, reaction);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: res.isLiked,
                likes: res.likesCount,
                userReaction: res.userReaction,
              }
            : p,
        ),
      );
      setSelectedReactions((prev) => ({
        ...prev,
        [postId]: (res.userReaction as ReactionType) || null,
      }));
    } catch (err) {
      console.log("[NewsFeed] Error selecting reaction:", err);
    }
  };

  // Share Post Modal State
  const [shareModalPost, setShareModalPost] = useState<PostItem | null>(null);

  const handleOpenShareModal = (post: PostItem) => {
    if (activeReactionPostId) setActiveReactionPostId(null);
    setShareModalPost(post);
  };

  const handleShareSuccess = (sharedPost?: PostItem | null, newSharesCount?: number) => {
    if (!shareModalPost) return;
    setPosts((prev) => {
      const updated = prev.map((p) =>
        p.id === shareModalPost.id
          ? {
              ...p,
              shares:
                newSharesCount !== undefined ? newSharesCount : p.shares + 1,
            }
          : p,
      );
      if (sharedPost) {
        return [sharedPost, ...updated];
      }
      return updated;
    });
  };

  const toggleExpandComments = async (postId: string) => {
    if (activeReactionPostId) setActiveReactionPostId(null);
    if (activeSharePostId) setActiveSharePostId(null);

    setActiveCommentsPostId(postId);
    if (!postComments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      getPostCommentsApi(postId)
        .then((items) =>
          setPostComments((prev) => ({ ...prev, [postId]: items })),
        )
        .catch((err) => console.log("[NewsFeed] Failed to load comments:", err))
        .finally(() =>
          setLoadingComments((prev) => ({ ...prev, [postId]: false })),
        );
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text || submittingComments[postId]) return;

    setSubmittingComments((prev) => ({ ...prev, [postId]: true }));
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    const currentReply = replyingTo;
    setReplyingTo(null);

    // Determine parent thread id to auto-expand replies
    const allComments = postComments[postId] || [];
    const parentComment = currentReply?.commentId
      ? allComments.find((c) => c.id === currentReply.commentId)
      : null;
    const threadRootId =
      parentComment?.parentId || currentReply?.commentId || null;

    try {
      const newComment = await addPostCommentApi(
        postId,
        text,
        currentReply?.commentId || null,
      );

      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));

      if (threadRootId) {
        setExpandedReplyCommentIds((prev) => ({
          ...prev,
          [threadRootId]: true,
        }));
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: p.comments + 1 } : p,
        ),
      );

      showToast("Comment posted!", "success");
    } catch {
      const fallbackComment: CommentItem = {
        id: Date.now().toString(),
        postId,
        parentId: currentReply?.commentId || null,
        userId: String(user?.id || "me"),
        authorName: user?.name || user?.username || "You",
        avatarUri: user?.avatarUrl || "",
        timeAgo: "Just now",
        content: text,
        likes: 0,
        isLiked: false,
      };
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), fallbackComment],
      }));
      if (threadRootId) {
        setExpandedReplyCommentIds((prev) => ({
          ...prev,
          [threadRootId]: true,
        }));
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: p.comments + 1 } : p,
        ),
      );
      showToast("Comment posted!", "success");
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleCommentLike = async (postId: string, commentId: string) => {
    if (activeReactionCommentId) setActiveReactionCommentId(null);

    // Optimistic toggle
    setPostComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map((c) => {
        if (c.id === commentId) {
          const wasLiked = c.isLiked || Boolean(commentReactions[commentId]);
          return {
            ...c,
            isLiked: !wasLiked,
            likes: wasLiked ? Math.max(0, c.likes - 1) : c.likes + 1,
          };
        }
        return c;
      }),
    }));

    setCommentReactions((prev) => ({
      ...prev,
      [commentId]: prev[commentId] ? null : "heart",
    }));

    try {
      const res = await toggleLikeCommentApi(commentId);
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) =>
          c.id === commentId
            ? { ...c, isLiked: res.isLiked, likes: res.likesCount }
            : c,
        ),
      }));
    } catch (err) {
      console.log("[NewsFeed] Failed to toggle comment like:", err);
    }
  };

  // Post Options Menu & Edit / Delete / Privacy Modals
  const [selectedPostForMenu, setSelectedPostForMenu] =
    useState<PostItem | null>(null);
  const [isPostMenuVisible, setIsPostMenuVisible] = useState(false);

  // Swipe-to-dismiss gesture handling for post options sheet
  const [postOptionsMenuTranslateY] = useState(() => new Animated.Value(0));
  const postOptionsMenuPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            gestureState.dy > 5 &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
          );
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            postOptionsMenuTranslateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 60 || gestureState.vy > 0.5) {
            Animated.timing(postOptionsMenuTranslateY, {
              toValue: Dimensions.get("window").height,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              setIsPostMenuVisible(false);
              postOptionsMenuTranslateY.setValue(0);
            });
          } else {
            Animated.spring(postOptionsMenuTranslateY, {
              toValue: 0,
              bounciness: 4,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(postOptionsMenuTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [postOptionsMenuTranslateY],
  );

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostCategory, setEditPostCategory] = useState("General");
  const [editPostPrivacy, setEditPostPrivacy] = useState("Public");
  const [isUpdatingPost, setIsUpdatingPost] = useState(false);

  // Quick Privacy Modal State
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);

  // Delete Confirm Modal State
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const isPostOwner = (post: PostItem | null) => {
    if (!post) return false;
    return Number(post.userId) === Number(user?.id) || user?.role === "admin";
  };

  const handleOpenPostMenu = (post: PostItem) => {
    postOptionsMenuTranslateY.setValue(0);
    setSelectedPostForMenu(post);
    setIsPostMenuVisible(true);
  };

  const handleOpenEditModal = () => {
    if (!selectedPostForMenu) return;
    setEditPostContent(selectedPostForMenu.content || "");
    setEditPostCategory(selectedPostForMenu.category || "General");
    setEditPostPrivacy(selectedPostForMenu.privacy || "Public");
    setIsPostMenuVisible(false);
    setIsEditModalVisible(true);
  };

  const handleSaveEditPost = async () => {
    if (!selectedPostForMenu) return;
    setIsUpdatingPost(true);
    try {
      const res = await updatePostApi(selectedPostForMenu.id, {
        content: editPostContent,
        category: editPostCategory,
        privacy: editPostPrivacy,
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPostForMenu.id
            ? {
                ...p,
                content: res.post.content,
                category: res.post.category,
                privacy: res.post.privacy,
                authorRole: res.post.category,
              }
            : p,
        ),
      );

      showToast("Post updated successfully!", "success");
      setIsEditModalVisible(false);
      setSelectedPostForMenu(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to update post.", "error");
    } finally {
      setIsUpdatingPost(false);
    }
  };

  const handleQuickChangePrivacy = async (privacy: string) => {
    if (!selectedPostForMenu) return;
    try {
      const res = await updatePostApi(selectedPostForMenu.id, {
        privacy,
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPostForMenu.id
            ? { ...p, privacy: res.post.privacy }
            : p,
        ),
      );
      showToast(`Privacy changed to ${privacy}!`, "success");
      setIsPrivacyModalVisible(false);
      setIsPostMenuVisible(false);
      setSelectedPostForMenu(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to change privacy.", "error");
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPostForMenu) return;
    setIsDeletingPost(true);
    try {
      await deletePostApi(selectedPostForMenu.id);
      setPosts((prev) => prev.filter((p) => p.id !== selectedPostForMenu.id));
      showToast("Post deleted successfully!", "success");
      setIsDeleteConfirmVisible(false);
      setSelectedPostForMenu(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete post.", "error");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleToggleSavePost = async (
    postId: string,
    collectionName?: string,
  ) => {
    try {
      const res = await toggleSavePostApi(postId, collectionName);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: res.isSaved } : p)),
      );
      const effectiveCol = res.collectionName || collectionName || "All Saved";
      setBookmarkedPosts((prev) => ({
        ...prev,
        [postId]: res.isSaved ? effectiveCol : "",
      }));

      if (res.isSaved) {
        showToast(res.message || `Saved to ${effectiveCol}`, "success");
      } else {
        showToast("Post removed from saved.", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to save post.", "error");
    }
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

  const [storyReplyText, setStoryReplyText] = useState("");
  const [isReplyingStory, setIsReplyingStory] = useState(false);
  const [isSendingStoryReply, setIsSendingStoryReply] = useState(false);
  const storyRemainingTimeRef = useRef(STORY_DURATION);
  const storyReplyInputRef = useRef<TextInput>(null);
  const isReplyingStoryRef = useRef(isReplyingStory);

  useEffect(() => {
    isReplyingStoryRef.current = isReplyingStory;
  }, [isReplyingStory]);

  const pauseStoryTimer = () => {
    progressAnim.stopAnimation((value) => {
      const elapsed = (value || 0) * STORY_DURATION;
      storyRemainingTimeRef.current = Math.max(500, STORY_DURATION - elapsed);
    });
  };

  const resumeStoryTimer = () => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: storyRemainingTimeRef.current || STORY_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isReplyingStoryRef.current) {
        handleNextRef.current();
      }
    });
  };

  const handleFocusStoryReply = () => {
    setIsReplyingStory(true);
    pauseStoryTimer();
  };

  const handleBlurStoryReply = () => {
    if (!isSendingStoryReply) {
      setIsReplyingStory(false);
      resumeStoryTimer();
    }
  };

  const handleTapLeft = () => {
    if (isReplyingStory) {
      Keyboard.dismiss();
      setIsReplyingStory(false);
      resumeStoryTimer();
      return;
    }
    handlePrevStory();
  };

  const handleTapRight = () => {
    if (isReplyingStory) {
      Keyboard.dismiss();
      setIsReplyingStory(false);
      resumeStoryTimer();
      return;
    }
    handleNextStory();
  };

  const handleCloseStoryViewer = () => {
    setActiveStoryIndex(null);
    setStoryReplyText("");
    setIsReplyingStory(false);
    Keyboard.dismiss();
  };

  const handlePrevStory = () => {
    if (activeStoryIndex === null) return;
    setStoryReplyText("");
    setIsReplyingStory(false);
    Keyboard.dismiss();
    if (activeSubStoryIndex > 0) {
      setActiveSubStoryIndex((prev) => prev - 1);
    } else if (activeStoryIndex > 0) {
      const prevUserStories = userStories[activeStoryIndex - 1]?.stories || [];
      setActiveStoryIndex(activeStoryIndex - 1);
      setActiveSubStoryIndex(Math.max(0, prevUserStories.length - 1));
    }
  };

  const handleNextStory = () => {
    if (activeStoryIndex === null) return;
    setStoryReplyText("");
    setIsReplyingStory(false);
    Keyboard.dismiss();
    const currentUser = userStories[activeStoryIndex];
    if (currentUser && activeSubStoryIndex < currentUser.stories.length - 1) {
      setActiveSubStoryIndex((prev) => prev + 1);
    } else if (activeStoryIndex < userStories.length - 1) {
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
      onStartShouldSetPanResponder: () => !isReplyingStoryRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isReplyingStoryRef.current) return false;
        return (
          Math.abs(gestureState.dx) > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isReplyingStoryRef.current) return;
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

    storyRemainingTimeRef.current = STORY_DURATION;
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
      if (finished && !isReplyingStoryRef.current) {
        handleNextRef.current();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [activeStoryIndex, activeSubStoryIndex]);

  const currentStoryUser =
    activeStoryIndex !== null ? userStories[activeStoryIndex] : null;
  const currentSubStory =
    currentStoryUser && currentStoryUser.stories[activeSubStoryIndex]
      ? currentStoryUser.stories[activeSubStoryIndex]
      : null;

  const isOwnActiveStory = Boolean(
    currentStoryUser &&
      user &&
      (String(currentStoryUser.userId) === String(user.id) ||
        (user.username &&
          currentStoryUser.userName.trim().toLowerCase() ===
            user.username.trim().toLowerCase())),
  );

  // Automatically mark story as viewed when current user is viewing someone else's story
  useEffect(() => {
    if (activeStoryIndex === null || !currentSubStory?.id) return;
    if (!isOwnActiveStory) {
      markStoryViewedApi(currentSubStory.id).catch(() => {});
    }
  }, [activeStoryIndex, activeSubStoryIndex, currentSubStory?.id, isOwnActiveStory]);

  const handleOpenStoryViewers = async () => {
    if (!currentSubStory) return;
    pauseStoryTimer();
    setIsStoryViewersModalVisible(true);
    setIsLoadingStoryViewers(true);
    try {
      const viewers = await getStoryViewersApi(currentSubStory.id);
      const filtered = (viewers || []).filter(
        (v) => !user?.id || String(v.userId) !== String(user.id),
      );
      setStoryViewersList(filtered);
    } catch (err) {
      console.log("[NewsFeed] Failed to load story viewers:", err);
      setStoryViewersList([]);
    } finally {
      setIsLoadingStoryViewers(false);
    }
  };

  const handleCloseStoryViewers = () => {
    setIsStoryViewersModalVisible(false);
    resumeStoryTimer();
  };

  const handleSendStoryReply = async () => {
    const trimmed = storyReplyText.trim();
    if (!trimmed || !currentStoryUser?.userId || isSendingStoryReply) return;

    setIsSendingStoryReply(true);
    try {
      await sendMessageApi({
        receiverId: String(currentStoryUser.userId),
        messageText: `Replied to your story: "${trimmed}"`,
      });
      showToast(`Message sent to ${currentStoryUser.userName}!`, "success");
      setStoryReplyText("");
      setIsReplyingStory(false);
      Keyboard.dismiss();
      resumeStoryTimer();
    } catch (err: any) {
      console.error("[NewsFeed] Error sending story reply:", err);
      showToast(err?.message || "Failed to send message.", "error");
    } finally {
      setIsSendingStoryReply(false);
    }
  };

  const handleSendStoryReaction = async (emoji: string) => {
    if (!currentStoryUser?.userId || isSendingStoryReply) return;

    setIsSendingStoryReply(true);
    try {
      await sendMessageApi({
        receiverId: String(currentStoryUser.userId),
        messageText: `Reacted ${emoji} to your story`,
      });
      showToast(`Sent ${emoji} to ${currentStoryUser.userName}!`, "success");
      setIsReplyingStory(false);
      Keyboard.dismiss();
      resumeStoryTimer();
    } catch (err: any) {
      console.error("[NewsFeed] Error sending story reaction:", err);
      showToast(err?.message || "Failed to send reaction.", "error");
    } finally {
      setIsSendingStoryReply(false);
    }
  };

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
            refreshControl={
              <RefreshControl
                refreshing={isRefreshingPosts}
                onRefresh={() => {
                  setIsRefreshingPosts(true);
                  fetchFeedPosts();
                }}
                colors={["#72AF5B"]}
                tintColor="#72AF5B"
              />
            }
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
                      <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200">
                        {Boolean(user?.avatarUrl && user.avatarUrl.trim()) ? (
                          <Image
                            source={{ uri: user!.avatarUrl!.trim() }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="person" size={32} color="#9CA3AF" />
                        )}
                      </View>
                      {/* The '+' Badge */}
                      <View className="absolute bottom-0 right-0 bg-blue-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white shadow-xs">
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text className="text-xs font-medium text-gray-700 mt-1">
                      Your story
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Items 2+: Other Users' Stories (Grouped per User) */}
                {userStories.map((userStory, index) => {
                  const hasUnseen = userStory.stories.some((s) => !s.isSeen);
                  const isSelf = Boolean(
                    user &&
                      (String(userStory.userId) === String(user.id) ||
                        (user.username &&
                          userStory.userName?.trim().toLowerCase() ===
                            user.username.trim().toLowerCase()) ||
                        (user.name &&
                          userStory.userName?.trim().toLowerCase() ===
                            user.name.trim().toLowerCase())),
                  );

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
                          <View className="w-full h-full rounded-full bg-gray-200 items-center justify-center overflow-hidden">
                            {Boolean(userStory.userAvatar && userStory.userAvatar.trim()) ? (
                              <Image
                                source={{ uri: userStory.userAvatar!.trim() }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Ionicons
                                name="person"
                                size={28}
                                color="#6B7280"
                              />
                            )}
                          </View>
                        </View>
                        <Text
                          className="text-xs font-medium text-gray-700 mt-1 max-w-[76px] text-center"
                          numberOfLines={1}
                        >
                          {isSelf ? "My story" : userStory.userName}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Feed Posts Section */}
            <View className="pb-24 pt-2">
              {isLoadingPosts ? (
                <View className="py-16 items-center justify-center">
                  <ActivityIndicator size="large" color="#72AF5B" />
                  <Text className="text-xs text-gray-500 mt-2 font-medium">
                    Loading farming community feed...
                  </Text>
                </View>
              ) : posts.length === 0 ? (
                <View className="py-16 items-center justify-center px-6">
                  <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-3">
                    <Ionicons
                      name="newspaper-outline"
                      size={32}
                      color="#72AF5B"
                    />
                  </View>
                  <Text className="text-base font-bold text-gray-800 mb-1">
                    No posts yet
                  </Text>
                  <Text className="text-xs text-gray-400 text-center">
                    Be the first to share an update with your farming community!
                  </Text>
                </View>
              ) : (
                posts
                  .filter((p) => !isPostExpired(p))
                  .map((post) => {
                    const isExpanded = expandedPostId === post.id;
                    const isReactionMenuOpen = activeReactionPostId === post.id;
                    const isCardElevated = isReactionMenuOpen;

                    const currentReaction =
                      selectedReactions[post.id] !== undefined
                        ? selectedReactions[post.id]
                        : ((post.userReaction as ReactionType) ||
                          (post.isLiked ? "like" : null));
                    const currentReactionConfig = REACTIONS.find(
                      (r) => r.type === currentReaction,
                    );

                    const isBookmarked = Boolean(
                      post.isSaved || bookmarkedPosts[post.id],
                    );

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

                        <View className="p-4">
                          {/* Temporary Flash Post Urgency Banner */}
                          {post.category === "Temporary" && (
                            <View className="flex-row items-center justify-between px-3 py-2 mb-3 bg-amber-50 border border-amber-200/90 rounded-xl">
                              <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                                <Ionicons
                                  name="flash"
                                  size={13}
                                  color="#D97706"
                                />
                                <Text
                                  className="text-xs font-bold text-amber-900"
                                  numberOfLines={1}
                                >
                                  Temporary Post
                                </Text>
                                {Boolean(post.durationLabel) && (
                                  <Text className="text-[11px] text-amber-700 font-medium">
                                    • {post.durationLabel}
                                  </Text>
                                )}
                              </View>
                              <View className="flex-row items-center gap-1 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                                <Ionicons
                                  name="time"
                                  size={12}
                                  color="#B45309"
                                />
                                <Text className="text-[11px] font-bold text-amber-900">
                                  {formatTemporaryRemainingTime(post.expiresAt)}
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Live Replay Banner */}
                          {(post.content.includes("[Live Replay]") ||
                            post.content.includes("🔴 [Live Replay]")) && (
                            <View className="flex-row items-center justify-between px-3 py-2 mb-3 bg-red-50 border border-red-200 rounded-xl">
                              <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                                <View className="w-2.5 h-2.5 rounded-full bg-red-600 mr-0.5" />
                                <Text className="text-xs font-bold text-red-800 tracking-wide">
                                  LIVE BROADCAST REPLAY
                                </Text>
                                {Boolean(post.durationLabel) && (
                                  <Text className="text-[11px] text-red-600 font-medium">
                                    • {post.durationLabel}
                                  </Text>
                                )}
                              </View>
                              <View className="flex-row items-center gap-1 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">
                                <Ionicons
                                  name="videocam"
                                  size={12}
                                  color="#DC2626"
                                />
                                <Text className="text-[11px] font-bold text-red-800">
                                  Recorded
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Shared Post Header Banner */}
                          {post.isShared && post.originalPost && (
                            <View className="flex-row items-center mb-2.5 px-0.5">
                              <Ionicons
                                name="arrow-redo"
                                size={15}
                                color="#72AF5B"
                              />
                              <View className="flex-row items-center ml-1.5 flex-wrap">
                                <Text className="font-bold text-gray-900 text-xs">
                                  {post.authorName}
                                </Text>
                                {(post.isVerified ||
                                  ((Boolean(
                                    user?.id && post.userId === String(user.id),
                                  ) ||
                                    post.authorName === user?.name ||
                                    post.authorName === user?.username) &&
                                    isRSBSAVerified)) && (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={13}
                                    color="#10B981"
                                    style={{ marginHorizontal: 3 }}
                                  />
                                )}
                                <Text className="text-xs text-gray-500 font-medium ml-1">
                                  shared a post
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Post Header */}
                          <View className="flex-row justify-between items-start mb-3">
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => {
                                const isCurrentUser =
                                  Boolean(
                                    user?.id && post.userId === String(user.id),
                                  ) ||
                                  post.authorName === user?.name ||
                                  post.authorName === user?.username;
                                const isVerifiedUser =
                                  Boolean(post.isVerified) ||
                                  (isCurrentUser && isRSBSAVerified);

                                router.push({
                                  pathname: "/user/UserProfile",
                                  params: {
                                    userId: post.userId,
                                    userName: post.authorName,
                                    userAvatar: post.avatarUri,
                                    userRole:
                                      isCurrentUser && isRSBSAVerified
                                        ? "RSBSA Verified Farmer"
                                        : post.authorRole,
                                    isVerified: isVerifiedUser
                                      ? "true"
                                      : "false",
                                  },
                                } as any);
                              }}
                              className="flex-row items-center flex-1 pr-2"
                            >
                              <View className="h-10 w-10 rounded-full border border-green-500 items-center justify-center bg-gray-100 mr-3 overflow-hidden">
                                {Boolean(post.avatarUri && post.avatarUri.trim()) ? (
                                  <Image
                                    source={{ uri: post.avatarUri.trim() }}
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <Ionicons
                                    name="person"
                                    size={20}
                                    color="#72AF5B"
                                  />
                                )}
                              </View>
                              <View className="flex-1">
                                <View className="flex-row items-center flex-wrap">
                                  <Text className="font-bold text-gray-900 mr-1.5 text-base">
                                    {post.authorName}
                                  </Text>
                                  {Boolean(
                                    post.taggedUsers &&
                                    post.taggedUsers.length > 0,
                                  ) && (
                                    <Text className="text-xs text-gray-500 mr-1.5 font-normal">
                                      is with{" "}
                                      <Text className="font-semibold text-gray-800">
                                        {post.taggedUsers![0].name}
                                      </Text>
                                      {post.taggedUsers!.length > 1
                                        ? ` and ${post.taggedUsers!.length - 1} other${post.taggedUsers!.length > 2 ? "s" : ""}`
                                        : ""}
                                    </Text>
                                  )}
                                  {(post.isVerified ||
                                    ((Boolean(
                                      user?.id &&
                                      post.userId === String(user.id),
                                    ) ||
                                      post.authorName === user?.name ||
                                      post.authorName === user?.username) &&
                                      isRSBSAVerified)) && (
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={16}
                                      color="#10B981"
                                      style={{ marginRight: 6 }}
                                    />
                                  )}
                                  <Text
                                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                      (Boolean(
                                        user?.id &&
                                        post.userId === String(user.id),
                                      ) ||
                                        post.authorName === user?.name ||
                                        post.authorName === user?.username) &&
                                      isRSBSAVerified
                                        ? "text-emerald-700 bg-emerald-50"
                                        : "text-green-600 bg-green-50"
                                    }`}
                                  >
                                    {(Boolean(
                                      user?.id &&
                                      post.userId === String(user.id),
                                    ) ||
                                      post.authorName === user?.name ||
                                      post.authorName === user?.username) &&
                                    isRSBSAVerified
                                      ? "RSBSA Verified Farmer"
                                      : post.authorRole}
                                  </Text>
                                </View>
                                <View className="flex-row items-center mt-0.5">
                                  {Boolean(
                                    post.location &&
                                    post.location.trim().length > 0 &&
                                    post.location !==
                                      "Iligan City, Philippines",
                                  ) && (
                                    <>
                                      <Ionicons
                                        name="location"
                                        size={12}
                                        color="#72AF5B"
                                      />
                                      <Text className="text-xs text-gray-500 ml-1 mr-1.5">
                                        {post.location} •
                                      </Text>
                                    </>
                                  )}
                                  <Text className="text-xs text-gray-500 mr-2">
                                    {post.timeAgo}
                                  </Text>
                                  <Ionicons
                                    name={
                                      post.privacy === "Friends"
                                        ? "people-outline"
                                        : post.privacy === "Only me"
                                          ? "lock-closed-outline"
                                          : "globe-outline"
                                    }
                                    size={12}
                                    color="#9ca3af"
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleOpenPostMenu(post)}
                              className="p-1.5 active:opacity-60"
                              accessibilityRole="button"
                              accessibilityLabel="Post options"
                            >
                              <Ionicons
                                name="ellipsis-horizontal"
                                size={20}
                                color="#9ca3af"
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Post Content (Sharer's caption or post content) */}
                          {!!post.content && (
                            <Text className="text-gray-800 text-sm mb-3 leading-5">
                              {post.content}
                            </Text>
                          )}

                          {/* Shared Post: Embedded Original Post Card */}
                          {post.isShared && post.originalPost ? (
                            <View className="border border-gray-200 rounded-xl p-3 bg-gray-50/80 mb-3">
                              {/* Original Author Info */}
                              <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => {
                                  router.push({
                                    pathname: "/user/UserProfile",
                                    params: {
                                      userId: post.originalPost?.userId,
                                      userName: post.originalPost?.authorName,
                                      userAvatar: post.originalPost?.avatarUri,
                                      userRole: post.originalPost?.authorRole,
                                      isVerified: post.originalPost?.isVerified
                                        ? "true"
                                        : "false",
                                    },
                                  } as any);
                                }}
                                className="flex-row items-center mb-2"
                              >
                                <View className="h-8 w-8 rounded-full border border-gray-300 items-center justify-center bg-gray-200 mr-2.5 overflow-hidden">
                                  {Boolean(post.originalPost.avatarUri && post.originalPost.avatarUri.trim()) ? (
                                    <Image
                                      source={{
                                        uri: post.originalPost.avatarUri.trim(),
                                      }}
                                      style={{ width: "100%", height: "100%" }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <Ionicons
                                      name="person"
                                      size={16}
                                      color="#6b7280"
                                    />
                                  )}
                                </View>
                                <View>
                                  <View className="flex-row items-center flex-wrap">
                                    <Text className="font-bold text-gray-900 text-sm mr-1.5">
                                      {post.originalPost.authorName}
                                    </Text>
                                    {post.originalPost.isVerified && (
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={13}
                                        color="#10B981"
                                        style={{ marginRight: 4 }}
                                      />
                                    )}
                                    <Text className="text-gray-500 text-[10px] font-semibold bg-gray-200 px-1.5 py-0.5 rounded">
                                      {post.originalPost.authorRole}
                                    </Text>
                                  </View>
                                  <Text className="text-[11px] text-gray-400 mt-0.5">
                                    {Boolean(
                                      post.originalPost.location &&
                                      post.originalPost.location.trim().length >
                                        0 &&
                                      post.originalPost.location !==
                                        "Iligan City, Philippines",
                                    )
                                      ? `${post.originalPost.location} • `
                                      : ""}
                                    {post.originalPost.timeAgo}
                                  </Text>
                                </View>
                              </TouchableOpacity>

                              {/* Original Content Text */}
                              {!!post.originalPost.content && (
                                <Text className="text-gray-700 text-sm mb-2 leading-5">
                                  {post.originalPost.content}
                                </Text>
                              )}

                              {/* Original Image */}
                              {post.originalPost.imageUrl || (post.originalPost.images && post.originalPost.images.length > 0) ? (
                                <PostImageGrid
                                  images={post.originalPost.images}
                                  fallbackImageUrl={post.originalPost.imageUrl}
                                  onPressImage={(clickedUri, clickedIdx) =>
                                    handleOpenPreview({
                                      uri: clickedUri,
                                      images:
                                        post.originalPost?.images && post.originalPost.images.length > 0
                                          ? post.originalPost.images
                                          : post.originalPost?.imageUrl
                                            ? [post.originalPost.imageUrl]
                                            : [],
                                      initialIndex: clickedIdx,
                                      caption: post.originalPost?.content,
                                      authorName: post.originalPost?.authorName,
                                      timeAgo: post.originalPost?.timeAgo,
                                      postId: post.id,
                                      authorRole: post.originalPost?.authorRole,
                                      avatarUri: post.avatarUri,
                                      isVerified: post.isVerified,
                                      likes: post.likes,
                                      comments: post.comments,
                                      shares: post.shares,
                                      isLiked: post.isLiked,
                                      isSaved: Boolean(
                                        post.isSaved ||
                                        bookmarkedPosts[post.id],
                                      ),
                                    })
                                  }
                                />
                              ) : null}
                            </View>
                          ) : /* Standard Post Images */
                          (post.images && post.images.length > 0) || post.imageUrl ? (
                            <PostImageGrid
                              images={post.images}
                              fallbackImageUrl={post.imageUrl}
                              onPressImage={(clickedUri, clickedIdx) =>
                                handleOpenPreview({
                                  uri: clickedUri,
                                  images:
                                    post.images && post.images.length > 0
                                      ? post.images
                                      : post.imageUrl
                                        ? [post.imageUrl]
                                        : [],
                                  initialIndex: clickedIdx,
                                  caption: post.content,
                                  authorName: post.authorName,
                                  timeAgo: post.timeAgo,
                                  postId: post.id,
                                  authorRole: post.authorRole,
                                  avatarUri: post.avatarUri,
                                  isVerified: post.isVerified,
                                  likes: post.likes,
                                  comments: post.comments,
                                  shares: post.shares,
                                  isLiked: post.isLiked,
                                  isSaved: Boolean(
                                    post.isSaved || bookmarkedPosts[post.id],
                                  ),
                                })
                              }
                            />
                          ) : (post as any).imageSource ? (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() =>
                                handleOpenPreview({
                                  source: (post as any).imageSource,
                                  caption: post.content,
                                  authorName: post.authorName,
                                  timeAgo: post.timeAgo,
                                  postId: post.id,
                                  authorRole: post.authorRole,
                                  avatarUri: post.avatarUri,
                                  isVerified: post.isVerified,
                                  likes: post.likes,
                                  comments: post.comments,
                                  shares: post.shares,
                                  isLiked: post.isLiked,
                                  isSaved: Boolean(
                                    post.isSaved || bookmarkedPosts[post.id],
                                  ),
                                })
                              }
                            >
                              <Image
                                source={(post as any).imageSource}
                                className="w-full rounded-lg mb-4 bg-gray-100"
                                style={{
                                  width: "100%",
                                  height: 224,
                                  borderRadius: 8,
                                }}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ) : (post.content.includes("[Live Replay]") ||
                            post.content.includes("🔴 [Live Replay]")) ? (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() => {
                                setLiveViewerData({
                                  authorName: post.authorName,
                                  authorAvatar:
                                    post.avatarUri ||
                                    "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
                                  streamTitle:
                                    post.content
                                      .split("\n")[0]
                                      .replace("🔴 [Live Replay]", "")
                                      .trim() || "Recorded Live Broadcast",
                                  location: post.location || "Iligan City",
                                  isReplay: true,
                                });
                                setIsLiveViewerVisible(true);
                              }}
                              className="w-full h-44 rounded-2xl mb-4 bg-gray-900 overflow-hidden items-center justify-center relative border border-gray-800"
                            >
                              <View className="w-14 h-14 rounded-full bg-red-600 items-center justify-center shadow-lg active:scale-95">
                                <Ionicons
                                  name="play"
                                  size={26}
                                  color="#FFFFFF"
                                  style={{ marginLeft: 3 }}
                                />
                              </View>
                              <View className="absolute top-3 left-3 flex-row items-center bg-red-600 px-2.5 py-1 rounded-full">
                                <Text className="text-white text-[10px] font-extrabold tracking-wider">
                                  REPLAY
                                </Text>
                              </View>
                              <View className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between">
                                <Text
                                  className="text-white text-xs font-semibold"
                                  numberOfLines={1}
                                >
                                  Recorded Live Stream
                                </Text>
                                {Boolean(post.durationLabel) && (
                                  <Text className="text-gray-300 text-xs font-medium">
                                    {post.durationLabel}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ) : null}

                          {/* Attached Location Static Leaflet Map Card */}
                          {Boolean(
                            post.location &&
                            post.location.trim().length > 0 &&
                            post.location !== "Iligan City, Philippines",
                          ) && (
                            <View className="mb-3 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xs">
                              <View className="flex-row items-center justify-between px-3.5 py-2 bg-gray-50/95 border-b border-gray-100">
                                <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                                  <Ionicons
                                    name="location-sharp"
                                    size={14}
                                    color="#72AF5B"
                                  />
                                  <Text
                                    className="text-xs font-bold text-gray-900 flex-1"
                                    numberOfLines={1}
                                  >
                                    {post.location}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() =>
                                    router.push("/user/ExploreMap" as any)
                                  }
                                  className="flex-row items-center gap-1 bg-white border border-[#72AF5B]/40 px-2.5 py-1 rounded-lg active:bg-green-50"
                                  activeOpacity={0.7}
                                >
                                  <Ionicons
                                    name="map"
                                    size={12}
                                    color="#72AF5B"
                                  />
                                  <Text className="text-[11px] font-bold text-[#72AF5B]">
                                    Explore Map
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <TouchableOpacity
                                activeOpacity={0.92}
                                onPress={() =>
                                  router.push("/user/ExploreMap" as any)
                                }
                                style={{ width: "100%", height: 180 }}
                              >
                                <View
                                  style={{ width: "100%", height: "100%" }}
                                  pointerEvents="none"
                                >
                                  <LeafletMap
                                    latitude={
                                      getPostLocationCoords(
                                        post.location,
                                        post.latitude,
                                        post.longitude,
                                      ).latitude
                                    }
                                    longitude={
                                      getPostLocationCoords(
                                        post.location,
                                        post.latitude,
                                        post.longitude,
                                      ).longitude
                                    }
                                    zoom={14}
                                    locationTitle={post.location}
                                    interactive={false}
                                  />
                                </View>
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* Post Interaction Bar */}
                          <View className="flex-row justify-between items-center pt-1 border-t border-gray-100">
                            <View className="flex-row gap-6">
                              {/* Like / Reaction Button Trigger */}
                              <TouchableOpacity
                                onPress={() => handleQuickLike(post.id)}
                                onLongPress={() => {
                                  if (activeSharePostId)
                                    setActiveSharePostId(null);
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
                                          currentReactionConfig?.color ||
                                          "#72AF5B",
                                      }}
                                    >
                                      {currentReactionConfig?.label} (
                                      {post.likes})
                                    </Text>
                                  </>
                                ) : post.isLiked ? (
                                  <>
                                    <Ionicons
                                      name="heart"
                                      size={24}
                                      color="#EF4444"
                                    />
                                    <Text className="font-bold text-sm text-[#EF4444]">
                                      {post.likes}
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

                              {/* Comment Button (Opens Lightbox Modal with Comments Sheet) */}
                              <TouchableOpacity
                                onPress={() => toggleExpandComments(post.id)}
                                className="flex-row items-center gap-1.5 active:opacity-70"
                              >
                                <Ionicons
                                  name="chatbubble-outline"
                                  size={22}
                                  color="#6b7280"
                                />
                                <Text className="font-medium text-gray-500">
                                  {postComments[post.id] !== undefined
                                    ? postComments[post.id].length
                                    : post.comments}
                                </Text>
                              </TouchableOpacity>

                              {/* Share Button Trigger */}
                              <TouchableOpacity
                                onPress={() => handleOpenShareModal(post)}
                                className="flex-row items-center gap-1.5 active:opacity-70"
                              >
                                <Ionicons
                                  name="share-social-outline"
                                  size={22}
                                  color="#6b7280"
                                />
                                <Text className="font-medium text-gray-500">
                                  {post.shares}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Bookmark / Save Button Trigger - Opens Instagram Save To Collection Modal */}
                            <TouchableOpacity
                              onPress={() => {
                                const postImg =
                                  post.images && post.images.length > 0
                                    ? post.images[0]
                                    : post.imageUrl ||
                                      post.originalPost?.imageUrl ||
                                      (post.originalPost?.images && post.originalPost.images.length > 0
                                        ? post.originalPost.images[0]
                                        : "") ||
                                      "";
                                setSaveModalPost({
                                  id: post.id,
                                  imageUrl: postImg,
                                  collectionName: bookmarkedPosts[post.id] || (post.isSaved ? "All Saved" : "All Saved"),
                                });
                              }}
                              className="active:opacity-70 p-0.5"
                              accessibilityRole="button"
                              accessibilityLabel="Save post"
                            >
                              <Ionicons
                                name={
                                  isBookmarked ? "bookmark" : "bookmark-outline"
                                }
                                size={24}
                                color={isBookmarked ? "#000000" : "#6b7280"}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* View all comments trigger (Opens Lightbox Modal) */}
                          {(postComments[post.id] !== undefined
                            ? postComments[post.id].length
                            : post.comments) > 0 && (
                            <TouchableOpacity
                              onPress={() => toggleExpandComments(post.id)}
                              className="mt-2.5 active:opacity-70"
                            >
                              <Text className="text-xs font-semibold text-gray-500 hover:text-[#72AF5B]">
                                View all{" "}
                                {postComments[post.id] !== undefined
                                  ? postComments[post.id].length
                                  : post.comments}{" "}
                                {(postComments[post.id] !== undefined
                                  ? postComments[post.id].length
                                  : post.comments) === 1
                                  ? "comment"
                                  : "comments"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
              )}
            </View>
          </ScrollView>
        </View>
      </Pressable>

      {/* Facebook-style Share Post Modal */}
      <SharePostModal
        visible={shareModalPost !== null}
        post={shareModalPost}
        onClose={() => setShareModalPost(null)}
        onShareSuccess={handleShareSuccess}
        onShowToast={showToast}
      />

      {/* Instagram-style Save to Collection Modal */}
      <SaveToCollectionModal
        visible={saveModalPost !== null}
        postId={saveModalPost?.id || null}
        postImageUrl={saveModalPost?.imageUrl}
        currentCollectionName={saveModalPost?.collectionName}
        onClose={() => setSaveModalPost(null)}
        onSaveToCollection={async (collectionName) => {
          if (saveModalPost) {
            await handleToggleSavePost(saveModalPost.id, collectionName);
          }
        }}
        onCollectionCreated={() => {}}
        onShowToast={showToast}
      />

      {/* Animated Fullscreen Story Viewer Modal */}
      {currentStoryUser && currentSubStory && (
        <Modal
          visible={activeStoryIndex !== null}
          transparent={false}
          animationType="fade"
          onRequestClose={handleCloseStoryViewer}
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
            {/* Fullscreen Background: Image OR Rich Aesthetic Gradient for Text Stories */}
            {Boolean(currentSubStory.imageUrl && currentSubStory.imageUrl.trim()) ? (
              <View className="absolute inset-0 w-full h-full">
                <Image
                  source={{ uri: currentSubStory.imageUrl.trim() }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                {/* Subtle Dark Gradient Overlay */}
                <View className="absolute inset-0 bg-black/30" />
              </View>
            ) : (
              <LinearGradient
                colors={getStoryGradient(currentSubStory.backgroundColor)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0 w-full h-full"
              />
            )}

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
                    className="h-10 w-10 rounded-full border-2 items-center justify-center bg-gray-800 mr-3 overflow-hidden"
                    style={{ borderColor: "#72AF5B" }}
                  >
                    {Boolean(currentStoryUser.userAvatar && currentStoryUser.userAvatar.trim()) ? (
                      <Image
                        source={{ uri: currentStoryUser.userAvatar!.trim() }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={20} color="#9CA3AF" />
                    )}
                  </View>
                  <View>
                    <Text className="text-white font-bold text-base">
                      {isOwnActiveStory ? "My story" : currentStoryUser.userName}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      {currentSubStory.timeAgo && (
                        <Text className="text-white/80 text-xs">
                          {currentSubStory.timeAgo}
                        </Text>
                      )}
                      <Text className="text-white/50 text-xs">•</Text>
                      <Ionicons
                        name={
                          currentSubStory.privacy === "Only me"
                            ? "lock-closed"
                            : currentSubStory.privacy === "Friends"
                              ? "people"
                              : "globe-outline"
                        }
                        size={11}
                        color="rgba(255,255,255,0.75)"
                      />
                      <Text className="text-white/70 text-[10px]">
                        {currentSubStory.privacy || "Public"}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCloseStoryViewer}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center active:bg-black/60"
                  accessibilityRole="button"
                  accessibilityLabel="Close story viewer"
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Story Text Content: Centered bold typography for Text Stories, Bottom Caption for Image Stories */}
            {Boolean(currentSubStory.content && currentSubStory.content.trim()) ? (
              Boolean(currentSubStory.imageUrl && currentSubStory.imageUrl.trim()) ? (
                /* 1. Image Story: Bottom Caption Overlay */
                <View
                  className="flex-1 justify-end items-center pb-24 px-5 z-10 w-full"
                  pointerEvents="box-none"
                >
                  <Animated.View
                    style={{
                      transform: [{ scale: cardScaleAnim }],
                      opacity: cardOpacityAnim,
                      width: "100%",
                      maxWidth: 500,
                    }}
                    className="bg-black/65 px-5 py-3.5 rounded-2xl border border-white/15 shadow-lg"
                  >
                    <Text className="text-white text-base font-semibold text-center leading-6">
                      {currentSubStory.content}
                    </Text>
                  </Animated.View>
                </View>
              ) : (
                /* 2. Text Story: Centered Bold Typography (Instagram/Facebook Style) */
                <View
                  className="flex-1 justify-center items-center px-8 z-10 w-full"
                  pointerEvents="box-none"
                >
                  <Animated.View
                    style={{
                      transform: [{ scale: cardScaleAnim }],
                      opacity: cardOpacityAnim,
                      width: "100%",
                      maxWidth: 480,
                    }}
                    className="items-center justify-center p-4"
                  >
                    <Text
                      className="text-white text-2xl sm:text-3xl font-extrabold text-center leading-9 sm:leading-10 tracking-wide"
                      style={{
                        textShadowColor: "rgba(0, 0, 0, 0.55)",
                        textShadowOffset: { width: 0, height: 2 },
                        textShadowRadius: 8,
                      }}
                    >
                      {currentSubStory.content}
                    </Text>
                  </Animated.View>
                </View>
              )
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
                onPress={handleTapLeft}
                className="w-1/2 h-full"
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel="Previous story"
              />

              {/* Right Tap Zone */}
              <TouchableOpacity
                onPress={handleTapRight}
                className="w-1/2 h-full"
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel="Next story"
              />
            </View>

            {/* Bottom Bar: If own story, show Viewer pill button */}
            {isOwnActiveStory ? (
              <View className="absolute bottom-8 left-4 z-20">
                <TouchableOpacity
                  onPress={handleOpenStoryViewers}
                  activeOpacity={0.8}
                  className="flex-row items-center bg-black/60 px-4 py-2.5 rounded-full border border-white/20"
                >
                  <Ionicons name="eye-outline" size={18} color="white" />
                  <Text className="text-white text-xs font-semibold ml-2">
                    {currentSubStory?.viewsCount ?? 0}{" "}
                    {(currentSubStory?.viewsCount ?? 0) === 1 ? "view" : "views"}
                  </Text>
                  <Ionicons
                    name="chevron-up"
                    size={14}
                    color="#d1d5db"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              /* Instagram / Facebook style Story Message & Quick Reactions Bar */
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
                className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-2"
                style={{
                  backgroundColor: isReplyingStory
                    ? "rgba(0, 0, 0, 0.75)"
                    : "transparent",
                }}
              >
                {/* Floating Quick Reaction Emojis (shown when input is focused) */}
                {isReplyingStory && (
                  <View className="flex-row items-center justify-around mb-3 px-2 py-2 bg-black/70 rounded-full border border-white/20">
                    {["❤️", "🙌", "🔥", "👏", "😂", "😮", "😢", "😍"].map(
                      (emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => handleSendStoryReaction(emoji)}
                          className="w-9 h-9 items-center justify-center active:scale-125"
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text className="text-2xl">{emoji}</Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                )}

                <View className="flex-row items-center gap-2">
                  {/* Rounded Message Input Pill */}
                  <View className="flex-1 flex-row items-center bg-black/50 border border-white/25 rounded-full px-4 py-1.5 h-12">
                    <TextInput
                      ref={storyReplyInputRef}
                      value={storyReplyText}
                      onChangeText={setStoryReplyText}
                      onFocus={handleFocusStoryReply}
                      onBlur={handleBlurStoryReply}
                      placeholder={`Send message to ${
                        currentStoryUser.userName
                          ? currentStoryUser.userName.split(" ")[0]
                          : "user"
                      }...`}
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      className="flex-1 text-white text-sm py-1.5 mr-2"
                      returnKeyType="send"
                      onSubmitEditing={handleSendStoryReply}
                    />

                    {storyReplyText.trim().length > 0 && (
                      <TouchableOpacity
                        onPress={handleSendStoryReply}
                        disabled={isSendingStoryReply}
                        className="bg-[#72AF5B] w-8 h-8 rounded-full items-center justify-center active:opacity-80"
                      >
                        {isSendingStoryReply ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons name="arrow-up" size={18} color="white" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Quick Heart Reaction Button (Instagram style) */}
                  {storyReplyText.trim().length === 0 && (
                    <TouchableOpacity
                      onPress={() => handleSendStoryReaction("❤️")}
                      activeOpacity={0.7}
                      className="w-12 h-12 rounded-full bg-black/50 border border-white/25 items-center justify-center active:scale-110"
                      accessibilityLabel="Send love reaction"
                    >
                      <Ionicons name="heart" size={26} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </KeyboardAvoidingView>
            )}
          </SafeAreaView>
        </Modal>
      )}

      {/* Story Viewers Bottom Sheet Modal */}
      <Modal
        visible={isStoryViewersModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={handleCloseStoryViewers}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable
            className="flex-1"
            onPress={handleCloseStoryViewers}
            accessibilityRole="button"
            accessibilityLabel="Close story viewers backdrop"
          />
          <View className="bg-white rounded-t-3xl max-h-[75%] min-h-[40%] pb-8 pt-3 px-5 shadow-2xl">
            {/* Drag handle */}
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 rounded-full bg-gray-300" />
            </View>

            {/* Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="eye" size={20} color="#16a34a" />
                <Text className="text-lg font-bold text-gray-900 ml-2">
                  Story Viewers
                </Text>
                <View className="bg-gray-100 px-2.5 py-0.5 rounded-full ml-2">
                  <Text className="text-xs font-semibold text-gray-600">
                    {storyViewersList.length}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleCloseStoryViewers}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                accessibilityRole="button"
                accessibilityLabel="Close viewers sheet"
              >
                <Ionicons name="close" size={18} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 my-2.5">
              Only you can see who viewed this story.
            </Text>

            {/* Content */}
            {isLoadingStoryViewers ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#16a34a" />
                <Text className="text-sm text-gray-500 mt-3 font-medium">
                  Loading viewers...
                </Text>
              </View>
            ) : storyViewersList.length === 0 ? (
              <View className="py-12 items-center justify-center px-4">
                <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
                  <Ionicons name="eye-off-outline" size={32} color="#9ca3af" />
                </View>
                <Text className="text-base font-bold text-gray-800">
                  No views yet
                </Text>
                <Text className="text-xs text-gray-500 text-center mt-1">
                  When someone views your story, their profile will appear here.
                </Text>
              </View>
            ) : (
              <FlatList
                data={storyViewersList}
                keyExtractor={(item, index) => `${item.userId}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
                renderItem={({ item }) => (
                  <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
                    <View className="flex-row items-center flex-1 mr-3">
                      {Boolean(item.avatarUrl && item.avatarUrl.trim()) ? (
                        <Image
                          source={{ uri: item.avatarUrl.trim() }}
                          className="w-11 h-11 rounded-full bg-gray-100"
                        />
                      ) : (
                        <View className="w-11 h-11 rounded-full bg-green-100 items-center justify-center">
                          <Text className="text-green-800 font-bold text-base">
                            {(item.name || item.username || "U")[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <View className="flex-row items-center">
                          <Text
                            className="font-semibold text-gray-900 text-sm"
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {item.role && (
                            <View className="ml-2 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                              <Text className="text-[10px] text-green-700 font-medium">
                                {item.role}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-400 font-medium">
                      {item.viewedAt}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

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
          /* Step 1: Facebook / Instagram Style Device Photo Picker */
          <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 pt-2 pb-3 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-900">
                Create story
              </Text>
              <TouchableOpacity
                onPress={() => setStoryModalVisible(false)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                accessibilityRole="button"
                accessibilityLabel="Close create story modal"
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Top Quick Action Cards */}
            <View className="flex-row gap-2.5 px-4 pt-3 pb-3">
              {/* Aa Text Story */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedStoryImage(null);
                  setStoryTextContent("");
                  setStoryStep("EDIT_STORY");
                }}
                className="flex-1 bg-indigo-50 border border-indigo-100 rounded-2xl p-3 items-center justify-center active:opacity-80"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center mb-1 shadow-sm">
                  <Text className="text-white text-lg font-bold font-serif">
                    Aa
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-gray-800">
                  Text
                </Text>
              </TouchableOpacity>

              {/* Camera Snap */}
              <TouchableOpacity
                onPress={handlePickCamera}
                className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl p-3 items-center justify-center active:opacity-80"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center mb-1 shadow-sm">
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </View>
                <Text className="text-xs font-semibold text-gray-800">
                  Camera
                </Text>
              </TouchableOpacity>

              {/* Browse Gallery / Files */}
              <TouchableOpacity
                onPress={handlePickGallery}
                className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 items-center justify-center active:opacity-80"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-[#72AF5B] items-center justify-center mb-1 shadow-sm">
                  <Ionicons name="images" size={20} color="#FFFFFF" />
                </View>
                <Text className="text-xs font-semibold text-gray-800">
                  Browse
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recents Bar */}
            <View className="flex-row items-center justify-between px-4 py-2 bg-gray-50 border-y border-gray-100">
              <View className="flex-row items-center">
                <Text className="text-sm font-bold text-gray-800">Recents</Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#4B5563"
                  style={{ marginLeft: 4 }}
                />
              </View>
              <TouchableOpacity
                onPress={handlePickGallery}
                className="px-2.5 py-1 rounded-full bg-white border border-gray-200"
                activeOpacity={0.7}
              >
                <Text className="text-xs font-medium text-gray-600">
                  Browse all
                </Text>
              </TouchableOpacity>
            </View>

            {/* Photos Grid or Fallback State */}
            {loadingDevicePhotos && devicePhotos.length === 0 ? (
              <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#72AF5B" />
                <Text className="text-sm text-gray-500 mt-3 font-medium">
                  Loading photos from your device...
                </Text>
              </View>
            ) : mediaPermissionDenied ? (
              <View className="flex-1 items-center justify-center px-6 py-12">
                <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <Ionicons name="images-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-base font-bold text-gray-800 text-center mb-1">
                  Allow Access to Your Photos
                </Text>
                <Text className="text-xs text-gray-500 text-center mb-6 leading-5">
                  Grant permission to view your device photos and share them directly as stories.
                </Text>
                <TouchableOpacity
                  onPress={() => loadDevicePhotos(true)}
                  className="bg-[#72AF5B] px-6 py-2.5 rounded-full mb-3"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-sm font-semibold">
                    Grant Permission
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePickGallery}
                  className="px-4 py-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-gray-600">
                    Or select from file picker
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={storyGridItems}
                keyExtractor={(item) => item.id}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => {
                  if (item.id === "__camera_tile__") {
                    return (
                      <TouchableOpacity
                        key="__camera_tile__"
                        onPress={handlePickCamera}
                        style={{
                          width: (screenWidth - 4) / 3,
                          height: (screenWidth - 4) / 3,
                          margin: 0.6,
                        }}
                        className="bg-gray-900 items-center justify-center active:opacity-80"
                        activeOpacity={0.7}
                      >
                        <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mb-1">
                          <Ionicons name="camera" size={22} color="#FFFFFF" />
                        </View>
                        <Text className="text-white text-xs font-semibold">
                          Camera
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setSelectedStoryImage(item.uri);
                        setStoryStep("EDIT_STORY");
                      }}
                      activeOpacity={0.8}
                      style={{
                        width: (screenWidth - 4) / 3,
                        height: (screenWidth - 4) / 3,
                        margin: 0.6,
                      }}
                      className="bg-gray-100"
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View className="items-center justify-center py-16 px-4">
                    <Ionicons name="images-outline" size={40} color="#9CA3AF" />
                    <Text className="text-sm font-semibold text-gray-700 mt-3">
                      No photos found on device
                    </Text>
                    <Text className="text-xs text-gray-400 text-center mt-1 mb-4">
                      Take a new picture or choose from the system picker
                    </Text>
                    <TouchableOpacity
                      onPress={handlePickGallery}
                      className="bg-[#72AF5B] px-5 py-2 rounded-full"
                    >
                      <Text className="text-white text-xs font-semibold">
                        Browse Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
                ListFooterComponent={
                  devicePhotos.length === 0 ? (
                    <View className="items-center justify-center py-12 px-6">
                      <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
                        <Ionicons
                          name="images-outline"
                          size={28}
                          color="#9CA3AF"
                        />
                      </View>
                      <Text className="text-sm font-bold text-gray-800 text-center mb-1">
                        No photos in emulator storage
                      </Text>
                      <Text className="text-xs text-gray-500 text-center mb-4 leading-4">
                        Emulators start with an empty camera roll. Snap a photo with the Camera above, or tap Browse All to select from Google Photos or downloads.
                      </Text>
                      <TouchableOpacity
                        onPress={handlePickGallery}
                        className="bg-[#72AF5B] px-5 py-2.5 rounded-full shadow-sm active:opacity-80"
                        activeOpacity={0.8}
                      >
                        <Text className="text-white text-xs font-semibold">
                          Browse All / Google Photos
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null
                }
              />
            )}
          </SafeAreaView>
        ) : storyStep === "PRIVACY_SETTINGS" ? (
          /* Step 3: Story Privacy Settings (Dynamic & Modern) */
          <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 justify-between px-5 pt-2 pb-4 h-full">
              {/* Top Content */}
              <View>
                {/* Back Arrow Button */}
                <TouchableOpacity
                  onPress={() => setStoryStep("EDIT_STORY")}
                  className="w-10 h-10 -ml-2 mb-2 rounded-full items-center justify-center active:bg-gray-100"
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={28} color="#111827" />
                </TouchableOpacity>

                {/* Header Title */}
                <Text className="text-2xl font-bold text-gray-900 mb-1.5">
                  Story Privacy
                </Text>
                <Text className="text-sm text-gray-500 mb-6 leading-5">
                  Choose who can see your story. Your story will stay visible on LocalFarm for 24 hours.
                </Text>

                {/* Privacy Options List */}
                <View>
                  {STORY_PRIVACY_OPTIONS.map((option) => {
                    const isSelected = storyPrivacy === option.title;

                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => setStoryPrivacy(option.title as any)}
                        className={`flex-row items-center p-4 rounded-2xl mb-3 border ${
                          isSelected
                            ? "bg-green-50/70 border-[#72AF5B]"
                            : "bg-white border-gray-200"
                        }`}
                        activeOpacity={0.7}
                      >
                        <View
                          className={`w-11 h-11 rounded-full items-center justify-center mr-3.5 ${
                            isSelected ? "bg-[#72AF5B]" : "bg-gray-100"
                          }`}
                        >
                          <Ionicons
                            name={option.icon}
                            size={22}
                            color={isSelected ? "#FFFFFF" : "#4B5563"}
                          />
                        </View>
                        <View className="flex-1 mr-2">
                          <Text
                            className={`text-base mb-0.5 ${
                              isSelected
                                ? "font-bold text-gray-900"
                                : "font-semibold text-gray-800"
                            }`}
                          >
                            {option.title}
                          </Text>
                          <Text className="text-xs text-gray-500 leading-4">
                            {option.subtitle}
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            isSelected ? "radio-button-on" : "radio-button-off"
                          }
                          size={22}
                          color={isSelected ? "#72AF5B" : "#D1D5DB"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bottom Actions */}
              <View className="mt-auto pb-2">
                {/* Set as default audience Row */}
                <View className="flex-row justify-between items-center mb-4 px-1 py-3 border-t border-gray-100">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm text-gray-900 font-semibold">
                      Set as default audience
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      Remember this privacy setting for future stories
                    </Text>
                  </View>
                  <Switch
                    value={isDefaultStoryAudience}
                    onValueChange={(val) => {
                      setIsDefaultStoryAudience(val);
                      if (val) {
                        AsyncStorage.setItem(
                          "localfarm_default_story_privacy",
                          storyPrivacy,
                        ).catch(() => {});
                      } else {
                        AsyncStorage.removeItem(
                          "localfarm_default_story_privacy",
                        ).catch(() => {});
                      }
                    }}
                    trackColor={{ false: "#E5E7EB", true: "#72AF5B" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Done Button */}
                <TouchableOpacity
                  onPress={handleSaveStoryPrivacy}
                  className="w-full bg-[#72AF5B] py-3.5 rounded-xl items-center justify-center active:opacity-80 shadow-md"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-base">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        ) : (
          /* Step 2: Full Screen Edit Story View */
          <View className="flex-1 bg-black relative">
            {/* Main Media */}
            {Boolean(selectedStoryImage && selectedStoryImage.trim()) ? (
              <View className="flex-1 w-full relative">
                <Image
                  source={{ uri: selectedStoryImage!.trim() }}
                  className="flex-1 w-full"
                  resizeMode="cover"
                />
                <View className="absolute bottom-24 left-4 right-4 bg-black/60 rounded-xl px-4 py-3 z-10 border border-white/20">
                  <TextInput
                    value={storyTextContent}
                    onChangeText={setStoryTextContent}
                    placeholder="Add a caption to your story..."
                    placeholderTextColor="#CBD5E1"
                    className="text-white text-sm"
                  />
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={getStoryGradient(selectedStoryBg)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="flex-1 w-full items-center justify-center p-8 relative"
              >
                <TextInput
                  value={storyTextContent}
                  onChangeText={setStoryTextContent}
                  placeholder="Type your story here... ✍️"
                  placeholderTextColor="rgba(255, 255, 255, 0.65)"
                  multiline
                  className="text-white text-2xl font-bold text-center w-full px-4"
                  autoFocus
                />

                {/* Color Selector Pills */}
                <View className="absolute bottom-28 flex-row gap-3 items-center justify-center">
                  {Object.entries(STORY_GRADIENT_PRESETS).map(([key, colors]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setSelectedStoryBg(key)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        selectedStoryBg === key
                          ? "border-white scale-110"
                          : "border-transparent opacity-80"
                      }`}
                      style={{ backgroundColor: colors[1] }}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${key} gradient`}
                    />
                  ))}
                </View>
              </LinearGradient>
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
                onPress={handleShareStory}
                disabled={isSharingStory}
                className="bg-[#72AF5B] px-6 py-3 rounded-full flex-row items-center active:bg-[#5e944b] shadow-lg"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Share story"
              >
                {isSharingStory ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    className="mr-2"
                  />
                ) : (
                  <>
                    <Text className="text-white font-bold text-base mr-2">
                      Share
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* 1. Post Options Action Sheet Modal */}
      <Modal
        visible={isPostMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsPostMenuVisible(false);
          postOptionsMenuTranslateY.setValue(0);
        }}
      >
        <Pressable
          onPress={() => {
            setIsPostMenuVisible(false);
            postOptionsMenuTranslateY.setValue(0);
          }}
          className="flex-1 bg-black/50 justify-end"
        >
          <Animated.View
            style={{
              transform: [{ translateY: postOptionsMenuTranslateY }],
            }}
            {...postOptionsMenuPanResponder.panHandlers}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl p-5 pb-9 shadow-2xl"
            >
              {/* Header Handle / Drag Indicator */}
              <View className="w-full items-center pt-0 pb-3 -mt-1">
                <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </View>

              <Text className="text-base font-bold text-gray-900 mb-3 px-1">
                Post Options
              </Text>

              {isPostOwner(selectedPostForMenu) ? (
                <View className="gap-1">
                  {/* Edit Post */}
                  <TouchableOpacity
                    onPress={handleOpenEditModal}
                    className="flex-row items-center py-3 px-2 rounded-xl active:bg-gray-100"
                  >
                    <View className="w-10 h-10 rounded-full bg-[#72AF5B] items-center justify-center mr-3">
                      <Ionicons
                        name="create-outline"
                        size={22}
                        color="#ffffff"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        Edit Post
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Update content, category, or privacy
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Change Privacy */}
                  <TouchableOpacity
                    onPress={() => {
                      setIsPostMenuVisible(false);
                      setIsPrivacyModalVisible(true);
                    }}
                    className="flex-row items-center py-3 px-2 rounded-xl active:bg-gray-100"
                  >
                    <View className="w-10 h-10 rounded-full bg-[#72AF5B] items-center justify-center mr-3">
                      <Ionicons
                        name="globe-outline"
                        size={22}
                        color="#ffffff"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        Change Audience
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Current: {selectedPostForMenu?.privacy || "Public"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>

                  {/* Delete Post */}
                  <TouchableOpacity
                    onPress={() => {
                      setIsPostMenuVisible(false);
                      setIsDeleteConfirmVisible(true);
                    }}
                    className="flex-row items-center py-3 px-2 rounded-xl active:bg-red-50"
                  >
                    <View className="w-10 h-10 rounded-full bg-[#E45742] items-center justify-center mr-3">
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#ffffff"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-red-600">
                        Delete Post
                      </Text>
                      <Text className="text-xs text-red-400">
                        Remove this post permanently
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-1">
                  {/* Save Post */}
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedPostForMenu) {
                        handleToggleSavePost(selectedPostForMenu.id);
                      }
                      setIsPostMenuVisible(false);
                    }}
                    className="flex-row items-center py-3 px-2 rounded-xl active:bg-gray-100"
                  >
                    <View className="w-10 h-10 rounded-full bg-yellow-50 items-center justify-center mr-3">
                      <Ionicons
                        name="bookmark-outline"
                        size={22}
                        color="#EAB308"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        Save Post
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Add to your saved posts
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Hide Post */}
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedPostForMenu) {
                        setPosts((prev) =>
                          prev.filter((p) => p.id !== selectedPostForMenu.id),
                        );
                        showToast("Post hidden from your feed.", "info");
                      }
                      setIsPostMenuVisible(false);
                    }}
                    className="flex-row items-center py-3 px-2 rounded-xl active:bg-gray-100"
                  >
                    <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                      <Ionicons
                        name="eye-off-outline"
                        size={22}
                        color="#6B7280"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        Hide Post
                      </Text>
                      <Text className="text-xs text-gray-500">
                        See fewer posts like this
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* 2. Edit Post Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(false)}
              className="p-1 active:opacity-70"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-base font-bold text-gray-900">Edit Post</Text>
            <TouchableOpacity
              onPress={handleSaveEditPost}
              disabled={isUpdatingPost}
              className="bg-[#72AF5B] px-4 py-1.5 rounded-full active:opacity-80"
            >
              {isUpdatingPost ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-sm">Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 p-4"
            keyboardShouldPersistTaps="handled"
          >
            {/* Category Selector */}
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(["Field", "Wholesaler", "Temporary", "General"] as const).map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setEditPostCategory(cat)}
                    className={`px-3 py-1.5 rounded-full border ${
                      editPostCategory === cat
                        ? "bg-[#72AF5B] border-[#72AF5B]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        editPostCategory === cat
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            {/* Privacy Selector */}
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Audience / Privacy
            </Text>
            <View className="flex-row gap-2 mb-4">
              {(["Public", "Friends", "Only me"] as const).map((priv) => (
                <TouchableOpacity
                  key={priv}
                  onPress={() => setEditPostPrivacy(priv)}
                  className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                    editPostPrivacy === priv
                      ? "bg-[#72AF5B] border-[#72AF5B]"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Ionicons
                    name={
                      priv === "Public"
                        ? "globe-outline"
                        : priv === "Friends"
                          ? "people-outline"
                          : "lock-closed-outline"
                    }
                    size={14}
                    color={editPostPrivacy === priv ? "#FFFFFF" : "#6B7280"}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      editPostPrivacy === priv ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {priv}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content Input */}
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Post Content
            </Text>
            <TextInput
              value={editPostContent}
              onChangeText={setEditPostContent}
              placeholder="What do you want to update?"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 min-h-[140px]"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 3. Quick Privacy Change Modal */}
      <Modal
        visible={isPrivacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPrivacyModalVisible(false)}
      >
        <Pressable
          onPress={() => setIsPrivacyModalVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
          >
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-base font-bold text-gray-900 mb-1">
              Select Audience
            </Text>
            <Text className="text-xs text-gray-500 mb-4">
              Who can see this post on Local Farm?
            </Text>

            <View className="gap-2">
              {[
                {
                  type: "Public",
                  title: "Public",
                  desc: "Anyone on or off Local Farm",
                  icon: "globe-outline",
                },
                {
                  type: "Friends",
                  title: "Friends",
                  desc: "Your connections on Local Farm",
                  icon: "people-outline",
                },
                {
                  type: "Only me",
                  title: "Only me",
                  desc: "Only you can see this post",
                  icon: "lock-closed-outline",
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.type}
                  onPress={() => handleQuickChangePrivacy(item.type)}
                  className={`flex-row items-center p-3 rounded-2xl border ${
                    selectedPostForMenu?.privacy === item.type
                      ? "bg-green-50/50 border-[#72AF5B]"
                      : "bg-gray-50 border-gray-200"
                  } active:opacity-80`}
                >
                  <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 border border-gray-100 shadow-xs">
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color="#72AF5B"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      {item.title}
                    </Text>
                    <Text className="text-xs text-gray-500">{item.desc}</Text>
                  </View>
                  {selectedPostForMenu?.privacy === item.type && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#72AF5B"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setIsPrivacyModalVisible(false)}
              className="mt-4 py-3 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-700">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 4. Delete Confirmation Modal */}
      <Modal
        visible={isDeleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteConfirmVisible(false)}
      >
        <Pressable
          onPress={() => setIsDeleteConfirmVisible(false)}
          className="flex-1 bg-black/50 items-center justify-center p-4"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl"
          >
            <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-4">
              <Ionicons name="trash-outline" size={28} color="#EF4444" />
            </View>
            <Text className="text-lg font-bold text-gray-900 text-center mb-1.5">
              Delete Post?
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-6 leading-4">
              Are you sure you want to delete this post? This action cannot be
              undone.
            </Text>

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setIsDeleteConfirmVisible(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Text className="text-sm font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeletePost}
                disabled={isDeletingPost}
                className="flex-1 py-3 rounded-xl bg-red-600 items-center justify-center active:bg-red-700"
              >
                {isDeletingPost ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-bold text-white">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 5. Standalone Comments Bottom Sheet Modal */}
      {(() => {
        if (!activeCommentsPostId) return null;
        const currentPost = posts.find((p) => p.id === activeCommentsPostId);
        const currentComments = postComments[activeCommentsPostId] || [];
        const commentsCount =
          postComments[activeCommentsPostId] !== undefined
            ? postComments[activeCommentsPostId].length
            : currentPost?.comments || 0;

        return (
          <Modal
            visible={activeCommentsPostId !== null}
            transparent={true}
            animationType="slide"
            statusBarTranslucent={true}
            onRequestClose={() => {
              setActiveCommentsPostId(null);
              setReplyingTo(null);
            }}
          >
            <View className="flex-1 bg-black/60 justify-end">
              {/* Backdrop Pressable */}
              <Pressable
                className="absolute inset-0"
                onPress={() => {
                  setActiveCommentsPostId(null);
                  setReplyingTo(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close comments backdrop"
              />

              <Animated.View
                style={{
                  height: Dimensions.get("window").height * 0.72,
                  maxHeight: "85%",
                  elevation: 25,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: -6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  transform: [{ translateY: standaloneCommentsTranslateY }],
                }}
                className="bg-white rounded-t-3xl flex-col overflow-hidden w-full"
              >
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                  className="flex-1 flex-col"
                >
                  {/* Drawer Drag Handle & Header (Swipe down to close) */}
                  <View
                    {...standaloneCommentsPanResponder.panHandlers}
                    className="pt-3 pb-2.5 px-5 border-b border-gray-100 bg-white"
                  >
                    <View className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-2" />
                    <Text className="text-base font-bold text-gray-900 text-center">
                      Comments
                    </Text>
                  </View>

                  {/* Comments List */}
                  <ScrollView
                    className="flex-1 px-4 py-3"
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 24 }}
                  >
                    {loadingComments[activeCommentsPostId] ? (
                      <View className="py-16 items-center justify-center">
                        <ActivityIndicator size="small" color="#72AF5B" />
                        <Text className="text-xs text-gray-400 mt-2 font-medium">
                          Loading comments...
                        </Text>
                      </View>
                    ) : currentComments.length === 0 ? (
                      <View className="py-16 items-center justify-center px-6">
                        <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-3">
                          <Ionicons
                            name="chatbubbles-outline"
                            size={28}
                            color="#72AF5B"
                          />
                        </View>
                        <Text className="text-sm font-bold text-gray-800">
                          No comments yet
                        </Text>
                        <Text className="text-xs text-gray-400 text-center mt-1">
                          Be the first to share your thoughts!
                        </Text>
                      </View>
                    ) : (
                      (() => {
                        const getThreadReplies = (
                          parentId: string,
                          all: CommentItem[],
                        ): CommentItem[] => {
                          const direct = all.filter(
                            (c) => c.parentId === parentId,
                          );
                          const result: CommentItem[] = [];
                          for (const item of direct) {
                            result.push(item);
                            result.push(...getThreadReplies(item.id, all));
                          }
                          return result;
                        };

                        const rootComments = currentComments.filter(
                          (c) =>
                            !c.parentId ||
                            !currentComments.some((p) => p.id === c.parentId),
                        );

                        return rootComments.map((rootComment) => {
                          const childReplies = getThreadReplies(
                            rootComment.id,
                            currentComments,
                          );
                          const areRepliesExpanded =
                            !!expandedReplyCommentIds[rootComment.id];

                          const renderCommentItem = (
                            comment: CommentItem,
                            isReply: boolean,
                          ) => {
                            const currentCommentReaction =
                              commentReactions[comment.id];
                            const hasCommentReaction =
                              Boolean(currentCommentReaction) ||
                              comment.isLiked;
                            const commentLikesCount = comment.likes;

                            return (
                              <View
                                key={comment.id}
                                className={`flex-row items-start mb-3.5 relative ${
                                  isReply
                                    ? "ml-10 pl-3 border-l-2 border-gray-200 mt-1"
                                    : ""
                                }`}
                              >
                                {/* Avatar */}
                                <View
                                  className={`${
                                    isReply ? "h-7 w-7" : "h-8 w-8"
                                  } rounded-full mr-2.5 bg-gray-200 items-center justify-center overflow-hidden border border-gray-100`}
                                >
                                  {Boolean(comment.avatarUri && comment.avatarUri.trim()) ? (
                                    <Image
                                      source={{ uri: comment.avatarUri!.trim() }}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                      }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <Ionicons
                                      name="person"
                                      size={isReply ? 13 : 15}
                                      color="#9CA3AF"
                                    />
                                  )}
                                </View>

                                {/* Content */}
                                <View className="flex-1">
                                  {/* Author Row */}
                                  <View className="flex-row justify-between items-center mb-0.5">
                                    <View className="flex-row items-center gap-1">
                                      <Text
                                        className={`${
                                          isReply ? "text-xs" : "text-sm"
                                        } font-bold text-gray-900`}
                                      >
                                        {comment.authorName}
                                      </Text>
                                      {(comment.isVerified ||
                                        ((Boolean(
                                          user?.id &&
                                          comment.userId === String(user.id),
                                        ) ||
                                          comment.authorName === user?.name ||
                                          comment.authorName ===
                                            user?.username) &&
                                          isRSBSAVerified)) && (
                                        <Ionicons
                                          name="checkmark-circle"
                                          size={13}
                                          color="#10B981"
                                        />
                                      )}
                                    </View>
                                    <Text className="text-[11px] text-gray-400">
                                      {comment.timeAgo}
                                    </Text>
                                  </View>

                                  {/* Comment Text */}
                                  <Text className="text-sm text-gray-700 leading-5">
                                    {comment.content}
                                  </Text>

                                  {/* Interaction Row */}
                                  <View className="flex-row items-center gap-4 mt-1.5">
                                    {/* Like button */}
                                    <TouchableOpacity
                                      onPress={() =>
                                        activeCommentsPostId &&
                                        handleToggleCommentLike(
                                          activeCommentsPostId,
                                          comment.id,
                                        )
                                      }
                                      className="flex-row items-center gap-1 active:opacity-70"
                                      hitSlop={{
                                        top: 6,
                                        bottom: 6,
                                        left: 6,
                                        right: 6,
                                      }}
                                    >
                                      <Ionicons
                                        name={
                                          hasCommentReaction
                                            ? "heart"
                                            : "heart-outline"
                                        }
                                        size={15}
                                        color={
                                          hasCommentReaction
                                            ? "#EF4444"
                                            : "#6B7280"
                                        }
                                      />
                                      <Text
                                        className={`text-xs ${
                                          hasCommentReaction
                                            ? "text-[#EF4444] font-bold"
                                            : "text-gray-500 font-medium"
                                        }`}
                                      >
                                        {commentLikesCount}
                                      </Text>
                                    </TouchableOpacity>

                                    {/* Reply trigger */}
                                    <TouchableOpacity
                                      onPress={() => {
                                        setReplyingTo({
                                          commentId: comment.id,
                                          username: comment.authorName,
                                        });
                                        commentInputRef.current?.focus();
                                      }}
                                      className="active:opacity-70 py-0.5"
                                      hitSlop={{
                                        top: 8,
                                        bottom: 8,
                                        left: 8,
                                        right: 8,
                                      }}
                                    >
                                      <Text
                                        numberOfLines={1}
                                        className="text-xs text-gray-500 font-medium hover:text-[#72AF5B]"
                                      >
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
                              {renderCommentItem(rootComment, false)}

                              {childReplies.length > 0 &&
                                !areRepliesExpanded && (
                                  <TouchableOpacity
                                    onPress={() =>
                                      toggleRepliesVisibility(rootComment.id)
                                    }
                                    style={{ flexWrap: "nowrap" }}
                                    className="flex-row items-center ml-10 py-1.5 mb-2 active:opacity-70 self-start"
                                    activeOpacity={0.7}
                                    hitSlop={{
                                      top: 8,
                                      bottom: 8,
                                      left: 8,
                                      right: 8,
                                    }}
                                  >
                                    <View className="w-5 h-[1.5px] bg-[#72AF5B] mr-2 rounded-full" />
                                    <Text
                                      numberOfLines={1}
                                      style={{ flexShrink: 0 }}
                                      className="text-xs font-bold text-[#72AF5B]"
                                    >
                                      {childReplies.length === 1
                                        ? "View 1 reply"
                                        : `View all ${childReplies.length} replies`}
                                    </Text>
                                    <Ionicons
                                      name="chevron-down"
                                      size={13}
                                      color="#72AF5B"
                                      style={{ marginLeft: 4 }}
                                    />
                                  </TouchableOpacity>
                                )}

                              {childReplies.length > 0 &&
                                areRepliesExpanded && (
                                  <View className="mb-1">
                                    {childReplies.map((reply) =>
                                      renderCommentItem(reply, true),
                                    )}
                                    <TouchableOpacity
                                      onPress={() =>
                                        toggleRepliesVisibility(rootComment.id)
                                      }
                                      style={{ flexWrap: "nowrap" }}
                                      className="flex-row items-center ml-10 py-1.5 mb-2 active:opacity-70 self-start"
                                      activeOpacity={0.7}
                                      hitSlop={{
                                        top: 8,
                                        bottom: 8,
                                        left: 8,
                                        right: 8,
                                      }}
                                    >
                                      <View className="w-5 h-[1.5px] bg-gray-300 mr-2 rounded-full" />
                                      <Text
                                        numberOfLines={1}
                                        style={{ flexShrink: 0 }}
                                        className="text-xs font-semibold text-gray-500 hover:text-[#72AF5B]"
                                      >
                                        Hide replies
                                      </Text>
                                      <Ionicons
                                        name="chevron-up"
                                        size={13}
                                        color="#9CA3AF"
                                        style={{ marginLeft: 4 }}
                                      />
                                    </TouchableOpacity>
                                  </View>
                                )}
                            </View>
                          );
                        });
                      })()
                    )}
                  </ScrollView>

                  {/* Bottom Pinned Comment Input Section */}
                  <View
                    style={{ paddingBottom: Math.max(insets.bottom, 16) + 6 }}
                    className="px-4 pt-2.5 border-t border-gray-200 bg-white"
                  >
                    {replyingTo && (
                      <View className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 flex-row justify-between items-center rounded-t-xl border-b-0 mb-1">
                        <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                          <Ionicons
                            name="return-down-forward"
                            size={14}
                            color="#72AF5B"
                          />
                          <Text
                            className="text-xs text-gray-700"
                            numberOfLines={1}
                          >
                            Replying to{" "}
                            <Text className="font-bold text-gray-900">
                              @{replyingTo.username}
                            </Text>
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setReplyingTo(null)}
                          className="p-1 active:opacity-70"
                          accessibilityRole="button"
                          accessibilityLabel="Cancel reply"
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                      </View>
                    )}

                    <View
                      className={`bg-gray-50 border border-gray-200 px-4 py-2 flex-row items-center shadow-xs ${
                        replyingTo
                          ? "rounded-b-xl rounded-t-none"
                          : "rounded-full"
                      }`}
                    >
                      <TextInput
                        ref={commentInputRef}
                        value={commentInputs[activeCommentsPostId] || ""}
                        onChangeText={(text) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [activeCommentsPostId]: text,
                          }))
                        }
                        placeholder={
                          replyingTo
                            ? `Reply to @${replyingTo.username}...`
                            : "Add a comment..."
                        }
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 text-sm text-gray-800 p-0"
                        onSubmitEditing={() =>
                          activeCommentsPostId &&
                          handleAddComment(activeCommentsPostId)
                        }
                        returnKeyType="send"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          activeCommentsPostId &&
                          handleAddComment(activeCommentsPostId)
                        }
                        disabled={
                          !(commentInputs[activeCommentsPostId] || "").trim() ||
                          submittingComments[activeCommentsPostId]
                        }
                        className={`ml-2 p-2 rounded-full items-center justify-center min-w-[32px] min-h-[32px] ${
                          (commentInputs[activeCommentsPostId] || "").trim() &&
                          !submittingComments[activeCommentsPostId]
                            ? "bg-[#72AF5B] active:opacity-85"
                            : "bg-gray-200 opacity-60"
                        }`}
                      >
                        {submittingComments[activeCommentsPostId] ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="send" size={14} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </Animated.View>
            </View>
          </Modal>
        );
      })()}

      {/* 6. Fullscreen Image Lightbox Modal */}
      <Modal
        visible={!!previewImage}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleCloseLightbox}
      >
        {(() => {
          if (!previewImage) return null;
          const imagesList =
            previewImage.images && previewImage.images.length > 0
              ? previewImage.images.filter((img) => Boolean(typeof img === "string" ? img.trim() : img))
              : previewImage.uri && previewImage.uri.trim()
                ? [previewImage.uri.trim()]
                : previewImage.source
                  ? [previewImage.source]
                  : [];

          return (
            <View className="flex-1 bg-black/95 justify-between relative">
              {/* Top Bar with Pagination Counter & Close Button */}
              <View
                style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
                className="px-4 pb-3 flex-row items-center justify-between z-20"
              >
                {imagesList.length > 1 ? (
                  <View className="bg-white/20 px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">
                      {(previewImage.currentIndex ?? 0) + 1} / {imagesList.length}
                    </Text>
                  </View>
                ) : (
                  <View className="w-10" />
                )}

                <TouchableOpacity
                  onPress={handleCloseLightbox}
                  className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
                  accessibilityRole="button"
                  accessibilityLabel="Close image preview"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Horizontal Swipeable Image Gallery (Slide Left / Right) */}
              <View className="flex-1 justify-center relative">
                <FlatList
                  ref={lightboxListRef}
                  data={imagesList}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={
                    previewImage.currentIndex &&
                    previewImage.currentIndex >= 0 &&
                    previewImage.currentIndex < imagesList.length
                      ? previewImage.currentIndex
                      : 0
                  }
                  getItemLayout={(_, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                  })}
                  onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                      lightboxListRef.current?.scrollToOffset({
                        offset: info.index * screenWidth,
                        animated: false,
                      });
                    }, 50);
                  }}
                  onMomentumScrollEnd={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    const newIdx = Math.round(offsetX / screenWidth);
                    if (
                      newIdx >= 0 &&
                      newIdx < imagesList.length &&
                      newIdx !== previewImage.currentIndex
                    ) {
                      setPreviewImage((prev) =>
                        prev ? { ...prev, currentIndex: newIdx } : null,
                      );
                    }
                  }}
                  keyExtractor={(_, idx) => `lightbox-feed-img-${idx}`}
                  renderItem={({ item }) => (
                    <Pressable
                      style={{ width: screenWidth }}
                      className="flex-1 items-center justify-center px-2"
                      onPress={handleCloseLightbox}
                    >
                      <Image
                        source={typeof item === "string" ? { uri: item } : item}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="contain"
                      />
                    </Pressable>
                  )}
                />
              </View>

              {/* Dot Indicators for multi-image gallery */}
              {imagesList.length > 1 && (
                <View className="flex-row justify-center items-center gap-1.5 pb-2 z-20">
                  {imagesList.map((_, dotIdx) => (
                    <View
                      key={dotIdx}
                      className={`h-1.5 rounded-full ${
                        dotIdx === (previewImage.currentIndex ?? 0)
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/40"
                      }`}
                    />
                  ))}
                </View>
              )}

              {/* Bottom Caption (if available) */}
              {previewImage?.caption ? (
                <View
                  style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
                  className="bg-black/75 border-t border-white/10 z-10 px-5 pt-3 pb-2"
                >
                  <ScrollView
                    style={{ maxHeight: 90 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text className="text-white/95 text-sm leading-5">
                      {previewImage.caption}
                    </Text>
                  </ScrollView>
                </View>
              ) : null}
            </View>
          );
        })()}
      </Modal>

      {/* Create Post Modal */}
      <CreatePostModal
        isVisible={isCreatePostVisible}
        onClose={() => setCreatePostVisible(false)}
        onPost={handleNewPostCreated}
      />

      {/* Live Stream Viewer Simulation Modal */}
      <LiveViewerModal
        isVisible={isLiveViewerVisible}
        onClose={() => setIsLiveViewerVisible(false)}
        authorName={liveViewerData.authorName}
        authorAvatar={liveViewerData.authorAvatar}
        streamTitle={liveViewerData.streamTitle}
        location={liveViewerData.location}
        isReplay={liveViewerData.isReplay}
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar onFabPress={() => setCreatePostVisible(true)} />
    </SafeAreaView>
  );
}
