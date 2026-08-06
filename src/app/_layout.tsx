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

import { LoadingScreen } from "@/components/loading-screen";
import { AnimatedSplashOverlay } from "@/components/splash-screen";
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
    // 3. Once ready, perform route guard check & navigation based on user role
    if (appPhase !== "ready") return;

    const firstSegment = (segments[0] as string) || "";
    const inAuthGroup = firstSegment === "(auth)";
    const inAdminGroup = firstSegment === "(admin)";

    if (!user && !inAuthGroup) {
      // Unauthenticated -> navigate to login page
      router.replace("/(auth)/login" as any);
    } else if (user) {
      if (inAuthGroup) {
        // Authenticated -> Redirect to role-specific dashboard
        if (user.role === "admin") {
          router.replace("/(admin)" as any);
        } else {
          router.replace("/(user)" as any);
        }
      } else if (user.role !== "admin" && inAdminGroup) {
        // Guard: Prevent regular user from entering admin route
        router.replace("/(user)" as any);
      }
    }
  }, [appPhase, user, segments]);

  // Phase 1: Green Splash Screen
  if (appPhase === "splash") {
    return <AnimatedSplashOverlay />;
  }

  // Phase 2: White Loading Screen with "Loading..." text & green logo
  if (appPhase === "loading" || isLoading) {
    return <LoadingScreen />;
  }

  // Phase 3: Ready -> Render App Navigation
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
