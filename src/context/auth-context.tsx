import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  User,
  SignUpParams,
  loginApi,
  signUpApi,
  logoutApi,
  getCurrentUserApi,
  updateProfileApi,
} from "@/services/auth-service";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams | string, email?: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<User> & { fullName?: string }) => Promise<User>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateUser: async () => ({ id: "", name: "", email: "", role: "user" }),
  refreshUser: async () => {},
});

// Module-scoped session cache: survives Fast Refresh and hot reload cycles in memory
let inMemoryUser: User | null = null;
let inMemoryAuthInitialized = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(inMemoryUser);
  const [isLoading, setIsLoadingState] = useState<boolean>(!inMemoryAuthInitialized);

  const setUser = (newUser: User | null | ((prev: User | null) => User | null)) => {
    setUserState((prev) => {
      const resolved = typeof newUser === "function" ? newUser(prev) : newUser;
      inMemoryUser = resolved;
      return resolved;
    });
  };

  const setIsLoading = (loading: boolean) => {
    inMemoryAuthInitialized = !loading;
    setIsLoadingState(loading);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUserApi();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check cached user first for instant UI
    AsyncStorage.getItem("localfarm_cached_user")
      .then((cached) => {
        if (isMounted && cached) {
          try {
            const parsed = JSON.parse(cached);
            setUser((prev) => prev || parsed);
          } catch {}
        }
      })
      .catch(() => {});

    // Check stored JWT session on app boot
    getCurrentUserApi()
      .then((currentUser) => {
        if (isMounted && currentUser) {
          setUser((prev) => ({ ...(prev || {}), ...currentUser }));
          AsyncStorage.setItem(
            "localfarm_cached_user",
            JSON.stringify(currentUser),
          ).catch(() => {});
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginApi(email, password);
      setUser(response.user);
      await AsyncStorage.setItem(
        "localfarm_cached_user",
        JSON.stringify(response.user),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    params: SignUpParams | string,
    email?: string,
    password?: string,
  ) => {
    setIsLoading(true);
    try {
      const response = await signUpApi(params, email, password);
      setUser(response.user);
      await AsyncStorage.setItem(
        "localfarm_cached_user",
        JSON.stringify(response.user),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (data: Partial<User> & { fullName?: string }) => {
    try {
      const res = await updateProfileApi(data);
      const mergedUser = { ...res.user, ...data };
      setUser(mergedUser);
      await AsyncStorage.setItem(
        "localfarm_cached_user",
        JSON.stringify(mergedUser),
      );
      return mergedUser;
    } catch {
      // Fallback: update local state if backend call fails or runs offline
      let updatedUser: User | null = null;
      setUser((prev) => {
        if (!prev) return null;
        updatedUser = {
          ...prev,
          ...data,
          name: data.fullName || data.name || prev.name,
          fullName: data.fullName || data.name || prev.fullName,
          about: data.about !== undefined ? data.about : prev.about,
          bio:
            data.bio !== undefined
              ? data.bio
              : data.about !== undefined
                ? data.about
                : prev.bio,
        };
        return updatedUser;
      });
      if (updatedUser) {
        await AsyncStorage.setItem(
          "localfarm_cached_user",
          JSON.stringify(updatedUser),
        );
        return updatedUser;
      }
      return { ...data } as any;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
      await AsyncStorage.removeItem("localfarm_cached_user");
      setUser(null);
      router.replace("/auth/Login" as any);
    } catch (err) {
      console.error("Logout error", err);
      await AsyncStorage.removeItem("localfarm_cached_user");
      setUser(null);
      router.replace("/auth/Login" as any);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


