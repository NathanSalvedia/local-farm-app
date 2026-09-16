import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_RSBSA_STATE,
  getRSBSAApplication,
  RSBSAApplication,
} from "@/services/rsbsa-service";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navigation from "../../components/Navigation";

const FARM_DETAILS_STORAGE_KEY = "localfarm_user_farm_details_v1";

interface FarmDetails {
  farmName: string; // Farm or Product
  farmLocation: string;
  primaryCrops: string;
}

const DEFAULT_FARM_DETAILS: FarmDetails = {
  farmName: "Salvedia Green Meadows",
  farmLocation: "Brgy. Bunga, Cabanglasan, Bukidnon",
  primaryCrops: "Tomatoes, Bell Peppers, Romaine Lettuce",
};

const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];

export default function PersonalInformation() {
  const params = useLocalSearchParams<{ edit?: string; mode?: string }>();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  // Personal Info Form State
  const [formData, setFormData] = useState({
    name: user?.name || user?.fullName || "",
    username: user?.username || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    gender: user?.gender || "Male",
    bio: user?.about || user?.bio || "",
  });

  // Agricultural Profile State (Farm or Product)
  const [farmData, setFarmData] = useState<FarmDetails>(DEFAULT_FARM_DETAILS);

  // RSBSA Verification State
  const [rsbsaApp, setRsbsaApp] =
    useState<RSBSAApplication>(DEFAULT_RSBSA_STATE);

  // UI Control State
  const [isEditing, setIsEditing] = useState(
    params?.edit === "true" || params?.mode === "edit",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPicture, setIsChangingPicture] = useState(false);
  const [isPhotoOptionsVisible, setIsPhotoOptionsVisible] = useState(false);

  // Avatar adjustment state
  const [avatarUri, setAvatarUri] = useState<string>(user?.avatarUrl || "");
  const [avatarScale, setAvatarScale] = useState<number>(1);
  const [sliderProgress, setSliderProgress] = useState<number>(0.15);
  const [trackWidth, setTrackWidth] = useState<number>(280);

  // Check params for initial edit mode
  useEffect(() => {
    if (params?.edit === "true" || params?.mode === "edit") {
      setIsEditing(true);
    }
  }, [params?.edit, params?.mode]);

  // Sync user state on load
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || user.fullName || "",
        username: user.username || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        gender: user.gender || "Male",
        bio: user.about || user.bio || "",
      });
      if (user.avatarUrl) {
        setAvatarUri(user.avatarUrl);
      }
    }
  }, [user]);

  // Load RSBSA and Farm Details from local storage
  useEffect(() => {
    let isMounted = true;
    const loadAgriculturalData = async () => {
      try {
        const app = await getRSBSAApplication();
        if (!isMounted) return;
        setRsbsaApp(app);

        const savedFarm = await AsyncStorage.getItem(FARM_DETAILS_STORAGE_KEY);
        if (!isMounted) return;
        if (savedFarm) {
          const parsed = JSON.parse(savedFarm);
          setFarmData((prev) => ({ ...prev, ...parsed }));
        } else if (app && (app.farmName || app.location || app.crops)) {
          setFarmData({
            farmName: app.farmName || DEFAULT_FARM_DETAILS.farmName,
            farmLocation: app.location || DEFAULT_FARM_DETAILS.farmLocation,
            primaryCrops: app.crops || DEFAULT_FARM_DETAILS.primaryCrops,
          });
        }
      } catch (err) {
        console.warn("Error loading agricultural profile data:", err);
      }
    };

    loadAgriculturalData();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateSliderProgress = (locationX: number) => {
    if (trackWidth <= 0) return;
    const clampedX = Math.max(0, Math.min(locationX, trackWidth));
    setSliderProgress(clampedX / trackWidth);
  };

  const handleBack = () => {
    if (isChangingPicture) {
      setAvatarUri(user?.avatarUrl || "");
      setIsChangingPicture(false);
    } else if (isEditing) {
      handleCancelEdit();
    } else {
      try {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push("/user/MenuProfile" as any);
        }
      } catch {
        router.push("/user/MenuProfile" as any);
      }
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user?.name || user?.fullName || "",
      username: user?.username || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      gender: user?.gender || "Male",
      bio: user?.about || user?.bio || "",
    });
    AsyncStorage.getItem(FARM_DETAILS_STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          setFarmData(JSON.parse(saved));
        }
      })
      .catch(() => {});
    setIsEditing(false);
  };

  const handleDone = async () => {
    if (!formData.name.trim()) {
      showToast("Full name cannot be empty.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update user profile via auth context
      await updateUser({
        name: formData.name.trim(),
        fullName: formData.name.trim(),
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        gender: formData.gender.trim(),
        about: formData.bio.trim(),
        bio: formData.bio.trim(),
      });

      // 2. Persist farm profile details
      await AsyncStorage.setItem(
        FARM_DETAILS_STORAGE_KEY,
        JSON.stringify(farmData),
      );

      // 3. Keep RSBSA application updated with farm profile if exists
      try {
        const currentRSBSA = await getRSBSAApplication();
        if (currentRSBSA && currentRSBSA.status !== "unverified") {
          const updatedRSBSA: RSBSAApplication = {
            ...currentRSBSA,
            fullName: formData.name.trim() || currentRSBSA.fullName,
            farmName: farmData.farmName || currentRSBSA.farmName,
            location: farmData.farmLocation || currentRSBSA.location,
            crops: farmData.primaryCrops || currentRSBSA.crops,
          };
          await AsyncStorage.setItem(
            "localfarm_rsbsa_verification_v1",
            JSON.stringify(updatedRSBSA),
          );
          setRsbsaApp(updatedRSBSA);
        }
      } catch (rsbsaSyncErr) {
        console.warn("RSBSA sync skipped:", rsbsaSyncErr);
      }

      setIsEditing(false);
      showToast("Personal & farm profile saved successfully!", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePicture = async () => {
    const newScale = 1 + sliderProgress * 1.2;
    setAvatarScale(newScale);
    setIsSaving(true);
    try {
      await updateUser({
        avatarUrl: avatarUri,
      });
      setIsChangingPicture(false);
      showToast("Profile picture updated successfully!", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save picture.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPicture = () => {
    setAvatarUri(user?.avatarUrl || "");
    setIsChangingPicture(false);
  };

  const pickImageFromGallery = async () => {
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
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setAvatarUri(uri);
        setSliderProgress(0.15);
        setIsChangingPicture(true);
        return;
      }
    } catch (error) {
      console.error("Error picking image from gallery:", error);
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const res = event.target?.result;
              if (typeof res === "string") {
                setAvatarUri(res);
                setSliderProgress(0.15);
                setIsChangingPicture(true);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } catch (webErr) {
        console.error("Web file picker error:", webErr);
      }
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      if (Platform.OS !== "web") {
        const permissionResult =
          await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          showToast("Permission to access camera is required.", "warning");
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setAvatarUri(uri);
        setSliderProgress(0.15);
        setIsChangingPicture(true);
        return;
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  // ---------------------------------------------------------------------------
  // Change Picture Screen View (Slider & Cropping)
  // ---------------------------------------------------------------------------
  if (isChangingPicture) {
    const thumbLeft = Math.max(
      0,
      Math.min(
        sliderProgress * (trackWidth || 280) - 12,
        (trackWidth || 280) - 24,
      ),
    );

    return (
      <SafeAreaView
        className="flex-1 bg-white relative"
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      >
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Top Header Row */}
          <View className="flex-row items-center justify-center px-4 pt-4 pb-3 relative bg-white">
            <TouchableOpacity
              onPress={handleCancelPicture}
              className="absolute left-4 top-4 p-1 active:opacity-70"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-undo" size={28} color="#000000" />
            </TouchableOpacity>

            <Text className="text-xl font-bold text-gray-900">
              Change picture
            </Text>
          </View>

          {/* Large Circular Profile Picture Preview */}
          <View className="items-center justify-center mt-10 mb-6">
            <TouchableOpacity
              onPress={pickImageFromGallery}
              activeOpacity={0.9}
              className="relative"
              accessibilityRole="button"
              accessibilityLabel="Choose photo from gallery"
            >
              <View className="w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-[#E5E7EB] items-center justify-center shadow-lg border border-gray-100">
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{
                      width: "100%",
                      height: "100%",
                      transform: [{ scale: 1 + sliderProgress * 1.2 }],
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full bg-[#72AF5B] items-center justify-center">
                    <Ionicons name="person" size={130} color="#ffffff" />
                  </View>
                )}
              </View>

              {/* Gallery Icon Badge */}
              <View className="absolute bottom-2 right-4 bg-[#72AF5B] p-2.5 rounded-full border-2 border-white shadow-md">
                <Ionicons name="images" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickImageFromGallery}
              className="mt-3 flex-row items-center gap-1.5 active:opacity-70"
            >
              <Ionicons name="image-outline" size={18} color="#72AF5B" />
              <Text className="text-sm font-semibold text-[#72AF5B]">
                Choose from gallery
              </Text>
            </TouchableOpacity>
          </View>

          {/* Slider & Actions Container */}
          <View className="px-8 w-full max-w-[360px] self-center">
            {/* Horizontal Slider Track */}
            <View
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(evt) =>
                updateSliderProgress(evt.nativeEvent.locationX)
              }
              onResponderMove={(evt) =>
                updateSliderProgress(evt.nativeEvent.locationX)
              }
              className="h-8 justify-center relative"
            >
              {/* Gray Bar */}
              <View className="h-2 bg-[#D1D5DB] rounded-full w-full" />

              {/* Slider Thumb Handle */}
              <View
                style={{
                  position: "absolute",
                  left: thumbLeft,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#CBD5E1",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.25,
                  shadowRadius: 2,
                  elevation: 3,
                }}
              />
            </View>

            {/* Action Buttons: Cancel and Save */}
            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity
                onPress={handleCancelPicture}
                disabled={isSaving}
                className="bg-[#A0A8B0] px-6 py-2.5 rounded-xl active:bg-[#8e969e] shadow-sm"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-white text-base font-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSavePicture}
                disabled={isSaving}
                className="bg-[#72AF5B] px-7 py-2.5 rounded-xl active:bg-[#60964c] shadow-sm flex-row items-center justify-center min-w-[90px]"
                style={{ backgroundColor: "#72AF5B" }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Save"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-base font-bold">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <Navigation activeTab="Menu" showFab={false} />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main View: Personal Information & Edit Information
  // ---------------------------------------------------------------------------
  const displayName = formData.name || user?.name || user?.fullName || "Grower";
  const isRSBSAVerified = rsbsaApp?.status === "verified";
  const isRSBSAPending = rsbsaApp?.status === "pending";

  return (
    <SafeAreaView
      className="flex-1 bg-[#F9FAFB] relative"
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
    >
      <ScrollView
        className="flex-1 bg-[#F9FAFB]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* Top Green Brand Banner Header */}
        <View className="w-full bg-[#6EA352] pt-6 pb-20 px-4 relative shadow-sm">
          <View className="flex-row items-center justify-between relative">
            <TouchableOpacity
              onPress={handleBack}
              className="p-1 active:opacity-70"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? "Cancel edit" : "Go back"}
            >
              <Ionicons name="arrow-undo" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-white text-lg font-bold tracking-wide">
                {isEditing ? "Edit Information" : "Personal Information"}
              </Text>
              <Text className="text-green-100 text-xs mt-0.5">
                {isEditing
                  ? "Update farm & personal details"
                  : "Identity & Agricultural Details"}
              </Text>
            </View>

            {/* Right Spacer to keep header title centered */}
            <View className="w-8" />
          </View>
        </View>

        {/* Overlapping Avatar Profile Section */}
        <View className="items-center z-50 -mt-16 px-4">
          <View className="relative">
            <View className="w-32 h-32 rounded-full border-[5px] border-white bg-[#E5E7EB] items-center justify-center overflow-hidden shadow-md">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: [{ scale: avatarScale }],
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full bg-[#E5E7EB] items-center justify-center">
                  <Ionicons name="person" size={68} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Verified Green Badge on Avatar */}
            {isRSBSAVerified ? (
              <View className="absolute bottom-1 right-1 w-7 h-7 bg-white rounded-full items-center justify-center shadow-md">
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
            ) : (
              <View className="absolute bottom-1 right-1 w-6 h-6 bg-[#72AF5B] rounded-full border-[3px] border-white shadow-sm" />
            )}
          </View>

          {/* Profile Name & Primary Action */}
          <View className="items-center mt-3">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xl font-bold text-gray-900 text-center">
                {displayName}
              </Text>
              {isRSBSAVerified && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>

            {/* Change Picture or Edit Information Action */}
            {isEditing ? (
              <TouchableOpacity
                onPress={() => setIsPhotoOptionsVisible(true)}
                className="mt-3.5 flex-row items-center justify-center gap-2 px-4 py-2 rounded-xl shadow-sm"
                style={{ backgroundColor: "#72AF5B" }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Change picture"
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white uppercase tracking-wider">
                  Change Photo
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="mt-3.5 flex-row items-center justify-center gap-2 px-5 py-2 rounded-xl shadow-sm"
                style={{ backgroundColor: "#72AF5B" }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Edit Information"
              >
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text className="text-sm font-bold text-white">
                  Edit Information
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Body Container */}
        <View className="px-4 mt-5">
          {/* ================================================================= */}
          {/* RSBSA VERIFICATION STATUS CARD (Hidden in Edit Mode)              */}
          {/* ================================================================= */}
          {!isEditing &&
            (isRSBSAVerified ? (
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center shadow-sm">
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#059669"
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-sm font-bold text-emerald-950">
                          RSBSA Verified Grower
                        </Text>
                        <View className="bg-emerald-600 px-1.5 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                            Official DA
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-emerald-800 mt-0.5">
                        {rsbsaApp?.rsbsaNumber
                          ? `Ref ID: ${rsbsaApp.rsbsaNumber}`
                          : "Department of Agriculture registered"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/user/RSBSAVerification" as any)
                    }
                    className="bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-sm active:bg-emerald-50"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-bold text-emerald-800">
                      Credentials →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isRSBSAPending ? (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center">
                      <Ionicons name="time" size={22} color="#D97706" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-sm font-bold text-amber-950">
                          RSBSA Verification Pending
                        </Text>
                        <View className="bg-amber-500 px-1.5 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                            In Review
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-amber-800 mt-0.5">
                        Submitted for Municipal Agri Office verification.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/user/RSBSAVerification" as any)
                    }
                    className="bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm active:bg-amber-50"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-bold text-amber-800">
                      Track →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/user/RSBSAVerification" as any)}
                className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm active:bg-gray-50"
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Apply for RSBSA Grower Verification"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center shadow-sm">
                      <Ionicons name="ribbon" size={22} color="#72AF5B" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-gray-900">
                          Get RSBSA Verified
                        </Text>
                        <View className="bg-gray-50 px-1.5 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-[#72AF5B]">
                            Badge
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-600 mt-0.5 leading-4">
                        Register with the DA Registry System to earn the
                        verified grower badge & wholesale access.
                      </Text>
                    </View>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#72AF5B"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}

          {/* ================================================================= */}
          {/* SECTION 1: FARM & AGRICULTURAL IDENTITY                           */}
          {/* ================================================================= */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center">
                <Ionicons name="leaf" size={16} color="#72AF5B" />
              </View>
              <Text className="text-base font-bold text-gray-900">
                Farm & Agricultural Identity
              </Text>
            </View>
            <Text className="text-xs text-gray-500 mb-4 ml-9">
              {isEditing
                ? "Update your farm and harvest product details"
                : "Your public grower credentials displayed across LocalFarm"}
            </Text>

            {/* Farm or Product */}
            <View className="mb-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Farm or Product
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-3.5 py-2.5 border ${
                  isEditing
                    ? "bg-white border-[#72AF5B]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Ionicons
                  name="storefront-outline"
                  size={18}
                  color={isEditing ? "#72AF5B" : "#72AF5B"}
                />
                <TextInput
                  value={farmData.farmName}
                  editable={isEditing}
                  onChangeText={(text) =>
                    setFarmData((prev) => ({ ...prev, farmName: text }))
                  }
                  placeholder="e.g., Green Valley Organic Farm or Fresh Produce"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-900 p-0"
                />
              </View>
            </View>

            {/* Farm Location / Barangay */}
            <View className="mb-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Farm Location (Barangay & Municipality)
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-3.5 py-2.5 border ${
                  isEditing
                    ? "bg-white border-[#72AF5B]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={isEditing ? "#72AF5B" : "#72AF5B"}
                />
                <TextInput
                  value={farmData.farmLocation}
                  editable={isEditing}
                  onChangeText={(text) =>
                    setFarmData((prev) => ({ ...prev, farmLocation: text }))
                  }
                  placeholder="e.g., Brgy. Bunga, Cabanglasan, Bukidnon"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-900 p-0"
                />
              </View>
            </View>

            {/* Primary Produce / Crops */}
            <View className="mb-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Primary Produce / Crops & Livestock
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-3.5 py-2.5 border ${
                  isEditing
                    ? "bg-white border-[#72AF5B]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Ionicons
                  name="nutrition-outline"
                  size={18}
                  color={isEditing ? "#72AF5B" : "#72AF5B"}
                />
                <TextInput
                  value={farmData.primaryCrops}
                  editable={isEditing}
                  onChangeText={(text) =>
                    setFarmData((prev) => ({ ...prev, primaryCrops: text }))
                  }
                  placeholder="e.g., Tomatoes, Romaine Lettuce, Native Chickens"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-900 p-0"
                />
              </View>
            </View>
          </View>

          {/* ================================================================= */}
          {/* SECTION 2: PERSONAL IDENTITY                                      */}
          {/* ================================================================= */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-7 h-7 rounded-lg bg-gray-50 items-center justify-center">
                <Ionicons name="person" size={16} color="#72AF5B" />
              </View>
              <Text className="text-base font-bold text-gray-900">
                Personal Identity
              </Text>
            </View>
            <Text className="text-xs text-gray-500 mb-4 ml-9">
              {isEditing
                ? "Update your personal name, username, and story"
                : "Your personal profile details and bio"}
            </Text>

            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Full Name
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-3.5 py-2.5 border ${
                  isEditing
                    ? "bg-white border-[#72AF5B]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={isEditing ? "#72AF5B" : "#6B7280"}
                />
                <TextInput
                  value={formData.name}
                  editable={isEditing}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, name: text }))
                  }
                  placeholder="Your full name"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-900 p-0"
                />
              </View>
            </View>

            {/* Username */}
            <View className="mb-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Username
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-3.5 py-2.5 border ${
                  isEditing
                    ? "bg-white border-[#72AF5B]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Ionicons
                  name="at-outline"
                  size={18}
                  color={isEditing ? "#72AF5B" : "#6B7280"}
                />
                <TextInput
                  value={formData.username}
                  editable={isEditing}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, username: text }))
                  }
                  placeholder="username"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-900 p-0"
                />
              </View>
            </View>

            {/* Gender */}
            <View className="mb-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Gender
              </Text>
              {isEditing ? (
                <View className="flex-row gap-2 pt-1">
                  {GENDER_OPTIONS.map((g) => {
                    const isSelected = formData.gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() =>
                          setFormData((prev) => ({ ...prev, gender: g }))
                        }
                        className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                          isSelected
                            ? "bg-[#72AF5B]/10 border-[#72AF5B]"
                            : "bg-gray-50 border-gray-200"
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? "text-[#558643] font-bold" : "text-gray-700"
                          }`}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View className="flex-row items-center rounded-xl px-3.5 py-2.5 bg-gray-50 border border-gray-100">
                  <MaterialCommunityIcons
                    name="gender-male-female"
                    size={18}
                    color="#6B7280"
                  />
                  <Text className="flex-1 ml-2.5 text-sm font-medium text-gray-900">
                    {formData.gender}
                  </Text>
                </View>
              )}
            </View>

            {/* Bio */}
            <View className="mb-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Bio / Farm Story
              </Text>
              <View
                className={`flex-row items-start rounded-xl px-3.5 py-2.5 border ${
                  isEditing
                    ? "bg-white border-[#72AF5B]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <View className="pt-0.5">
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={isEditing ? "#72AF5B" : "#6B7280"}
                  />
                </View>
                <TextInput
                  value={formData.bio}
                  editable={isEditing}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, bio: text }))
                  }
                  multiline
                  placeholder={
                    isEditing
                      ? "Share a few sentences about your agricultural journey..."
                      : "No bio added yet."
                  }
                  placeholderTextColor="#9CA3AF"
                  style={{ minHeight: 52, textAlignVertical: "top" }}
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-900 p-0 leading-5"
                />
              </View>
            </View>
          </View>

          {/* ================================================================= */}
          {/* SECTION 3: CONTACT & SECURITY                                     */}
          {/* ================================================================= */}
          <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-7 h-7 rounded-lg bg-gray-50 items-center justify-center">
                <Ionicons name="call" size={16} color="#72AF5B" />
              </View>
              <Text className="text-base font-bold text-gray-900">
                Contact & Security
              </Text>
            </View>
            <Text className="text-xs text-gray-500 mb-4 ml-9">
              Your direct communication and account login channels
            </Text>

            {/* Phone Number */}
            <View className="mb-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Phone Number
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-3.5 py-2.5 border ${
                  isEditing
                    ? "bg-white border-[#72AF5B]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={isEditing ? "#72AF5B" : "#6B7280"}
                />
                <TextInput
                  value={formData.phoneNumber}
                  editable={isEditing}
                  keyboardType="phone-pad"
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, phoneNumber: text }))
                  }
                  placeholder="+63 9XX XXX XXXX"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-900 p-0"
                />
              </View>
            </View>

            {/* Email Address (Account Locked) */}
            <View className="mb-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Email Address
              </Text>
              <View className="flex-row items-center rounded-xl px-3.5 py-2.5 bg-gray-100 border border-gray-200">
                <Ionicons name="mail-outline" size={18} color="#6B7280" />
                <TextInput
                  value={formData.email}
                  editable={false}
                  placeholder="user@localfarm.ph"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2.5 text-sm font-medium text-gray-600 p-0"
                />
                <View className="flex-row items-center gap-1 bg-gray-200 px-2 py-0.5 rounded-md">
                  <Ionicons name="lock-closed" size={12} color="#6B7280" />
                  <Text className="text-[10px] font-semibold text-gray-600">
                    Primary
                  </Text>
                </View>
              </View>
              <Text className="text-[11px] text-gray-400 mt-1.5 ml-1">
                Primary login email cannot be edited directly for security.
              </Text>
            </View>
          </View>

          {/* ================================================================= */}
          {/* EDIT MODE BOTTOM ACTION BAR                                       */}
          {/* ================================================================= */}
          {isEditing && (
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 py-3.5 bg-gray-200 rounded-2xl items-center justify-center active:bg-gray-300"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-sm font-bold text-gray-800">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDone}
                disabled={isSaving}
                className="flex-[2] py-3.5 bg-[#72AF5B] rounded-2xl items-center justify-center shadow-md active:bg-[#60964c] flex-row gap-2"
                style={{ backgroundColor: "#72AF5B" }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Save Changes"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text className="text-sm font-bold text-white">
                      Save Changes
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Navigation activeTab="Menu" showFab={false} />

      {/* Photo Options Modal */}
      <Modal
        visible={isPhotoOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPhotoOptionsVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsPhotoOptionsVisible(false)}
          className="flex-1 justify-end sm:justify-center items-center px-4 pb-6"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl"
          >
            <Text className="text-lg font-bold text-gray-900 text-center mb-1">
              Change Profile Picture
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-4">
              Select an option to update your photo
            </Text>

            {/* Option 1: Gallery */}
            <TouchableOpacity
              onPress={() => {
                setIsPhotoOptionsVisible(false);
                pickImageFromGallery();
              }}
              className="flex-row items-center py-3.5 px-4 bg-gray-50 rounded-2xl mb-2.5 active:bg-gray-100 border border-gray-100"
              accessibilityRole="button"
              accessibilityLabel="Choose from Gallery"
            >
              <View className="w-10 h-10 rounded-full bg-[#E2F0D9] items-center justify-center mr-3.5">
                <Ionicons name="images" size={20} color="#72AF5B" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Choose from Gallery
                </Text>
                <Text className="text-xs text-gray-500">
                  Pick an existing image from your device
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Camera */}
            <TouchableOpacity
              onPress={() => {
                setIsPhotoOptionsVisible(false);
                takePhotoWithCamera();
              }}
              className="flex-row items-center py-3.5 px-4 bg-gray-50 rounded-2xl mb-2.5 active:bg-gray-100 border border-gray-100"
              accessibilityRole="button"
              accessibilityLabel="Take Photo"
            >
              <View className="w-10 h-10 rounded-full bg-[#E2F0D9] items-center justify-center mr-3.5">
                <Ionicons name="camera" size={20} color="#72AF5B" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Take Photo
                </Text>
                <Text className="text-xs text-gray-500">
                  Use your camera to take a new picture
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 3: Adjust Current Picture */}
            <TouchableOpacity
              onPress={() => {
                setIsPhotoOptionsVisible(false);
                setIsChangingPicture(true);
              }}
              className="flex-row items-center py-3.5 px-4 bg-gray-50 rounded-2xl mb-4 active:bg-gray-100 border border-gray-100"
              accessibilityRole="button"
              accessibilityLabel="Adjust Current Picture"
            >
              <View className="w-10 h-10 rounded-full bg-[#E2F0D9] items-center justify-center mr-3.5">
                <Ionicons name="crop" size={20} color="#72AF5B" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Adjust Current Picture
                </Text>
                <Text className="text-xs text-gray-500">
                  Zoom and position your current avatar
                </Text>
              </View>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setIsPhotoOptionsVisible(false)}
              className="w-full py-3 bg-gray-200 rounded-2xl items-center justify-center active:bg-gray-300"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-base font-semibold text-gray-700">
                Cancel
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
