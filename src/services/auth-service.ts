import {
  apiFetch,
  setAuthToken,
  removeAuthToken,
  getAuthToken,
} from "@/lib/api";

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  username?: string;
  phoneNumber?: string;
  gender?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
}

export interface SignUpParams {
  name: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  gender?: string;
  role?: UserRole;
}

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  if (response.token) {
    await setAuthToken(response.token);
  }

  return response;
}

export async function signUpApi(
  params: SignUpParams | string,
  email?: string,
  password?: string,
): Promise<AuthResponse> {
  let payload: Record<string, any> = {};

  if (typeof params === "object") {
    payload = {
      name: params.name,
      email: params.email.trim(),
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      username: params.username,
      phoneNumber: params.phoneNumber,
      gender: params.gender,
      role: params.role || (params.email.toLowerCase().includes("admin") ? "admin" : "user"),
    };
  } else {
    payload = {
      name: params,
      email: (email || "").trim(),
      password: password || "",
      role: (email || "").toLowerCase().includes("admin") ? "admin" : "user",
    };
  }

  const response = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response.token) {
    await setAuthToken(response.token);
  }

  return response;
}

export async function getCurrentUserApi(): Promise<User | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await apiFetch<{ user: User }>("/auth/me", {
      method: "GET",
    });
    return response.user;
  } catch {
    await removeAuthToken();
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  await removeAuthToken();
}

export async function resetPasswordForEmailApi(email: string): Promise<void> {
  await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function verifyOtpApi(
  email: string,
  otp: string,
): Promise<void> {
  await apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  });
}

export async function resetPasswordApi(
  email: string,
  password: string,
): Promise<void> {
  await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function updateProfileApi(
  data: Partial<User> & { fullName?: string },
): Promise<{ message: string; user: User }> {
  return await apiFetch<{ message: string; user: User }>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}


