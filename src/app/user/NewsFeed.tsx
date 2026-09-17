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
  markStoryViewedApi,
  StoryItem,
  UserStory,
} from "@/services/story-service";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
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

const getStaticLocationCoords = (locationName?: string) => {
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
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [storyTextContent, setStoryTextContent] = useState("");
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeSubStoryIndex, setActiveSubStoryIndex] = useState<number>(0);
  const [isStoryModalVisible, setStoryModalVisible] = useState(false);
  const [storyStep, setStoryStep] = useState<
    "SELECT_MEDIA" | "EDIT_STORY" | "PRIVACY_SETTINGS"
  >("SELECT_MEDIA");
  const [selectedStoryImage, setSelectedStoryImage] = useState<string | null>(
    null,
  );
  const [storyPrivacy, setStoryPrivacy] = useState<
    "Public" | "Friends" | "Only me"
  >("Public");
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
    setPreviewImage(data);
  };

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);

  const fetchFeedPosts = async () => {
    try {
      const data = await getPostsApi();
      setPosts(data);
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
    }, [])
  );

  // Auto-mark story as viewed when viewed by user
  useEffect(() => {
    if (activeStoryIndex !== null && userStories[activeStoryIndex]) {
      const activeStory = userStories[activeStoryIndex].stories[activeSubStoryIndex];
      if (activeStory && !activeStory.isSeen) {
        markStoryViewedApi(activeStory.id);
        setUserStories((prev) =>
          prev.map((u, uIdx) => {
            if (uIdx !== activeStoryIndex) return u;
            return {
              ...u,
              stories: u.stories.map((s, sIdx) =>
                sIdx === activeSubStoryIndex ? { ...s, isSeen: true } : s
              ),
            };
          })
        );
      }
    }
  }, [activeStoryIndex, activeSubStoryIndex]);

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
        privacy: storyPrivacy,
      });
      showToast("Story shared successfully!", "success");
      setStoryModalVisible(false);
      setSelectedStoryImage(null);
      setStoryTextContent("");
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

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const wasLiked = p.isLiked || selectedReactions[postId] === "like";
          return {
            ...p,
            isLiked: !wasLiked,
            likes: wasLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
          };
        }
        return p;
      }),
    );

    setSelectedReactions((prev) => {
      const current = prev[postId];
      return {
        ...prev,
        [postId]: current ? null : "like",
      };
    });

    try {
      const res = await toggleLikePostApi(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: res.isLiked, likes: res.likesCount }
            : p,
        ),
      );
    } catch (err) {
      console.log("[NewsFeed] Error toggling like:", err);
    }
  };

  const handleSelectReaction = (postId: string, reaction: ReactionType) => {
    setSelectedReactions((prev) => ({
      ...prev,
      [postId]: prev[postId] === reaction ? null : reaction,
    }));
    setActiveReactionPostId(null);
  };

  // Share to Feed Dialog Modal State
  const [shareDialogPost, setShareDialogPost] = useState<PostItem | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [isSharingPost, setIsSharingPost] = useState(false);

  const handleToggleShare = (postId: string) => {
    if (activeReactionPostId) setActiveReactionPostId(null);
    setActiveSharePostId((prev) => (prev === postId ? null : postId));
  };

  const handleOpenShareDialog = (post: PostItem) => {
    setActiveSharePostId(null);
    setShareCaption("");
    setShareDialogPost(post);
  };

  const handleShareOptionClick = async (postId: string, optionId: string) => {
    setActiveSharePostId(null);
    const targetPost = posts.find((p) => p.id === postId);

    if (optionId === "public" || optionId === "feed") {
      if (targetPost) {
        handleOpenShareDialog(targetPost);
      }
      return;
    }

    if (optionId === "copy") {
      showToast("Post link copied to clipboard!", "success");
      return;
    }

    try {
      const res = await sharePostApi(postId, optionId);
      setPosts((prev) => {
        const updated = prev.map((p) =>
          p.id === postId ? { ...p, shares: res.sharesCount } : p,
        );
        if (res.sharedPost) {
          return [res.sharedPost, ...updated];
        }
        return updated;
      });
      showToast(`Post shared! (${optionId})`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to share post.", "error");
    }
  };

  const handleConfirmShare = async () => {
    if (!shareDialogPost) return;
    setIsSharingPost(true);
    try {
      const res = await sharePostApi(
        shareDialogPost.id,
        "public",
        shareCaption.trim(),
      );
      setPosts((prev) => {
        const updated = prev.map((p) =>
          p.id === shareDialogPost.id ? { ...p, shares: res.sharesCount } : p,
        );
        if (res.sharedPost) {
          return [res.sharedPost, ...updated];
        }
        return updated;
      });
      showToast("Post shared to your feed!", "success");
      setShareDialogPost(null);
      setShareCaption("");
    } catch (err: any) {
      showToast(err?.message || "Failed to share post.", "error");
    } finally {
      setIsSharingPost(false);
    }
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
        avatarUri:
          user?.avatarUrl ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
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
    collectionName: string = "All Saved",
  ) => {
    try {
      const res = await toggleSavePostApi(postId, collectionName);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: res.isSaved } : p)),
      );
      setBookmarkedPosts((prev) => ({
        ...prev,
        [postId]: res.isSaved ? collectionName : "",
      }));
      showToast(res.message, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save post.", "error");
    }
  };

  const handleCreateCollection = async () => {
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
      await handleToggleSavePost(bookmarkPostId, trimmed);
    }

    setNewCollectionName("");
    setNewCollectionModalVisible(false);
    setBookmarkPostId(null);
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
      const prevUserStories = userStories[activeStoryIndex - 1]?.stories || [];
      setActiveStoryIndex(activeStoryIndex - 1);
      setActiveSubStoryIndex(Math.max(0, prevUserStories.length - 1));
    }
  };

  const handleNextStory = () => {
    if (activeStoryIndex === null) return;
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
    activeStoryIndex !== null ? userStories[activeStoryIndex] : null;
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
                        {user?.avatarUrl ? (
                          <Image
                            source={{ uri: user.avatarUrl }}
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
                            {userStory.userAvatar ? (
                              <Image
                                source={{ uri: userStory.userAvatar }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Ionicons name="person" size={28} color="#6B7280" />
                            )}
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
                    const isShareMenuOpen = activeSharePostId === post.id;
                    const isCardElevated =
                      isReactionMenuOpen || isShareMenuOpen;

                    const currentReaction = selectedReactions[post.id];
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
                                  Flash Post
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
                                {post.avatarUri ? (
                                  <Image
                                    source={{ uri: post.avatarUri }}
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
                                  {Boolean(post.taggedUsers && post.taggedUsers.length > 0) && (
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
                                  {post.originalPost.avatarUri ? (
                                    <Image
                                      source={{
                                        uri: post.originalPost.avatarUri,
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
                              {post.originalPost.imageUrl ? (
                                <TouchableOpacity
                                  activeOpacity={0.9}
                                  onPress={() =>
                                    handleOpenPreview({
                                      uri: post.originalPost!.imageUrl,
                                      caption: post.originalPost!.content,
                                      authorName: post.originalPost!.authorName,
                                      timeAgo: post.originalPost!.timeAgo,
                                      postId: post.id,
                                      authorRole: post.authorRole,
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
                                >
                                  <Image
                                    source={{ uri: post.originalPost.imageUrl }}
                                    className="w-full rounded-lg bg-gray-100"
                                    style={{
                                      width: "100%",
                                      height: 180,
                                      borderRadius: 8,
                                    }}
                                    resizeMode="cover"
                                  />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          ) : /* Standard Post Image */
                          post.imageUrl ? (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() =>
                                handleOpenPreview({
                                  uri: post.imageUrl,
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
                                source={{ uri: post.imageUrl }}
                                className="w-full rounded-lg mb-4 bg-gray-100"
                                style={{
                                  width: "100%",
                                  height: 224,
                                  borderRadius: 8,
                                }}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
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
                                      getStaticLocationCoords(post.location)
                                        .latitude
                                    }
                                    longitude={
                                      getStaticLocationCoords(post.location)
                                        .longitude
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
                                onPress={() => handleToggleShare(post.id)}
                                className="flex-row items-center gap-1.5 active:opacity-70"
                              >
                                <Ionicons
                                  name="share-social-outline"
                                  size={22}
                                  color={
                                    isShareMenuOpen ? "#72AF5B" : "#6b7280"
                                  }
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
                              onPress={() => handleToggleSavePost(post.id)}
                              onLongPress={() => setBookmarkPostId(post.id)}
                              className="active:opacity-70 p-0.5"
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

      {/* Facebook-style Share to Feed Dialog Modal */}
      <Modal
        visible={shareDialogPost !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isSharingPost) {
            setShareDialogPost(null);
            setShareCaption("");
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/60 justify-center items-center p-4"
        >
          <Pressable
            className="absolute inset-0"
            onPress={() => {
              if (!isSharingPost) {
                setShareDialogPost(null);
                setShareCaption("");
              }
            }}
          />
          <View
            className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[85vh] flex-col"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
              <Text className="text-lg font-bold text-gray-900">
                Share to Feed
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShareDialogPost(null);
                  setShareCaption("");
                }}
                disabled={isSharingPost}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                accessibilityRole="button"
                accessibilityLabel="Close share dialog"
              >
                <Ionicons name="close" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-5 py-4"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logged-in User Profile Row */}
              <View className="flex-row items-center mb-3">
                <View className="w-11 h-11 rounded-full border border-green-500 items-center justify-center bg-gray-100 mr-3 overflow-hidden">
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={22} color="#9CA3AF" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-base">
                    {user?.name || user?.username || "You"}
                  </Text>
                  <View className="flex-row items-center mt-1 bg-green-50 self-start px-2 py-0.5 rounded-full border border-green-200/60">
                    <Ionicons name="globe-outline" size={12} color="#166534" />
                    <Text className="text-xs font-semibold text-green-800 ml-1">
                      Public
                    </Text>
                  </View>
                </View>
              </View>

              {/* Custom Description / Thoughts Input */}
              <TextInput
                value={shareCaption}
                onChangeText={setShareCaption}
                placeholder="Say something about this post..."
                placeholderTextColor="#9CA3AF"
                multiline
                className="text-base text-gray-800 min-h-[90px] text-top mb-4"
                style={{ textAlignVertical: "top" }}
                autoFocus={true}
              />

              {/* Original Post Preview Box (Facebook Embed Style) */}
              {shareDialogPost && (
                <View className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/70 mb-2">
                  {/* Original Author Info */}
                  <View className="flex-row items-center mb-2.5">
                    <View className="w-8 h-8 rounded-full border border-green-400 items-center justify-center bg-gray-200 mr-2.5 overflow-hidden">
                      {shareDialogPost.originalPost?.avatarUri ||
                      shareDialogPost.avatarUri ? (
                        <Image
                          source={{
                            uri:
                              shareDialogPost.originalPost?.avatarUri ||
                              shareDialogPost.avatarUri,
                          }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={16} color="#9CA3AF" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-bold text-gray-900 text-xs"
                        numberOfLines={1}
                      >
                        {shareDialogPost.originalPost?.authorName ||
                          shareDialogPost.authorName}
                      </Text>
                      <Text
                        className="text-[11px] text-gray-500"
                        numberOfLines={1}
                      >
                        {shareDialogPost.originalPost?.authorRole ||
                          shareDialogPost.authorRole}{" "}
                        •{" "}
                        {shareDialogPost.originalPost?.timeAgo ||
                          shareDialogPost.timeAgo}
                      </Text>
                    </View>
                  </View>

                  {/* Original Post Content Snippet */}
                  {shareDialogPost.originalPost?.content ||
                  shareDialogPost.content ? (
                    <Text
                      className="text-sm text-gray-700 mb-2 leading-relaxed"
                      numberOfLines={4}
                    >
                      {shareDialogPost.originalPost?.content ||
                        shareDialogPost.content}
                    </Text>
                  ) : null}

                  {/* Original Post Image (if any) */}
                  {shareDialogPost.originalPost?.imageUrl ||
                  shareDialogPost.imageUrl ? (
                    <Image
                      source={{
                        uri:
                          shareDialogPost.originalPost?.imageUrl ||
                          shareDialogPost.imageUrl,
                      }}
                      className="w-full h-40 rounded-xl bg-gray-200"
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Share Button */}
            <View className="px-5 py-3.5 border-t border-gray-100 bg-white">
              <TouchableOpacity
                onPress={handleConfirmShare}
                disabled={isSharingPost}
                className="w-full py-3.5 rounded-xl bg-[#72AF5B] items-center justify-center flex-row shadow-sm active:bg-[#5e944a]"
                activeOpacity={0.85}
              >
                {isSharingPost ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="arrow-redo" size={18} color="#ffffff" />
                    <Text className="text-white font-bold text-base ml-2">
                      Share Now
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                          handleToggleSavePost(bookmarkPostId, col.name);
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
                    className="h-10 w-10 rounded-full border-2 items-center justify-center bg-gray-800 mr-3 overflow-hidden"
                    style={{ borderColor: "#72AF5B" }}
                  >
                    {currentStoryUser.userAvatar ? (
                      <Image
                        source={{ uri: currentStoryUser.userAvatar }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={20} color="#9CA3AF" />
                    )}
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
                  {activeStoryIndex === userStories.length - 1 &&
                  activeSubStoryIndex === currentStoryUser.stories.length - 1
                    ? "Close"
                    : "Next"}
                </Text>
                <Ionicons
                  name={
                    activeStoryIndex === userStories.length - 1 &&
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
                  setSelectedStoryImage(null);
                  setStoryTextContent("");
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
                onPress={handlePickCamera}
                className="flex-1 bg-gray-100 rounded-xl p-4 items-center justify-center active:bg-gray-200"
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={24} color="#1F2937" />
                <Text className="text-xs font-semibold text-gray-700 mt-1">
                  Camera
                </Text>
              </TouchableOpacity>

              {/* Option 3: Gallery */}
              <TouchableOpacity
                onPress={handlePickGallery}
                className="flex-1 bg-gray-100 rounded-xl p-4 items-center justify-center active:bg-gray-200"
                activeOpacity={0.7}
              >
                <Ionicons
                  name="images-outline"
                  size={24}
                  color="#1F2937"
                />
                <Text className="text-xs font-semibold text-gray-700 mt-1">
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>

            {/* Media Options Section */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="flex-1 px-3"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <TouchableOpacity
                onPress={handlePickGallery}
                activeOpacity={0.8}
                className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-3 flex-row items-center"
              >
                <View className="w-14 h-14 rounded-full bg-[#72AF5B] items-center justify-center mr-4 shadow-sm">
                  <Ionicons name="images" size={28} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">
                    Choose from Gallery
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    Select photos from your device library to share
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#72AF5B" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickCamera}
                activeOpacity={0.8}
                className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-3 flex-row items-center"
              >
                <View className="w-14 h-14 rounded-full bg-blue-500 items-center justify-center mr-4 shadow-sm">
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">
                    Take Photo
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    Snap a fresh photo of your crops or farm today
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedStoryImage(null);
                  setStoryTextContent("");
                  setStoryStep("EDIT_STORY");
                }}
                activeOpacity={0.8}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-3 flex-row items-center"
              >
                <View className="w-14 h-14 rounded-full bg-amber-500 items-center justify-center mr-4 shadow-sm">
                  <Ionicons name="create" size={28} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">
                    Create Text Story
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    Share an update, announcement, or farming tip
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
              </TouchableOpacity>
            </ScrollView>
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
                Your post will show up in Feed, on your profile and search
                result
              </Text>

              {/* Privacy Options List */}
              <View className="space-y-4">
                {[
                  { id: "Public", title: "Public", icon: "globe" as const },
                  { id: "Friends", title: "Friends", icon: "people" as const },
                  {
                    id: "Only me",
                    title: "Only me",
                    icon: "lock-closed" as const,
                  },
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
              <View className="flex-1 w-full relative">
                <Image
                  source={{ uri: selectedStoryImage }}
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
              <View className="flex-1 w-full bg-[#1e293b] items-center justify-center p-8">
                <TextInput
                  value={storyTextContent}
                  onChangeText={setStoryTextContent}
                  placeholder="Type your story here... ✍️"
                  placeholderTextColor="#94A3B8"
                  multiline
                  className="text-white text-2xl font-bold text-center w-full px-4"
                  autoFocus
                />
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
                onPress={handleShareStory}
                disabled={isSharingStory}
                className="bg-[#72AF5B] px-6 py-3 rounded-full flex-row items-center active:bg-[#5e944b] shadow-lg"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Share story"
              >
                {isSharingStory ? (
                  <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
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
                      <Ionicons name="create-outline" size={22} color="#ffffff" />
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
                      <Ionicons name="globe-outline" size={22} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        Change Audience
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Current: {selectedPostForMenu?.privacy || "Public"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
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
                      <Ionicons name="trash-outline" size={22} color="#ffffff" />
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
                                  {comment.avatarUri ? (
                                    <Image
                                      source={{ uri: comment.avatarUri }}
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
        <View className="flex-1 bg-black/95 justify-between relative">
          {/* Top Bar with Close Button */}
          <View
            style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
            className="px-4 pb-3 flex-row items-center justify-end z-20"
          >
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

          {/* Centered Image with Tap-to-close on background */}
          <Pressable
            className="flex-1 items-center justify-center px-2"
            onPress={handleCloseLightbox}
          >
            {previewImage && (
              <Image
                source={
                  previewImage.uri
                    ? { uri: previewImage.uri }
                    : previewImage.source
                }
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            )}
          </Pressable>

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
      </Modal>

      {/* Create Post Modal */}
      <CreatePostModal
        isVisible={isCreatePostVisible}
        onClose={() => setCreatePostVisible(false)}
        onPost={handleNewPostCreated}
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar onFabPress={() => setCreatePostVisible(true)} />
    </SafeAreaView>
  );
}
