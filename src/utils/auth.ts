import { UserProfile } from "../types";

const TOKEN_KEY = "animix_auth_token_v1";
const USER_KEY = "animix_auth_user_v1";

export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function isAdultFromDob(dobString: string): boolean {
  return calculateAge(dobString) >= 18;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user: UserProfile = JSON.parse(raw);
    if (user && user.dateOfBirth) {
      const currentAge = calculateAge(user.dateOfBirth);
      user.age = currentAge;
      user.isAdultVerified = currentAge >= 18;
    }
    return user;
  } catch {
    return null;
  }
}

export function saveAuthData(token: string, user: UserProfile) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    const currentAge = calculateAge(user.dateOfBirth);
    const updatedUser: UserProfile = {
      ...user,
      age: currentAge,
      isAdultVerified: currentAge >= 18
    };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  } catch (e) {
    console.error("Failed to save auth data", e);
  }
}

export function clearAuthData() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error("Failed to clear auth data", e);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  return fetch(url, {
    ...options,
    headers
  });
}
