import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import { validateEmail, validatePassword } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG_IMAGE = require("../../../assets/images/background-blur.png");
const LF3_IMAGE = require("../../../assets/images/LF3.png");
const LOGO2_IMAGE = require("../../../assets/images/logo2.png");
const LOCAL_FARMERS_LOGO = require("../../../assets/images/local-farmers-logo.png");
const ABOUT_COLLAGE = require("../../../assets/images/about-collage.png");
const ABOUT_FARMER = require("../../../assets/images/about-farmer.png");
const ABOUT_SEEDLING = require("../../../assets/images/about-seedling.png");
const ABOUT_POSTER = require("../../../assets/images/about-poster.png");

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const [aboutSectionY, setAboutSectionY] = useState(0);
  const [featuresSectionY, setFeaturesSectionY] = useState(0);
  const [blogSectionY, setBlogSectionY] = useState(0);
  const [contactSectionY, setContactSectionY] = useState(0);
  const [activeNav, setActiveNav] = useState<"Home" | "About" | "Features" | "Blog" | "Contact">("Home");

  const [selectedBlogCategory, setSelectedBlogCategory] = useState("All Articles");
  const [blogSearchQuery, setBlogSearchQuery] = useState("");

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);

  const handleSendContact = () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      showToast("Please fill in your name, email, and message.", "warning");
      return;
    }
    setIsSendingContact(true);
    setTimeout(() => {
      setIsSendingContact(false);
      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
      showToast("Thank you! Your message has been sent to the Local Farm team.", "success");
    }, 800);
  };

  const scrollToHome = () => {
    setActiveNav("Home");
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const scrollToAbout = () => {
    setActiveNav("About");
    if (scrollViewRef.current) {
      const targetY = aboutSectionY > 0 ? aboutSectionY - 20 : 650;
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    }
  };

  const scrollToFeatures = () => {
    setActiveNav("Features");
    if (scrollViewRef.current) {
      const targetY = featuresSectionY > 0 ? featuresSectionY - 20 : 1300;
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    }
  };

  const scrollToBlog = () => {
    setActiveNav("Blog");
    if (scrollViewRef.current) {
      const targetY = blogSectionY > 0 ? blogSectionY - 20 : 2000;
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    }
  };

  const scrollToContact = () => {
    setActiveNav("Contact");
    if (scrollViewRef.current) {
      const targetY = contactSectionY > 0 ? contactSectionY - 20 : 2700;
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    }
  };

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

  // ---------------------------------------------------------------------------
  // 1. DESKTOP / WEBSITE VIEW (Admin & Web Landing Page)
  // ---------------------------------------------------------------------------
  if (isDesktop) {
    return (
      <View className="flex-1 bg-white min-h-screen">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            if (contactSectionY > 0 && offsetY >= contactSectionY - 220) {
              setActiveNav("Contact");
            } else if (blogSectionY > 0 && offsetY >= blogSectionY - 220) {
              setActiveNav("Blog");
            } else if (featuresSectionY > 0 && offsetY >= featuresSectionY - 220) {
              setActiveNav("Features");
            } else if (aboutSectionY > 0 && offsetY >= aboutSectionY - 220) {
              setActiveNav("About");
            } else {
              setActiveNav("Home");
            }
          }}
          scrollEventThrottle={16}
        >
          {/* Top Navigation Bar (Separated Corners & Sticky Header) */}
          <header className="w-full border-b border-gray-100 bg-white sticky top-0 z-50 shadow-2xs">
            <View className="w-full flex-row justify-between items-center px-8 md:px-12 py-4 relative">
              {/* Left Corner: Brand Logo */}
              <TouchableOpacity
                onPress={scrollToHome}
                className="flex-row items-center cursor-pointer"
                activeOpacity={0.85}
              >
                <Image
                  source={LOCAL_FARMERS_LOGO}
                  className="h-10 w-44"
                  style={{ width: 185, height: 42 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Center: Fixed Navigation Links */}
              <View
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: [{ translateX: -190 }],
                }}
                className="flex-row items-center gap-10"
              >
                <TouchableOpacity
                  onPress={scrollToHome}
                  className="items-center cursor-pointer"
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-sm ${
                      activeNav === "Home"
                        ? "font-bold text-gray-900"
                        : "font-semibold text-gray-600 hover:text-gray-900"
                    } transition-colors`}
                  >
                    Home
                  </Text>
                  {activeNav === "Home" && (
                    <View className="w-6 h-[3px] bg-[#72AF5B] rounded-full mt-1" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={scrollToAbout}
                  className="items-center cursor-pointer"
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-sm ${
                      activeNav === "About"
                        ? "font-bold text-gray-900"
                        : "font-semibold text-gray-600 hover:text-gray-900"
                    } transition-colors`}
                  >
                    About
                  </Text>
                  {activeNav === "About" && (
                    <View className="w-6 h-[3px] bg-[#72AF5B] rounded-full mt-1" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={scrollToFeatures}
                  className="items-center cursor-pointer"
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-sm ${
                      activeNav === "Features"
                        ? "font-bold text-gray-900"
                        : "font-semibold text-gray-600 hover:text-gray-900"
                    } transition-colors`}
                  >
                    Features
                  </Text>
                  {activeNav === "Features" && (
                    <View className="w-6 h-[3px] bg-[#72AF5B] rounded-full mt-1" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={scrollToBlog}
                  className="items-center cursor-pointer"
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-sm ${
                      activeNav === "Blog"
                        ? "font-bold text-gray-900"
                        : "font-semibold text-gray-600 hover:text-gray-900"
                    } transition-colors`}
                  >
                    Blog
                  </Text>
                  {activeNav === "Blog" && (
                    <View className="w-6 h-[3px] bg-[#72AF5B] rounded-full mt-1" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={scrollToContact}
                  className="items-center cursor-pointer"
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-sm ${
                      activeNav === "Contact"
                        ? "font-bold text-gray-900"
                        : "font-semibold text-gray-600 hover:text-gray-900"
                    } transition-colors`}
                  >
                    Contact
                  </Text>
                  {activeNav === "Contact" && (
                    <View className="w-6 h-[3px] bg-[#72AF5B] rounded-full mt-1" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Right Corner: Fixed-width Login Button */}
              <View className="items-end">
                <TouchableOpacity
                  onPress={() => setIsLoginModalOpen((prev) => !prev)}
                  className="bg-[#72AF5B] w-28 py-2.5 rounded-xl flex-row items-center justify-center gap-2 shadow-xs active:bg-[#5E9C4E] hover:bg-[#5E9C4E] transition-all"
                  activeOpacity={0.9}
                >
                  <Ionicons name="person" size={16} color="#FFFFFF" />
                  <Text className="text-white text-sm font-bold">
                    {isLoginModalOpen ? "Close" : "Login"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </header>

          {/* Main Hero Section (Comfortable & Clean Left-Corner Hero Content) */}
          <View className="w-full bg-white flex-1 justify-center">
            <View className="w-full px-8 md:px-14 py-10 md:py-14 flex-row items-center justify-between gap-12">
              {/* Left Corner: Headline, Description & CTAs */}
              <View className="flex-1 max-w-[560px]">
                <Text className="text-5xl font-black text-gray-900 leading-[1.12] tracking-tight mb-4">
                  Your Farm.{"\n"}
                  Your Community.{"\n"}
                  Your <Text className="text-[#72AF5B]">Local Farm.</Text>
                </Text>

                <Text className="text-sm md:text-base text-gray-600 leading-relaxed mb-7 font-normal">
                  Local Farm is a social platform for farmers and communities to connect,
                  share, learn, and grow together. Stay updated, engage with others, and
                  build a stronger agriculture community.
                </Text>

                {/* CTA Buttons */}
                <View className="flex-row items-center gap-3.5 mb-7">
                  <TouchableOpacity
                    onPress={() => setIsLoginModalOpen(true)}
                    className="bg-[#72AF5B] px-6 py-3.5 rounded-xl flex-row items-center gap-2 shadow-sm active:bg-[#5E9C4E] hover:bg-[#5E9C4E] transition-all"
                    activeOpacity={0.9}
                  >
                    <Ionicons name="leaf" size={18} color="#FFFFFF" />
                    <Text className="text-white font-bold text-sm">Get the App</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-white border border-gray-200 px-6 py-3.5 rounded-xl flex-row items-center gap-2 active:bg-gray-50 hover:bg-gray-50 transition-all shadow-2xs"
                    activeOpacity={0.9}
                  >
                    <Ionicons name="play" size={16} color="#374151" />
                    <Text className="text-gray-800 font-bold text-sm">Learn More</Text>
                  </TouchableOpacity>
                </View>

                {/* App Store Badges */}
                <View className="flex-row items-center gap-3.5">
                  <TouchableOpacity
                    className="bg-black px-4 py-2 rounded-xl flex-row items-center gap-2.5 active:opacity-80 shadow-xs"
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-google-playstore" size={20} color="#FFFFFF" />
                    <View>
                      <Text className="text-[8px] text-gray-300 font-medium leading-none uppercase">
                        GET IT ON
                      </Text>
                      <Text className="text-xs text-white font-bold leading-tight">
                        Google Play
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-black px-4 py-2 rounded-xl flex-row items-center gap-2.5 active:opacity-80 shadow-xs"
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                    <View>
                      <Text className="text-[8px] text-gray-300 font-medium leading-none">
                        Download on the
                      </Text>
                      <Text className="text-xs text-white font-bold leading-tight">
                        App Store
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right Column: Floating Login Card (Shows Only When Clicked) */}
              {isLoginModalOpen ? (
                <View className="w-[420px] shrink-0 bg-white rounded-3xl p-8 shadow-2xl shadow-gray-300/40 border border-gray-100 relative">
                  {/* Close button on card */}
                  <TouchableOpacity
                    onPress={() => setIsLoginModalOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 items-center justify-center transition-all"
                    accessibilityLabel="Close Login"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color="#4B5563" />
                  </TouchableOpacity>

                  {/* Micro Badge */}
                  <View className="self-center flex-row items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full mb-3">
                    <Ionicons name="leaf" size={12} color="#72AF5B" />
                    <Text className="text-[11px] font-bold text-[#5E9C4E] uppercase tracking-wider">
                      Local Farm Portal
                    </Text>
                  </View>

                  <Text className="text-2xl font-black text-gray-900 text-center tracking-tight">
                    Welcome Back!
                  </Text>
                  <Text className="text-xs text-gray-500 text-center font-medium mt-1 mb-5">
                    Login to connect with your agricultural community
                  </Text>

                  {/* General Error Banner */}
                  {generalError ? (
                    <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex-row items-center gap-2">
                      <Ionicons name="alert-circle" size={18} color="#EF4444" />
                      <Text className="text-xs text-red-700 font-medium flex-1">
                        {generalError}
                      </Text>
                    </View>
                  ) : null}

                  {/* Email Input */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-700 mb-1.5">
                      Email Address
                    </Text>
                    <View
                      className={`flex-row items-center border ${
                        emailError ? "border-red-400 bg-red-50/30" : "border-gray-200 bg-gray-50/50"
                      } rounded-xl px-3.5 h-12 bg-white transition-all`}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={18}
                        color="#9CA3AF"
                      />
                      <RNTextInput
                        placeholder="farmer@example.com"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          if (emailError) setEmailError("");
                          if (generalError) setGeneralError("");
                        }}
                        className="flex-1 text-sm text-gray-900 ml-2.5 h-full"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    {emailError ? (
                      <Text className="text-red-500 text-[11px] mt-1.5 ml-1 font-medium">
                        {emailError}
                      </Text>
                    ) : null}
                  </View>

                  {/* Password Input */}
                  <View className="mb-3.5">
                    <Text className="text-xs font-bold text-gray-700 mb-1.5">
                      Password
                    </Text>
                    <View
                      className={`flex-row items-center border ${
                        passwordError ? "border-red-400 bg-red-50/30" : "border-gray-200 bg-gray-50/50"
                      } rounded-xl px-3.5 h-12 bg-white transition-all`}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color="#9CA3AF"
                      />
                      <RNTextInput
                        placeholder="Enter your password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(t) => {
                          setPassword(t);
                          if (passwordError) setPasswordError("");
                          if (generalError) setGeneralError("");
                        }}
                        className="flex-1 text-sm text-gray-900 ml-2.5 h-full"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="p-1 rounded hover:bg-gray-100"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordError ? (
                      <Text className="text-red-500 text-[11px] mt-1.5 ml-1 font-medium">
                        {passwordError}
                      </Text>
                    ) : null}
                  </View>

                  {/* Remember Me & Forgot Password */}
                  <View className="flex-row items-center justify-between mb-5">
                    <TouchableOpacity
                      onPress={() => setRememberMe(!rememberMe)}
                      className="flex-row items-center gap-2 py-1"
                      activeOpacity={0.8}
                    >
                      <View
                        className={`w-4 h-4 rounded-[4px] border ${
                          rememberMe
                            ? "bg-[#72AF5B] border-[#72AF5B]"
                            : "border-gray-300 bg-white"
                        } items-center justify-center`}
                      >
                        {rememberMe && (
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        )}
                      </View>
                      <Text className="text-xs text-gray-600 font-medium">
                        Remember me
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push("/auth/ForgotPassword" as any)}
                      activeOpacity={0.7}
                      className="py-1"
                    >
                      <Text className="text-xs font-semibold text-[#72AF5B] hover:underline">
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Login Submit Button */}
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isSubmitting}
                    className="w-full bg-[#72AF5B] h-12 rounded-xl flex-row items-center justify-center gap-2 shadow-md shadow-[#72AF5B]/25 active:bg-[#5E9C4E] hover:bg-[#5E9C4E] transition-all mb-4"
                    activeOpacity={0.9}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text className="text-white font-bold text-sm tracking-wide">
                          Sign In
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* OR Divider */}
                  <View className="flex-row items-center my-2 w-full">
                    <View className="flex-1 h-[1px] bg-gray-200" />
                    <Text className="text-[10px] text-gray-400 px-3 uppercase font-bold tracking-wider">
                      OR CONTINUE WITH
                    </Text>
                    <View className="flex-1 h-[1px] bg-gray-200" />
                  </View>

                  {/* Google Login */}
                  <TouchableOpacity
                    onPress={() => showToast("Google authentication initialized", "info")}
                    className="w-full border border-gray-200 bg-white hover:bg-gray-50 rounded-xl h-11 flex-row items-center justify-center gap-2.5 active:bg-gray-100 transition-all mb-4 shadow-2xs"
                    activeOpacity={0.9}
                  >
                    <Ionicons name="logo-google" size={17} color="#EA4335" />
                    <Text className="text-xs font-semibold text-gray-700">
                      Continue with Google
                    </Text>
                  </TouchableOpacity>

                  {/* Signup Link */}
                  <View className="flex-row items-center justify-center pt-1">
                    <Text className="text-xs text-gray-500">
                      {"Don't have an account? "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/auth/Signup" as any)}
                      activeOpacity={0.7}
                    >
                      <Text className="text-xs font-bold text-[#72AF5B] hover:underline">
                        Sign up here
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Bottom Features Highlight Bar */}
          <footer className="w-full border-t border-gray-100 bg-white py-8">
            <View className="w-full px-8 md:px-14 flex-row justify-between items-start gap-6">
              {/* Feature 1: Connect */}
              <View className="flex-1 items-center text-center px-2">
                <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2.5">
                  <Ionicons name="people" size={20} color="#72AF5B" />
                </View>
                <Text className="text-sm font-bold text-gray-900 mb-1">
                  Connect
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-relaxed">
                  Connect with farmers and your community.
                </Text>
              </View>

              {/* Feature 2: Learn */}
              <View className="flex-1 items-center text-center px-2">
                <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2.5">
                  <Ionicons name="book" size={20} color="#72AF5B" />
                </View>
                <Text className="text-sm font-bold text-gray-900 mb-1">
                  Learn
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-relaxed">
                  Discover farming tips and agricultural news.
                </Text>
              </View>

              {/* Feature 3: Share */}
              <View className="flex-1 items-center text-center px-2">
                <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2.5">
                  <Ionicons name="share-social" size={20} color="#72AF5B" />
                </View>
                <Text className="text-sm font-bold text-gray-900 mb-1">
                  Share
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-relaxed">
                  Share stories, photos, and your experiences.
                </Text>
              </View>

              {/* Feature 4: Live */}
              <View className="flex-1 items-center text-center px-2">
                <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2.5">
                  <Ionicons name="videocam" size={20} color="#72AF5B" />
                </View>
                <Text className="text-sm font-bold text-gray-900 mb-1">
                  Live
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-relaxed">
                  Go live anytime and engage in real-time.
                </Text>
              </View>

              {/* Feature 5: Safe & Secure */}
              <View className="flex-1 items-center text-center px-2">
                <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2.5">
                  <Ionicons name="shield-checkmark" size={20} color="#72AF5B" />
                </View>
                <Text className="text-sm font-bold text-gray-900 mb-1">
                  Safe & Secure
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-relaxed">
                  Your community is protected with our report system.
                </Text>
              </View>
            </View>
          </footer>

          {/* ----------------------------------------------------------------- */}
          {/* ABOUT SECTION (Formal, Simple & Uniform Layout) */}
          {/* ----------------------------------------------------------------- */}
          <View
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setAboutSectionY(layout.y);
            }}
            className="w-full bg-white border-t border-gray-200 py-20 md:py-24 px-8 md:px-14"
          >
            {/* Section Header */}
            <View className="max-w-3xl mx-auto items-center mb-16 text-center">
              <View className="flex-row items-center gap-2 bg-white border border-gray-200 px-3.5 py-1 rounded-full shadow-2xs mb-4">
                <View className="w-2 h-2 rounded-full bg-[#72AF5B]" />
                <Text className="text-xs font-bold text-[#5E9C4E] uppercase tracking-wider">
                  ABOUT US
                </Text>
              </View>

              <Text className="text-3xl md:text-4xl font-black text-gray-900 text-center tracking-tight leading-tight mb-4">
                Empowering Sustainable{"\n"}
                <Text className="text-[#72AF5B]">Local Agriculture</Text>
              </Text>

              <Text className="text-sm md:text-base text-gray-600 text-center leading-relaxed">
                Local Farm is dedicated to strengthening regional food systems by connecting local farmers, agricultural cooperatives, and consumers through direct trade, verified provenance, and collaborative farming intelligence.
              </Text>
            </View>

            {/* 3 Symmetrical, Simple & Formal Cards */}
            <View className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Card 1: Our Vision */}
              <View className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                <View>
                  <View className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center mb-6">
                    <Ionicons name="eye-outline" size={22} color="#5E9C4E" />
                  </View>

                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    OUR VISION
                  </Text>
                  <Text className="text-lg font-bold text-gray-900 mb-3">
                    Direct Farm Trade
                  </Text>
                  <Text className="text-xs text-gray-600 leading-relaxed mb-6">
                    Connecting growers directly with consumers and local markets to eliminate middleman fees and ensure fair pricing for every harvest.
                  </Text>
                </View>

                <View className="pt-4 border-t border-gray-100 flex-row items-center justify-between">
                  <Text className="text-xs text-gray-500 font-medium">Economic Impact</Text>
                  <Text className="text-xs font-bold text-[#5E9C4E]">+40% Higher Margin</Text>
                </View>
              </View>

              {/* Card 2: Our Mission */}
              <View className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                <View>
                  <View className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center mb-6">
                    <Ionicons name="leaf-outline" size={22} color="#5E9C4E" />
                  </View>

                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    OUR MISSION
                  </Text>
                  <Text className="text-lg font-bold text-gray-900 mb-3">
                    Transparent Agriculture
                  </Text>
                  <Text className="text-xs text-gray-600 leading-relaxed mb-6">
                    Fostering complete visibility into food origins, sustainable organic practices, and verified farm-to-table traceability.
                  </Text>
                </View>

                <View className="pt-4 border-t border-gray-100 flex-row items-center justify-between">
                  <Text className="text-xs text-gray-500 font-medium">Provenance Standard</Text>
                  <Text className="text-xs font-bold text-[#5E9C4E]">100% Traceable</Text>
                </View>
              </View>

              {/* Card 3: Our Community */}
              <View className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                <View>
                  <View className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center mb-6">
                    <Ionicons name="people-outline" size={22} color="#5E9C4E" />
                  </View>

                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    OUR COMMUNITY
                  </Text>
                  <Text className="text-lg font-bold text-gray-900 mb-3">
                    Collaborative Wisdom
                  </Text>
                  <Text className="text-xs text-gray-600 leading-relaxed mb-6">
                    Providing a dedicated platform for farmers to exchange agronomic solutions, weather advisories, and organic pest defense.
                  </Text>
                </View>

                <View className="pt-4 border-t border-gray-100 flex-row items-center justify-between">
                  <Text className="text-xs text-gray-500 font-medium">Peer Network</Text>
                  <Text className="text-xs font-bold text-[#5E9C4E]">24/7 Knowledge Base</Text>
                </View>
              </View>
            </View>

            {/* Uniform Key Metrics Bar */}
            <View className="max-w-6xl mx-auto w-full bg-white rounded-2xl p-8 border border-gray-200 shadow-xs mb-14">
              <View className="flex-row flex-wrap justify-between items-center gap-6">
                <View className="flex-1 min-w-[130px] items-center text-center border-r border-gray-100 last:border-0">
                  <Text className="text-3xl font-black text-gray-900 mb-1">
                    10,000+
                  </Text>
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Active Growers
                  </Text>
                </View>

                <View className="flex-1 min-w-[130px] items-center text-center border-r border-gray-100 last:border-0">
                  <Text className="text-3xl font-black text-gray-900 mb-1">
                    50+
                  </Text>
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Farming Hubs
                  </Text>
                </View>

                <View className="flex-1 min-w-[130px] items-center text-center border-r border-gray-100 last:border-0">
                  <Text className="text-3xl font-black text-gray-900 mb-1">
                    40,000+
                  </Text>
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Insights Shared
                  </Text>
                </View>

                <View className="flex-1 min-w-[130px] items-center text-center">
                  <Text className="text-3xl font-black text-gray-900 mb-1">
                    99.2%
                  </Text>
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Trust Rating
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ----------------------------------------------------------------- */}
          {/* FEATURES SECTION (Exact Match to Reference Layout) */}
          {/* ----------------------------------------------------------------- */}
          <View
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setFeaturesSectionY(layout.y);
            }}
            className="w-full bg-white border-t border-gray-100 py-20 md:py-28 px-8 md:px-14"
          >
            {/* Section Header */}
            <View className="max-w-3xl mx-auto items-center mb-16 text-center">
              <Text className="text-lg md:text-xl font-bold text-gray-900 mb-2 tracking-tight">
                Following <Text className="text-[#67A34E]">Features</Text>
              </Text>

              <Text className="text-3xl md:text-5xl font-black text-gray-900 text-center tracking-tight leading-tight mb-4">
                Everything You Need to Stay Connected
              </Text>

              <Text className="text-xs md:text-sm text-gray-500 text-center max-w-2xl leading-relaxed">
                Local Farm combines familiar social features with a community built around agriculture, making it easy to communicate, share experience, and discover what's happening around you
              </Text>
            </View>

            {/* Features 6-Card Grid */}
            <View className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1: News Feed */}
              <View className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all flex flex-col justify-between min-h-[250px]">
                <View className="flex-row items-start gap-5 mb-6">
                  <View className="w-14 h-14 rounded-2xl bg-[#67A34E] items-center justify-center shrink-0">
                    <Ionicons name="document-text" size={26} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900 mb-2">
                      News Feed
                    </Text>
                    <Text className="text-xs text-gray-500 leading-relaxed font-normal">
                      Stay connected with the latest updates from your friends and community. Create posts, share photos and videos, react to content, comment on discussion, and share moments that matters to you.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsLoginModalOpen(true);
                    scrollToHome();
                  }}
                  className="self-start pt-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-gray-400 hover:text-[#67A34E] transition-colors">
                    Learn more →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feature 2: Messaging */}
              <View className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all flex flex-col justify-between min-h-[250px]">
                <View className="flex-row items-start gap-5 mb-6">
                  <View className="w-14 h-14 rounded-2xl bg-[#67A34E] items-center justify-center shrink-0">
                    <Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900 mb-2">
                      Messaging
                    </Text>
                    <Text className="text-xs text-gray-500 leading-relaxed font-normal">
                      Have private conversation with friends, and other members of the community. Exchange ideas, ask questions, share information, and stay connected wherever you are.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsLoginModalOpen(true);
                    scrollToHome();
                  }}
                  className="self-start pt-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-gray-400 hover:text-[#67A34E] transition-colors">
                    Learn more →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feature 3: Add Friends */}
              <View className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all flex flex-col justify-between min-h-[250px]">
                <View className="flex-row items-start gap-5 mb-6">
                  <View className="w-14 h-14 rounded-2xl bg-[#67A34E] items-center justify-center shrink-0">
                    <Ionicons name="people" size={28} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900 mb-2">
                      Add Friends
                    </Text>
                    <Text className="text-xs text-gray-500 leading-relaxed font-normal">
                      Discover people within the Local Farm community and build meaningful connections. Send friend requests, accept new connections, and grow your agricultural network.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsLoginModalOpen(true);
                    scrollToHome();
                  }}
                  className="self-start pt-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-gray-400 hover:text-[#67A34E] transition-colors">
                    Learn more →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feature 4: My Day */}
              <View className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all flex flex-col justify-between min-h-[250px]">
                <View className="flex-row items-start gap-5 mb-6">
                  <View className="w-14 h-14 rounded-2xl bg-[#67A34E] items-center justify-center shrink-0">
                    <Ionicons name="images" size={26} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900 mb-2">
                      My Day
                    </Text>
                    <Text className="text-xs text-gray-500 leading-relaxed font-normal">
                      Share your everyday moments through photos and videos. Show what is happening on your farm, share your harvest, or simply let your community see your day.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsLoginModalOpen(true);
                    scrollToHome();
                  }}
                  className="self-start pt-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-gray-400 hover:text-[#67A34E] transition-colors">
                    Learn more →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feature 5: Live */}
              <View className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all flex flex-col justify-between min-h-[250px]">
                <View className="flex-row items-start gap-5 mb-6">
                  <View className="w-14 h-14 rounded-2xl bg-[#67A34E] items-center justify-center shrink-0">
                    <Ionicons name="videocam" size={26} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900 mb-2">
                      Live
                    </Text>
                    <Text className="text-xs text-gray-500 leading-relaxed font-normal">
                      Go live directly from your farm, share farming activities, demonstrate techniques, showcase your farm, or interact with your community in real time.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsLoginModalOpen(true);
                    scrollToHome();
                  }}
                  className="self-start pt-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-gray-400 hover:text-[#67A34E] transition-colors">
                    Learn more →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feature 6: Report */}
              <View className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all flex flex-col justify-between min-h-[250px]">
                <View className="flex-row items-start gap-5 mb-6">
                  <View className="w-14 h-14 rounded-2xl bg-[#67A34E] items-center justify-center shrink-0">
                    <Ionicons name="videocam" size={26} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900 mb-2">
                      Report
                    </Text>
                    <Text className="text-xs text-gray-500 leading-relaxed font-normal">
                      Help keep the community safe. Report scams, suspicious users, inappropriate content, or harmful behavior so Local Farm can remain a trusted environment for everyone.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsLoginModalOpen(true);
                    scrollToHome();
                  }}
                  className="self-start pt-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-gray-400 hover:text-[#67A34E] transition-colors">
                    Learn more →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ----------------------------------------------------------------- */}
          {/* BLOG & STORIES SECTION (Exact Match to Reference Layout) */}
          {/* ----------------------------------------------------------------- */}
          <View
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setBlogSectionY(layout.y);
            }}
            className="w-full bg-white border-t border-gray-100 py-20 md:py-28 px-8 md:px-14"
          >
            {/* Section Header */}
            <View className="max-w-3xl mx-auto items-center mb-12 text-center">
              <Text className="text-xs font-bold text-[#67A34E] uppercase tracking-wider mb-2">
                BLOG & STORIES
              </Text>

              <Text className="text-3xl md:text-5xl font-black text-gray-900 text-center tracking-tight leading-tight mb-4">
                Stories, Knowledge, and Ideas{"\n"}
                From the Farm
              </Text>

              <Text className="text-xs md:text-sm text-gray-500 text-center max-w-2xl leading-relaxed">
                Explore stories and useful information from the agricultural community. Discover farming experience, community stories, technology, and ideas that can help farmers grow.
              </Text>
            </View>

            {/* Category Filter Tabs & Search Bar */}
            <View className="max-w-6xl mx-auto w-full flex-row flex-wrap items-center justify-between gap-4 mb-10">
              {/* Category Pills */}
              <View className="flex-row flex-wrap items-center gap-2.5">
                {[
                  "All Articles",
                  "Farming Tips",
                  "Sustainable Farming",
                  "Community",
                  "Technology",
                  "Stories",
                ].map((category) => {
                  const isActive = selectedBlogCategory === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setSelectedBlogCategory(category)}
                      className={`px-4 py-2 rounded-xl transition-all ${
                        isActive
                          ? "bg-[#67A34E] shadow-xs"
                          : "bg-white border border-gray-200 hover:bg-gray-50"
                      }`}
                      activeOpacity={0.8}
                    >
                      <Text
                        className={`text-xs ${
                          isActive ? "font-bold text-white" : "font-medium text-gray-700"
                        }`}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Search Bar */}
              <View className="flex-row items-center bg-white border border-gray-200 rounded-full px-4 py-2 w-full md:w-64 shadow-2xs">
                <Ionicons name="search" size={15} color="#9CA3AF" />
                <RNTextInput
                  placeholder="Search articles..."
                  placeholderTextColor="#9CA3AF"
                  value={blogSearchQuery}
                  onChangeText={setBlogSearchQuery}
                  className="flex-1 ml-2 text-xs text-gray-900 outline-none"
                />
              </View>
            </View>

            {/* Articles Grid (1 Large Featured + 4 Smaller in 2x2) */}
            <View className="max-w-6xl mx-auto w-full flex-row flex-wrap lg:flex-nowrap gap-6">
              {/* Left Column: Large Featured Article */}
              <View className="w-full lg:w-5/12 bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/40 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                <View>
                  <Image
                    source={ABOUT_FARMER}
                    className="w-full h-64"
                    style={{ width: "100%", height: 260 }}
                    resizeMode="cover"
                  />
                  <View className="p-6">
                    <Text className="text-[10px] font-bold text-[#67A34E] uppercase tracking-wider mb-2">
                      TECHNOLOGY
                    </Text>
                    <Text className="text-xl font-bold text-gray-900 mb-3 leading-snug">
                      How Technology Is Helping Local Farmers Connect
                    </Text>
                    <Text className="text-xs text-gray-500 leading-relaxed font-normal">
                      Discover how digital tools and online communities are making it easier for farmers to share knowledge, solve problems, and grow together.
                    </Text>
                  </View>
                </View>

                <View className="px-6 py-4 border-t border-gray-50 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                    <Text className="text-[11px] text-gray-400">May 8, 2026</Text>
                    <Text className="text-[11px] text-gray-300">•</Text>
                    <Text className="text-[11px] text-gray-400">4 min read</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => showToast("Article saved to your reading list!", "info")}
                    className="flex-row items-center gap-1"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-bold text-[#67A34E]">Read Article</Text>
                    <Ionicons name="arrow-forward" size={12} color="#67A34E" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right Column: 4 Smaller Articles Grid (2x2) */}
              <View className="w-full lg:w-7/12 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Right Card 1 */}
                <View className="bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/40 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                  <View>
                    <Image
                      source={ABOUT_SEEDLING}
                      className="w-full h-36"
                      style={{ width: "100%", height: 145 }}
                      resizeMode="cover"
                    />
                    <View className="p-5">
                      <Text className="text-[10px] font-bold text-[#67A34E] uppercase tracking-wider mb-1.5">
                        SUSTAINABLE FARMING
                      </Text>
                      <Text className="text-sm font-bold text-gray-900 mb-2 leading-snug">
                        5 Practical Ways to Build a More Sustainable Farm
                      </Text>
                      <Text className="text-[11px] text-gray-500 leading-relaxed font-normal">
                        Simple and effective practices that help improve your farm while protecting the environment.
                      </Text>
                    </View>
                  </View>
                  <View className="px-5 py-3 border-t border-gray-50 flex-row items-center justify-between">
                    <Text className="text-[10px] text-gray-400">May 30, 2026 • 4 min read</Text>
                    <TouchableOpacity
                      onPress={() => showToast("Article saved to your reading list!", "info")}
                      className="flex-row items-center gap-1"
                      activeOpacity={0.7}
                    >
                      <Text className="text-[11px] font-bold text-[#67A34E]">Read Article</Text>
                      <Ionicons name="arrow-forward" size={11} color="#67A34E" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right Card 2 */}
                <View className="bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/40 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                  <View>
                    <Image
                      source={ABOUT_POSTER}
                      className="w-full h-36"
                      style={{ width: "100%", height: 145 }}
                      resizeMode="cover"
                    />
                    <View className="p-5">
                      <Text className="text-[10px] font-bold text-[#67A34E] uppercase tracking-wider mb-1.5">
                        SUSTAINABLE FARMING
                      </Text>
                      <Text className="text-sm font-bold text-gray-900 mb-2 leading-snug">
                        5 Practical Ways to Build a More Sustainable Farm
                      </Text>
                      <Text className="text-[11px] text-gray-500 leading-relaxed font-normal">
                        Simple and effective practices that help improve your farm while protecting the environment.
                      </Text>
                    </View>
                  </View>
                  <View className="px-5 py-3 border-t border-gray-50 flex-row items-center justify-between">
                    <Text className="text-[10px] text-gray-400">May 30, 2026 • 4 min read</Text>
                    <TouchableOpacity
                      onPress={() => showToast("Article saved to your reading list!", "info")}
                      className="flex-row items-center gap-1"
                      activeOpacity={0.7}
                    >
                      <Text className="text-[11px] font-bold text-[#67A34E]">Read Article</Text>
                      <Ionicons name="arrow-forward" size={11} color="#67A34E" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right Card 3 */}
                <View className="bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/40 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                  <View>
                    <Image
                      source={ABOUT_COLLAGE}
                      className="w-full h-36"
                      style={{ width: "100%", height: 145 }}
                      resizeMode="cover"
                    />
                    <View className="p-5">
                      <Text className="text-[10px] font-bold text-[#67A34E] uppercase tracking-wider mb-1.5">
                        COMMUNITY
                      </Text>
                      <Text className="text-sm font-bold text-gray-900 mb-2 leading-snug">
                        The Importance of Strong Farming Communities
                      </Text>
                      <Text className="text-[11px] text-gray-500 leading-relaxed font-normal">
                        Why connecting with other farmers creates stronger, more resilient agriculture.
                      </Text>
                    </View>
                  </View>
                  <View className="px-5 py-3 border-t border-gray-50 flex-row items-center justify-between">
                    <Text className="text-[10px] text-gray-400">June 3, 2026 • 4 min read</Text>
                    <TouchableOpacity
                      onPress={() => showToast("Article saved to your reading list!", "info")}
                      className="flex-row items-center gap-1"
                      activeOpacity={0.7}
                    >
                      <Text className="text-[11px] font-bold text-[#67A34E]">Read Article</Text>
                      <Ionicons name="arrow-forward" size={11} color="#67A34E" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right Card 4 */}
                <View className="bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/40 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                  <View>
                    <Image
                      source={ABOUT_FARMER}
                      className="w-full h-36"
                      style={{ width: "100%", height: 145 }}
                      resizeMode="cover"
                    />
                    <View className="p-5">
                      <Text className="text-[10px] font-bold text-[#67A34E] uppercase tracking-wider mb-1.5">
                        SUSTAINABLE FARMING
                      </Text>
                      <Text className="text-sm font-bold text-gray-900 mb-2 leading-snug">
                        5 Practical Ways to Build a More Sustainable Farm
                      </Text>
                      <Text className="text-[11px] text-gray-500 leading-relaxed font-normal">
                        Simple and effective practices that help improve your farm while protecting the environment.
                      </Text>
                    </View>
                  </View>
                  <View className="px-5 py-3 border-t border-gray-50 flex-row items-center justify-between">
                    <Text className="text-[10px] text-gray-400">May 30, 2026 • 4 min read</Text>
                    <TouchableOpacity
                      onPress={() => showToast("Article saved to your reading list!", "info")}
                      className="flex-row items-center gap-1"
                      activeOpacity={0.7}
                    >
                      <Text className="text-[11px] font-bold text-[#67A34E]">Read Article</Text>
                      <Ionicons name="arrow-forward" size={11} color="#67A34E" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ----------------------------------------------------------------- */}
          {/* CONTACT SECTION */}
          {/* ----------------------------------------------------------------- */}
          <View
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setContactSectionY(layout.y);
            }}
            className="w-full bg-white border-t border-gray-100 py-16 md:py-24 px-8 md:px-14"
          >
            <View className="max-w-4xl mx-auto items-center mb-16 text-center">
              <View className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 rounded-full mb-4">
                <Ionicons name="mail" size={14} color="#5E9C4E" />
                <Text className="text-xs font-bold text-[#5E9C4E] uppercase tracking-wider">
                  Contact & Support
                </Text>
              </View>

              <Text className="text-4xl md:text-5xl font-black text-gray-900 text-center tracking-tight leading-tight mb-4">
                We'd Love to{"\n"}
                <Text className="text-[#72AF5B]">Hear From You</Text>
              </Text>

              <Text className="text-base text-gray-600 text-center max-w-2xl leading-relaxed">
                Have questions about the app, need technical assistance, or looking to partner with our local farmer network? Reach out below.
              </Text>
            </View>

            <View className="max-w-6xl mx-auto w-full flex-row flex-wrap lg:flex-nowrap gap-12">
              {/* Left Column: Contact Cards */}
              <View className="w-full lg:w-5/12">
                <View className="bg-[#FAFDF7] p-6 rounded-3xl border border-gray-100 flex-row items-center gap-4 mb-4">
                  <View className="w-12 h-12 rounded-2xl bg-green-100 items-center justify-center shrink-0">
                    <Ionicons name="mail-outline" size={24} color="#72AF5B" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Email Address
                    </Text>
                    <Text className="text-base font-bold text-gray-900">
                      support@localfarm.app
                    </Text>
                  </View>
                </View>

                <View className="bg-[#FAFDF7] p-6 rounded-3xl border border-gray-100 flex-row items-center gap-4 mb-4">
                  <View className="w-12 h-12 rounded-2xl bg-green-100 items-center justify-center shrink-0">
                    <Ionicons name="call-outline" size={24} color="#72AF5B" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Phone Number
                    </Text>
                    <Text className="text-base font-bold text-gray-900">
                      +63 (2) 8800-FARM
                    </Text>
                  </View>
                </View>

                <View className="bg-[#FAFDF7] p-6 rounded-3xl border border-gray-100 flex-row items-center gap-4 mb-4">
                  <View className="w-12 h-12 rounded-2xl bg-green-100 items-center justify-center shrink-0">
                    <Ionicons name="location-outline" size={24} color="#72AF5B" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Location
                    </Text>
                    <Text className="text-base font-bold text-gray-900">
                      AgriTech Innovation Center, PH
                    </Text>
                  </View>
                </View>

                <View className="bg-[#FAFDF7] p-6 rounded-3xl border border-gray-100 flex-row items-center gap-4">
                  <View className="w-12 h-12 rounded-2xl bg-green-100 items-center justify-center shrink-0">
                    <Ionicons name="time-outline" size={24} color="#72AF5B" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Support Hours
                    </Text>
                    <Text className="text-base font-bold text-gray-900">
                      Monday – Saturday, 8AM – 6PM
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right Column: Contact Form */}
              <View className="w-full lg:w-7/12 bg-[#FAFDF7] p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm">
                <Text className="text-2xl font-black text-gray-900 mb-2">
                  Send Us a Message
                </Text>
                <Text className="text-xs text-gray-500 mb-6 font-medium">
                  We typically respond to inquiries within 24 business hours.
                </Text>

                <View className="flex-row flex-wrap md:flex-nowrap gap-4 mb-4">
                  <View className="flex-1 min-w-[200px]">
                    <Text className="text-xs font-bold text-gray-700 mb-1.5">
                      Your Name
                    </Text>
                    <RNTextInput
                      placeholder="e.g. Juan Cruz"
                      placeholderTextColor="#9CA3AF"
                      value={contactName}
                      onChangeText={setContactName}
                      className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-sm text-gray-900"
                    />
                  </View>

                  <View className="flex-1 min-w-[200px]">
                    <Text className="text-xs font-bold text-gray-700 mb-1.5">
                      Your Email
                    </Text>
                    <RNTextInput
                      placeholder="e.g. juan@example.com"
                      placeholderTextColor="#9CA3AF"
                      value={contactEmail}
                      onChangeText={setContactEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-sm text-gray-900"
                    />
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">
                    Subject (Optional)
                  </Text>
                  <RNTextInput
                    placeholder="e.g. Partnership inquiry / App support"
                    placeholderTextColor="#9CA3AF"
                    value={contactSubject}
                    onChangeText={setContactSubject}
                    className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-sm text-gray-900"
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">
                    Message
                  </Text>
                  <RNTextInput
                    placeholder="Write your message here..."
                    placeholderTextColor="#9CA3AF"
                    value={contactMessage}
                    onChangeText={setContactMessage}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="w-full h-28 bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-900"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSendContact}
                  disabled={isSendingContact}
                  className="w-full bg-[#72AF5B] h-12 rounded-xl flex-row items-center justify-center gap-2 shadow-md shadow-[#72AF5B]/25 active:bg-[#5E9C4E] hover:bg-[#5E9C4E] transition-all"
                  activeOpacity={0.9}
                >
                  {isSendingContact ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text className="text-white font-bold text-sm">
                        Send Message
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Desktop Landing Footer */}
          <footer className="w-full border-t border-gray-100 bg-white py-8 px-8 md:px-14">
            <View className="max-w-6xl mx-auto w-full flex-row justify-between items-center">
              <TouchableOpacity onPress={scrollToHome} className="flex-row items-center gap-3">
                <Image
                  source={LOCAL_FARMERS_LOGO}
                  className="h-8 w-36"
                  style={{ width: 140, height: 32 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <Text className="text-xs text-gray-500">
                © 2026 Local Farm App. All rights reserved.
              </Text>

              <View className="flex-row items-center gap-6">
                <TouchableOpacity onPress={scrollToHome}>
                  <Text className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                    Home
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={scrollToAbout}>
                  <Text className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                    About
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={scrollToFeatures}>
                  <Text className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                    Features
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={scrollToBlog}>
                  <Text className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                    Blog
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={scrollToContact}>
                  <Text className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                    Contact
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/auth/Signup" as any)}>
                  <Text className="text-xs font-semibold text-[#72AF5B] hover:text-[#5E9C4E]">
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </footer>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. MOBILE VIEW (User Role Login)
  // ---------------------------------------------------------------------------
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
        {/* Centered Form Wrapper */}
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
              {"Don't have an account? "}
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


