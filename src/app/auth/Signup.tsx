import { useAuth } from "@/hooks/use-auth";
import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
} from "@/utils/validation";
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
const LF3_IMAGE = require("../../../assets/images/LF3.png");
const LOGO2_IMAGE = require("../../../assets/images/logo2.png");

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const handleSignUp = async () => {
    setGeneralError("");
    let hasError = false;

    if (!firstName.trim()) {
      setFirstNameError("First name required.");
      hasError = true;
    } else {
      setFirstNameError("");
    }

    if (!lastName.trim()) {
      setLastNameError("Last name required.");
      hasError = true;
    } else {
      setLastNameError("");
    }

    if (!username.trim()) {
      setUsernameError("Username required.");
      hasError = true;
    } else {
      setUsernameError("");
    }

    const phoneVal = validatePhoneNumber(phoneNumber);
    if (!phoneVal.isValid) {
      setPhoneNumberError(phoneVal.error || "");
      hasError = true;
    } else {
      setPhoneNumberError("");
    }

    if (!gender) {
      setGenderError("Select gender.");
      hasError = true;
    } else {
      setGenderError("");
    }

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      setEmailError(emailVal.error || "");
      hasError = true;
    } else {
      setEmailError("");
    }

    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      setPasswordError(passVal.error || "");
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

    // Redirect to OTP verification screen
    router.push({
      pathname: "/auth/Otp",
      params: {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        gender,
      },
    } as any);
  };

  return (
    <ImageBackground source={BG_IMAGE} className="flex-1" resizeMode="cover">
      {/* Top Left LF2 Banner Logo */}
      <View
        className="absolute left-4 z-20"
        style={{ top: Math.max(insets.top + 8, 16) }}
      >
        <Image
          source={LF3_IMAGE}
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
          {/* Form Wrapper (No Container Box) */}
          <View className="w-full max-w-[380px]">
            {/* Header Block (Left-aligned) */}
            <View className="items-start mb-6 w-full">
              <Text className="text-5xl font-extrabold text-[#000000] tracking-widest uppercase mb-1">
                Join Us
              </Text>
              <Text className="text-md text-[#000000] text-left">
                Create an Account
              </Text>
            </View>

            {generalError ? (
              <View className="bg-[#FFEBEA] p-3 rounded-xl mb-4 w-full border border-[#FF3B30]">
                <Text className="text-[#FF3B30] text-sm text-center font-medium">
                  {generalError}
                </Text>
              </View>
            ) : null}

            {/* 2-Column Grid: First Name & Last Name */}
            <View className="w-full flex-row gap-3 mb-4">
              {/* First Name */}
              <View className="flex-1">
                <RNTextInput
                  className={`w-full h-12 bg-white/95 border ${
                    firstNameError ? "border-[#FF3B30]" : "border-gray-300"
                  } rounded-xl px-4 text-base text-gray-900`}
                  placeholder="First Name"
                  placeholderTextColor="#888888"
                  value={firstName}
                  onChangeText={(text: string) => {
                    setFirstName(text);
                    if (firstNameError) setFirstNameError("");
                  }}
                />
                {firstNameError ? (
                  <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                    {firstNameError}
                  </Text>
                ) : null}
              </View>

              {/* Last Name */}
              <View className="flex-1">
                <RNTextInput
                  className={`w-full h-12 bg-white/95 border ${
                    lastNameError ? "border-[#FF3B30]" : "border-gray-300"
                  } rounded-xl px-4 text-base text-gray-900`}
                  placeholder="Last Name"
                  placeholderTextColor="#888888"
                  value={lastName}
                  onChangeText={(text: string) => {
                    setLastName(text);
                    if (lastNameError) setLastNameError("");
                  }}
                />
                {lastNameError ? (
                  <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                    {lastNameError}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Username Field */}
            <View className="w-full mb-4">
              <RNTextInput
                className={`w-full h-12 bg-white/95 border ${
                  usernameError ? "border-[#FF3B30]" : "border-gray-300"
                } rounded-xl px-4 text-base text-gray-900`}
                placeholder="Username"
                placeholderTextColor="#888888"
                value={username}
                onChangeText={(text: string) => {
                  setUsername(text);
                  if (usernameError) setUsernameError("");
                }}
                autoCapitalize="none"
              />
              {usernameError ? (
                <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                  {usernameError}
                </Text>
              ) : null}
            </View>

            {/* Phone Number Field */}
            <View className="w-full mb-4">
              <RNTextInput
                className={`w-full h-12 bg-white/95 border ${
                  phoneNumberError ? "border-[#FF3B30]" : "border-gray-300"
                } rounded-xl px-4 text-base text-gray-900`}
                placeholder="Phone Number"
                placeholderTextColor="#888888"
                value={phoneNumber}
                onChangeText={(text: string) => {
                  setPhoneNumber(text);
                  if (phoneNumberError) setPhoneNumberError("");
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              {phoneNumberError ? (
                <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                  {phoneNumberError}
                </Text>
              ) : null}
            </View>

            {/* Gender Dropdown Field */}
            <View className="w-full mb-4 z-30 relative">
              <TouchableOpacity
                className={`w-full h-12 bg-white/95 border ${
                  genderError ? "border-[#FF3B30]" : "border-gray-300"
                } rounded-xl px-4 flex-row items-center justify-between`}
                onPress={() => setShowGenderDropdown((prev) => !prev)}
              >
                <Text
                  className={`text-base ${
                    gender ? "text-gray-900 font-medium" : "text-gray-400"
                  }`}
                  numberOfLines={1}
                >
                  {gender || "Select Gender"}
                </Text>
                <Ionicons
                  name="chevron-down-outline"
                  size={18}
                  color="#2E7D32"
                />
              </TouchableOpacity>

              {/* Dropdown Options */}
              {showGenderDropdown ? (
                <View className="absolute top-[70px] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {GENDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      className="px-4 py-3 border-b border-gray-100 active:bg-gray-50 flex-row items-center justify-between"
                      onPress={() => {
                        setGender(option);
                        setShowGenderDropdown(false);
                        if (genderError) setGenderError("");
                      }}
                    >
                      <Text className="text-sm text-gray-800 font-medium">
                        {option}
                      </Text>
                      {gender === option ? (
                        <Ionicons
                          name="checkmark-outline"
                          size={18}
                          color="#848484"
                        />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {genderError ? (
                <Text className="text-[#FF3B30] text-xs mt-1 font-medium">
                  {genderError}
                </Text>
              ) : null}
            </View>

            {/* Email Field */}
            <View className="w-full mb-4 z-10">
              <RNTextInput
                className={`w-full h-12 bg-white/95 border ${
                  emailError ? "border-[#FF3B30]" : "border-gray-300"
                } rounded-xl px-4 text-base text-gray-900`}
                placeholder="Email address"
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
            <View className="w-full mb-4 z-10">
              <View className="w-full relative">
                <RNTextInput
                  className={`w-full h-12 bg-white/95 border ${
                    passwordError ? "border-[#FF3B30]" : "border-gray-300"
                  } rounded-xl px-4 pr-16 text-base text-gray-900`}
                  placeholder="Create a password (min. 6 characters)"
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
            <View className="w-full mb-6 z-10">
              <View className="w-full relative">
                <RNTextInput
                  className={`w-full h-12 bg-white/95 border ${
                    confirmPasswordError
                      ? "border-[#FF3B30]"
                      : "border-gray-300"
                  } rounded-xl px-4 pr-16 text-base text-gray-900`}
                  placeholder="Re-enter your password"
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
              className="w-full h-12 bg-[#72AF5B] rounded-xl items-center justify-center shadow-sm active:opacity-90 mt-1"
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-bold">
                {isLoading ? "Creating account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View className="flex-row justify-center mt-6 w-full">
              <Text className="text-sm text-[#4A654C]">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/auth/Login" as any)}
              >
                <Text className="text-sm font-bold text-[#72AF5B]">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
