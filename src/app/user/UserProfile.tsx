import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import { blockUser } from "@/services/blocked-users-service";
import { sendFriendRequestApi } from "@/services/connection-service";
import {
  CommentItem,
  deletePostApi,
  getPostCommentsApi,
  getPostsApi,
  PostItem,
  sharePostApi,
  toggleLikePostApi,
  toggleSavePostApi,
  toggleLikeCommentApi,
  addPostCommentApi,
} from "@/services/post-service";
import { getRSBSAApplication, RSBSAApplication } from "@/services/rsbsa-service";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import CreatePostModal from "../../components/CreatePostModal";
import BottomNavBar from "../../components/Navigation";
import { ProfileHeader } from "../../components/ProfileHeader";
import ShareProfileModal from "../../components/ShareProfileModal";

const DEFAULT_COVER_PHOTO =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&auto=format&fit=crop&q=80";

export interface GridPostItem {
  id: string;
  imageUri: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timeAgo: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

const INITIAL_GRID_POSTS: GridPostItem[] = [
  {
    id: "grid-1",
    imageUri:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
    caption:
      "Fresh harvest from our greenhouse! Crispy greens, radishes, and organic garden salad bowl. 🥗🌱",
    likesCount: 142,
    commentsCount: 18,
    timeAgo: "3 days ago",
    isLiked: false,
    isSaved: false,
  },
  {
    id: "grid-2",
    imageUri:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80",
    caption:
      "Golden hour over the wheat fields. Prepping the soil and inspecting crops for the upcoming season. 🌾✨",
    likesCount: 98,
    commentsCount: 9,
    timeAgo: "5 days ago",
    isLiked: false,
    isSaved: false,
  },
  {
    id: "grid-3",
    imageUri:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    caption:
      "Fresh heirloom tomatoes harvested this morning! Rich, sweet, and bursting with local flavor. 🍅",
    likesCount: 215,
    commentsCount: 24,
    timeAgo: "1 week ago",
    isLiked: false,
    isSaved: false,
  },
  {
    id: "grid-4",
    imageUri:
      "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=600&auto=format&fit=crop&q=80",
    caption:
      "Community planting day out in the paddies. Grateful for our hardworking team and fertile fields! 🚜🌾",
    likesCount: 178,
    commentsCount: 14,
    timeAgo: "2 weeks ago",
    isLiked: false,
    isSaved: false,
  },
  {
    id: "grid-5",
    imageUri:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&auto=format&fit=crop&q=80",
    caption:
      "First batch of crisp orchard apples picked under the morning dew. Freshly boxed for delivery! 🍎🍏",
    likesCount: 165,
    commentsCount: 11,
    timeAgo: "3 weeks ago",
    isLiked: false,
    isSaved: false,
  },
];

const INITIAL_GRID_COMMENTS: Record<string, CommentItem[]> = {
  "grid-1": [
    {
      id: "gc-1",
      postId: "grid-1",
      userId: "u-2",
      authorName: "Elena Rostova",
      avatarUri: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
      timeAgo: "2d ago",
      content: "Those greens look so crisp and vibrant! Beautiful harvest. 🌱",
      likes: 4,
      isLiked: false,
      isVerified: true,
    },
    {
      id: "gc-2",
      postId: "grid-1",
      userId: "u-3",
      authorName: "Marcus Vance",
      avatarUri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      timeAgo: "1d ago",
      content: "Do you have any crates available for the weekend market?",
      likes: 2,
      isLiked: false,
    },
  ],
  "grid-2": [
    {
      id: "gc-3",
      postId: "grid-2",
      userId: "u-4",
      authorName: "Sarah Jenkins",
      avatarUri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
      timeAgo: "4d ago",
      content: "Stunning golden hour light over the fields! 🌾✨",
      likes: 5,
      isLiked: true,
    },
  ],
  "grid-3": [
    {
      id: "gc-4",
      postId: "grid-3",
      userId: "u-5",
      authorName: "David Chen",
      avatarUri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
      timeAgo: "5d ago",
      content: "Best heirloom tomatoes in the valley! So sweet and flavorful. 🍅",
      likes: 7,
      isLiked: false,
      isVerified: true,
    },
  ],
};

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const params = useLocalSearchParams<{
    userId?: string;
    userName?: string;
    userAvatar?: string;
    userRole?: string;
    userAbout?: string;
    userBio?: string;
    isVerified?: string;
  }>();

  const insets = useSafeAreaInsets();
  const [rsbsaApp, setRsbsaApp] = useState<RSBSAApplication | null>(null);

  const isOwnProfile =
    !params.userId ||
    (Boolean(user?.id) && String(params.userId) === String(user?.id)) ||
    (Boolean(user?.name) && params.userName === user?.name) ||
    (Boolean(user?.username) && params.userName === user?.username) ||
    (Boolean(rsbsaApp?.fullName) && params.userName === rsbsaApp?.fullName);

  const profileName =
    params.userName || user?.name || user?.username || rsbsaApp?.fullName || "Juan Dela Cruz";

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getRSBSAApplication()
        .then((app) => {
          if (isMounted) setRsbsaApp(app);
        })
        .catch((err) => console.warn("Failed to load RSBSA in profile:", err));
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const isRSBSAVerified = rsbsaApp?.status === "verified";

  const isVerifiedProfile =
    Boolean(
      isRSBSAVerified &&
        (isOwnProfile ||
          Boolean(
            rsbsaApp?.fullName &&
              rsbsaApp.fullName.trim().toLowerCase() ===
                profileName.trim().toLowerCase()
          ))
    ) ||
    params.isVerified === "true" ||
    profileName === "Paulbert Landicho" ||
    profileName === "Juan Dela Cruz" ||
    (isOwnProfile && Boolean((user as any)?.isVerified));
  const profileAvatar =
    params.userAvatar ||
    (isOwnProfile ? user?.avatarUrl : undefined) ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
  const profileRole =
    params.userRole ||
    (isOwnProfile ? (user as any)?.role : undefined) ||
    "Field";
  const profileHandle =
    isOwnProfile && user?.email
      ? user.email
      : `@${profileName.toLowerCase().replace(/\s+/g, "")}@gmail.com`;

  // Cover Photo state & persistence
  const [coverPhotoUri, setCoverPhotoUri] = useState<string>(
    user?.coverPhotoUrl || DEFAULT_COVER_PHOTO,
  );
  const [isUpdatingCover, setIsUpdatingCover] = useState<boolean>(false);
  const [isCoverModalVisible, setIsCoverModalVisible] =
    useState<boolean>(false);
  const [isViewingCoverPhoto, setIsViewingCoverPhoto] =
    useState<boolean>(false);

  // Instagram-style Post Viewer State
  const [gridPostsData, setGridPostsData] = useState<GridPostItem[]>(INITIAL_GRID_POSTS);
  const [selectedGridPostIndex, setSelectedGridPostIndex] = useState<number | null>(null);

  const handleOpenGridPost = (index: number) => {
    setSelectedGridPostIndex(index);
  };

  const handleCloseGridPost = () => {
    setSelectedGridPostIndex(null);
  };

