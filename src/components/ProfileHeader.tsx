import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";

export interface ProfileHeaderProps {
  coverPhotoUri?: string;
  avatarUri?: string;
  isOwnProfile?: boolean;
  isVerified?: boolean;
  isUpdatingCover?: boolean;
  onPressBack?: () => void;
  onPressDots?: () => void;
  onPressEditCover?: () => void;
  onPressChangePicture?: () => void;
  onPressCoverPhoto?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  coverPhotoUri = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&auto=format&fit=crop&q=80",
  avatarUri = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  isOwnProfile = false,
  isVerified = false,
  isUpdatingCover = false,
  onPressBack,
  onPressDots,
  onPressEditCover,
  onPressChangePicture,
  onPressCoverPhoto,
}) => {
  return (
    <View className="w-full h-48 bg-gray-200 relative mb-14">
      {/* Cover Photo */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPressCoverPhoto || onPressEditCover}
        className="w-full h-full"
        accessibilityRole="button"
        accessibilityLabel="Cover photo"
      >
        <Image
          source={{ uri: coverPhotoUri }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Loading Overlay when updating cover */}
      {isUpdatingCover && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 15,
          }}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {/* Back Button Overlay */}
      {onPressBack && (
        <TouchableOpacity
          onPress={onPressBack}
          activeOpacity={0.8}
          className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-black/40 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Edit Cover Photo (Pencil) if own profile */}
      {isOwnProfile && onPressEditCover && (
        <TouchableOpacity
          onPress={onPressEditCover}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            top: 12,
            right: 56,
            zIndex: 20,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Edit cover photo"
        >
          <Ionicons name="pencil" size={17} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Absolute-positioned "dots" icon button (ellipsis-horizontal) */}
      <TouchableOpacity
        onPress={onPressDots}
        activeOpacity={0.8}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 20,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          alignItems: "center",
          justifyContent: "center",
        }}
        accessibilityRole="button"
        accessibilityLabel="Profile options"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Avatar */}
      <View className="absolute -bottom-10 left-4 z-10">
        <View className="w-24 h-24 rounded-full border-4 border-white bg-gray-300 items-center justify-center overflow-hidden">
          <Image
            source={{ uri: avatarUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* Camera icon on bottom right of avatar if own profile */}
        {isOwnProfile && onPressChangePicture && (
          <TouchableOpacity
            onPress={onPressChangePicture}
            className="absolute bottom-0 right-0 w-7 h-7 bg-gray-200 rounded-full border-2 border-white items-center justify-center shadow-xs active:bg-gray-300"
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            <Ionicons name="camera" size={14} color="#1f2937" />
          </TouchableOpacity>
        )}

        {/* Verified Green Badge on top-right of avatar */}
        {isVerified && (
          <View
            className="absolute -top-1 -right-1 w-7 h-7 bg-white rounded-full items-center justify-center shadow-md border-2 border-white"
            accessibilityLabel="Verified RSBSA Grower"
          >
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          </View>
        )}
      </View>
    </View>
  );
};

export default ProfileHeader;
