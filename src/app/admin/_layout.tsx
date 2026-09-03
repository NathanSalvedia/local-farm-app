import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import { Slot, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

/**
 * Admin Route Group Middleware (_layout.tsx)
 * Ensures only authenticated administrators can access any screen inside /admin/*
 */
export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/auth/Login" as any);
      } else if (user.role !== "admin") {
        showToast("Access Restricted: Admin privileges required.", "error");
        router.replace("/user/NewsFeed" as any);
      }
    }
  }, [user, isLoading, router, showToast]);

  // Block rendering admin screens for unauthenticated or non-admin users
  if (!user || user.role !== "admin") {
    return <View className="flex-1 bg-white" />;
  }

  return <Slot />;
}
