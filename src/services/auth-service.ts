export type UserRole = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  // Simulate network request latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (email.toLowerCase() === "error@example.com") {
    throw new Error("Invalid email or password.");
  }

  // Detect admin role if email contains 'admin'
  const isAdmin = email.toLowerCase().includes("admin");

  return {
    user: {
      id: "usr_" + Date.now(),
      name: isAdmin
        ? "Admin User"
        : email.split("@")[0] || "Farmer User",
      email: email,
      role: isAdmin ? "admin" : "user",
    },
    token: "mock-jwt-token-" + Date.now(),
  };
}

export async function signUpApi(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  // Simulate network request latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (email.toLowerCase() === "existing@example.com") {
    throw new Error("An account with this email already exists.");
  }

  const isAdmin = email.toLowerCase().includes("admin");

  return {
    user: {
      id: "usr_" + Date.now(),
      name: name.trim() || "New User",
      email: email,
      role: isAdmin ? "admin" : "user",
    },
    token: "mock-jwt-token-" + Date.now(),
  };
}

export async function logoutApi(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
}
