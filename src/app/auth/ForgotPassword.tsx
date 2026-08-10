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

import { validateEmail } from "@/utils/validation";

const BG_IMAGE = require("../../../assets/images/background-blur.png");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSendOtp = async () => {
    setGeneralError("");
    const emailVal = validateEmail(email);

    if (!emailVal.isValid) {
      setEmailError(emailVal.error || "Please enter a valid email address.");
      return;
    }

    setEmailError("");
    setIsLoading(true);

    try {
      // Simulate sending OTP request
      setTimeout(() => {
        setIsLoading(false);
        setShowModal(true);
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setGeneralError(
        err?.message || "Failed to send reset code. Please try again.",
      );
    }
  };

  const handleModalContinue = () => {
    setShowModal(false);
    router.push("/auth/VerifyOtp" as any);
  };

  return (
    <ImageBackground source={BG_IMAGE} className="flex-1" resizeMode="cover">
      {/* Top Left Back Arrow Button */}
      <TouchableOpacity
        className="absolute left-4 z-30 p-2"
        style={{ top: Math.max(insets.top + 8, 16) }}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back-outline" size={30} color="#848484" />
      </TouchableOpacity>

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
            {/* Centered Circular Vector Icon */}
            <View className="w-24 h-24 rounded-full bg-[#72AF5B] items-center justify-center self-center mb-6 shadow-sm">
              <MaterialCommunityIcons
                name="lock-reset"
                size={48}
                color="#FFFFFF"
              />
            </View>

            {/* Header Block */}
            <View className="items-start mb-6 w-full">
              <Text className="text-4xl font-extrabold text-[#000000] text-left mb-2">
                Forgot Password?
              </Text>
              <Text className="text-md text-[#000000] text-left">
                Enter your registered email address and we will send a 6-digit
                OTP code to reset your password.
              </Text>
            </View>

            {generalError ? (
              <View className="bg-[#FFEBEA] p-3 rounded-xl mb-4 w-full border border-[#FF3B30]">
                <Text className="text-[#FF3B30] text-sm text-center font-medium">
                  {generalError}
                </Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View className="w-full mb-6">
              <RNTextInput
                className={`w-full h-12 bg-white/95 border ${
                  emailError ? "border-[#FF3B30]" : "border-gray-300"
                } rounded-xl px-4 text-base text-gray-900`}
                placeholder="Enter your email"
                placeholderTextColor="#888888"
                value={email}
                onChangeText={(text: string) => {
                  setEmail(text);
                  if (emailError) setEmailError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError ? (
                <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                  {emailError}
                </Text>
              ) : null}
            </View>

            {/* Send Code Button */}
            <TouchableOpacity
              className="w-full h-12 bg-[#72AF5B] rounded-xl items-center justify-center shadow-sm active:opacity-90 mb-6"
              onPress={handleSendOtp}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-medium">
                Send Code
              </Text>
            </TouchableOpacity>

            {/* Footer / Back to Login Link */}
            <View className="flex-row justify-center mt-2 w-full">
              <Text className="text-sm text-[#4A654C]">
                Remember your password?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/auth/Login" as any)}
              >
                <Text className="text-sm font-bold text-[#2E7D32]">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-8 w-full max-w-[340px] items-center shadow-2xl">
            {/* Modal Icon */}
            <View className="w-20 h-20 rounded-full bg-[#E8F5E9] items-center justify-center mb-5">
              <MaterialCommunityIcons
                name="email-check-outline"
                size={42}
                color="#2E7D32"
              />
            </View>

            {/* Modal Title */}
            <Text className="text-2xl font-extrabold text-[#000000] text-center mb-2">
              Check Your Email!
            </Text>

            {/* Modal Message */}
            <Text className="text-sm text-[#555555] text-center mb-1 leading-5">
              We've sent a 6-digit verification code to
            </Text>
            <Text className="text-sm font-bold text-[#2E7D32] text-center mb-6">
              {email}
            </Text>

            {/* Divider */}
            <View className="w-full h-px bg-gray-100 mb-5" />

            {/* Note */}
            <View className="flex-row items-start mb-6 px-1">
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#888888"
                style={{ marginTop: 1, marginRight: 6 }}
              />
              <Text className="text-xs text-[#888888] flex-1 leading-4">
                Didn't receive the email? Check your spam folder or wait a few
                minutes before requesting again.
              </Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              className="w-full h-12 bg-[#72AF5B] rounded-xl items-center justify-center shadow-sm active:opacity-90 mb-3"
              onPress={handleModalContinue}
            >
              <Text className="text-white text-base font-bold">
                Enter Verification Code
              </Text>
            </TouchableOpacity>

            {/* Close / Cancel Button */}
            <TouchableOpacity
              className="w-full h-11 border border-gray-300 rounded-xl items-center justify-center active:opacity-70"
              onPress={() => setShowModal(false)}
            >
              <Text className="text-sm text-[#888888] font-medium">Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}
