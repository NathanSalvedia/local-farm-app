import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import { validateEmail, validatePassword } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG_IMAGE = require("../../../assets/images/background-blur.png");
const LF3_IMAGE = require("../../../assets/images/LF3.png");
const LOGO2_IMAGE = require("../../../assets/images/logo2.png");

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const handleLogin = async () => {
    setGeneralError("");
    const emailVal = validateEmail(email);
    const passVal = validatePassword(password);

    setEmailError(emailVal.error || "");
    setPasswordError(passVal.error || "");

    if (!emailVal.isValid) {
      showToast(emailVal.error || "Please enter a valid email address.", "warning");
      return;
    }

    if (!passVal.isValid) {
      showToast(passVal.error || "Please enter your password.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      showToast("Signed in successfully! Welcome back.", "success");
    } catch (err: any) {
      const msg = err?.message || "Invalid email or password. Please check your credentials.";
      setGeneralError(msg);
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={BG_IMAGE}
      className="flex-1"
      resizeMode="cover"
      style={{ flex: 1, overflow: "hidden" }}
    >
      {/* Top Banner Header */}
      <View
        className="w-full px-5 z-20"
        style={{ paddingTop: Math.max(insets.top + 8, 16) }}
      >
        <Image
          source={LF3_IMAGE}
          className="w-[135px] h-[40px]"
          style={{ width: 135, height: 40 }}
          resizeMode="contain"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center items-center px-5"
        style={{
          paddingBottom: Math.max(insets.bottom + 16, 24),
        }}
      >
        {/* Centered Form Wrapper (Fixed Position, Non-Draggable) */}
        <View className="w-full max-w-[380px] items-center">
          {/* Centered Logo2 & Header */}
          <View className="items-center mb-6 w-full">
            <Image
              source={LOGO2_IMAGE}
              className="w-20 h-20 self-center mb-3"
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
            <Text className="text-3xl font-extrabold text-neutral-900 text-center tracking-tight">
              Welcome Back!
            </Text>
          </View>

          {/* Email Field */}
          <View className="w-full mb-3.5">
            <RNTextInput
              className={`w-full h-[52px] bg-white/95 border ${
                emailError ? "border-[#FF3B30] bg-[#FFF8F8]" : "border-gray-200"
              } rounded-2xl px-4 text-base text-gray-900 shadow-sm`}
              placeholder="farmer@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                if (emailError) setEmailError("");
                if (generalError) setGeneralError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? (
              <Text className="text-[#FF3B30] text-xs mt-1.5 ml-1 font-medium">
                {emailError}
              </Text>
            ) : null}
          </View>

          {/* Password Field */}
          <View className="w-full mb-1">
            <View className="w-full relative justify-center">
              <RNTextInput
                className={`w-full h-[52px] bg-white/95 border ${
                  passwordError ? "border-[#FF3B30] bg-[#FFF8F8]" : "border-gray-200"
                } rounded-2xl pl-4 pr-12 text-base text-gray-900 shadow-sm`}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                  if (generalError) setGeneralError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                className="absolute right-0 top-0 bottom-0 px-4 justify-center items-center"
                onPress={() => setShowPassword((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#848484"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text className="text-[#FF3B30] text-xs mt-1.5 ml-1 font-medium">
                {passwordError}
              </Text>
            ) : null}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            className="self-end mb-5 py-1.5 px-1"
            onPress={() => router.push("/auth/ForgotPassword" as any)}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-medium text-neutral-700">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            className={`w-full h-[52px] ${
              isSubmitting ? "bg-[#72AF5B]/80" : "bg-[#72AF5B]"
            } rounded-2xl items-center justify-center shadow-md shadow-[#72AF5B]/30 active:opacity-90 flex-row gap-2`}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : null}
            <Text className="text-white text-base font-bold tracking-wide">
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View className="flex-row justify-center items-center mt-6 w-full">
            <Text className="text-sm text-neutral-600">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/Signup" as any)}
              activeOpacity={0.7}
              className="py-1"
            >
              <Text className="text-sm font-bold text-[#72AF5B]">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

