import { useAuth } from "@/hooks/use-auth";
import {
  ChatMessage,
  getMessagesApi,
  LocationPinData,
  sendMessageApi,
} from "@/services/chat-service";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LeafletMap from "../../components/LeafletMap";

const CAROUSEL_INQUIRIES = [
  {
    id: "available",
    icon: "🌾",
    tag: "AVAILABILITY",
    tagBg: "bg-[#72AF5B]/15",
    tagText: "text-[#2E5E20]",
    title: "Available pa po ba ito?",
    text: "Available pa po ba ito?",
    desc: "Check if today's harvest of fresh produce is in stock right now.",
    btnText: "Ask Availability",
  },
  {
    id: "bulk",
    icon: "📦",
    tag: "WHOLESALE",
    tagBg: "bg-amber-100",
    tagText: "text-amber-800",
    title: "How much for bulk / wholesale?",
    text: "How much for bulk / wholesale?",
    desc: "Inquire about volume discounts for orders 50kg & above.",
    btnText: "Ask Bulk Rates",
  },
  {
    id: "pickup",
    icon: "📍",
    tag: "PICKUP POINT",
    tagBg: "bg-[#72AF5B]/15",
    tagText: "text-[#2E5E20]",
    title: "Where is your pickup point?",
    text: "Where is your pickup point?",
    desc: "Get gate pickup coordinates & landmark directions in Pala-o.",
    btnText: "Ask Pickup Point",
  },
  {
    id: "deliver",
    icon: "🚚",
    tag: "DELIVERY",
    tagBg: "bg-purple-100",
    tagText: "text-purple-800",
    title: "Do you provide delivery services?",
    text: "Do you provide delivery services?",
    desc: "Check morning delivery drop-offs to Iligan City central markets.",
    btnText: "Ask Delivery",
  },
];

const mergeMessages = (
  serverMsgs: ChatMessage[],
  currentMsgs: ChatMessage[],
): ChatMessage[] => {
  const combined = [...serverMsgs];
  currentMsgs.forEach((m) => {
    const mId = String(m.id || "");
    if (
      (mId.startsWith("msg-") ||
        mId.startsWith("temp-") ||
        mId.startsWith("auto-")) &&
      !combined.some((c) => String(c.id) === mId)
    ) {
      combined.push(m);
    }
  });
  return combined;
};

const SAVED_PLACES = [
  {
    id: "farm_gate",
    icon: "🚜",
    name: "Farm Gate",
    title: "Green Valley Farm - Main Gate",
    address: "National Highway, Brgy. Pala-o, Iligan City",
    lat: 8.228,
    lng: 124.2452,
  },
  {
    id: "market_stall",
    icon: "🏪",
    name: "Market Stall",
    title: "Iligan Wet & Dry Market - Stall 18",
    address: "Pala-o Public Market, Iligan City",
    lat: 8.2295,
    lng: 124.2415,
  },
  {
    id: "pickup_hub",
    icon: "📦",
    name: "Pickup Hub",
    title: "Central Agro Sorting & Pickup Hub",
    address: "Macapagal Ave, Tubod, Iligan City",
    lat: 8.2175,
    lng: 124.2389,
  },
  {
    id: "meetup_point",
    icon: "📍",
    name: "Meetup Point",
    title: "Rotonda Crossing Meetup Spot",
    address: "Tibanga Highway Rotonda, Iligan City",
    lat: 8.2392,
    lng: 124.2441,
  },
];

