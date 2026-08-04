import { supabaseAnonClient, supabaseAdminClient } from "./supabaseServer.js";

export interface ServerUser {
  id: string;
  username: string;
  email: string;
  dateOfBirth: string; // YYYY-MM-DD
  createdAt: string;
  avatarUrl?: string;
  bio?: string;
  nicknameEffect?: string;
  backgroundBanner?: string;
}

export function mapDbUserToUser(row: any): ServerUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
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
    const { data, error } = await supabaseAdminClient
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by id:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err: any) {
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
    try {
      const { data, error } = await supabaseAdminClient
        .from("users")
        .upsert({
          ...insertPayload,
          created_at: now,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[UserService] Error upserting user profile:", error.message);
        throw new Error(error.message);
      }
      return mapDbUserToUser(data);
    } catch (err: any) {
      console.error("[UserService] Exception in ensureUserProfile:", err);
      throw err;
    }
  }

  return user;
}

export async function signUpWithSupabase(userData: {
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
}): Promise<{ token: string; user: ServerUser }> {
  console.log("[REGISTER TRACE 3] Entering signUpWithSupabase()");
  const cleanUsername = userData.username.trim();
  const cleanEmail = userData.email.trim().toLowerCase();
  console.log("[REGISTER TRACE 4] Email and Username:", { email: cleanEmail, username: cleanUsername });

  console.log("[REGISTER TRACE 5] Before calling supabase.auth.signUp()");

  // Diagnostic logging
  const urlVal = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://xrotiwzgtcwqjjpgzznh.supabase.co";
  const anonKeyVal = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_HYLIoV70dTcXlYGgT0mvgg_2zI1-IS4";
  const serviceKeyVal = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

  console.log("=== DIAGNOSTIC LOGS ===");
  console.log("SUPABASE_URL:", urlVal);
  console.log("SUPABASE_ANON_KEY length:", anonKeyVal.length);
  console.log("SUPABASE_SERVICE_ROLE_KEY length:", serviceKeyVal.length);
  console.log("typeof global.fetch:", typeof global.fetch);
  console.log("Node.js version:", process.version);
  console.log("process.env.VERCEL:", process.env.VERCEL);
  console.log("process.env.NODE_ENV:", process.env.NODE_ENV);

  try {
    console.log("=== RAW FETCH DIAGNOSTIC START ===");
    const rawRes = await global.fetch("https://xrotiwzgtcwqjjpgzznh.supabase.co/auth/v1/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKeyVal,
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: userData.password,
        data: {
          username: cleanUsername,
          date_of_birth: userData.dateOfBirth,
        },
      }),
    });

    const rawText = await rawRes.text();
    const headersObj: Record<string, string> = {};
    rawRes.headers.forEach((v, k) => {
      headersObj[k] = v;
    });

    console.log("RAW FETCH Status:", rawRes.status);
    console.log("RAW FETCH Headers:", JSON.stringify(headersObj, null, 2));
    console.log("RAW FETCH Body:", rawText);
    console.log("=== RAW FETCH DIAGNOSTIC END ===");
  } catch (rawErr: any) {
    console.error("RAW FETCH DIAGNOSTIC ERROR:", rawErr);
  }

  let signUpRes: any;
  try {
    signUpRes = await supabaseAnonClient.auth.signUp({
      email: cleanEmail,
      password: userData.password,
      options: {
        data: {
          username: cleanUsername,
          date_of_birth: userData.dateOfBirth,
        },
      },
    });
    console.log("[REGISTER TRACE 6] Complete response from supabase.auth.signUp():", {
      data: signUpRes?.data,
      error: signUpRes?.error,
    });
  } catch (signUpException: any) {
    console.error("[REGISTER TRACE 7] Exception thrown during supabase.auth.signUp():", {
      message: signUpException?.message || String(signUpException),
      code: signUpException?.code || signUpException?.status || null,
      status: signUpException?.status || 500,
      fullError: signUpException,
      stack: signUpException?.stack,
    });
    throw signUpException;
  }

  if (signUpRes?.error) {
    console.error("RAW SUPABASE ERROR:", JSON.stringify(signUpRes.error, null, 2));
    console.error("RAW ERROR OBJECT:", signUpRes.error);
    throw signUpRes.error;
  }

  if (!signUpRes?.data?.user) {
    const msg = "Не удалось зарегистрировать пользователя в Supabase Auth (user object empty)";
    const err: any = new Error(msg);
    err.status = 400;
    console.error("[REGISTER TRACE 7] No user returned from Supabase Auth:", {
      message: msg,
      code: null,
      status: 400,
      fullError: err,
      stack: err.stack,
    });
    throw err;
  }

  const authUser = signUpRes.data.user;
  const session = signUpRes.data.session;

  if (!session || !session.access_token) {
    const msg = "Регистрация успешна! Пожалуйста, подтвердите ваш email для входа.";
    const err: any = new Error(msg);
    err.status = 400;
    err.code = "EMAIL_CONFIRMATION_REQUIRED";
    console.error("[REGISTER TRACE 7] No session access_token (email confirmation required):", {
      message: msg,
      code: err.code,
      status: 400,
      fullError: err,
      stack: err.stack,
    });
    throw err;
  }

  const token = session.access_token;

  let user: ServerUser;
  try {
    user = await ensureUserProfile(
      authUser.id,
      cleanEmail,
      cleanUsername,
      userData.dateOfBirth
    );
  } catch (profileErr: any) {
    console.error("[REGISTER TRACE 7] Exception in ensureUserProfile:", {
      message: profileErr?.message || String(profileErr),
      code: profileErr?.code || null,
      status: profileErr?.status || 500,
      fullError: profileErr,
      stack: profileErr?.stack,
    });
    throw profileErr;
  }

  return {
    token,
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

  const { data: authData, error: authError } = await supabaseAnonClient.auth.signInWithPassword({
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
    const { data: { user: authUser }, error } = await supabaseAdminClient.auth.getUser(token);

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

    return null;
  } catch (err) {
    console.error("[UserService] Exception in getUserByAuthToken:", err);
    return null;
  }
}

export async function signOutWithSupabase(token: string): Promise<void> {
  if (!token) return;
  try {
    await supabaseAnonClient.auth.signOut().catch(() => {});
    await supabaseAdminClient.auth.admin?.signOut?.(token).catch(() => {});
  } catch (err) {
    console.error("[UserService] Exception in signOutWithSupabase:", err);
  }
}

export async function findUserByUsername(username: string): Promise<ServerUser | null> {
  const clean = username.trim().toLowerCase();
  try {
    const { data, error } = await supabaseAdminClient
      .from("users")
      .select("*")
      .ilike("username", clean)
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by username:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err: any) {
    console.error("[UserService] Exception in findUserByUsername:", err);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<ServerUser | null> {
  const clean = email.trim().toLowerCase();
  try {
    const { data, error } = await supabaseAdminClient
      .from("users")
      .select("*")
      .ilike("email", clean)
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by email:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err: any) {
    console.error("[UserService] Exception in findUserByEmail:", err);
    return null;
  }
}

export async function findUserByLogin(login: string): Promise<ServerUser | null> {
  const clean = login.trim().toLowerCase();
  try {
    const { data, error } = await supabaseAdminClient
      .from("users")
      .select("*")
      .or(`username.ilike.${clean},email.ilike.${clean}`)
      .maybeSingle();

    if (error) {
      console.error("[UserService] Error finding user by login:", error.message);
      return null;
    }
    return data ? mapDbUserToUser(data) : null;
  } catch (err: any) {
    console.error("[UserService] Exception in findUserByLogin:", err);
    return null;
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
    const { data, error } = await supabaseAdminClient
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
  } catch (err: any) {
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

export async function getUserStats(userId: string): Promise<{
  favoriteCount: number;
  watchlistCount: number;
  commentCount: number;
  ratingCount: number;
}> {
  try {
    const [favs, watch, comms, rats] = await Promise.all([
      supabaseAdminClient.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdminClient.from("watchlist_items").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdminClient.from("comments").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdminClient.from("ratings").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    return {
      favoriteCount: favs.count || 0,
      watchlistCount: watch.count || 0,
      commentCount: comms.count || 0,
      ratingCount: rats.count || 0,
    };
  } catch (err: any) {
    console.error("[UserService] Exception in getUserStats:", err);
    return {
      favoriteCount: 0,
      watchlistCount: 0,
      commentCount: 0,
      ratingCount: 0,
    };
  }
}
