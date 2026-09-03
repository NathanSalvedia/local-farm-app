import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Change this IP if testing on a physical mobile device over local Wi-Fi
// (e.g. "http://192.168.1.5:5000/api")
const DEFAULT_HOST = Platform.select({
  web: "http://localhost:5000/api",
  android: "http://10.0.2.2:5000/api", // Android emulator maps 10.0.2.2 to host machine localhost
  ios: "http://localhost:5000/api",
  default: "http://localhost:5000/api",
});

export const TOKEN_STORAGE_KEY = "localfarm_auth_token";
export const API_URL_STORAGE_KEY = "localfarm_api_url";

let currentBaseUrl = DEFAULT_HOST;

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export function setApiBaseUrl(url: string) {
  currentBaseUrl = url.endsWith("/api") ? url : `${url}/api`;
}

// Token helper methods
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error("Failed to save auth token", err);
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to remove auth token", err);
  }
}

// Universal API Fetcher
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const url = `${currentBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      `Server request failed (${response.status}: ${response.statusText})`;
    throw new Error(errorMsg);
  }

  return data as T;
}
