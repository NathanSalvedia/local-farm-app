import { useRouter } from "expo-router";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUserApi();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    // Check stored JWT session on app boot
    getCurrentUserApi()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginApi(email, password);
      setUser(response.user);
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
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (data: Partial<User> & { fullName?: string }) => {
    const res = await updateProfileApi(data);
    setUser(res.user);
    return res.user;
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
      setUser(null);
      router.replace("/auth/Login" as any);
    } catch (err) {
      console.error("Logout error", err);
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


