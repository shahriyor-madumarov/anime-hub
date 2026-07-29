import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabaseServer } from "./supabaseServer";

export interface ServerUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  dateOfBirth: string; // YYYY-MM-DD
  createdAt: string;
  avatarUrl?: string;
  bio?: string;
  nicknameEffect?: string;
  backgroundBanner?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  plainTextPassword: string,
  storedHash: string
): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!storedHash) return { isValid: false, needsRehash: false };

  const isBcryptHash =
    storedHash.startsWith("$2a$") ||
    storedHash.startsWith("$2b$") ||
    storedHash.startsWith("$2y$");

  if (isBcryptHash) {
    const isValid = await bcrypt.compare(plainTextPassword, storedHash);
    return { isValid, needsRehash: false };
  } else {
    // Legacy plaintext password check
    const isValid = plainTextPassword === storedHash;
    return { isValid, needsRehash: isValid };
  }
}

export async function updateUserPasswordHash(userId: string, newHash: string): Promise<boolean> {
  try {
    const { error } = await supabaseServer
      .from("users")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[UserService] Error updating user password hash:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[UserService] Exception in updateUserPasswordHash:", err);
    return false;
  }
}

export function mapDbUserToUser(row: any): ServerUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash || "",
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split("T")[0] : "",
    createdAt: row.created_at || new Date().toISOString(),
    avatarUrl: row.avatar_url || "",
    bio: row.bio || "",
    nicknameEffect: row.nickname_effect || "none",
    backgroundBanner: row.background_banner || "",
  };
}

export async function findUserById(id: string): Promise<ServerUser | null> {
  try {
    const { data, error } = await supabaseServer
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by id:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err) {
    console.error("[UserService] Exception in findUserById:", err);
    return null;
  }
}

export async function ensureUserProfile(
  authUserId: string,
  email: string,
  username: string,
  dateOfBirth?: string
): Promise<ServerUser> {
  let user = await findUserById(authUserId);
  if (!user) {
    user = await findUserByEmail(email);
  }

  const now = new Date().toISOString();
  const cleanUsername = username ? username.trim() : email.split("@")[0];
  const cleanEmail = email.trim().toLowerCase();

  const insertPayload = {
    id: authUserId,
    username: cleanUsername,
    email: cleanEmail,
    date_of_birth: dateOfBirth || "2000-01-01",
    updated_at: now,
  };

  if (!user) {
    const { data, error } = await supabaseServer
      .from("users")
      .upsert({
        ...insertPayload,
        created_at: now,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[UserService] Error upserting user profile:", error.message);
      return {
        id: authUserId,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash: "",
        dateOfBirth: insertPayload.date_of_birth,
        createdAt: now,
      };
    }
    return mapDbUserToUser(data);
  }

  return user;
}

export async function signUpWithSupabase(userData: {
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
}): Promise<{ token: string; user: ServerUser }> {
  const cleanUsername = userData.username.trim();
  const cleanEmail = userData.email.trim().toLowerCase();

  const signUpRes: any = await supabaseServer.auth.signUp({
    email: cleanEmail,
    password: userData.password,
    options: {
      data: {
        username: cleanUsername,
        date_of_birth: userData.dateOfBirth,
      },
    },
  });

  if (signUpRes?.error) {
    const msg = typeof signUpRes.error === "string"
      ? signUpRes.error
      : (signUpRes.error.message || "Ошибка при регистрации в Supabase Auth");
    console.error("[UserService] Supabase signUp error:", msg);
    throw new Error(msg);
  }

  if (!signUpRes?.data?.user) {
    throw new Error("Не удалось зарегистрировать пользователя");
  }

  const authUser = signUpRes.data.user;

  let token = signUpRes.data.session?.access_token;
  if (!token) {
    const { data: signInData, error: signInError } = await supabaseServer.auth.signInWithPassword({
      email: cleanEmail,
      password: userData.password,
    });
    if (!signInError && signInData?.session) {
      token = signInData.session.access_token;
    }
  }

  const user = await ensureUserProfile(
    authUser.id,
    cleanEmail,
    cleanUsername,
    userData.dateOfBirth
  );

  return {
    token: token || `token_${authUser.id}`,
    user,
  };
}

export async function signInWithSupabase(loginData: {
  login: string;
  password: string;
}): Promise<{ token: string; user: ServerUser }> {
  const cleanLogin = loginData.login.trim();
  let email = cleanLogin.toLowerCase();

  const existingUser = await findUserByLogin(cleanLogin);
  if (existingUser && existingUser.email) {
    email = existingUser.email;
  }

  console.log(`[UserService] Attempting Supabase signInWithPassword for resolved email: "${email}"`);

  const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
    email,
    password: loginData.password,
  });

  if (authError) {
    console.error("[UserService] Complete Supabase authError object:", authError);
    console.error("[UserService] Supabase signInWithPassword error details:", JSON.stringify(authError, null, 2));
    throw new Error(authError.message);
  }

  if (!authData.session || !authData.user) {
    console.error("[UserService] Supabase signInWithPassword returned no session or user");
    throw new Error("Не удалось получить сессию Supabase Auth");
  }

  const token = authData.session.access_token;

  let user = await findUserById(authData.user.id);
  if (!user) {
    user = await ensureUserProfile(
      authData.user.id,
      authData.user.email || email,
      cleanLogin.includes("@") ? authData.user.email?.split("@")[0] || cleanLogin : cleanLogin
    );
  }

  return {
    token,
    user,
  };
}