const openExternalMap = (lat: number, lng: number, label: string) => {
  const scheme = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
  });
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  if (scheme) {
    Linking.canOpenURL(scheme)
      .then((supported) => {
        if (supported) {
          Linking.openURL(scheme);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  } else {
    Linking.openURL(webUrl);
  }
};

const generateUniqueId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export default function ChatConversation() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    conversationId?: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
    online?: string;
  }>();

  const otherUserName = params.name || "Farmer";
  const otherUserAvatar = params.avatarUrl || "";
  const isOnline = params.online === "true";

  const [conversationId, setConversationId] = useState<string | null>(
    params.conversationId || null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Location Pin States
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [locationTitle, setLocationTitle] = useState(SAVED_PLACES[0].title);
  const [locationAddress, setLocationAddress] = useState(
    SAVED_PLACES[0].address,
  );
  const [locationCoords, setLocationCoords] = useState({
    latitude: SAVED_PLACES[0].lat,
    longitude: SAVED_PLACES[0].lng,
  });
  // Swipe-to-dismiss gesture handling for Share Farm Location Pin modal
  const locationModalTranslateY = useRef(new Animated.Value(0)).current;
  const locationModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          locationModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.5) {
          Animated.timing(locationModalTranslateY, {
            toValue: Dimensions.get("window").height,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setIsLocationModalVisible(false);
            locationModalTranslateY.setValue(0);
          });
        } else {
          Animated.spring(locationModalTranslateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(locationModalTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const [previewMapLocation, setPreviewMapLocation] =
    useState<LocationPinData | null>(null);

  // Welcome Card & Farmer Status States
  const [isWelcomeCardVisible, setIsWelcomeCardVisible] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isFarmerTyping, setIsFarmerTyping] = useState(false);
  const [fullPreviewImage, setFullPreviewImage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const fetchMessages = async () => {
    try {
      const data = await getMessagesApi({
        conversationId: conversationId || undefined,
        userId: params.userId || undefined,
      });
      setMessages((prev) => mergeMessages(data.messages, prev));
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err) {
      console.warn("Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getMessagesApi({
      conversationId: conversationId || undefined,
      userId: params.userId || undefined,
    })
      .then((data) => {
        if (isMounted) {
          setMessages((prev) => mergeMessages(data.messages, prev));
          if (data.conversationId) setConversationId(data.conversationId);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Failed to fetch messages:", err);
          setMessages((prev) => mergeMessages([], prev));
          setIsLoading(false);
        }
      });

    // Polling interval for live incoming messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [params.conversationId, params.userId]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const handleSendQuickReply = (text: string, chipId?: string) => {
    if (isSending) return;

    let replyText =
      "Salamat sa mensahe! Available po kami para sa orders at delivery ngayon. 🌾";
    let locationData: LocationPinData | undefined = undefined;

    if (chipId === "available") {
      replyText =
        "Opo, available pa po! Katatapos lang i-harvest kaninang umaga. Ilang kilo po ang kailangan ninyo? 🥭";
    } else if (chipId === "bulk") {
      replyText =
        "May wholesale discount po tayo for 50kg above (up to 15% discount)! Sabihin niyo lang po kung ilang kilo ang kailangan ninyo. 📦";
    } else if (chipId === "harvest") {
      replyText =
        "Ang susunod na ani ay bukas ng 5:30 AM. Fresh na fresh para sa pickup at delivery! 🚜";
    } else if (chipId === "pickup") {
      replyText =
        "Sa Green Valley Farm Main Gate po sa National Highway, Brgy. Pala-o, 6 AM - 5 PM daily! Eto po ang exact farm gate pin: 📍";
      locationData = {
        title: "Green Valley Farm - Main Gate",
        address: "National Highway, Brgy. Pala-o, Iligan City",
        latitude: 8.228,
        longitude: 124.2452,
      };
    } else if (chipId === "deliver") {
      replyText =
        "Puwede po kami mag-deliver sa Pala-o Market at Tibanga rotonda tuwing 7:00 AM! Paki-message lang po ang exact drop-off location ninyo. 🚚";
    } else if (chipId === "fresh") {
      replyText =
        "Kaka-ani lang po kaninang 6:00 AM! Guarantee crispy at sweet. ✨";
    }

    const tempUserMsgId = generateUniqueId("temp");
    const optimisticMsg: ChatMessage = {
      id: tempUserMsgId,
      sender: "user",
      senderId: user?.id ? String(user.id) : undefined,
      receiverId: params.userId,
      type: "text",
      text,
      time: "Just now",
      isSeen: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsFarmerTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 60);

    const autoReplyTempId = generateUniqueId(`auto-${chipId || "reply"}`);

    // Persist user inquiry message AND farmer auto-reply in database
    sendMessageApi({
      receiverId: params.userId,
      conversationId: conversationId || undefined,
      messageText: text,
      autoReplyText: locationData ? JSON.stringify(locationData) : replyText,
      autoReplyType: locationData ? "location" : "auto_reply",
    })
      .then((res) => {
        if (res.data) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempUserMsgId ? res.data : m)),
          );
          if (res.data.conversationId && !conversationId) {
            setConversationId(res.data.conversationId);
          }
        }
      })
      .catch((err) => {
        console.warn("Inquiry quick send error:", err);
      });

    // Realistic instant auto-reply simulation with typing bubble
    setTimeout(() => {
      setIsFarmerTyping(false);

      const autoReplyMsg: ChatMessage = {
        id: autoReplyTempId,
        sender: "other",
        senderId: params.userId,
        type: locationData ? "location" : "auto_reply",
        text: replyText,
        location: locationData,
        time: "Just now",
        isSeen: true,
      };
      setMessages((prev) => [...prev, autoReplyMsg]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 850);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText("");
    setIsSending(true);

    // Optimistic message preview
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: "user",
      senderId: user?.id ? String(user.id) : undefined,
      receiverId: params.userId,
      type: "text",
      text,
      time: "Just now",
      isSeen: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await sendMessageApi({
        receiverId: params.userId,
        conversationId: conversationId || undefined,
        messageText: text,
      });

      if (res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.data : m)),
        );
        if (res.data.id && !conversationId) {
          fetchMessages();
        }
      }
    } catch (err) {
      console.warn("Send message error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendLocation = async (locData: LocationPinData) => {
    setIsLocationModalVisible(false);
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: "user",
      senderId: user?.id ? String(user.id) : undefined,
      receiverId: params.userId,
      type: "location",
      text: JSON.stringify(locData),
      location: locData,
      time: "Just now",
      isSeen: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await sendMessageApi({
        receiverId: params.userId,
        conversationId: conversationId || undefined,
        messageText: JSON.stringify(locData),
        messageType: "location",
      });

      if (res.data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...res.data, location: locData } : m,
          ),
        );
        if (res.data.id && !conversationId) {
          fetchMessages();
        }
      }
    } catch (err) {
      console.warn("Send location error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendImage = async (imageUri: string) => {
    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: "user",
      senderId: user?.id ? String(user.id) : undefined,
      receiverId: params.userId,
      type: "image",
      imageUrl: imageUri,
      text: "[Photo]",
      time: "Just now",
      isSeen: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 60);

    try {
      const res = await sendMessageApi({
        receiverId: params.userId,
        conversationId: conversationId || undefined,
        messageText: "[Photo]",
        messageType: "image",
        imageUrl: imageUri,
      });

      if (res.data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...res.data, imageUrl: imageUri } : m,
          ),
        );
        if (res.data.id && !conversationId) {
          fetchMessages();
        }
      }
    } catch (err) {
      console.warn("Send image error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handlePickFromGallery = async () => {
    setShowAttachmentMenu(false);
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow photo library access to share photos in chat.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        handleSendImage(uri);
      }
    } catch (error) {
      console.error("Gallery picker error:", error);
    }
  };

  const handlePickFromCamera = async () => {
    setShowAttachmentMenu(false);
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow camera access to take and send photos in chat.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        handleSendImage(uri);
      }
    } catch (error) {
      console.error("Camera picker error:", error);
    }
  };

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/Chats" as any);
      }
    } catch {
      router.push("/user/Chats" as any);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        style={{ flex: 1 }}
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-3 py-3 bg-white border-b border-gray-100 shadow-2xs z-10">
          {/* Left Section: Back, Avatar, Name & Status */}
          <View className="flex-row items-center flex-1 pr-1">
            <TouchableOpacity
              onPress={handleBack}
              className="p-1 -ml-1 mr-2 active:opacity-70 flex-row items-center"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={28} color="#000000" />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <View className="w-11 h-11 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200 shadow-2xs">
              {otherUserAvatar ? (
                <Image
                  source={{ uri: otherUserAvatar }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={24} color="#6B7280" />
              )}
            </View>

            {/* Name and Active Status */}
            <View className="flex-1 ml-3 justify-center">
              <Text
                className="font-bold text-base text-gray-900 leading-tight"
                numberOfLines={1}
              >
                {otherUserName}
              </Text>
              <View className="flex-row items-center mt-0.5">
                {isOnline && (
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                )}
                <Text className="text-xs text-gray-500">
                  {isOnline ? "Active Now" : "Local Farmer"}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Section: Call, Video, Info Icons */}
          <View className="flex-row items-center gap-3.5">
            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Voice Call"
            >
              <Ionicons name="call" size={22} color="#72AF5B" />
            </TouchableOpacity>

            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Video Call"
            >
              <Ionicons name="videocam" size={24} color="#72AF5B" />
            </TouchableOpacity>

            <TouchableOpacity
              className="p-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color="#72AF5B"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 bg-white"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
            paddingTop: 16,
            paddingBottom: 16,
          }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() =>
            scrollViewRef.current?.scrollToEnd({ animated: false })
          }
        >
          {isLoading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#72AF5B" />
              <Text className="text-xs text-gray-400 mt-2 font-medium">
                Loading messages...
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="py-20 items-center justify-center px-6">
              <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-3">
                <Ionicons
                  name="chatbubble-ellipses"
                  size={32}
                  color="#72AF5B"
                />
              </View>
              <Text className="text-base font-bold text-gray-800 mb-1">
                Say hello to {otherUserName}!
              </Text>
              <Text className="text-xs text-gray-400 text-center">
                Start your conversation about crops, seeds, or local farming.
              </Text>
            </View>
          ) : null}

          {/* Farmer's Automated Greeting & Interactive FAQ Card */}
          {!isLoading && isWelcomeCardVisible && (
            <View className="mb-4 bg-[#72AF5B]/5 rounded-2xl border border-[#72AF5B]/30 p-3.5 shadow-2xs">
              {/* Card Header */}
              <View className="flex-row items-center justify-between pb-2 mb-2 border-b border-[#72AF5B]/20">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-5 h-5 rounded-full bg-[#72AF5B] items-center justify-center">
                    <Ionicons name="flash" size={11} color="#FFFFFF" />
                  </View>
                  <Text className="text-[11px] font-bold text-[#2E5E20] uppercase tracking-wider">
                    Instant Auto-Reply • {otherUserName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsWelcomeCardVisible(false)}
                  className="w-5 h-5 rounded-full bg-[#72AF5B]/15 items-center justify-center"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={12} color="#2E5E20" />
                </TouchableOpacity>
              </View>

              {/* Greeting Message */}
              <Text className="text-xs text-gray-700 leading-4 mb-3 font-normal">
                {`Kumusta! Welcome to ${otherUserName}'s farm chat. 🌾 We are currently out tending the crops. Leave your inquiries below or tap a quick question from our menu!`}
              </Text>

              {/* Carousel Header with Counter & Swipe Hint */}
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    Quick Inquiry Cards
                  </Text>
                  <View className="px-1.5 py-0.5 rounded-md bg-[#72AF5B]/15">
                    <Text className="text-[9px] font-bold text-[#2E5E20]">
                      {carouselIndex + 1}/{CAROUSEL_INQUIRIES.length}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-0.5">
                  <Text className="text-[10px] font-medium text-[#72AF5B]">
                    Swipe cards
                  </Text>
                  <Ionicons name="chevron-forward" size={11} color="#72AF5B" />
                </View>
              </View>

              {/* Swipeable Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={248}
                snapToAlignment="start"
                scrollEventThrottle={16}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const offsetX = e.nativeEvent.contentOffset.x;
                  const idx = Math.min(
                    Math.max(0, Math.round(offsetX / 248)),
                    CAROUSEL_INQUIRIES.length - 1,
                  );
                  if (idx !== carouselIndex) {
                    setCarouselIndex(idx);
                  }
                }}
                contentContainerStyle={{ paddingVertical: 2, paddingRight: 4 }}
              >
                {CAROUSEL_INQUIRIES.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => handleSendQuickReply(item.title, item.id)}
                    className={`w-[240px] bg-white rounded-2xl p-3.5 border mr-2 shadow-2xs justify-between ${
                      idx === carouselIndex
                        ? "border-[#72AF5B] bg-white"
                        : "border-[#72AF5B]/40 bg-white/95"
                    }`}
                  >
                    {/* Top Row: Produce Icon + Category Tag */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="w-8 h-8 rounded-xl bg-[#72AF5B]/10 items-center justify-center border border-[#72AF5B]/20">
                        <Text className="text-base">{item.icon}</Text>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded-full ${item.tagBg}`}
                      >
                        <Text
                          className={`text-[9px] font-extrabold uppercase tracking-wider ${item.tagText}`}
                        >
                          {item.tag}
                        </Text>
                      </View>
                    </View>

                    {/* Inquiry Question & Description */}
                    <View className="mb-3">
                      <Text
                        className="text-xs font-bold text-gray-900 leading-snug mb-1"
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text
                        className="text-[11px] text-gray-500 leading-3.5 font-normal"
                        numberOfLines={2}
                      >
                        {item.desc}
                      </Text>
                    </View>

                    {/* Bottom CTA Button */}
                    <View className="flex-row items-center justify-between py-1.5 px-3 bg-[#72AF5B]/10 rounded-xl border border-[#72AF5B]/35 active:bg-[#72AF5B]/20">
                      <Text className="text-[11px] font-bold text-[#2E5E20]">
                        {item.btnText}
                      </Text>
                      <Ionicons name="send" size={11} color="#72AF5B" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Carousel Pagination Dots */}
              <View className="flex-row items-center justify-center gap-1.5 mt-2.5">
                {CAROUSEL_INQUIRIES.map((_, dotIdx) => (
                  <View
                    key={dotIdx}
                    className={`h-1.5 rounded-full ${
                      dotIdx === carouselIndex
                        ? "w-4 bg-[#72AF5B]"
                        : "w-1.5 bg-[#72AF5B]/25"
                    }`}
                  />
                ))}
              </View>
            </View>
          )}

          {!isLoading &&
            messages.map((item, index) => {
              // Exact match: if sender is user or senderId equals logged in user's ID
              const isUser =
                item.sender === "user" ||
                (Boolean(user?.id) &&
                  (String(item.senderId) === String(user?.id) ||
                    Number(item.senderId) === Number(user?.id)));

              // Parse location pin data if present
              let locationData: LocationPinData | null = item.location || null;
              if (
                !locationData &&
                (item.type === "location" ||
                  (item.text &&
                    (item.text.trim().startsWith('{"type":"location"') ||
                      (item.text.includes('"latitude"') &&
                        item.text.includes('"longitude"')))))
              ) {
                try {
                  locationData = JSON.parse(item.text!);
                } catch {}
              }

              return (
                <View key={item.id || index} className="mb-3">
                  {/* Message Row */}
                  <View
                    className={`flex-row items-end ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Other User Avatar */}
                    {!isUser && (
                      <View className="mr-2 mb-0.5">
                        <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200">
                          {otherUserAvatar ? (
                            <Image
                              source={{ uri: otherUserAvatar }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="person" size={16} color="#6B7280" />
                          )}
                        </View>
                      </View>
                    )}

                    {/* Message Content: Auto-Reply, Location Pin, Image, or Text Bubble */}
                    {(item.id && String(item.id).startsWith("auto-")) ||
                    item.type === "auto_reply" ||
                    (!isUser &&
                      Boolean(item.text) &&
                      (item.text!.includes("Salamat sa mensahe!") ||
                        item.text!.includes("Opo, available pa po!") ||
                        item.text!.includes("May wholesale discount") ||
                        item.text!.includes("Ang susunod na ani") ||
                        item.text!.includes("Sa Green Valley Farm Main Gate") ||
                        item.text!.includes("Puwede po kami mag-deliver") ||
                        item.text!.includes("Kaka-ani lang po"))) ? (
                      /* Auto-Reply Visual Card */
                      <View className="w-72 rounded-2xl overflow-hidden bg-white border border-[#72AF5B]/40 shadow-xs">
                        {/* Auto-Reply Card Header */}
                        <View className="px-3 py-1.5 bg-[#72AF5B]/10 border-b border-[#72AF5B]/20 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5">
                            <View className="w-4 h-4 rounded-full bg-[#72AF5B] items-center justify-center">
                              <Ionicons name="flash" size={9} color="#FFFFFF" />
                            </View>
                            <Text className="text-[10px] font-bold text-[#2E5E20] uppercase tracking-wider">
                              Instant Auto-Reply
                            </Text>
                          </View>
                          <View className="px-2 py-0.5 rounded-full bg-[#72AF5B]/20 border border-[#72AF5B]/30">
                            <Text className="text-[8px] font-bold text-[#2E5E20] tracking-wide">
                              FARM BOT
                            </Text>
                          </View>
                        </View>

                        {/* Content */}
                        <View className="p-3 bg-white">
                          <Text className="text-sm text-gray-800 leading-snug font-medium mb-2">
                            {item.text}
                          </Text>

                          {/* Interactive Farm Location Action Buttons */}
                          {locationData ? (
                            <View className="pt-2 border-t border-[#72AF5B]/20 flex-row gap-2">
                              <TouchableOpacity
                                onPress={() =>
                                  setPreviewMapLocation(locationData)
                                }
                                className="flex-1 py-1.5 bg-[#72AF5B]/10 rounded-lg items-center justify-center flex-row gap-1 border border-[#72AF5B]/30 active:bg-[#72AF5B]/20"
                              >
                                <Ionicons
                                  name="map-outline"
                                  size={12}
                                  color="#72AF5B"
                                />
                                <Text className="text-[11px] font-semibold text-[#2E5E20]">
                                  View Map
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() =>
                                  openExternalMap(
                                    locationData.latitude,
                                    locationData.longitude,
                                    locationData.title,
                                  )
                                }
                                className="flex-1 py-1.5 bg-[#72AF5B] rounded-lg items-center justify-center flex-row gap-1 active:opacity-80"
                              >
                                <Ionicons
                                  name="navigate-outline"
                                  size={12}
                                  color="#FFFFFF"
                                />
                                <Text className="text-[11px] font-bold text-white">
                                  Directions
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ) : locationData ? (
                      /* Location Pin Card */
                      <View
                        className={`w-64 rounded-2xl overflow-hidden shadow-xs border ${
                          isUser
                            ? "bg-emerald-50 border-emerald-300"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        {/* Map Header Preview Graphic */}
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setPreviewMapLocation(locationData)}
                          className="h-24 w-full bg-emerald-100/70 relative items-center justify-center overflow-hidden"
                        >
                          {/* Map Grid Texture */}
                          <View className="absolute inset-0 bg-[#E8F5E9] items-center justify-center">
                            <View className="absolute w-full h-[1.5px] bg-emerald-300/60 top-6" />
                            <View className="absolute w-full h-[2px] bg-emerald-400/60 top-12" />
                            <View className="absolute h-full w-[2px] bg-emerald-400/60 left-16" />
                            <View className="absolute h-full w-[1.5px] bg-emerald-300/60 right-14" />
                            <View className="w-12 h-12 rounded-full bg-emerald-200/40 border border-emerald-300/50" />
                          </View>

                          {/* Center Pin Icon */}
                          <View className="items-center justify-center z-10">
                            <View className="w-9 h-9 rounded-full bg-red-500/20 items-center justify-center">
                              <Ionicons
                                name="location"
                                size={24}
                                color="#EF4444"
                              />
                            </View>
                          </View>

                          {/* Top-Right Badge */}
                          <View className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded-full flex-row items-center">
                            <Ionicons
                              name="navigate"
                              size={9}
                              color="#FFFFFF"
                            />
                            <Text className="text-[9px] font-bold text-white ml-1">
                              FARM PIN
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Location Details */}
                        <View className="p-3 bg-white">
                          <View className="flex-row items-center gap-1.5 mb-1">
                            <Ionicons
                              name="location-sharp"
                              size={14}
                              color="#15803D"
                            />
                            <Text
                              className="text-sm font-bold text-gray-900 flex-1"
                              numberOfLines={1}
                            >
                              {locationData.title}
                            </Text>
                          </View>

                          {locationData.address ? (
                            <Text
                              className="text-xs text-gray-500 leading-4 mb-1.5"
                              numberOfLines={2}
                            >
                              {locationData.address}
                            </Text>
                          ) : null}

                          <Text className="text-[10px] font-mono text-gray-400 mb-2.5">
                            {locationData.latitude.toFixed(4)}° N,{" "}
                            {locationData.longitude.toFixed(4)}° E
                          </Text>

                          {/* Action Buttons */}
                          <View className="flex-row gap-2 pt-2 border-t border-gray-100">
                            <TouchableOpacity
                              onPress={() =>
                                setPreviewMapLocation(locationData)
                              }
                              className="flex-1 py-1.5 bg-gray-100 rounded-lg items-center justify-center flex-row gap-1 active:bg-gray-200"
                            >
                              <Ionicons
                                name="map-outline"
                                size={12}
                                color="#374151"
                              />
                              <Text className="text-[11px] font-semibold text-gray-700">
                                View Map
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() =>
                                openExternalMap(
                                  locationData!.latitude,
                                  locationData!.longitude,
                                  locationData!.title,
                                )
                              }
                              className="flex-1 py-1.5 bg-[#72AF5B] rounded-lg items-center justify-center flex-row gap-1 active:opacity-80"
                            >
                              <Ionicons
                                name="navigate-outline"
                                size={12}
                                color="#FFFFFF"
                              />
                              <Text className="text-[11px] font-bold text-white">
                                Directions
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : item.type === "image" && item.imageUrl ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setFullPreviewImage(item.imageUrl || null)}
                        className="w-56 h-44 rounded-2xl bg-gray-100 mb-1 items-center justify-center overflow-hidden border border-gray-200 shadow-2xs"
                      >
                        <Image
                          source={{ uri: item.imageUrl }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View
                        className={`px-4 py-2.5 max-w-[76%] ${
                          isUser
                            ? "bg-[#72AF5B] rounded-2xl rounded-br-xs"
                            : "bg-[#F0F0F0] rounded-2xl rounded-bl-xs"
                        }`}
                      >
                        <Text
                          className={`text-sm leading-snug ${
                            isUser ? "text-white font-medium" : "text-gray-900"
                          }`}
                        >
                          {item.text}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Seen & Timestamp indicator */}
                  <View
                    className={`flex-row items-center mt-1 px-1 ${
                      isUser ? "justify-end" : "justify-start ml-10"
                    }`}
                  >
                    <Text className="text-[10px] text-gray-400 font-medium">
                      {item.time || "Now"}
                    </Text>
                    {isUser && item.isSeen && (
                      <Text className="text-[10px] text-[#72AF5B] font-bold ml-1.5">
                        • Seen
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

          {/* Farmer is Typing Bubble */}
          {isFarmerTyping && (
            <View className="flex-row items-end mb-3 mt-1">
              <View className="w-8 h-8 rounded-full bg-[#72AF5B]/15 items-center justify-center mr-2 border border-[#72AF5B]/30 overflow-hidden">
                {otherUserAvatar ? (
                  <Image
                    source={{ uri: otherUserAvatar }}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <Ionicons name="person" size={16} color="#72AF5B" />
                )}
              </View>
              <View className="px-3.5 py-2.5 bg-[#72AF5B]/10 rounded-2xl rounded-bl-xs flex-row items-center border border-[#72AF5B]/25">
                <View className="flex-row items-center gap-1 mr-2">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#72AF5B]" />
                  <View className="w-1.5 h-1.5 rounded-full bg-[#72AF5B]/80" />
                  <View className="w-1.5 h-1.5 rounded-full bg-[#72AF5B]/60" />
                </View>
                <Text className="text-xs text-[#2E5E20] font-medium">
                  {otherUserName} is typing...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <View
            className="absolute bottom-16 left-4 z-50 bg-white rounded-2xl p-2 shadow-2xl elevation-10 w-52 border border-gray-100"
            style={{
              position: "absolute",
              bottom: 64,
              left: 16,
              zIndex: 50,
            }}
          >
            {/* Camera Option */}
            <TouchableOpacity
              onPress={handlePickFromCamera}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-[#3B82F6] items-center justify-center">
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">Camera</Text>
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              onPress={handlePickFromGallery}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-[#8B5CF6] items-center justify-center">
                <Ionicons name="images" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">Gallery</Text>
            </TouchableOpacity>

            {/* Location Pin Option */}
            <TouchableOpacity
              onPress={() => {
                setShowAttachmentMenu(false);
                setIsLocationModalVisible(true);
              }}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-[#EF4444] items-center justify-center">
                <Ionicons name="location-sharp" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">
                Location Pin
              </Text>
            </TouchableOpacity>

            {/* Voice Message Option */}
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(false)}
              className="flex-row items-center px-2.5 py-2 rounded-xl active:bg-gray-100 gap-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-[#72AF5B] items-center justify-center">
                <Ionicons name="mic" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-semibold text-gray-800">Voice</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Input Bar */}
        <View className="flex-row items-center px-4 py-3 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={() => setShowAttachmentMenu((prev) => !prev)}
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 active:opacity-80 shadow-2xs ${
              showAttachmentMenu ? "bg-gray-700" : "bg-[#72AF5B]"
            }`}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Attachments"
          >
            <Ionicons
              name={showAttachmentMenu ? "close" : "add"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Text Input Pill */}
          <View className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-3 flex-row items-center border border-gray-200">
            <TextInput
              value={inputText}
              onChangeText={(t) => {
                setInputText(t);
                if (showAttachmentMenu) setShowAttachmentMenu(false);
              }}
              placeholder="Aa"
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-base text-gray-800 p-0 font-medium"
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={inputText.trim() ? handleSend : undefined}
            disabled={!inputText.trim() || isSending}
            className="active:opacity-70 p-1"
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#72AF5B" />
            ) : inputText.trim() ? (
              <Ionicons name="send" size={22} color="#72AF5B" />
            ) : (
              <MaterialCommunityIcons
                name="flower-tulip"
                size={24}
                color="#EC4899"
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Share Farm Location Pin Modal */}
      <Modal
        visible={isLocationModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setIsLocationModalVisible(false);
          locationModalTranslateY.setValue(0);
        }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          {/* Backdrop */}
          <Pressable
            onPress={() => {
              setIsLocationModalVisible(false);
              locationModalTranslateY.setValue(0);
            }}
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Close location modal backdrop"
          />

          <Animated.View
            style={{
              transform: [{ translateY: locationModalTranslateY }],
            }}
            className="bg-white rounded-t-3xl p-5 pb-8 shadow-2xl max-h-[85%]"
          >
            {/* Drag Handle Area (Swipe down to close) */}
            <View
              {...locationModalPanResponder.panHandlers}
              className="w-full py-2.5 items-center -mt-3 mb-1"
            >
              <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center" />
            </View>

            {/* Header (No X button, swipe down to dismiss) */}
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-[#72AF5B] items-center justify-center mr-2.5">
                <Ionicons name="location" size={19} color="#ffffff" />
              </View>
              <Text className="text-lg font-bold text-gray-900">
                Share Farm Location Pin
              </Text>
            </View>

            <Text className="text-sm text-gray-500 mb-4">
              Send your farm gate, pickup spot, or meetup coordinates so the
              other party can easily navigate to you.
            </Text>

            {/* Place Name Input */}
            <Text className="text-sm font-bold text-gray-700 mb-1">
              Location / Farm Name
            </Text>
            <TextInput
              value={locationTitle}
              onChangeText={setLocationTitle}
              placeholder="e.g. Green Valley Farm - Main Gate"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 mb-3"
            />

            {/* Address Input */}
            <Text className="text-sm font-bold text-gray-700 mb-1">
              Address / Landmark Instructions
            </Text>
            <TextInput
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="e.g. Near Pala-o Crossing, Iligan City"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 mb-3"
            />

            {/* GPS Coordinates Display */}
            <View className="flex-row items-center justify-between bg-gray-100 border border-gray-200 p-3 rounded-xl mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="navigate-circle" size={25} color="#72AF5B" />
                <View>
                  <Text className="text-sm font-bold text-[#000000]">
                    GPS Coordinates
                  </Text>
                  <Text className="text-sm font-mono text-[#72AF5B]">
                    {locationCoords.latitude.toFixed(4)}° N,{" "}
                    {locationCoords.longitude.toFixed(4)}° E
                  </Text>
                </View>
              </View>
              <View className="bg-[#72AF5B] px-3 py-1 rounded-md">
                <Text className="text-sm font-bold text-white">READY</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setIsLocationModalVisible(false);
                  locationModalTranslateY.setValue(0);
                }}
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Text className="text-sm font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleSendLocation({
                    title: locationTitle.trim() || "Farm Location Pin",
                    address:
                      locationAddress.trim() || "Iligan City, Philippines",
                    latitude: locationCoords.latitude,
                    longitude: locationCoords.longitude,
                  })
                }
                disabled={isSending}
                className="flex-1 py-3 rounded-xl bg-[#72AF5B] items-center justify-center flex-row gap-2 active:opacity-85"
              >
                <Text className="text-sm font-bold text-white">
                  Send Location Pin
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* In-App Map Preview Modal */}
      <Modal
        visible={!!previewMapLocation}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setPreviewMapLocation(null)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setPreviewMapLocation(null)}
              className="p-1 -ml-1 flex-row items-center gap-1"
            >
              <Ionicons name="chevron-back" size={24} color="#000000" />
              <Text className="text-sm font-medium text-gray-700">Back</Text>
            </TouchableOpacity>

            <Text
              className="text-base font-bold text-gray-900 max-w-[200px]"
              numberOfLines={1}
            >
              {previewMapLocation?.title || "Location Map"}
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (previewMapLocation) {
                  openExternalMap(
                    previewMapLocation.latitude,
                    previewMapLocation.longitude,
                    previewMapLocation.title,
                  );
                }
              }}
              className="p-1"
            >
              <Ionicons name="open-outline" size={22} color="#15803D" />
            </TouchableOpacity>
          </View>

          {previewMapLocation && (
            <View className="flex-1 relative">
              <LeafletMap
                latitude={previewMapLocation.latitude}
                longitude={previewMapLocation.longitude}
                zoom={15}
              />

              {/* Floating Info Card on bottom of map */}
              <View className="absolute bottom-6 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200">
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-gray-900">
                      {previewMapLocation.title}
                    </Text>
                    {previewMapLocation.address && (
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {previewMapLocation.address}
                      </Text>
                    )}
                  </View>
                  <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
                    <Ionicons name="location" size={18} color="#EF4444" />
                  </View>
                </View>

                <Text className="text-[10px] font-mono text-gray-400 mb-3">
                  {previewMapLocation.latitude.toFixed(4)}° N,{" "}
                  {previewMapLocation.longitude.toFixed(4)}° E
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    openExternalMap(
                      previewMapLocation.latitude,
                      previewMapLocation.longitude,
                      previewMapLocation.title,
                    )
                  }
                  className="w-full bg-[#72AF5B] py-2.5 rounded-xl flex-row items-center justify-center gap-2 active:opacity-85"
                >
                  <Ionicons name="navigate" size={16} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm">
                    Navigate in Google Maps
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Full-Screen Image Preview Modal */}
      <Modal
        visible={!!fullPreviewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullPreviewImage(null)}
      >
        <View className="flex-1 bg-black/95 items-center justify-center relative">
          <SafeAreaView className="absolute top-4 right-4 z-50">
            <TouchableOpacity
              onPress={() => setFullPreviewImage(null)}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
          {fullPreviewImage ? (
            <Image
              source={{ uri: fullPreviewImage }}
              className="w-full h-4/5"
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
