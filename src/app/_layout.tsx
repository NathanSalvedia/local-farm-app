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
import { useColorScheme } from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { LoadingScreen } from "../components/LoadingScreen";
import { AnimatedSplashOverlay } from "../components/SplashScreen";
import { AuthProvider } from "@/context/auth-context";
import { useAuth } from "@/hooks/use-auth";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const { user, isLoading } = useAuth();
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
    // 3. Navigation handling after splash/loading phase
    if (appPhase !== "ready") return;

    const firstSegment = (segments[0] as string) || "";
    const inAuthGroup = firstSegment === "auth";

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

  // Phase 2: White Loading Screen with animated running green border
  if (appPhase === "loading" || isLoading) {
    return <LoadingScreen />;
  }

  // Phase 3: Ready -> Render App Navigation (Directly renders whichever route is visited)
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
