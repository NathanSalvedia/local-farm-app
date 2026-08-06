import { useAuth } from "@/hooks/use-auth";
import { validateEmail, validatePassword } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG_IMAGE = require("../../../assets/images/background-blur.png");
const LF2_IMAGE = require("../../../assets/images/LF2.png");
const LOGO2_IMAGE = require("../../../assets/images/logo2.png");

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const handleLogin = async () => {
    setGeneralError("");
    const emailVal = validateEmail(email);
    const passVal = validatePassword(password);

    setEmailError(emailVal.error || "");
    setPasswordError(passVal.error || "");

    if (!emailVal.isValid || !passVal.isValid) {
      return;
    }

    try {
      await signIn(email, password);
    } catch (err: any) {
      setGeneralError(
        err?.message || "Failed to sign in. Please check your credentials.",
      );
    }
  };

  return (
    <ImageBackground source={BG_IMAGE} className="flex-1" resizeMode="cover">
      {/* Top Left LF2 Banner Logo */}
      <View
        className="absolute left-4 z-20"
        style={{ top: Math.max(insets.top + 8, 16) }}
      >
        <Image
          source={LF2_IMAGE}
          className="w-[140px] h-[42px]"
          style={{ width: 140, height: 42 }}
          resizeMode="contain"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center items-center px-5 pb-8 pt-20"
          keyboardShouldPersistTaps="handled"
        >
          {/* Centered Form Wrapper (No Container Box) */}
          <View className="w-full max-w-[380px] items-center">
            {/* Centered Logo2 & Header */}
            <View className="items-center mb-6 w-full">
              <Image
                source={LOGO2_IMAGE}
                className="w-[88px] h-[88px] self-center mb-3"
                style={{ width: 88, height: 88 }}
                resizeMode="contain"
              />
              <Text className="text-4xl font-extrabold text-[#000000] text-center mb-1 p-3">
                Welcome Back!
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
            <View className="w-full mb-4">
              <RNTextInput
                className={`w-full h-12 bg-white/95 border ${
                  emailError ? "border-[#FF3B30]" : "border-gray-300"
                } rounded-xl px-4 text-base text-gray-900`}
                placeholder="farmer@example.com"
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

            {/* Password Field */}
            <View className="w-full mb-6">
              <View className="w-full relative">
                <RNTextInput
                  className={`w-full h-12 bg-white/95 border ${
                    passwordError ? "border-[#FF3B30]" : "border-gray-300"
                  } rounded-xl px-4 pr-16 text-base text-gray-900`}
                  placeholder="Enter your password"
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
                  className="absolute right-3.5 top-3"
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
              <TouchableOpacity
                className="self-end mt-1.5"
                onPress={() => router.push("/forgot-password" as any)}
              >
                <Text className="text-md p-2 text-[#000000]">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className="w-full h-12 bg-[#2E7D32] rounded-xl items-center justify-center shadow-sm active:opacity-90 mt-1"
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-bold">
                {isLoading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View className="flex-row justify-center mt-6 w-full">
              <Text className="text-sm text-[#4A654C]">
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/signup" as any)}>
                <Text className="text-sm font-bold text-[#2E7D32] ">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
