import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Navigation from "../../components/Navigation";

interface FormFieldItem {
  id: string;
  label: string;
  value: string;
  iconType: "person" | "mail" | "call" | "male" | "location";
  editable: boolean;
}

export default function PersonalInformation() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<Record<string, string>>({
    "1": user?.name || user?.fullName || "",
    "2": user?.username || "",
    "3": user?.email || "",
    "4": user?.phoneNumber || "",
    "5": user?.gender || "Male",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPicture, setIsChangingPicture] = useState(false);
  const [isPhotoOptionsVisible, setIsPhotoOptionsVisible] = useState(false);

  const [avatarUri, setAvatarUri] = useState<string>(user?.avatarUrl || "");
  const [avatarScale, setAvatarScale] = useState<number>(1);
  const [sliderProgress, setSliderProgress] = useState<number>(0.15);
  const [trackWidth, setTrackWidth] = useState<number>(280);

  // Sync state when user object loads or updates
  useEffect(() => {
    if (user) {
      setFormData({
        "1": user.name || user.fullName || "",
        "2": user.username || "",
        "3": user.email || "",
        "4": user.phoneNumber || "",
        "5": user.gender || "Male",
      });
      if (user.avatarUrl) {
        setAvatarUri(user.avatarUrl);
      }
    }
  }, [user]);

  const formFields: FormFieldItem[] = [
    {
      id: "1",
      label: "Fullname:",
      value: formData["1"],
      iconType: "person",
      editable: true,
    },
    {
      id: "2",
      label: "Username:",
      value: formData["2"],
      iconType: "person",
      editable: true,
    },
    {
      id: "3",
      label: "Email address:",
      value: user?.email || formData["3"],
      iconType: "mail",
      editable: false, // Email is identity locked
    },
    {
      id: "4",
      label: "Phone Number:",
      value: formData["4"],
      iconType: "call",
      editable: true,
    },
    {
      id: "5",
      label: "Gender:",
      value: formData["5"],
      iconType: "male",
      editable: true,
    },
  ];

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
      setFormData({
        "1": user?.name || user?.fullName || "",
        "2": user?.username || "",
        "3": user?.email || "",
        "4": user?.phoneNumber || "",
        "5": user?.gender || "Male",
      });
      setIsEditing(false);
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

  const handleInputChange = (id: string, text: string) => {
    setFormData((prev) => ({ ...prev, [id]: text }));
  };

  const handleDone = async () => {
    if (!formData["1"].trim()) {
      showToast("Full name cannot be empty.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({
        name: formData["1"].trim(),
        fullName: formData["1"].trim(),
        username: formData["2"].trim(),
        phoneNumber: formData["4"].trim(),
        gender: formData["5"].trim(),
      });
      setIsEditing(false);
      showToast("Profile updated successfully!", "success");
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

  const handleChangePicture = () => {
    setIsPhotoOptionsVisible(true);
  };

  const renderFieldIcon = (type: FormFieldItem["iconType"]) => {
    switch (type) {
      case "person":
        return <Ionicons name="person" size={20} color="#ffffff" />;
      case "mail":
        return <Ionicons name="mail" size={20} color="#ffffff" />;
      case "call":
        return <Ionicons name="call" size={20} color="#ffffff" />;
      case "male":
        return (
          <MaterialCommunityIcons
            name="gender-male"
            size={22}
            color="#ffffff"
          />
        );
      case "location":
        return <Ionicons name="location" size={20} color="#ffffff" />;
      default:
        return <Ionicons name="person" size={20} color="#ffffff" />;
    }
  };

  // ---------------------------------------------------------------------------
  // Change Picture Screen View
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
                className="bg-[#A0A8B0] px-6 py-2.5 rounded-xl active:bg-[#8e969e] shadow-xs"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-white text-base font-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSavePicture}
                disabled={isSaving}
                className="bg-[#72AF5B] px-7 py-2.5 rounded-xl active:bg-[#60964c] shadow-xs flex-row items-center justify-center min-w-[90px]"
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
  // Profile / User Information & Edit View
  // ---------------------------------------------------------------------------
  const displayName = formData["1"] || user?.name || user?.fullName || "User";

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
        {/* Top Green Header Banner */}
        <View className="w-full bg-[#6EA352] pt-8 pb-16 px-4 relative">
          <View className="flex-row items-center justify-center relative">
            <TouchableOpacity
              onPress={handleBack}
              className="absolute left-0 p-1 active:opacity-70"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-undo" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <Text className="text-white text-lg font-bold tracking-wide">
              Profile
            </Text>
          </View>
        </View>

        {/* Overlapping Avatar Section */}
        <View className="items-center z-50 -mt-16">
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

            {!isEditing && (
              <View className="absolute bottom-1 right-1 w-6 h-6 bg-[#72AF5B] rounded-full border-[3px] border-white shadow-2xs" />
            )}
          </View>

          {isEditing ? (
            <TouchableOpacity
              onPress={handleChangePicture}
              className="mt-3 flex-row items-center justify-center gap-1.5 bg-[#72AF5B] px-5 py-2 rounded-lg shadow-sm active:bg-[#60964c]"
              style={{ backgroundColor: "#72AF5B" }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change picture"
            >
              <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white text-center">
                Change picture
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="items-center mt-2.5">
              <Text className="text-xl font-bold text-gray-900 text-center">
                {displayName}
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="mt-2 flex-row items-center justify-center gap-2 bg-[#72AF5B] px-5 py-2 rounded-lg shadow-sm active:bg-[#60964c]"
                style={{ backgroundColor: "#72AF5B" }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Edit Profile"
              >
                <Text className="text-sm font-bold text-white">
                  Edit Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Form Fields List */}
        <View className="px-5 mt-5">
          {formFields.map((field) => {
            return (
              <View key={field.id} className="mb-3.5">
                {/* Field Label */}
                <Text className="text-sm font-medium text-gray-800 mb-1.5 ml-1">
                  {field.label}
                </Text>

                {/* Input Card Container */}
                <View
                  className={`flex-row items-center rounded-2xl py-2.5 px-3 border shadow-2xs ${
                    isEditing && field.editable
                      ? "bg-white border-green-500/50"
                      : "bg-[#F2F4F5] border-gray-100/80"
                  }`}
                >
                  {/* Circular Green Icon Badge */}
                  <View
                    className="bg-[#72AF5B] w-10 h-10 rounded-full items-center justify-center mr-3.5"
                    style={{ backgroundColor: "#72AF5B" }}
                  >
                    {renderFieldIcon(field.iconType)}
                  </View>

                  {/* Input / Text Value */}
                  <TextInput
                    value={field.value}
                    editable={isEditing && field.editable}
                    onChangeText={(text) => handleInputChange(field.id, text)}
                    className={`text-sm sm:text-base font-semibold flex-1 p-0 ${
                      isEditing && field.editable ? "text-gray-900" : "text-gray-700"
                    }`}
                    placeholderTextColor="#9CA3AF"
                  />

                  {!field.editable && isEditing && (
                    <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                  )}
                </View>
              </View>
            );
          })}

          {/* Full-width "Done" Button in Edit Mode */}
          {isEditing && (
            <View className="mt-5 mb-3">
              <TouchableOpacity
                onPress={handleDone}
                disabled={isSaving}
                className="w-full bg-[#72AF5B] py-3.5 rounded-2xl items-center justify-center active:bg-[#60964c] shadow-sm flex-row"
                style={{ backgroundColor: "#72AF5B" }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-base font-bold">Done</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Navigation activeTab="Menu" showFab={false} />

      {/* Photo Source Selection Modal */}
      <Modal
        visible={isPhotoOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPhotoOptionsVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsPhotoOptionsVisible(false)}
          className="flex-1 bg-black/50 justify-end sm:justify-center items-center px-4 pb-6"
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
                  Zoom and crop your current avatar
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