  const handleToggleGridPostLike = (index: number) => {
    const post = gridPostsData[index];
    if (!post) return;
    const newIsLiked = !post.isLiked;
    setGridPostsData((prev) =>
      prev.map((p, idx) => {
        if (idx !== index) return p;
        return {
          ...p,
          isLiked: newIsLiked,
          likesCount: newIsLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      })
    );
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            isLiked: newIsLiked,
            likes: newIsLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
          };
        }
        return p;
      })
    );
    toggleLikePostApi(post.id).catch(() => {});
  };

  useEffect(() => {
    if (selectedGridPostIndex === null) return;
    const onBackPress = () => {
      setSelectedGridPostIndex(null);
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();

  }, [selectedGridPostIndex]);

  const handleToggleGridPostSave = (index: number) => {
    const post = gridPostsData[index];
    if (!post) return;
    const newIsSaved = !post.isSaved;
    setGridPostsData((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, isSaved: newIsSaved } : p))
    );
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: newIsSaved } : p))
    );
    showToast(
      newIsSaved ? "Post saved to collection!" : "Post removed from saved.",
      "success"
    );
    toggleSavePostApi(post.id).catch(() => {});
  };

  useEffect(() => {
    let isMounted = true;
    const loadCover = async () => {
      try {
        const storageKey = `localfarm_cover_photo_${user?.id || "default"}`;
        const savedCover = await AsyncStorage.getItem(storageKey);
        if (isMounted) {
          if (savedCover) {
            setCoverPhotoUri(savedCover);
          } else if (user?.coverPhotoUrl) {
            setCoverPhotoUri(user.coverPhotoUrl);
          }
        }
      } catch {
        // ignore error loading cached cover
      }
    };
    loadCover();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.coverPhotoUrl]);

  const applyCoverPhoto = async (newUri: string) => {
    setIsUpdatingCover(true);
    try {
      setCoverPhotoUri(newUri);
      const storageKey = `localfarm_cover_photo_${user?.id || "default"}`;
      await AsyncStorage.setItem(storageKey, newUri);
      try {
        await updateUser({ coverPhotoUrl: newUri });
      } catch {
        // offline or local state fallback
      }
      showToast("Cover photo updated successfully!", "success");
    } catch (err: any) {
      console.error("Failed to update cover photo:", err);
      showToast(err?.message || "Failed to update cover photo.", "error");
    } finally {
      setIsUpdatingCover(false);
    }
  };

  const pickCoverFromGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        const permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          showToast("Permission to access gallery is required.", "warning");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await applyCoverPhoto(result.assets[0].uri);
        return;
      }
    } catch (error) {
      console.error("Error picking image from gallery:", error);
    }

    // Direct Web fallback if running on web browser
    if (Platform.OS === "web" && typeof document !== "undefined") {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const res = event.target?.result;
              if (typeof res === "string") {
                await applyCoverPhoto(res);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } catch (e) {
        console.error("Web file picker error:", e);
      }
    }
  };

  const takeCoverPhoto = async () => {
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
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await applyCoverPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      showToast("Could not take photo.", "error");
    }
  };

  const handleCoverPhotoPress = () => {
    if (isOwnProfile) {
      setIsCoverModalVisible(true);
    } else {
      setIsViewingCoverPhoto(true);
    }
  };

  const handleChangeCoverPhoto = () => {
    setIsCoverModalVisible(true);
  };

  const handleResetCoverPhoto = async () => {
    setIsCoverModalVisible(false);
    setIsUpdatingCover(true);
    try {
      setCoverPhotoUri(DEFAULT_COVER_PHOTO);
      const storageKey = `localfarm_cover_photo_${user?.id || "default"}`;
      await AsyncStorage.removeItem(storageKey);
      try {
        await updateUser({ coverPhotoUrl: "" });
      } catch {}
      showToast("Cover photo reset to default.", "info");
    } finally {
      setIsUpdatingCover(false);
    }
  };

  const [activeTab, setActiveTab] = useState<"posts" | "all" | "about">("all");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [postComments, setPostComments] = useState<Record<string, CommentItem[]>>(INITIAL_GRID_COMMENTS);
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
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
  const commentInputRef = useRef<TextInput>(null);

  // Swipe-to-dismiss gesture handling for standalone comments sheet
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
  const [commentReactions, setCommentReactions] = useState<
    Record<string, string | null>
  >({});
  const [expandedReplyCommentIds, setExpandedReplyCommentIds] = useState<
    Record<string, boolean>
  >({});
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);

  const toggleRepliesVisibility = (commentId: string) => {
    setExpandedReplyCommentIds((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleToggleCommentLike = async (postId: string, commentId: string) => {
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
            : c
        ),
      }));
    } catch {}
  };
  const [isCreatePostVisible, setCreatePostVisible] = useState(false);
  const { showToast } = useToast();

  const loadUserPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const all = await getPostsApi();
      const targetUserId = params.userId || user?.id;
      const targetName = profileName;

      const userPosts = all.filter((p) => {
        if (targetUserId && p.userId && String(p.userId) === String(targetUserId)) {
          return true;
        }
        if (
          targetName &&
          p.authorName &&
          p.authorName.trim().toLowerCase() === targetName.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      });

      if (userPosts.length > 0) {
        setPosts(userPosts);
        const postsWithImages = userPosts.filter((p) => Boolean(p.imageUrl));
        if (postsWithImages.length > 0) {
          const mappedGridPosts: GridPostItem[] = postsWithImages.map((p) => ({
            id: p.id,
            imageUri: p.imageUrl,
            caption: p.content,
            likesCount: p.likes || 0,
            commentsCount: p.comments || 0,
            timeAgo: p.timeAgo || "Recently",
            isLiked: p.isLiked,
            isSaved: p.isSaved,
          }));
          setGridPostsData([...mappedGridPosts, ...INITIAL_GRID_POSTS]);
        }
      } else {
        setPosts([
          {
            id: "p-1",
            userId: String(targetUserId || "1"),
            authorName: profileName,
            authorRole: isVerifiedProfile ? "RSBSA Verified Farmer" : profileRole,
            avatarUri: profileAvatar,
            location: "Mill Creek Valley, CA",
            timeAgo: "2 hrs ago",
            content:
              "Fresh heirloom tomatoes harvested this morning at Mill Creek Valley Farm! 🍅 Ready for the weekend market.",
            imageUrl:
              "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=1000&auto=format&fit=crop&q=80",
            category: "Produce",
            privacy: "Public",
            likes: 120,
            comments: 12,
            shares: 5,
            isLiked: false,
            isSaved: false,
            isVerified: isVerifiedProfile,
          },
          {
            id: "p-2",
            userId: String(targetUserId || "1"),
            authorName: profileName,
            authorRole: isVerifiedProfile ? "RSBSA Verified Farmer" : profileRole,
            avatarUri: profileAvatar,
            location: "Mill Creek Valley, CA",
            timeAgo: "Yesterday",
            content:
              "Checking out the organic root crops and prepping the field for next week's planting season. 🌱",
            imageUrl:
              "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1000&auto=format&fit=crop&q=80",
            category: "Field Update",
            privacy: "Public",
            likes: 84,
            comments: 7,
            shares: 2,
            isLiked: false,
            isSaved: false,
            isVerified: isVerifiedProfile,
          },
        ]);
      }
    } catch (err) {
      console.warn("Failed to load user posts:", err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [
    params.userId,
    user?.id,
    profileName,
    profileRole,
    profileAvatar,
    isVerifiedProfile,
  ]);

  useEffect(() => {
    loadUserPosts();
  }, [loadUserPosts]);

  const handleQuickLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const wasLiked = p.isLiked;
          return {
            ...p,
            isLiked: !wasLiked,
            likes: wasLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
          };
        }
        return p;
      })
    );

    try {
      const res = await toggleLikePostApi(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: res.isLiked, likes: res.likesCount }
            : p
        )
      );
    } catch {}
  };

  const handleToggleSavePost = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    const currentlySaved = post?.isSaved;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isSaved: !currentlySaved } : p
      )
    );

    try {
      const res = await toggleSavePostApi(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isSaved: res.isSaved } : p
        )
      );
      showToast(
        res.isSaved ? "Post saved to collection!" : "Post removed from saved.",
        "success"
      );
    } catch {
      showToast(
        currentlySaved ? "Post removed from saved." : "Post saved to collection!",
        "success"
      );
    }
  };

  // Share to Feed Dialog Modal State
  const [shareDialogPost, setShareDialogPost] = useState<PostItem | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [isSharingPost, setIsSharingPost] = useState(false);

  const handleToggleShare = (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (targetPost) {
      setShareCaption("");
      setShareDialogPost(targetPost);
    }
  };

  const handleConfirmShare = async () => {
    if (!shareDialogPost) return;
    setIsSharingPost(true);
    try {
      const res = await sharePostApi(
        shareDialogPost.id,
        "public",
        shareCaption.trim()
      );
      setPosts((prev) => {
        const updated = prev.map((p) =>
          p.id === shareDialogPost.id ? { ...p, shares: res.sharesCount } : p
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
    setActiveCommentsPostId(postId);
    if (!postComments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      getPostCommentsApi(postId)
        .then((items) =>
          setPostComments((prev) => ({ ...prev, [postId]: items }))
        )
        .catch((err) =>
          console.log("[UserProfile] Failed to load comments:", err)
        )
        .finally(() =>
          setLoadingComments((prev) => ({ ...prev, [postId]: false }))
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
    const threadRootId = parentComment?.parentId || currentReply?.commentId || null;

    try {
      const newComment = await addPostCommentApi(
        postId,
        text,
        currentReply?.commentId || null
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
          p.id === postId ? { ...p, comments: p.comments + 1 } : p
        )
      );
      setGridPostsData((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        )
      );
      showToast("Comment posted!", "success");
    } catch {
      const fallbackComment: CommentItem = {
        id: Date.now().toString(),
        postId,
        parentId: currentReply?.commentId || null,
        userId: String(user?.id || "me"),
        authorName: user?.name || user?.username || profileName,
        avatarUri: user?.avatarUrl || profileAvatar,
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
          p.id === postId ? { ...p, comments: p.comments + 1 } : p
        )
      );
      setGridPostsData((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        )
      );
      showToast("Comment posted!", "success");
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleOpenPostOptions = (post: PostItem) => {
    const canDelete =
      isOwnProfile ||
      (Boolean(user?.id) && String(post.userId) === String(user?.id));

    Alert.alert("Post Options", post.content?.slice(0, 40) + "...", [
      {
        text: "Copy Link",
        onPress: () => showToast("Post link copied to clipboard!", "info"),
      },
      ...(canDelete
        ? [
            {
              text: "Delete Post",
              style: "destructive" as const,
              onPress: async () => {
                try {
                  await deletePostApi(post.id);
                } catch {}
                setPosts((prev) => prev.filter((p) => p.id !== post.id));
                showToast("Post deleted.", "info");
              },
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const [isFriendRequested, setIsFriendRequested] = useState(false);
  const [isLoadingFriend, setIsLoadingFriend] = useState(false);

  const handleAddFriend = async () => {
    if (isFriendRequested || isLoadingFriend) return;
    setIsLoadingFriend(true);
    try {
      if (params.userId) {
        await sendFriendRequestApi(params.userId);
      }
      setIsFriendRequested(true);
      showToast("Friend request sent!", "success");
    } catch (err: any) {
      setIsFriendRequested(true);
      showToast(err?.message || "Friend request sent!", "success");
    } finally {
      setIsLoadingFriend(false);
    }
  };

  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  const handleShareProfile = () => {
    setIsShareModalVisible(true);
  };

  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutInput, setAboutInput] = useState(user?.about || user?.bio || "");
  const [isSavingAbout, setIsSavingAbout] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active && (user?.about || user?.bio)) {
        setAboutInput(user.about || user.bio || "");
      }
    });
    return () => {
      active = false;
    };
  }, [user?.about, user?.bio]);

  const handleSaveAbout = async () => {
    setIsSavingAbout(true);
    try {
      await updateUser({
        about: aboutInput.trim(),
        bio: aboutInput.trim(),
      });
      setIsEditingAbout(false);
      showToast("About updated successfully!", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update about.", "error");
    } finally {
      setIsSavingAbout(false);
    }
  };

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Bottom sheet ref
  const bottomSheetRef = useRef<BottomSheet>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
        style={[props.style, { zIndex: 90, elevation: 90 }]}
      />
    ),
    [],
  );

  const handleOpenBottomSheet = useCallback(() => {
    setIsOptionsOpen(true);
  }, []);

  const handleRestrict = () => {
    bottomSheetRef.current?.close();
    Alert.alert(
      "Restrict Account",
      `Are you sure you want to restrict ${profileName}? They won't see when you're online or if you've read their messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restrict",
          style: "destructive",
          onPress: () => {
            showToast(`${profileName} has been restricted.`, "info");
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    bottomSheetRef.current?.close();
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${profileName}? They will no longer be able to view your profile, posts, or message you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            const targetId =
              params.userId || profileName.toLowerCase().replace(/\s+/g, "_");
            await blockUser({
              id: targetId,
              name: profileName,
              username:
                params.userName ||
                (profileHandle.startsWith("@")
                  ? profileHandle.slice(1)
                  : undefined),
              avatarUrl: profileAvatar,
            });
            showToast(`${profileName} has been blocked.`, "info");
          },
        },
      ],
    );
  };

  const handleReport = () => {
    bottomSheetRef.current?.close();
    Alert.alert("Report Account", `Why are you reporting ${profileName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Spam or Scam",
        style: "destructive",
        onPress: () => {
          showToast(
            "Report submitted. Thank you for helping keep Local Farm safe.",
            "success",
          );
        },
      },
      {
        text: "Inappropriate Content",
        style: "destructive",
        onPress: () => {
          showToast(
            "Report submitted. We will review this account.",
            "success",
          );
        },
      },
    ]);
  };

  const handleAboutThisAccount = () => {
    bottomSheetRef.current?.close();
    Alert.alert(
      "About This Account",
      `Account: ${profileName}\nRole: ${profileRole}\nHandle: ${profileHandle}\nStatus: Verified Farm Account\nMember since: 2024\nLocation: Mill Creek Valley, CA`,
      [{ text: "Done" }],
    );
  };

  const handleCopyProfileUrl = () => {
    bottomSheetRef.current?.close();
    showToast("Profile URL copied to clipboard!", "success");
  };

  const handleNewPostCreated = (newPostData: any) => {
    const createdPost: PostItem = {
      id: newPostData?.id || Date.now().toString(),
      userId: String(user?.id || newPostData?.userId || "me"),
      authorName:
        newPostData?.authorName ||
        user?.name ||
        user?.username ||
        profileName,
      authorRole:
        newPostData?.authorRole ||
        (isRSBSAVerified ? "RSBSA Verified Farmer" : profileRole),
      avatarUri:
        newPostData?.avatarUri ||
        user?.avatarUrl ||
        profileAvatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      location: newPostData?.location || "Mill Creek Valley, CA",
      timeAgo: "Just now",
      content: newPostData?.content || "",
      imageUrl:
        newPostData?.imageUrl ||
        (Array.isArray(newPostData?.photos) ? newPostData.photos[0] : "") ||
        "",
      category: newPostData?.category || "General",
      privacy: newPostData?.privacy || "Public",
      likes: newPostData?.likes ?? 0,
      comments: newPostData?.comments ?? 0,
      shares: newPostData?.shares ?? 0,
      isLiked: Boolean(newPostData?.isLiked),
      isSaved: Boolean(newPostData?.isSaved),
      isVerified: Boolean(newPostData?.isVerified ?? isRSBSAVerified),
    };
    setPosts((prev) => [createdPost, ...prev]);
    if (createdPost.imageUrl) {
      setGridPostsData((prev) => [
        {
          id: createdPost.id,
          imageUri: createdPost.imageUrl,
          caption: createdPost.content,
          likesCount: 0,
          commentsCount: 0,
          timeAgo: "Just now",
          isLiked: false,
          isSaved: false,
        },
        ...prev,
      ]);
    }
    setCreatePostVisible(false);
  };

// Dedicated Full-Page Section for Post Detail (NewsFeed post card format)
  if (selectedGridPostIndex !== null) {
    const currentPost = gridPostsData[selectedGridPostIndex];
    if (currentPost) {
      const currentPostComments = postComments[currentPost.id] || [];

      return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={["top", "bottom", "left", "right"]}>
          {/* Header Bar: Back arrow + "Posts" + Counter + Close button */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-xs">
            <TouchableOpacity
              onPress={handleCloseGridPost}
              activeOpacity={0.7}
              className="flex-row items-center py-1 pr-2"
              accessibilityRole="button"
              accessibilityLabel="Back to posts"
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
              <Text className="ml-2.5 text-base font-bold text-gray-900">
                Posts
              </Text>
            </TouchableOpacity>

            <Text className="text-xs font-semibold text-gray-500">
              {selectedGridPostIndex + 1} of {gridPostsData.length}
            </Text>

            <TouchableOpacity
              onPress={handleCloseGridPost}
              activeOpacity={0.7}
              className="p-1"
              accessibilityRole="button"
              accessibilityLabel="Close post"
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Post Content */}
          <ScrollView
            className="flex-1 bg-gray-100"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12, paddingBottom: 60 }}
          >
            {/* Post Card - Exact NewsFeed Design */}
            <View className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden mb-4">
              {/* Post Header */}
              <View className="p-4 pb-2">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center flex-1 pr-2">
                    {/* Avatar with #72AF5B ring */}
                    <View className="h-10 w-10 rounded-full border border-[#72AF5B] items-center justify-center bg-gray-100 mr-3 overflow-hidden">
                      {profileAvatar ? (
                        <Image
                          source={{ uri: profileAvatar }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={20} color="#72AF5B" />
                      )}
                    </View>
                    {/* Author details */}
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap">
                        <Text className="font-bold text-gray-900 mr-1.5 text-base">
                          {profileName}
                        </Text>
                        {isVerifiedProfile && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10B981"
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <Text
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            isVerifiedProfile
                              ? "text-emerald-700 bg-emerald-50"
                              : "text-green-600 bg-green-50"
                          }`}
                        >
                          {isVerifiedProfile ? "RSBSA Verified Farmer" : profileRole}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-0.5">
                        <Ionicons
                          name="location"
                          size={12}
                          color="#72AF5B"
                        />
                        <Text className="text-xs text-gray-500 ml-1 mr-2">
                          Mill Creek Valley, CA • {currentPost.timeAgo}
                        </Text>
                        <Ionicons
                          name="globe-outline"
                          size={12}
                          color="#9ca3af"
                        />
                      </View>
                    </View>
                  </View>

                  {/* 3-dots post options */}
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert("Post Options", undefined, [
                        {
                          text: "Share Post",
                          onPress: () => handleToggleShare(currentPost.id),
                        },
                        {
                          text: currentPost.isSaved ? "Remove from Saved" : "Save Post",
                          onPress: () => handleToggleGridPostSave(selectedGridPostIndex),
                        },
                        { text: "Cancel", style: "cancel" },
                      ]);
                    }}
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

                {/* Post Caption */}
                {!!currentPost.caption && (
                  <Text className="text-gray-800 text-sm mb-3 leading-5">
                    {currentPost.caption}
                  </Text>
                )}

                {/* Post Image with tap-to-open Lightbox */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    handleOpenPreview({
                      uri: currentPost.imageUri,
                      caption: currentPost.caption,
                      authorName: profileName,
                      authorRole: "Farmer",
                      avatarUri: profileAvatar,
                      timeAgo: currentPost.timeAgo,
                      postId: currentPost.id,
                      isVerified: isRSBSAVerified,
                      likes: currentPost.likesCount,
                      comments: (postComments[currentPost.id] || []).length,
                      isLiked: currentPost.isLiked,
                    })
                  }
                >
                  <Image
                    source={{ uri: currentPost.imageUri }}
                    className="w-full rounded-lg mb-4 bg-gray-100"
                    style={{
                      width: "100%",
                      height: 280,
                      borderRadius: 8,
                    }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>

                {/* Interaction Bar */}
                <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
                  <View className="flex-row gap-6">
                    {/* Like Button */}
                    <TouchableOpacity
                      onPress={() => handleToggleGridPostLike(selectedGridPostIndex)}
                      className="flex-row items-center gap-1.5 active:opacity-70"
                    >
                      {currentPost.isLiked ? (
                        <>
                          <Ionicons
                            name="heart"
                            size={24}
                            color="#EF4444"
                          />
                          <Text className="font-bold text-sm text-[#EF4444]">
                            {currentPost.likesCount}
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
                            {currentPost.likesCount}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Comment Button (Opens Lightbox Modal with Comments Sheet) */}
                    <TouchableOpacity
                      onPress={() => toggleExpandComments(currentPost.id)}
                      className="flex-row items-center gap-1.5 active:opacity-70"
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={22}
                        color="#6b7280"
                      />
                      <Text className="font-medium text-gray-500">
                        {currentPostComments.length > 0
                          ? currentPostComments.length
                          : currentPost.commentsCount}
                      </Text>
                    </TouchableOpacity>

                    {/* Share Button */}
                    <TouchableOpacity
                      onPress={() => handleToggleShare(currentPost.id)}
                      className="flex-row items-center gap-1.5 active:opacity-70"
                    >
                      <Ionicons
                        name="share-social-outline"
                        size={22}
                        color="#6b7280"
                      />
                      <Text className="font-medium text-gray-500">
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Save/Bookmark Button */}
                  <TouchableOpacity
                    onPress={() => handleToggleGridPostSave(selectedGridPostIndex)}
                    className="active:opacity-70 p-0.5"
                    accessibilityRole="button"
                    accessibilityLabel="Save post"
                  >
                    <Ionicons
                      name={
                        currentPost.isSaved ? "bookmark" : "bookmark-outline"
                      }
                      size={24}
                      color={currentPost.isSaved ? "#72AF5B" : "#6b7280"}
                    />
                  </TouchableOpacity>
                </View>

                {/* View all comments trigger (Opens Lightbox Modal) */}
                {((currentPostComments.length > 0
                  ? currentPostComments.length
                  : currentPost.commentsCount) > 0) && (
                  <TouchableOpacity
                    onPress={() => toggleExpandComments(currentPost.id)}
                    className="mt-2.5 active:opacity-70"
                  >
                    <Text className="text-xs font-semibold text-gray-500 hover:text-[#72AF5B]">
                      View all{" "}
                      {currentPostComments.length > 0
                        ? currentPostComments.length
                        : currentPost.commentsCount}{" "}
                      {(currentPostComments.length > 0
                        ? currentPostComments.length
                        : currentPost.commentsCount) === 1
                        ? "comment"
                        : "comments"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Adjacent Posts Navigation (Previous / Next) */}
            <View className="flex-row items-center justify-between px-2 py-3 bg-white rounded-xl border border-gray-200 mb-6">
              <TouchableOpacity
                onPress={() => {
                  if (selectedGridPostIndex > 0) {
                    const prevIdx = selectedGridPostIndex - 1;
                    setSelectedGridPostIndex(prevIdx);
                  }
                }}
                disabled={selectedGridPostIndex === 0}
                className={`flex-row items-center px-4 py-2.5 rounded-xl ${
                  selectedGridPostIndex === 0
                    ? "opacity-30"
                    : "bg-gray-100 border border-gray-200 active:bg-gray-200"
                }`}
              >
                <Ionicons name="chevron-back" size={18} color="#374151" />
                <Text className="text-xs font-semibold text-gray-700 ml-1">
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (selectedGridPostIndex < gridPostsData.length - 1) {
                    const nextIdx = selectedGridPostIndex + 1;
                    setSelectedGridPostIndex(nextIdx);
                  }
                }}
                disabled={selectedGridPostIndex === gridPostsData.length - 1}
                className={`flex-row items-center px-4 py-2.5 rounded-xl ${
                  selectedGridPostIndex === gridPostsData.length - 1
                    ? "opacity-30"
                    : "bg-gray-100 border border-gray-200 active:bg-gray-200"
                }`}
              >
                <Text className="text-xs font-semibold text-gray-700 mr-1">
                  Next
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Share Modal if opened from within post */}
          <ShareProfileModal
            visible={isShareModalVisible}
            onClose={() => setIsShareModalVisible(false)}
            username={profileName}
          />
        </SafeAreaView>
      );
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      {/* Top Header */}

      {/* Main Content ScrollView */}
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. Hero Section (ProfileHeader with Cover Photo, Avatar, & Options) */}
        <ProfileHeader
          coverPhotoUri={isOwnProfile ? coverPhotoUri : DEFAULT_COVER_PHOTO}
          avatarUri={profileAvatar}
          isOwnProfile={isOwnProfile}
          isVerified={isVerifiedProfile}
          isUpdatingCover={isUpdatingCover}
          onPressBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/user/NewsFeed" as any);
            }
          }}
          onPressDots={handleOpenBottomSheet}
          onPressEditCover={handleChangeCoverPhoto}
          onPressCoverPhoto={handleCoverPhotoPress}
          onPressChangePicture={() => router.push("/user/ChangePicture" as any)}
        />

        {/* 4. Profile Details Section */}
        <View className="px-4">
          {/* Name & Badge */}
          <View className="flex-row items-center mt-2 mb-1 flex-wrap">
            <Text className="text-2xl font-bold text-gray-900 mr-1.5">
              {profileName}
            </Text>
            {isVerifiedProfile && (
              <View className="flex-row items-center mr-2">
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              </View>
            )}
            <View
              className={`rounded-md px-2.5 py-0.5 flex-row items-center gap-1 ${
                isVerifiedProfile ? "bg-emerald-600" : "bg-[#77af5c]"
              }`}
            >
              {isVerifiedProfile && (
                <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
              )}
              <Text className="text-xs font-bold text-white">
                {isVerifiedProfile ? "RSBSA Verified Farmer" : profileRole}
              </Text>
            </View>
          </View>

          {/* Handle/Email */}
          <Text className="text-sm text-gray-800 mb-3">{profileHandle}</Text>

          {/* Bio */}
          <Text className="text-sm text-gray-800 leading-5 mb-3">
            Heirloom vegetable grower at Mill Creek Valley Farm. Organic,
            sustainable, community-first. Third generation farmer.
          </Text>

          {/* Location */}
          <View className="flex-row items-center mb-4">
            <Ionicons name="location" size={16} color="#000000" />
            <Text className="text-sm text-gray-800 ml-1">
              Mill Creek Valley, CA
            </Text>
          </View>

          {/* Action Buttons Row */}
          <View className="flex-row items-center gap-2.5 mb-5">
            {isOwnProfile ? (
              <>
                {/* Edit profile Button */}
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/user/PersonalInformation",
                      params: { mode: "edit" },
                    } as any)
                  }
                  className="flex-1 bg-[#5cb85c] rounded-xl py-2.5 px-3 flex-row items-center justify-center gap-1.5 shadow-sm active:opacity-85"
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text className="text-white text-sm font-semibold">
                    Edit profile
                  </Text>
                </TouchableOpacity>

                {/* Share profile Button */}
                <TouchableOpacity
                  onPress={handleShareProfile}
                  className="flex-1 bg-gray-200 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-1.5 active:bg-gray-300"
                  accessibilityRole="button"
                  accessibilityLabel="Share profile"
                >
                  <Ionicons
                    name="share-social-outline"
                    size={16}
                    color="#1f2937"
                  />
                  <Text className="text-gray-800 text-sm font-semibold">
                    Share profile
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Add friend Button */}
                <TouchableOpacity
                  onPress={handleAddFriend}
                  disabled={isLoadingFriend}
                  className={`flex-1 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:opacity-85 ${
                    isFriendRequested
                      ? "bg-gray-100 border border-gray-300"
                      : "bg-[#5cb85c]"
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFriendRequested ? "Friend request sent" : "Add friend"
                  }
                >
                  <Ionicons
                    name={isFriendRequested ? "checkmark-circle" : "person-add"}
                    size={16}
                    color={isFriendRequested ? "#5cb85c" : "#FFFFFF"}
                  />
                  <Text
                    className={`text-sm font-semibold ${
                      isFriendRequested ? "text-[#5cb85c]" : "text-white"
                    }`}
                  >
                    {isFriendRequested ? "Requested" : "Add friend"}
                  </Text>
                </TouchableOpacity>

                {/* Message Button */}
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/user/ChatConversation",
                      params: {
                        userId: params.userId,
                        userName: profileName,
                        userAvatar: profileAvatar,
                      },
                    } as any)
                  }
                  className="flex-1 bg-gray-200 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-1.5 active:bg-gray-300"
                  accessibilityRole="button"
                  accessibilityLabel="Message"
                >
                  <Ionicons name="chatbubble" size={15} color="#1f2937" />
                  <Text className="text-gray-800 text-sm font-semibold">
                    Message
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* 6. Tab Navigation */}
        <View className="flex-row border-b border-gray-300 bg-gray-50">
          {/* Tab 1 (All - Left) */}
          <TouchableOpacity
            onPress={() => setActiveTab("all")}
            className={`flex-1 py-3 items-center border-b-[3px] ${
              activeTab === "all" ? "border-[#77af5c]" : "border-transparent"
            }`}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "all" }}
          >
            <Text
              className={`font-bold ${
                activeTab === "all" ? "text-gray-900" : "text-gray-600"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>

          {/* Tab 2 (Posts - Center) */}
          <TouchableOpacity
            onPress={() => setActiveTab("posts")}
            className={`flex-1 py-3 items-center border-b-[3px] ${
              activeTab === "posts" ? "border-[#77af5c]" : "border-transparent"
            }`}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "posts" }}
          >
            <Text
              className={`font-bold ${
                activeTab === "posts" ? "text-gray-900" : "text-gray-600"
              }`}
            >
              Posts
            </Text>
          </TouchableOpacity>

          {/* Tab 3 (About - Inactive) */}
          <TouchableOpacity
            onPress={() => setActiveTab("about")}
            className={`flex-1 py-3 items-center border-b-[3px] ${
              activeTab === "about" ? "border-[#77af5c]" : "border-transparent"
            }`}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "about" }}
          >
            <Text
              className={`font-bold ${
                activeTab === "about" ? "text-gray-900" : "text-gray-600"
              }`}
            >
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* 7. Tab Contents */}
        {activeTab === "posts" && (
          gridPostsData.length === 0 ? (
            <View className="py-12 px-6 items-center justify-center bg-white">
              <Ionicons name="images-outline" size={48} color="#9CA3AF" />
              <Text className="text-base font-bold text-gray-700 mt-3">No photo posts yet</Text>
              <Text className="text-sm text-gray-400 text-center mt-1">
                {isOwnProfile
                  ? "Photos you share will appear here."
                  : `${profileName} hasn't shared any photo posts yet.`}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap w-full">
              {gridPostsData.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  onPress={() => handleOpenGridPost(index)}
                  activeOpacity={0.88}
                  className="w-1/3 aspect-square border-[1px] border-white bg-gray-200 overflow-hidden"
                  accessibilityRole="button"
                  accessibilityLabel={`View post ${index + 1}`}
                >
                  <Image
                    source={{ uri: post.imageUri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* 'All' Tab Timeline Feed */}
        {activeTab === "all" && (
          <View className="w-full">
            {/* 1. 'Create Post' Section */}
            <View className="bg-white p-4">
              <View className="flex-row items-center">
                {/* Profile Avatar Icon matching UserHeader.tsx */}
                <TouchableOpacity
                  onPress={() => setCreatePostVisible(true)}
                  activeOpacity={0.8}
                  className="w-10 h-10 rounded-full border border-[#72AF5B] items-center justify-center overflow-hidden bg-gray-100 mr-3"
                  accessibilityRole="button"
                  accessibilityLabel="Create post"
                >
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person-outline" size={20} color="#333333" />
                  )}
                </TouchableOpacity>

                {/* 'What's on your mind?' input trigger */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCreatePostVisible(true)}
                  className="flex-1 bg-gray-100 rounded-full px-4 justify-center h-10"
                  accessibilityRole="button"
                  accessibilityLabel={
                    isOwnProfile
                      ? "What's on your mind?"
                      : `Write something to ${profileName}...`
                  }
                >
                  <Text className="text-base text-gray-500">
                    {isOwnProfile
                      ? "What's on your mind?"
                      : `Write something to ${profileName}...`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Post Feed */}
            <View className="bg-gray-100 pt-3 pb-6 px-3">
              {isLoadingPosts ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="large" color="#72AF5B" />
                  <Text className="text-sm text-gray-500 mt-2">Loading posts...</Text>
                </View>
              ) : posts.length === 0 ? (
                <View className="py-12 px-6 items-center justify-center bg-white rounded-xl border border-gray-200">
                  <Ionicons name="newspaper-outline" size={48} color="#9CA3AF" />
                  <Text className="text-base font-bold text-gray-700 mt-3">No posts yet</Text>
                  <Text className="text-sm text-gray-400 text-center mt-1">
                    {isOwnProfile
                      ? "Share your farming updates, produce, or stories with the community!"
                      : `${profileName} hasn't published any posts yet.`}
                  </Text>
                </View>
              ) : (
                posts.map((post) => {
                  const isBookmarked = Boolean(post.isSaved);
                  const isCurrentUser =
                    Boolean(user?.id && post.userId === String(user.id)) ||
                    post.authorName === user?.name ||
                    post.authorName === user?.username;
                  const isVerifiedUser =
                    Boolean(post.isVerified) || (isCurrentUser && isRSBSAVerified);

                  return (
                    <View
                      key={post.id}
                      className="bg-white mb-3 rounded-xl shadow-xs border border-gray-100 overflow-hidden"
                    >
                      {/* Shared Post Header Banner */}
                      {post.isShared && post.originalPost && (
                        <View className="flex-row items-center px-4 pt-3 pb-1">
                          <Ionicons name="arrow-redo" size={14} color="#72AF5B" />
                          <View className="flex-row items-center ml-1.5 flex-wrap">
                            <Text className="font-bold text-gray-900 text-xs">
                              {post.authorName}
                            </Text>
                            {isVerifiedUser && (
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
                      <View className="p-4 pb-2">
                        <View className="flex-row justify-between items-start mb-3">
                          <View className="flex-row items-center flex-1 pr-2">
                            {/* Avatar with #72AF5B ring */}
                            <View className="h-10 w-10 rounded-full border border-[#72AF5B] items-center justify-center bg-gray-100 mr-3 overflow-hidden">
                              {post.avatarUri ? (
                                <Image
                                  source={{ uri: post.avatarUri }}
                                  style={{ width: "100%", height: "100%" }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Ionicons name="person" size={20} color="#72AF5B" />
                              )}
                            </View>
                            {/* Author details */}
                            <View className="flex-1">
                              <View className="flex-row items-center flex-wrap">
                                <Text className="font-bold text-gray-900 mr-1.5 text-base">
                                  {post.authorName}
                                </Text>
                                {isVerifiedUser && (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={16}
                                    color="#10B981"
                                    style={{ marginRight: 6 }}
                                  />
                                )}
                                <Text
                                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                    isCurrentUser && isRSBSAVerified
                                      ? "text-emerald-700 bg-emerald-50"
                                      : "text-green-600 bg-green-50"
                                  }`}
                                >
                                  {isCurrentUser && isRSBSAVerified
                                    ? "RSBSA Verified Farmer"
                                    : post.authorRole}
                                </Text>
                              </View>
                              <View className="flex-row items-center mt-0.5">
                                <Ionicons
                                  name="location"
                                  size={12}
                                  color="#72AF5B"
                                />
                                <Text className="text-xs text-gray-500 ml-1 mr-2">
                                  {post.location} • {post.timeAgo}
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
                          </View>

                          {/* 3-dots post options */}
                          <TouchableOpacity
                            onPress={() => handleOpenPostOptions(post)}
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

                        {/* Post Content */}
                        {!!post.content && (
                          <Text className="text-gray-800 text-sm mb-3 leading-5">
                            {post.content}
                          </Text>
                        )}

                        {/* Shared Post: Embedded Original Post Card */}
                        {post.isShared && post.originalPost ? (
                          <View className="border border-gray-200 rounded-xl p-3 bg-gray-50/80 mb-3">
                            <View className="flex-row items-center mb-2">
                              <View className="h-8 w-8 rounded-full border border-gray-300 items-center justify-center bg-gray-200 mr-2.5 overflow-hidden">
                                {post.originalPost.avatarUri ? (
                                  <Image
                                    source={{ uri: post.originalPost.avatarUri }}
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
                                  {post.originalPost.location} • {post.originalPost.timeAgo}
                                </Text>
                              </View>
                            </View>

                            {!!post.originalPost.content && (
                              <Text className="text-gray-700 text-sm mb-2 leading-5">
                                {post.originalPost.content}
                              </Text>
                            )}

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
                                    isSaved: post.isSaved,
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
                        ) : (
                          /* Standard Post Image */
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
                                  isSaved: post.isSaved,
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
                          ) : null
                        )}

                        {/* Interaction Bar */}
                        <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
                          <View className="flex-row gap-6">
                            {/* Like Button */}
                            <TouchableOpacity
                              onPress={() => handleQuickLike(post.id)}
                              className="flex-row items-center gap-1.5 active:opacity-70"
                            >
                              {post.isLiked ? (
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

                            {/* Share Button */}
                            <TouchableOpacity
                              onPress={() => handleToggleShare(post.id)}
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

                          {/* Save/Bookmark Button */}
                          <TouchableOpacity
                            onPress={() => handleToggleSavePost(post.id)}
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
                        {((postComments[post.id] !== undefined
                          ? postComments[post.id].length
                          : post.comments) > 0) && (
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
          </View>
        )}

        {activeTab === "about" && (
          <View className="p-6 bg-white">
            {isEditingAbout ? (
              /* Inline Edit Mode (Separated from personal info) */
              <View>
                <Text className="text-base font-semibold text-gray-900 mb-2">
                  Edit About
                </Text>
                <View className="border border-[#5cb85c] rounded-xl p-3 bg-gray-50 mb-3">
                  <TextInput
                    value={aboutInput}
                    onChangeText={setAboutInput}
                    multiline={true}
                    numberOfLines={4}
                    placeholder="Write something about yourself or farm..."
                    placeholderTextColor="#9CA3AF"
                    className="text-sm text-gray-800 p-0"
                    style={{ minHeight: 90, textAlignVertical: "top" }}
                    autoFocus={true}
                  />
                </View>

                <View className="flex-row items-center gap-2.5 justify-end">
                  <TouchableOpacity
                    onPress={() => {
                      setAboutInput(user?.about || user?.bio || "");
                      setIsEditingAbout(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-100 active:bg-gray-200"
                    accessibilityRole="button"
                    accessibilityLabel="Cancel edit"
                  >
                    <Text className="text-sm font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveAbout}
                    disabled={isSavingAbout}
                    className="px-5 py-2 rounded-xl bg-[#5cb85c] active:bg-[#4ea64e] flex-row items-center gap-1.5"
                    accessibilityRole="button"
                    accessibilityLabel="Save about"
                  >
                    {isSavingAbout ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-sm font-bold text-white">Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* View Mode with Separate Edit Button */
              <View>
                <Text className="text-base font-semibold text-gray-900 mb-2">
                  About {profileName}
                </Text>
                <Text className="text-sm text-gray-700 leading-6">
                  {(isOwnProfile
                    ? user?.about || user?.bio
                    : params.userAbout || params.userBio) ||
                    "Dedicated to regenerative agriculture, certified organic produce, and nourishing our local community since 1984. Specializing in heirloom tomatoes, root crops, and seasonal greens."}
                </Text>

                {/* Separate Edit Button */}
                {isOwnProfile && (
                  <TouchableOpacity
                    onPress={() => {
                      setAboutInput(user?.about || user?.bio || "");
                      setIsEditingAbout(true);
                    }}
                    className="mt-4 w-full bg-[#72AF5B]  rounded-xl py-2.5 flex-row items-center justify-center gap-2 active:bg-gray-200"
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Edit about"
                  >
                    <Ionicons name="create-outline" size={16} color="#ffffff" />
                    <Text className="text-md font-semibold text-white">
                      Edit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

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
                      {shareDialogPost.originalPost?.avatarUri || shareDialogPost.avatarUri ? (
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
                      <Text className="font-bold text-gray-900 text-xs" numberOfLines={1}>
                        {shareDialogPost.originalPost?.authorName ||
                          shareDialogPost.authorName}
                      </Text>
                      <Text className="text-[11px] text-gray-500" numberOfLines={1}>
                        {shareDialogPost.originalPost?.authorRole ||
                          shareDialogPost.authorRole}{" "}
                        •{" "}
                        {shareDialogPost.originalPost?.timeAgo ||
                          shareDialogPost.timeAgo}
                      </Text>
                    </View>
                  </View>

                  {/* Original Post Content Snippet */}
                  {(shareDialogPost.originalPost?.content ||
                    shareDialogPost.content) ? (
                    <Text
                      className="text-sm text-gray-700 mb-2 leading-relaxed"
                      numberOfLines={4}
                    >
                      {shareDialogPost.originalPost?.content ||
                        shareDialogPost.content}
                    </Text>
                  ) : null}

                  {/* Original Post Image (if any) */}
                  {(shareDialogPost.originalPost?.imageUrl ||
                    shareDialogPost.imageUrl) ? (
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

      {/* Create Post Modal */}
      <CreatePostModal
        isVisible={isCreatePostVisible}
        onClose={() => setCreatePostVisible(false)}
        onPost={handleNewPostCreated}
      />

      {/* Standalone Expandable Comments Drawer Modal */}
      {activeCommentsPostId && (() => {
        const currentComments = postComments[activeCommentsPostId] || [];

        return (
          <Modal
            visible={!!activeCommentsPostId}
            transparent={true}
            animationType="fade"
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
                        const direct = all.filter((c) => c.parentId === parentId);
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
                            Boolean(currentCommentReaction) || comment.isLiked;
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
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                  style={{
                    paddingBottom: Math.max(insets.bottom, 12) + 6,
                  }}
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
                      replyingTo ? "rounded-b-xl rounded-t-none" : "rounded-full"
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
                        handleAddComment(activeCommentsPostId)
                      }
                      returnKeyType="send"
                    />
                    <TouchableOpacity
                      onPress={() =>
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

      {/* Fullscreen Image Lightbox Modal */}
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

      {/* Share Profile Modal */}
      <ShareProfileModal
        visible={isShareModalVisible}
        onClose={() => setIsShareModalVisible(false)}
        username={
          isOwnProfile
            ? "@NATHANSALVEDIA"
            : `@${profileName.toUpperCase().replace(/\s+/g, "")}`
        }
        onShowToast={showToast}
      />

      {/* Cover Photo Selection Modal (Bottom Sheet / Lower Corner) */}
      <Modal
        visible={isCoverModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsCoverModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-transparent"
          onPress={() => setIsCoverModalVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl pt-3 px-5 border-t border-l border-r border-gray-200"
            style={{
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              elevation: 8,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            }}
          >
            {/* Drag Indicator Handle */}
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row justify-between items-center mb-3 pb-2.5 border-b border-gray-100">
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Change Cover Photo
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Update the banner on your profile
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCoverModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                accessibilityRole="button"
                accessibilityLabel="Close cover photo modal"
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View className="gap-2.5 my-1">
              {/* Option 1: See cover photo */}
              <TouchableOpacity
                onPress={() => {
                  setIsCoverModalVisible(false);
                  setTimeout(() => {
                    setIsViewingCoverPhoto(true);
                  }, 250);
                }}
                activeOpacity={0.7}
                className="flex-row items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="See cover photo"
              >
                <View className="w-11 h-11 rounded-full bg-purple-50 items-center justify-center mr-3.5 border border-purple-100">
                  <Ionicons name="eye-outline" size={22} color="#7C3AED" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    See cover photo
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    View your cover photo in full screen
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {/* Option 2: Choose from Library */}
              <TouchableOpacity
                onPress={() => {
                  setIsCoverModalVisible(false);
                  pickCoverFromGallery();
                }}
                activeOpacity={0.7}
                className="flex-row items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="Choose from Library"
              >
                <View className="w-11 h-11 rounded-full bg-[#E2F0D9] items-center justify-center mr-3.5">
                  <Ionicons name="images" size={22} color="#72AF5B" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    Choose from Library
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Select a photo from your gallery
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {/* Option 2: Take Photo */}
              <TouchableOpacity
                onPress={() => {
                  setIsCoverModalVisible(false);
                  takeCoverPhoto();
                }}
                activeOpacity={0.7}
                className="flex-row items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="Take Photo"
              >
                <View className="w-11 h-11 rounded-full bg-blue-50 items-center justify-center mr-3.5">
                  <Ionicons name="camera" size={22} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    Take Photo
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Snap a new photo with your camera
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {/* Option 3: Reset to Default (if custom photo is set) */}
              {coverPhotoUri !== DEFAULT_COVER_PHOTO && (
                <TouchableOpacity
                  onPress={handleResetCoverPhoto}
                  activeOpacity={0.7}
                  className="flex-row items-center p-3.5 bg-red-50/70 rounded-2xl border border-red-100 active:bg-red-100"
                  accessibilityRole="button"
                  accessibilityLabel="Reset to Default"
                >
                  <View className="w-11 h-11 rounded-full bg-red-100 items-center justify-center mr-3.5">
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-red-600">
                      Reset to Default
                    </Text>
                    <Text className="text-xs text-red-500/80 mt-0.5">
                      Remove custom banner and use default
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#fca5a5" />
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setIsCoverModalVisible(false)}
              activeOpacity={0.8}
              className="mt-3 bg-gray-100 py-3 rounded-2xl active:bg-gray-200 items-center"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-sm font-semibold text-gray-700">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-Screen Cover Photo Viewer Modal */}
      <Modal
        visible={isViewingCoverPhoto}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsViewingCoverPhoto(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000000" }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Top Bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                zIndex: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setIsViewingCoverPhoto(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel="Close photo viewer"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                  letterSpacing: 0.2,
                }}
              >
                Cover Photo
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Photo Center */}
            <Pressable
              onPress={() => setIsViewingCoverPhoto(false)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Image
                source={{
                  uri: isOwnProfile ? coverPhotoUri : DEFAULT_COVER_PHOTO,
                }}
                style={{
                  width: "100%",
                  height: 280,
                }}
                resizeMode="contain"
              />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      

      {/* Bottom Navigation Component */}
      <BottomNavBar showFab={false} />

      {/* Profile Options Bottom Sheet */}
      {isOptionsOpen && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          enableDynamicSizing={true}
          enablePanDownToClose={true}
          onClose={() => setIsOptionsOpen(false)}
          onChange={(index) => {
            if (index === -1) {
              setIsOptionsOpen(false);
            }
          }}
          backdropComponent={renderBackdrop}
          containerStyle={{ zIndex: 100, elevation: 100 }}
          style={{ zIndex: 100, elevation: 100 }}
          backgroundStyle={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
          handleIndicatorStyle={{
            backgroundColor: "#D1D5DB",
            width: 44,
            height: 4.5,
            borderRadius: 3,
          }}
        >
          <BottomSheetView
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            }}
          >
            {/* Sheet Header */}
            <View className="items-center pb-3 mb-2 border-b border-gray-100">
              <Text className="text-base font-bold text-gray-900">
                Profile Options
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {profileName}
              </Text>
            </View>

            {/* Action Items */}
            <View>
              {/* Not Interested */}
              <TouchableOpacity
                onPress={handleRestrict}
                activeOpacity={0.7}
                className="flex-row items-center py-3.5 px-2.5 rounded-xl active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="Not interested"
              >
                <View className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center mr-3.5">
                  <Ionicons name="eye-off-outline" size={21} color="#374151" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    Not Interested
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {"We won't suggest this account to you again"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Block */}
              <TouchableOpacity
                onPress={handleBlock}
                activeOpacity={0.7}
                className="flex-row items-center py-3.5 px-2.5 rounded-xl active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="Block account"
              >
                <View className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center mr-3.5">
                  <Ionicons name="ban-outline" size={21} color="#374151" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    Block
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {"They won't be able to find your profile or message you"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Report (styled in red) */}
              <TouchableOpacity
                onPress={handleReport}
                activeOpacity={0.7}
                className="flex-row items-center py-3.5 px-2.5 rounded-xl active:bg-red-50"
                accessibilityRole="button"
                accessibilityLabel="Report account"
              >
                <View className="w-11 h-11 rounded-full bg-red-100 items-center justify-center mr-3.5">
                  <Ionicons
                    name="alert-circle-outline"
                    size={21}
                    color="#DC2626"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-red-600">
                    Report
                  </Text>
                  <Text className="text-xs text-red-500/80 mt-0.5">
                    Report profile for community guideline violations
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Copy profile link */}
              <TouchableOpacity
                onPress={handleCopyProfileUrl}
                activeOpacity={0.7}
                className="flex-row items-center py-3.5 px-2.5 rounded-xl active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="Copy profile link"
              >
                <View className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center mr-3.5">
                  <Ionicons name="link-outline" size={21} color="#374151" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    Copy profile link
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Copy link to this profile
                  </Text>
                </View>
              </TouchableOpacity>

              {/* About this account */}
              <TouchableOpacity
                onPress={handleAboutThisAccount}
                activeOpacity={0.7}
                className="flex-row items-center py-3.5 px-2.5 rounded-xl active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="About this account"
              >
                <View className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center mr-3.5">
                  <Ionicons
                    name="information-circle-outline"
                    size={21}
                    color="#374151"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    About this account
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    See account details and verification info
                  </Text>
                </View>
              </TouchableOpacity>

              {/* QR code */}
              <TouchableOpacity
                onPress={() => {
                  bottomSheetRef.current?.close();
                  setIsShareModalVisible(true);
                }}
                activeOpacity={0.7}
                className="flex-row items-center py-3.5 px-2.5 rounded-xl active:bg-gray-100"
                accessibilityRole="button"
                accessibilityLabel="QR code"
              >
                <View className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center mr-3.5">
                  <Ionicons name="qr-code-outline" size={21} color="#374151" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    QR code
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Let others scan to find this account
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}
