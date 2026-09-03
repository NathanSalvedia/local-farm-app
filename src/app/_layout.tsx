import "../global.css";
import {
  DarkTheme,
  DefaultTheme,
  Slot,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { LoadingScreen } from "../components/LoadingScreen";
import { AnimatedSplashOverlay } from "../components/SplashScreen";
import { AuthProvider } from "@/context/auth-context";
import { useAuth } from "@/hooks/use-auth";

SplashScreen.preventAutoHideAsync().catch(() => {});

import { useToast } from "@/context/toast-context";

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Startup phase states: 'splash' -> 'loading' -> 'ready'
  const [appPhase, setAppPhase] = useState<"splash" | "loading" | "ready">(
    "splash",
  );

  useEffect(() => {
    // 1. Hide native splash and stay on custom Splash Screen for 1.2s
    const splashTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setAppPhase("loading");
    }, 1200);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    // 2. Stay on Loading Screen until minimum 2.4s total time & auth session check finishes
    if (appPhase === "loading" && !isLoading) {
      const loadingTimer = setTimeout(() => {
        setAppPhase("ready");
      }, 1200);

      return () => clearTimeout(loadingTimer);
    }
  }, [appPhase, isLoading]);

  useEffect(() => {
    // 3. Security guards after splash/loading phase
    if (appPhase !== "ready") return;

    const firstSegment = (segments[0] as string) || "";
    const inAuthGroup = firstSegment === "auth";
    const inAdminGroup = firstSegment === "admin";

    // A. Unauthenticated user trying to access ANY protected route
    if (!user && !inAuthGroup) {
      router.replace("/auth/Login" as any);
      return;
    }

    // B. Regular user trying to access admin restricted route
    if (user && user.role !== "admin" && inAdminGroup) {
      showToast("Access Restricted: Admin privileges required.", "error");
      router.replace("/user/NewsFeed" as any);
      return;
    }

    // C. Authenticated user visiting auth pages (Login/Signup/ForgotPassword)
    if (user && inAuthGroup) {
      if (user.role === "admin") {
        router.replace("/admin" as any);
      } else {
        router.replace("/user/NewsFeed" as any);
      }
    }
  }, [appPhase, user, segments]);

  // Phase 1: Green Splash Screen
  if (appPhase === "splash") {
    return <AnimatedSplashOverlay />;
  }

  // Phase 2: White Loading Screen with animated running green border (Startup only)
  if (appPhase === "loading") {
    return <LoadingScreen />;
  }

  // Phase 3: Route Security Guard (Prevent rendering protected content before redirect)
  const firstSegment = (segments[0] as string) || "";
  const inAuthGroup = firstSegment === "auth";
  const inAdminGroup = firstSegment === "admin";

  if (!user && !inAuthGroup) {
    return null;
  }

  if (user && user.role !== "admin" && inAdminGroup) {
    return null;
  }

  // Render App Navigation
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}

import { ToastProvider } from "@/context/toast-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