export async function getUserByAuthToken(token: string): Promise<ServerUser | null> {
  if (!token) return null;

  try {
    const { data: { user: authUser }, error } = await supabaseServer.auth.getUser(token);

    if (!error && authUser) {
      let user = await findUserById(authUser.id);
      if (!user && authUser.email) {
        user = await findUserByEmail(authUser.email);
      }
      if (!user && authUser.email) {
        user = await ensureUserProfile(
          authUser.id,
          authUser.email,
          authUser.user_metadata?.username || authUser.email.split("@")[0]
        );
      }
      return user;
    }

    // Support token format during transition
    if (token.startsWith("token_")) {
      const parts = token.split("_");
      if (parts[1]) {
        const user = await findUserById(parts[1]);
        if (user) return user;
      }
    }

    return null;
  } catch (err) {
    console.error("[UserService] Exception in getUserByAuthToken:", err);
    return null;
  }
}

export async function signOutWithSupabase(token: string): Promise<void> {
  if (!token) return;
  try {
    await supabaseServer.auth.admin?.signOut?.(token).catch(() => {});
  } catch (err) {
    console.error("[UserService] Exception in signOutWithSupabase:", err);
  }
}

export async function findUserByUsername(username: string): Promise<ServerUser | null> {
  try {
    const { data, error } = await supabaseServer
      .from("users")
      .select("*")
      .ilike("username", username.trim())
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by username:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err) {
    console.error("[UserService] Exception in findUserByUsername:", err);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<ServerUser | null> {
  try {
    const { data, error } = await supabaseServer
      .from("users")
      .select("*")
      .ilike("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by email:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err) {
    console.error("[UserService] Exception in findUserByEmail:", err);
    return null;
  }
}

export async function findUserByLogin(login: string): Promise<ServerUser | null> {
  const clean = login.trim().toLowerCase();
  try {
    const { data, error } = await supabaseServer
      .from("users")
      .select("*")
      .or(`username.ilike.${clean},email.ilike.${clean}`)
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by login:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err) {
    console.error("[UserService] Exception in findUserByLogin:", err);
    return null;
  }
}

export async function createUser(userData: {
  username: string;
  email: string;
  passwordHash: string;
  dateOfBirth: string;
}): Promise<ServerUser> {
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();

  const insertPayload = {
    id: newId,
    username: userData.username.trim(),
    email: userData.email.trim().toLowerCase(),
    password_hash: userData.passwordHash,
    date_of_birth: userData.dateOfBirth,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabaseServer
      .from("users")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("[UserService] Error inserting new user to Supabase:", error.message);
      throw new Error(`DB Error: ${error.message}`);
    }

    return mapDbUserToUser(data);
  } catch (err) {
    console.error("[UserService] Exception in createUser:", err);
    return {
      id: newId,
      username: userData.username.trim(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash,
      dateOfBirth: userData.dateOfBirth,
      createdAt: now,
    };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string;
    email?: string;
    avatarUrl?: string;
    bio?: string;
    nicknameEffect?: string;
    backgroundBanner?: string;
  }
): Promise<ServerUser | null> {
  const dbUpdates: any = {};
  if (updates.email !== undefined) dbUpdates.email = updates.email.trim().toLowerCase();
  if (updates.username !== undefined) dbUpdates.username = updates.username.trim();
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio.slice(0, 300);
  if (updates.nicknameEffect !== undefined) dbUpdates.nickname_effect = updates.nicknameEffect;
  if (updates.backgroundBanner !== undefined) dbUpdates.background_banner = updates.backgroundBanner;

  dbUpdates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabaseServer
      .from("users")
      .update(dbUpdates)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      console.error("[UserService] Error updating user profile:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err) {
    console.error("[UserService] Exception in updateUserProfile:", err);
    return null;
  }
}

export async function createSession(userId: string, token: string): Promise<void> {
  // Deprecated legacy session table stub for compatibility
}

export async function getUserBySessionToken(token: string): Promise<ServerUser | null> {
  return getUserByAuthToken(token);
}

export async function deleteSession(token: string): Promise<void> {
  return signOutWithSupabase(token);
}
