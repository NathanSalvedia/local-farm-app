import { useAuth } from "@/hooks/use-auth";
import { Slot, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

/**
 * User Route Group Middleware (_layout.tsx)
 * Ensures only authenticated users can access any screen inside /user/*
 */
export default function UserLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/Login" as any);
    }
  }, [user, isLoading, router]);

  // If not logged in, block rendering protected user screens
  if (!user && !isLoading) {
    return <View className="flex-1 bg-white" />;
  }

  return <Slot />;
}
