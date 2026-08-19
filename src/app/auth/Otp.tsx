import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  Text,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG_IMAGE = require("../../../assets/images/background-blur.png");

export default function OTPScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{
    email?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    phoneNumber?: string;
    password?: string;
  }>();

  const email = params.email || "";
  const firstName = params.firstName || "";
  const lastName = params.lastName || "";
  const phoneNumber = params.phoneNumber || "";
  const password = params.password || "";

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // References for 6 input boxes
  const inputRefs = useRef<Array<RNTextInput | null>>([]);

  const handleChangeText = (text: string, index: number) => {
    // Clean non-numeric characters
    const cleanText = text.replace(/[^0-9]/g, "");

    const newOtp = [...otp];

    if (cleanText.length > 1) {
      // Handle pasted multi-digit OTP string
      const pastedDigits = cleanText.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedDigits[i] || "";
      }
      setOtp(newOtp);
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // Handle single digit typing
      newOtp[index] = cleanText;
      setOtp(newOtp);

      if (cleanText && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    if (errorMsg) setErrorMsg("");
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      setErrorMsg("Please enter all 6 digits of the OTP code.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccessModal(true);
      }, 800);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg("Invalid or expired OTP code. Please try again.");
    }
  };

  const handleSuccessContinue = async () => {
    setShowSuccessModal(false);
    if (firstName && lastName) {
      const fullName = `${firstName} ${lastName}`;
      await signUp(
        fullName,
        email || "user@example.com",
        password || "password123",
      );
    } else {
      router.replace("/auth/ResetPassword" as any);
    }
  };

  const handleResendCode = () => {
    setResendSent(true);
    setTimeout(() => setResendSent(false), 5000);
  };

  return (
    <ImageBackground source={BG_IMAGE} className="flex-1" resizeMode="cover">
      {/* Top Left Back Arrow Button */}
      <TouchableOpacity
        className="absolute left-4 z-30 p-2 rounded-full "
        style={{ top: Math.max(insets.top + 8, 16) }}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back-outline" size={28} color="#848484" />
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
          {/* Form Wrapper (Vertically Centered, No Container Box, No LF2 or Logo2) */}
          <View className="w-full max-w-[380px]">
            {/* Header Block */}
            <View className="items-start mb-6 w-full">
              <Text className="text-5xl font-extrabold text-[#000000] text-left mb-1">
                One-time Pin
              </Text>
              <Text className="text-md text-[#000000] text-left">
                {email
                  ? `Enter Verification Code sent to ${email}`
                  : "Enter Verification Code"}
              </Text>
            </View>

            {errorMsg ? (
              <View className="bg-[#FFEBEA] p-3 rounded-xl mb-4 w-full border border-[#FF3B30]">
                <Text className="text-[#FF3B30] text-sm text-center font-medium">
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {resendSent ? (
              <View className="bg-[#E8F5E9] p-3 rounded-xl mb-4 w-full border border-[#2E7D32]">
                <Text className="text-[#2E7D32] text-sm text-center font-medium">
                  A new OTP code has been sent to your email!
                </Text>
              </View>
            ) : null}

            {/* 6-Digit OTP Inputs */}
            <View className="flex-row justify-between w-full mb-6">
              {otp.map((digit, index) => (
                <RNTextInput
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  className={`w-12 h-14 bg-white/95 border ${
                    digit
                      ? "border-[#2E7D32]"
                      : errorMsg
                        ? "border-[#FF3B30]"
                        : "border-gray-300"
                  } rounded-xl text-center text-2xl font-bold text-gray-900 shadow-sm`}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={digit}
                  onChangeText={(text) => handleChangeText(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              className="w-full h-12 bg-[#2E7D32] rounded-xl items-center justify-center shadow-sm active:opacity-90 mb-4"
              onPress={handleVerify}
              disabled={isSubmitting}
            >
              <Text className="text-white text-base font-bold">
                Verify Code
              </Text>
            </TouchableOpacity>

            {/* Resend Code Link */}
            <View className="flex-row justify-center items-center">
              <TouchableOpacity onPress={handleResendCode}>
                <Text className="text-md  text-[#2E7D32] underline">
                  Resend Verification Code
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verification Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessContinue}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-xl">
            {/* Green Badge Icon */}
            <View className="w-16 h-16 rounded-full bg-[#E8F5E9] items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#2E7D32" />
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
              Verification Successful
            </Text>

            {/* Description Message */}
            <Text className="text-sm text-gray-600 text-center mb-6 leading-5">
              Your verification code has been confirmed successfully.
            </Text>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleSuccessContinue}
              className="w-full h-12 bg-[#2E7D32] rounded-xl items-center justify-center active:opacity-90 shadow-sm"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold">
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}
