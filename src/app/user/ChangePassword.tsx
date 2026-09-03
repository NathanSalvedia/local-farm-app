import { useToast } from "@/context/toast-context";
import { changePasswordApi } from "@/services/auth-service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Navigation from "../../components/Navigation";

export default function ChangePassword() {
  const router = useRouter();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/Security" as any);
      }
    } catch {
      router.push("/user/Security" as any);
    }
  };

  const handleSubmit = async () => {
    if (!currentPassword.trim()) {
      showToast("Please enter your current/previous password.", "warning");
      return;
    }
    if (!newPassword.trim()) {
      showToast("Please enter a new password.", "warning");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters long.", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "warning");
      return;
    }
    if (currentPassword === newPassword) {
      showToast("New password cannot be the same as your current password.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      showToast("Password changed successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        handleBack();
      }, 1000);
    } catch (err: any) {
      showToast(err?.message || "Failed to change password.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white relative"
      style={{ flex: 1, backgroundColor: "#FFFFFF", overflow: "hidden" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Main Content ScrollView */}
        <ScrollView
          className="flex-1 px-4 pt-2"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          alwaysBounceVertical={false}
          alwaysBounceHorizontal={false}
          directionalLockEnabled={true}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Top Header */}
          <View className="relative items-center justify-center py-4 mb-5">
            <TouchableOpacity
              onPress={handleBack}
              className="absolute left-0 top-4 p-1 active:opacity-70"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-undo" size={28} color="#000000" />
            </TouchableOpacity>

            <Text className="text-xl font-bold text-gray-900">
              Change Password
            </Text>
          </View>

          {/* Main Form Container */}
          <View className="bg-[#f4f4f5] rounded-3xl p-5 mb-6 shadow-xs border border-gray-100">
            {/* Intro Text */}
            <Text className="text-sm text-gray-600 mb-2 leading-5 font-medium">
              {"Choose a strong password and don't reuse it for another accounts"}
            </Text>
            <Text className="text-xs text-gray-500 mb-5">
              You may be signed out of your account.
            </Text>

            {/* 1. Previous / Current Password Input */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5 ml-1">
              Current Password:
            </Text>
            <View className="flex-row items-center bg-white border border-[#77af5c] rounded-full px-4 py-3 mb-4 shadow-2xs">
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showCurrent}
                className="flex-1 text-base text-gray-900 p-0 font-medium"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showCurrent ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showCurrent ? "eye" : "eye-off"}
                  size={22}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* 2. New Password Input */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5 ml-1">
              New Password:
            </Text>
            <View className="flex-row items-center bg-white border border-[#77af5c] rounded-full px-4 py-3 mb-4 shadow-2xs">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showNew}
                className="flex-1 text-base text-gray-900 p-0 font-medium"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNew((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showNew ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showNew ? "eye" : "eye-off"}
                  size={22}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* 3. Confirm New Password Input */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5 ml-1">
              Confirm New Password:
            </Text>
            <View className="flex-row items-center bg-white border border-[#77af5c] rounded-full px-4 py-3 mb-6 shadow-2xs">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirm}
                className="flex-1 text-base text-gray-900 p-0 font-medium"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirm ? "Hide password" : "Show password"
                }
              >
                <Ionicons
                  name={showConfirm ? "eye" : "eye-off"}
                  size={22}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#72AF5B] rounded-2xl py-3.5 items-center justify-center active:opacity-90 shadow-sm flex-row"
              style={{ backgroundColor: "#72AF5B" }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change Password"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Change Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
