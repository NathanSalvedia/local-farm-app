import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { validatePassword } from "@/utils/validation";

const BG_IMAGE = require("../../../assets/images/background-blur.png");

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleResetPassword = async () => {
    setGeneralError("");
    let hasError = false;

    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      setPasswordError(
        passVal.error || "Password must be at least 6 characters.",
      );
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasError = true;
    } else {
      setConfirmPasswordError("");
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      setTimeout(() => {
        setIsLoading(false);
        setShowSuccessModal(true);
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setGeneralError(
        err?.message || "Failed to reset password. Please try again.",
      );
    }
  };

  const handleGoToLogin = () => {
    setShowSuccessModal(false);
    router.replace("/auth/Login" as any);
  };

  return (
    <ImageBackground source={BG_IMAGE} className="flex-1" resizeMode="cover">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center items-center px-5 pb-8 pt-16"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-[380px]">
            {/* Header Block */}
            <View className="items-start mb-6 w-full">
              <Text className="text-4xl font-extrabold text-[#000000] text-left mb-1">
                Reset <Text className="text-[#2E7D32]">Password</Text>
              </Text>
              <Text className="text-md text-[#000000] text-left">
                Create a strong new password for your account.
              </Text>
            </View>

            {generalError ? (
              <View className="bg-[#FFEBEA] p-3 rounded-xl mb-4 w-full border border-[#FF3B30]">
                <Text className="text-[#FF3B30] text-sm text-center font-medium">
                  {generalError}
                </Text>
              </View>
            ) : null}

            {/* New Password Field */}
            <View className="w-full mb-4">
              <View className="w-full relative">
                <RNTextInput
                  className={`w-full h-12 bg-white/95 border ${
                    passwordError ? "border-[#FF3B30]" : "border-gray-300"
                  } rounded-xl px-4 pr-16 text-base text-gray-900`}
                  placeholder="Enter new password (min. 6 chars)"
                  placeholderTextColor="#888888"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text: string) => {
                    setPassword(text);
                    if (passwordError) setPasswordError("");
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="absolute right-4 top-3"
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#848484"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Confirm Password Field */}
            <View className="w-full mb-6">
              <View className="w-full relative">
                <RNTextInput
                  className={`w-full h-12 bg-white/95 border ${
                    confirmPasswordError
                      ? "border-[#FF3B30]"
                      : "border-gray-300"
                  } rounded-xl px-4 pr-16 text-base text-gray-900`}
                  placeholder="Re-enter your new password"
                  placeholderTextColor="#888888"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text: string) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) setConfirmPasswordError("");
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="absolute right-4 top-3"
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={22}
                    color="#848484"
                  />
                </TouchableOpacity>
              </View>
              {confirmPasswordError ? (
                <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                  {confirmPasswordError}
                </Text>
              ) : null}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className="w-full h-12 bg-[#72AF5B] rounded-xl items-center justify-center shadow-sm active:opacity-90 mb-4"
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-bold">
                Reset Password
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-8 w-full max-w-[340px] items-center shadow-2xl">
            {/* Animated Check Icon */}
            <View className="w-20 h-20 rounded-full bg-[#E8F5E9] items-center justify-center mb-5">
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={48}
                color="#2E7D32"
              />
            </View>

            {/* Title */}
            <Text className="text-2xl font-extrabold text-[#000000] text-center mb-2">
              Password Reset!
            </Text>

            {/* Message */}
            <Text className="text-sm text-[#555555] text-center mb-2 leading-5">
              Your password has been successfully reset.
            </Text>
            <Text className="text-sm text-[#555555] text-center mb-6 leading-5">
              You can now sign in with your new password.
            </Text>

            {/* Divider */}
            <View className="w-full h-px bg-gray-100 mb-5" />

            {/* Info Note */}
            <View className="flex-row items-start mb-6 px-1">
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#2E7D32"
                style={{ marginTop: 1, marginRight: 6 }}
              />
              <Text className="text-xs text-[#555555] flex-1 leading-4">
                For your security, please do not share your password with
                anyone.
              </Text>
            </View>

            {/* Back to Sign In Button */}
            <TouchableOpacity
              className="w-full h-12 bg-[#72AF5B] rounded-xl items-center justify-center shadow-sm active:opacity-90"
              onPress={handleGoToLogin}
            >
              <Text className="text-white text-base font-bold">
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}
