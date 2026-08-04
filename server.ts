import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import {
  ServerUser,
  findUserByUsername,
  findUserByEmail,
  updateUserProfile,
  signUpWithSupabase,
  signInWithSupabase,
  getUserByAuthToken,
  signOutWithSupabase,
  getUserStats,
} from "./src/db/userService";
import {
  getUserWatchlist,
  saveWatchlistItem,
  deleteWatchlistItem,
  syncWatchlist
} from "./src/db/watchlistService";
import {
  getUserRecentlyViewed,
  addRecentlyViewed,
  clearRecentlyViewed,
  syncRecentlyViewed
} from "./src/db/recentlyViewedService";
import {
  getUserReadChapters,
  saveReadChaptersForMedia,
  toggleReadChapter,
  markUpToChapter,
  syncReadChapters
} from "./src/db/readChaptersService";
import {
  uploadAvatar,
  deleteAvatar,
  uploadBanner,
  deleteBanner
} from "./src/db/storageService";
import {
  validateRequest,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  saveWatchlistSchema,
  deleteWatchlistSchema,
  addRecentlyViewedSchema,
  saveReadChaptersSchema,
  toggleReadChapterSchema,
  markUpToChapterSchema,
  userSyncSchema
} from "./src/middleware/validate";

const app = express();
const PORT = 3000;

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Strict CORS configuration using ALLOWED_ORIGINS whitelist
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like same-origin, curl, mobile apps)
      if (!origin) return callback(null, true);

      // If wildcard is specified in ALLOWED_ORIGINS, allow all
      if (allowedOrigins.includes("*")) return callback(null, true);

      // Check explicit whitelist
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Permit local development, Vercel deployments, and Cloud Run / AI Studio previews
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isVercel = /\.vercel\.app$/.test(origin);
      const isRunApp = /\.run\.app$/.test(origin);

      if (allowedOrigins.length === 0 || isLocalhost || isVercel || isRunApp) {
        return callback(null, true);
      }

      // Reject unauthorized origin gracefully without throwing an unhandled Error exception
      return callback(null, false);
    },
    credentials: true,
  })
);

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток входа или регистрации. Попробуйте через 15 минут." },
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Превышен лимит запросов к AI. Попробуйте через минуту." },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// In-Memory Cache Store keyed by ID to prevent duplicates & maintain data integrity
interface CacheEntry<T> {
  data: T;
  lastSynced: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache for live API calls

// Helper function to query AniList GraphQL API with retry & queueing
async function queryAniList(query: string, variables: Record<string, any> = {}) {
  const cacheKey = `anilist_${JSON.stringify({ query, variables })}`;
  const cached = memoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.lastSynced < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      console.warn("AniList rate limited (429), backing off...");
      if (cached) return cached.data; // Serve stale cache on rate limit
      throw new Error("Rate limit exceeded from AniList API");
    }

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      console.error("AniList GraphQL errors:", json.errors);
    }

    const data = json.data;
    memoryCache.set(cacheKey, { data, lastSynced: Date.now() });
    return data;
  } catch (err) {
    console.error("Error fetching from AniList:", err);
    if (cached) return cached.data;
    throw err;
  }
}

function deduplicateMediaList<T extends { id?: number }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<number>();
  return items.filter((item) => {
    if (!item || typeof item.id !== "number") return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// Common AniList GraphQL fragment for Media
const MEDIA_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  type
  format
  status
  description(asHtml: false)
  startDate { year month day }
  endDate { year month day }
  season
  seasonYear
  episodes
  duration
  chapters
  volumes
  countryOfOrigin
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  genres
  tags {
    id
    name
    category
    isAdult
  }
  averageScore
  meanScore
  popularity
  favourites
  trending
  isAdult
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
      siteUrl
    }
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
`;

// User Authentication & Age Verification System

// Helper function to calculate exact age in years based on registered Date of Birth
function calculateAge(dobString: string): number {
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

function extractToken(req: express.Request): string {
  const authHeader = req.headers.authorization || req.headers["x-auth-token"];
  return typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
}

async function getAuthUser(req: express.Request): Promise<ServerUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  return await getUserByAuthToken(token);
}

// RULE 1, 2, 3: Default-deny. Compute eligibility server-side from registered date of birth on each request.
async function isUserAdult(req: express.Request): Promise<boolean> {
  const user = await getAuthUser(req);
  if (!user || !user.dateOfBirth) return false;
  return calculateAge(user.dateOfBirth) >= 18;
}

function sanitizeUser(user: ServerUser) {
  const age = calculateAge(user.dateOfBirth);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    age,
    isAdultVerified: age >= 18,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl || "",
    bio: user.bio || "",
    nicknameEffect: user.nicknameEffect || "none",
    backgroundBanner: user.backgroundBanner || ""
  };
}

// Auth API Endpoints
app.post("/api/auth/register", authLimiter, validateRequest(registerSchema), async (req, res) => {
  const logRegisterError = (status: number, errorBody: { error: string }, errSource?: any) => {
    const supabaseMessage = errSource?.supabaseError?.message || errSource?.message || (errSource && typeof errSource === "string" ? errSource : null);
    const supabaseCode = errSource?.supabaseError?.code || errSource?.code || errSource?.status || null;
    const fullErrorObj = errSource || errorBody;

    console.error("[REGISTER TRACE 7] Registration Error details:", {
      message: supabaseMessage || errorBody.error,
      code: supabaseCode,
      status: status,
      fullError: fullErrorObj,
      stack: errSource?.stack || new Error().stack,
    });
    console.log("[REGISTER TRACE 8] Express route returning JSON to frontend (Error):", JSON.stringify(errorBody));
  };

  try {
    const { username, email, password, dateOfBirth } = req.body;
    if (!username || !email || !password || !dateOfBirth) {
      const errBody = { error: "Заполните все обязательные поля (имя, email, пароль, дата рождения)" };
      logRegisterError(400, errBody);
      return res.status(400).json(errBody);
    }

    if (typeof password !== "string" || password.length < 8) {
      const errBody = { error: "Пароль должен быть не менее 8 символов" };
      logRegisterError(400, errBody);
      return res.status(400).json(errBody);
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      const errBody = { error: "Укажите корректный адрес электронной почты" };
      logRegisterError(400, errBody);
      return res.status(400).json(errBody);
    }

    const existingEmail = await findUserByEmail(cleanEmail);
    if (existingEmail) {
      const errBody = { error: "Этот email уже зарегистрирован" };
      logRegisterError(400, errBody);
      return res.status(400).json(errBody);
    }

    const existingUser = await findUserByUsername(cleanUsername);
    if (existingUser) {
      const errBody = { error: "Это имя пользователя уже занято" };
      logRegisterError(400, errBody);
      return res.status(400).json(errBody);
    }

    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      const errBody = { error: "Укажите корректную дату рождения" };
      logRegisterError(400, errBody);
      return res.status(400).json(errBody);
    }

    const { token, user } = await signUpWithSupabase({
      username: cleanUsername,
      email: cleanEmail,
      password,
      dateOfBirth,
    });

    const responseJson = {
      token,
      user: sanitizeUser(user)
    };

    console.log("[REGISTER TRACE 8] Express route returning JSON to frontend (Success):", JSON.stringify(responseJson));
    return res.json(responseJson);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : (typeof error?.statusCode === "number" ? error.statusCode : 400);

    let rawErrorMsg = "";
    if (typeof error === "string" && error.trim() && error.trim() !== "{}" && error.trim() !== "[object Object]") {
      rawErrorMsg = error.trim();
    } else if (error?.supabaseError?.message && typeof error.supabaseError.message === "string" && error.supabaseError.message.trim() && error.supabaseError.message.trim() !== "{}" && error.supabaseError.message.trim() !== "[object Object]") {
      rawErrorMsg = error.supabaseError.message.trim();
    } else if (error?.message && typeof error.message === "string" && error.message.trim() && error.message.trim() !== "{}" && error.message.trim() !== "[object Object]") {
      rawErrorMsg = error.message.trim();
    }

    if (!rawErrorMsg || rawErrorMsg === "{}" || rawErrorMsg === "[object Object]") {
      rawErrorMsg = "Ошибка при регистрации в Supabase Auth";
    }

    let friendlyMsg = rawErrorMsg;
    const lower = rawErrorMsg.toLowerCase();

    if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("email_exists") || lower.includes("user_already_exists") || lower.includes("email address has already been registered")) {
      friendlyMsg = "Этот email уже зарегистрирован";
    } else if (lower.includes("username") || lower.includes("имя пользователя")) {
      friendlyMsg = "Это имя пользователя уже занято";
    }

    const errBody = { error: friendlyMsg };
    logRegisterError(status, errBody, error);
    return res.status(status).json(errBody);
  }
});

app.post("/api/auth/login", authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: "Введите имя пользователя/email и пароль" });
    }

    const { token, user } = await signInWithSupabase({
      login,
      password,
    });

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error: any) {
    const errorMsg = typeof error === "string"
      ? error
      : (error?.message && typeof error.message === "string" && error.message.trim() ? error.message : "Неверный логин или пароль");
    console.error("[API Login Error]:", errorMsg, error);
    res.status(400).json({ error: errorMsg });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization || req.headers["x-auth-token"];
  if (authHeader) {
    const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    if (token) {
      await signOutWithSupabase(token);
    }
  }
  res.json({ success: true, message: "Вы успешно вышли из системы" });
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  res.json({ user: sanitizeUser(user) });
});

app.put("/api/auth/profile", validateRequest(updateProfileSchema), async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const { dateOfBirth, username, email, avatarUrl, bio, nicknameEffect, backgroundBanner } = req.body;

    // DOB is write-once during registration and permanently locked afterward
    if (dateOfBirth !== undefined && dateOfBirth !== user.dateOfBirth) {
      return res.status(400).json({ 
        error: "Дата рождения фиксируется при регистрации и не может быть изменена." 
      });
    }

    const updates: any = {};

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== user.email) {
        const existing = await findUserByEmail(cleanEmail);
        if (existing) {
          return res.status(400).json({ error: "Этот email уже зарегистрирован." });
        }
        updates.email = cleanEmail;
        user.email = cleanEmail;
      }
    }

    if (username && username.trim()) {
      const cleanUsername = username.trim();
      if (cleanUsername.toLowerCase() !== user.username.toLowerCase()) {
        const existing = await findUserByUsername(cleanUsername);
        if (existing) {
          return res.status(400).json({ error: "Пользователь с таким именем уже существует." });
        }
        updates.username = cleanUsername;
        user.username = cleanUsername;
      }
    }

    if (avatarUrl !== undefined) { updates.avatarUrl = avatarUrl; user.avatarUrl = avatarUrl; }
    if (bio !== undefined) { updates.bio = bio.slice(0, 300); user.bio = bio.slice(0, 300); }
    if (nicknameEffect !== undefined) { updates.nicknameEffect = nicknameEffect; user.nicknameEffect = nicknameEffect; }
    if (backgroundBanner !== undefined) { updates.backgroundBanner = backgroundBanner; user.backgroundBanner = backgroundBanner; }

    // Persist profile updates in Supabase PostgreSQL
    const updatedDbUser = await updateUserProfile(user.id, updates);
    const finalUser = updatedDbUser || user;

    res.json({ user: sanitizeUser(finalUser) });
  } catch (error: any) {
    console.error("Profile update server error:", error);
    res.status(500).json({ error: error.message || "Ошибка сервера при обновлении профиля" });
  }
});

// Storage API Endpoints for Avatars and Banners
app.post("/api/user/avatar", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Передайте изображение (base64) для загрузки" });
    }
    const result = await uploadAvatar(user.id, image, mimeType);
    res.json({ avatarUrl: result.url, user: sanitizeUser(result.user) });
  } catch (error: any) {
    console.error("Avatar upload error:", error);
    res.status(400).json({ error: error.message || "Ошибка при загрузке аватарки" });
  }
});

app.delete("/api/user/avatar", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }
    const result = await deleteAvatar(user.id);
    res.json({ success: true, user: sanitizeUser(result.user) });
  } catch (error: any) {
    console.error("Avatar delete error:", error);
    res.status(500).json({ error: error.message || "Ошибка при удалении аватарки" });
  }
});

app.post("/api/user/banner", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Передайте изображение (base64) для загрузки" });
    }
    const result = await uploadBanner(user.id, image, mimeType);
    res.json({ backgroundBanner: result.url, user: sanitizeUser(result.user) });
  } catch (error: any) {
    console.error("Banner upload error:", error);
    res.status(400).json({ error: error.message || "Ошибка при загрузке баннера" });
  }
});

app.delete("/api/user/banner", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }
    const result = await deleteBanner(user.id);
    res.json({ success: true, user: sanitizeUser(result.user) });
  } catch (error: any) {
    console.error("Banner delete error:", error);
    res.status(500).json({ error: error.message || "Ошибка при удалении баннера" });
  }
});

app.get("/api/user/stats", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }
    const stats = await getUserStats(user.id);
    res.json(stats);
  } catch (error: any) {
    console.error("User stats error:", error);
    res.status(500).json({ error: "Ошибка получения статистики" });
  }
});

// Watchlist API Endpoints for server-side persistence
app.get("/api/user/watchlist", async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const watchlist = await getUserWatchlist(user.id, token);
  res.json({ watchlist });
});

app.post("/api/user/watchlist", validateRequest(saveWatchlistSchema), async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, item } = req.body;
  if (!mediaId || !item) {
    return res.status(400).json({ error: "Укажите mediaId и данные элемента" });
  }

  const updatedWatchlist = await saveWatchlistItem(user.id, typeof mediaId === "number" ? mediaId : parseInt(mediaId, 10), item, token);
  res.json({ success: true, watchlist: updatedWatchlist });
});

app.delete("/api/user/watchlist/:mediaId", validateRequest(deleteWatchlistSchema), async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const mediaId = typeof req.params.mediaId === "number" ? req.params.mediaId : parseInt(req.params.mediaId, 10);
  const updatedWatchlist = await deleteWatchlistItem(user.id, mediaId, token);
  res.json({ success: true, watchlist: updatedWatchlist });
});

// Recently Viewed API Endpoints
app.get("/api/user/recently-viewed", async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const recentlyViewed = await getUserRecentlyViewed(user.id, token);
  res.json({ recentlyViewed });
});

app.post("/api/user/recently-viewed", validateRequest(addRecentlyViewedSchema), async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { media } = req.body;
  if (!media || !media.id) {
    return res.status(400).json({ error: "Укажите медиа-объект" });
  }

  const updatedRecentlyViewed = await addRecentlyViewed(user.id, media, token);
  res.json({ success: true, recentlyViewed: updatedRecentlyViewed });
});

app.delete("/api/user/recently-viewed", async (req, res) => {
  try {
    const token = extractToken(req);
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }
    const updatedRecentlyViewed = await clearRecentlyViewed(user.id, token);
    res.json({ success: true, recentlyViewed: updatedRecentlyViewed });
  } catch (error: any) {
    console.error("[API Delete Recently Viewed Error]:", error);
    res.status(500).json({ error: error?.message || "Ошибка сервера при очистке истории" });
  }
});

// User Read Chapters API Endpoints
app.get("/api/user/read-chapters", async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const readMap = await getUserReadChapters(user.id, token);
  res.json({ readChapters: readMap });
});

app.post("/api/user/read-chapters", validateRequest(saveReadChaptersSchema), async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, readChapters } = req.body;
  if (!mediaId || !Array.isArray(readChapters)) {
    return res.status(400).json({ error: "Укажите mediaId и массив прочитанных глав" });
  }

  const updatedReadChapters = await saveReadChaptersForMedia(user.id, typeof mediaId === "number" ? mediaId : parseInt(mediaId, 10), readChapters, token);
  res.json({ success: true, readChapters: updatedReadChapters });
});

app.post("/api/user/read-chapters/toggle", validateRequest(toggleReadChapterSchema), async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, chapterNumber } = req.body;
  if (!mediaId || typeof chapterNumber !== "number") {
    return res.status(400).json({ error: "Укажите mediaId и chapterNumber" });
  }

  const updatedReadChapters = await toggleReadChapter(user.id, typeof mediaId === "number" ? mediaId : parseInt(mediaId, 10), chapterNumber, token);
  res.json({ success: true, readChapters: updatedReadChapters });
});

app.post("/api/user/read-chapters/mark-up-to", validateRequest(markUpToChapterSchema), async (req, res) => {
  const token = extractToken(req);
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, chapterNumber } = req.body;
  if (!mediaId || typeof chapterNumber !== "number") {
    return res.status(400).json({ error: "Укажите mediaId и chapterNumber" });
  }

  const updatedReadChapters = await markUpToChapter(user.id, typeof mediaId === "number" ? mediaId : parseInt(mediaId, 10), chapterNumber, token);
  res.json({ success: true, readChapters: updatedReadChapters });
});

// Full User Data Force Sync Endpoint
app.post("/api/user/sync", validateRequest(userSyncSchema), async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }

  const { watchlist = {}, readChapters = {}, recentlyViewed = [] } = req.body;

  const mergedWatchlist = await syncWatchlist(user.id, watchlist);
  const mergedReadMap = await syncReadChapters(user.id, readChapters);
  const mergedRV = await syncRecentlyViewed(user.id, recentlyViewed);

  res.json({
    success: true,
    watchlist: mergedWatchlist,
    readChapters: mergedReadMap,
    recentlyViewed: mergedRV,
    syncedAt: new Date().toISOString()
  });
});

// API Endpoint 1: Home Dashboard Data (Trending, Airing Today, Popular Manga, News)
app.get("/api/home", async (req, res) => {
  try {
    const isAdultUser = await isUserAdult(req);
    const query = `
      query {
        trending: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
        popularThisSeason: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: POPULARITY_DESC, season: SUMMER, seasonYear: 2026, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
        popularManga: Page(page: 1, perPage: 12) {
          media(type: MANGA, countryOfOrigin: "JP", sort: POPULARITY_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
        popularManhwa: Page(page: 1, perPage: 12) {
          media(type: MANGA, countryOfOrigin: "KR", sort: POPULARITY_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
        topRated: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;

    const data = await queryAniList(query);

    const filterList = (list: any[] = []) => {
      const dedup = deduplicateMediaList(list);
      if (!isAdultUser) {
        return dedup.filter((m) => !m.isAdult && !m.genres?.includes("Hentai"));
      }
      return dedup;
    };

    res.json({
      trending: filterList(data?.trending?.media || []),
      popularThisSeason: filterList(data?.popularThisSeason?.media || data?.trending?.media || []),
      popularManga: filterList(data?.popularManga?.media || []),
      popularManhwa: filterList(data?.popularManhwa?.media || []),
      topRated: filterList(data?.topRated?.media || []),
      lastSynced: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint 2: Airing Schedule for the next 7 days
app.get("/api/airing-schedule", async (req, res) => {
  try {
    const isAdultUser = await isUserAdult(req);
    const now = Math.floor(Date.now() / 1000);
    const startOfWeek = now - 86400; // 1 day ago
    const endOfWeek = now + 604800; // 7 days ahead

    const query = `
      query ($start: Int, $end: Int) {
        Page(page: 1, perPage: 50) {
          airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
            id
            airingAt
            timeUntilAiring
            episode
            media {
              ${MEDIA_FRAGMENT}
            }
          }
        }
      }
    `;

    const data = await queryAniList(query, { start: startOfWeek, end: endOfWeek });
    const rawSchedules = data?.Page?.airingSchedules || [];
    const seenMediaIds = new Set<number>();
    const schedules = rawSchedules.filter((sch: any) => {
      if (!sch || !sch.media || typeof sch.media.id !== "number") return false;
      if (!isAdultUser && (sch.media.isAdult || sch.media.genres?.includes("Hentai"))) return false;
      if (seenMediaIds.has(sch.media.id)) return false;
      seenMediaIds.add(sch.media.id);
      return true;
    });

    res.json({
      schedules,
      lastSynced: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint 3: Full Catalog Query with filters & pagination
app.get("/api/catalog", async (req, res) => {
  try {
    const isAdultUser = await isUserAdult(req);
    const {
      type = "ANIME",
      page = "1",
      perPage = "20",
      search,
      genre,
      tag,
      format,
      status,
      seasonYear,
      season,
      sort = "POPULARITY_DESC",
      isAdult = "false",
      countryOfOrigin
    } = req.query;

    // RULE 1: Default-deny. If user is not logged in or under 18, force isAdult = false.
    let isAdultBool = false;
    if (isAdultUser) {
      isAdultBool = isAdult === "true" || genre === "Hentai";
    } else {
      if (genre === "Hentai" || isAdult === "true") {
        return res.json({
          pageInfo: { total: 0, perPage: 20, currentPage: 1, lastPage: 1, hasNextPage: false },
          media: [],
          lastSynced: Date.now()
        });
      }
      isAdultBool = false;
    }

    let filterVariables: Record<string, any> = {
      page: parseInt(page as string, 10),
      perPage: parseInt(perPage as string, 10),
      type: type as string,
      isAdult: isAdultBool
    };

    let variableDefs = "$page: Int, $perPage: Int, $type: MediaType, $isAdult: Boolean";
    let mediaArgs = "type: $type, isAdult: $isAdult";

    if (countryOfOrigin) {
      const countries = (countryOfOrigin as string).split(",").map(c => c.trim().toUpperCase());
      if (countries.length === 1) {
        variableDefs += ", $countryOfOrigin: CountryCode";
        mediaArgs += ", countryOfOrigin: $countryOfOrigin";
        filterVariables.countryOfOrigin = countries[0];
      } else if (countries.length > 1) {
        variableDefs += ", $countryOfOrigin_in: [CountryCode]";
        mediaArgs += ", countryOfOrigin_in: $countryOfOrigin_in";
        filterVariables.countryOfOrigin_in = countries;
      }
    }

    if (search) {
      variableDefs += ", $search: String";
      mediaArgs += ", search: $search";
      filterVariables.search = search;
    }

    if (genre) {
      variableDefs += ", $genre: String";
      mediaArgs += ", genre: $genre";
      filterVariables.genre = genre;
    }

    if (tag) {
      variableDefs += ", $tag: String";
      mediaArgs += ", tag: $tag";
      filterVariables.tag = tag;
    }

    if (format) {
      variableDefs += ", $format: MediaFormat";
      mediaArgs += ", format: $format";
      filterVariables.format = format;
    }

    if (status) {
      variableDefs += ", $status: MediaStatus";
      mediaArgs += ", status: $status";
      filterVariables.status = status;
    }

    if (seasonYear) {
      variableDefs += ", $seasonYear: Int";
      mediaArgs += ", seasonYear: $seasonYear";
      filterVariables.seasonYear = parseInt(seasonYear as string, 10);
    }

    if (season) {
      variableDefs += ", $season: MediaSeason";
      mediaArgs += ", season: $season";
      filterVariables.season = season;
    }

    if (sort) {
      variableDefs += ", $sort: [MediaSort]";
      mediaArgs += ", sort: $sort";
      filterVariables.sort = [sort];
    }

    const query = `
      query (${variableDefs}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(${mediaArgs}) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;

    const data = await queryAniList(query, filterVariables);
    let rawMedia = data?.Page?.media || [];
    if (!isAdultUser) {
      rawMedia = rawMedia.filter((m: any) => !m.isAdult && !m.genres?.includes("Hentai"));
    }

    res.json({
      pageInfo: data?.Page?.pageInfo || {},
      media: deduplicateMediaList(rawMedia),
      lastSynced: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint 4: Single Media Detail with relations (franchises), characters, staff, trailer, recommendations
app.get("/api/media/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const query = `
      query ($id: Int) {
        Media(id: $id) {
          ${MEDIA_FRAGMENT}
          relations {
            edges {
              relationType
              node {
                id
                title {
                  romaji
                  english
                  native
                }
                type
                format
                status
                coverImage {
                  extraLarge
                  large
                }
                seasonYear
                episodes
                chapters
                averageScore
                isAdult
                genres
              }
            }
          }
          characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
            edges {
              role
              node {
                id
                name {
                  full
                  native
                  alternative
                }
                image {
                  large
                }
              }
              voiceActors(language: JAPANESE) {
                id
                name {
                  full
                  native
                }
                image {
                  medium
                }
                languageV2
              }
            }
          }
          staff(perPage: 8) {
            edges {
              role
              node {
                id
                name {
                  full
                }
                image {
                  medium
                }
              }
            }
          }
          trailer {
            id
            site
            thumbnail
          }
          recommendations(perPage: 8, sort: RATING_DESC) {
            nodes {
              mediaRecommendation {
                ${MEDIA_FRAGMENT}
              }
            }
          }
        }
      }
    `;

    const data = await queryAniList(query, { id });
    const media = data?.Media;

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    const isAdultContent = media.isAdult === true || (Array.isArray(media.genres) && media.genres.includes("Hentai"));
    const isAdultUser = await isUserAdult(req);

    // If user is under 18 or not logged in, return 404 Media not found (behave as if it doesn't exist)
    if (isAdultContent && !isAdultUser) {
      return res.status(404).json({ error: "Media not found" });
    }

    // Format characters & staff structure for clean frontend rendering
    const characters = media.characters?.edges?.map((edge: any) => ({
      id: edge.node.id,
      name: edge.node.name,
      image: edge.node.image,
      role: edge.role,
      voiceActors: edge.voiceActors
    })) || [];

    const staff = media.staff?.edges?.map((edge: any) => ({
      id: edge.node.id,
      name: edge.node.name,
      role: edge.role,
      image: edge.node.image
    })) || [];

    let recommendations = media.recommendations?.nodes
      ?.filter((node: any) => node.mediaRecommendation)
      .map((node: any) => ({ media: node.mediaRecommendation })) || [];

    if (!isAdultUser) {
      recommendations = recommendations.filter((rec: any) => !rec.media?.isAdult && !rec.media?.genres?.includes("Hentai"));
    }

    let relations = media.relations?.edges?.map((edge: any) => ({
      relationType: edge.relationType,
      node: edge.node
    })) || [];

    if (!isAdultUser) {
      relations = relations.filter((rel: any) => !rel.node?.isAdult && !rel.node?.genres?.includes("Hentai"));
    }

    const studios = Array.isArray(media.studios)
      ? media.studios
      : (media.studios?.nodes || []);

    res.json({
      ...media,
      relations,
      characters,
      staff,
      recommendations,
      studios,
      lastSynced: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint 5: Studio Detail with back catalog & upcoming announced projects
app.get("/api/studio/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const isAdultUser = await isUserAdult(req);
    const query = `
      query ($id: Int) {
        Studio(id: $id) {
          id
          name
          isAnimationStudio
          siteUrl
          media(sort: POPULARITY_DESC, perPage: 24) {
            nodes {
              ${MEDIA_FRAGMENT}
            }
          }
        }
      }
    `;

    const data = await queryAniList(query, { id });
    const studio = data?.Studio;

    if (!studio) {
      return res.status(404).json({ error: "Studio not found" });
    }

    let allMedia = deduplicateMediaList(studio.media?.nodes || []);
    if (!isAdultUser) {
      allMedia = allMedia.filter((m: any) => !m.isAdult && !m.genres?.includes("Hentai"));
    }

    const upcoming = allMedia.filter((m: any) => m.status === 'NOT_YET_RELEASED' || m.status === 'RELEASING');
    const catalog = allMedia.filter((m: any) => m.status === 'FINISHED');

    res.json({
      studio: {
        id: studio.id,
        name: studio.name,
        isAnimationStudio: studio.isAnimationStudio,
        siteUrl: studio.siteUrl
      },
      upcoming,
      catalog,
      lastSynced: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint 6: Instant Fuzzy Search across Anime, Manga, Manhwa, and Synonyms
app.get("/api/search", async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.json({ results: [] });
    }

    const searchTerm = q.trim();
    const isAdultUser = await isUserAdult(req);

    const mediaType = (type && typeof type === "string" && type.toUpperCase() !== "ALL") 
      ? type.toUpperCase() 
      : undefined;

    const query = `
      query ($search: String, $type: MediaType, $isAdult: Boolean) {
        Page(page: 1, perPage: 15) {
          media(search: $search, type: $type, isAdult: $isAdult) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;

    let results: any[] = [];
    try {
      const data = await queryAniList(query, { 
        search: searchTerm, 
        type: mediaType, 
        isAdult: isAdultUser ? undefined : false 
      });
      results = deduplicateMediaList(data?.Page?.media || []);
    } catch (err) {
      console.warn("Live AniList search failed, using cached database memory fallback", err);
    }

    // Secondary pass: if live search returned fewer than 5 results or failed, search memoryCache for fuzzy matches
    if (results.length < 8) {
      const lowerQ = searchTerm.toLowerCase();
      const cachedMediaList: any[] = [];

      for (const entry of memoryCache.values()) {
        if (entry?.data?.Page?.media && Array.isArray(entry.data.Page.media)) {
          cachedMediaList.push(...entry.data.Page.media);
        }
      }

      const matchedCached = cachedMediaList.filter((m: any) => {
        if (!m) return false;
        if (mediaType && m.type !== mediaType) return false;
        
        const romaji = m.title?.romaji?.toLowerCase() || "";
        const english = m.title?.english?.toLowerCase() || "";
        const native = m.title?.native?.toLowerCase() || "";
        const synonyms = Array.isArray(m.synonyms) ? m.synonyms.join(" ").toLowerCase() : "";
        const genres = Array.isArray(m.genres) ? m.genres.join(" ").toLowerCase() : "";
        
        return romaji.includes(lowerQ) || 
               english.includes(lowerQ) || 
               native.includes(lowerQ) || 
               synonyms.includes(lowerQ) ||
               genres.includes(lowerQ);
      });

      results = deduplicateMediaList([...results, ...matchedCached]);
    }

    if (!isAdultUser) {
      results = results.filter((m: any) => !m.isAdult && !m.genres?.includes("Hentai"));
    }

    res.json({ results: results.slice(0, 12) });
  } catch (error: any) {
    console.error("Search API error:", error);
    res.status(500).json({ error: error.message || "Ошибка при поиске" });
  }
});


// API Endpoint 7: News Aggregator (Fresh Russian Anime News)
app.get("/api/news", (req, res) => {
  const newsList = [
    {
      id: "news-1",
      title: "Анонсирован новый сезон «Магической Битвы» (Jujutsu Kaisen)",
      summary: "Студия MAPPA подтвердила производство продолжения культового аниме-сериала.",
      content: "Студия MAPPA официально объявила о начале работы над новым сезоном «Магической Битвы». Создатели обещают невероятную динамику боёв, адаптацию важнейших глав манги Гэгэ Акутами и новый саундтрек. Премьера запланирована на следующий год.",
      category: "Анонсы",
      imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
      source: "AnimiX News Room",
      date: "Сегодня, 14:30",
      readTime: "2 мин"
    },
    {
      id: "news-2",
      title: "«Клинок, рассекающий демонов»: фильм-трилогия переходит в финальную фазу",
      summary: "Опубликован свежий тизер и персонажные постеры к первому фильму трилогии «Замок Бесконечности».",
      content: "Анимационная студия ufotable поделилась новыми подробностями грандиозного кинематографического проекта «Замок Бесконечности». Фильм продемонстрирует ключевое противостояние столпов и высших лун с высочайшим качеством визуальных эффектов.",
      category: "Релизы",
      imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80",
      source: "AnimiX News Room",
      date: "Вчера, 19:15",
      readTime: "3 мин"
    },
    {
      id: "news-3",
      title: "Главные манга-новинки месяца: что почитать любителям фэнтези",
      summary: "Обзор свежих выпусков манги, завоевывающих рейтинги на Shonen Jump и Young Jump.",
      content: "Подборка перспективных манга-серий этого месяца включает увлекательные темные фэнтези, классический исекай с нестандартными механиками и романтические комедии с высоким рейтингом читателей.",
      category: "Манга",
      imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",
      source: "MangaDigest",
      date: "2 дня назад",
      readTime: "4 мин"
    },
    {
      id: "news-mw-1",
      title: "Поднятие уровня в одиночку (Solo Leveling): анонсирован новый сезон и продолжение манхвы",
      summary: "Культовый корейский вебтун получает расширенную экранизацию и продолжение с новыми главами.",
      content: "Издательство Kakao Entertainment и A-1 Pictures объявили о выпуске спин-офф глав популярной корейской манхвы «Solo Leveling: Ragnarok». Адаптация первого сезона завоевала миллионы просмотров, а новые главы продолжают удерживать первые места рейтингов.",
      category: "Манхва & Маньхуа",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
      source: "Webtoon Korea",
      date: "Вчера, 16:45",
      readTime: "3 мин"
    },
    {
      id: "news-mh-2",
      title: "Топ китайских маньхуа о культивации и боевых искусствах этого сезона",
      summary: "Разбор лучших китайских комиксов с глубокой системой боевых искусств и магии.",
      content: "Китайские маньхуа завоевывают популярность благодаря уникальному стилю культивации, экшену и яркой динамике страниц. В этом месяце лидеры рейтингов — «Боевой континент» (Soul Land) и «Расколотая битвой синева небес».",
      category: "Манхва & Маньхуа",
      imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
      source: "Manhua World",
      date: "3 дня назад",
      readTime: "4 мин"
    },
    {
      id: "news-4",
      title: "Студия Madhouse анонсировала оригинальный аниме-фильм",
      summary: "Легендарная студия готовит масштабную научно-фантастическую драму о путешествиях во времени.",
      content: "Madhouse, подарившая нам «Одинокого рокера», «Фрирен» и «Один удар», возвращается с оригинальным полнометражным проектом. Режиссером выступит мэтр современной анимации.",
      category: "Студии",
      imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80",
      source: "AnimiX News Room",
      date: "3 дня назад",
      readTime: "3 мин"
    }
  ];

  res.json({ news: newsList });
});

// API Endpoint 8: Gemini AI Translation for Synopsis
app.post("/api/ai/translate", aiLimiter, async (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text parameter" });
    }

    // Check memory cache first
    const cacheKey = `trans_${title || ""}_${text.slice(0, 30)}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return res.json({ translation: cached.data });
    }

    const gemini = getGeminiClient();
    if (!gemini) {
      return res.json({ translation: text }); // Fallback to raw text if no API key
    }

    const prompt = `Переведи следующий синопсис аниме/манги на красивый, литературный и связный русский язык. Сохраняй имена и названия. Не добавляй лишних комментариев от себя, только перевод.
Синопсис:
${text}`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const translatedText = response.text?.trim() || text;
    memoryCache.set(cacheKey, { data: translatedText, lastSynced: Date.now() });

    res.json({ translation: translatedText });
  } catch (error: any) {
    console.error("Gemini translate error:", error);
    res.json({ translation: req.body.text }); // Fallback on error
  }
});

// API Endpoint 9: Gemini AI Anime Assistant & Smart Recommendations
app.post("/api/ai/recommend", aiLimiter, async (req, res) => {
  try {
    const { prompt, userHistory = [] } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const gemini = getGeminiClient();
    if (!gemini) {
      return res.json({
        reply: "Движок AI временно недоступен. Пожалуйста, проверьте наличие API ключа в настройках."
      });
    }

    const systemInstruction = `Ты — эксперт-консультант по аниме и манге портала AnimiX. Твоя задача — отвечать на вопросы пользователей на русском языке, рекомендовать аниме и мангу под настроение, объяснять хронологию просмотра (Watch Order) сложных франшиз (например, Fate, Monogatari, Gundam) и помогать выбирать тайтлы.
Пиши вежливо, дружелюбно, структурировано с использованием списков и эмодзи. Выделяй названия аниме полужирным шрифтом.`;

    const fullUserPrompt = `Запрос пользователя: "${prompt}"
История просмотров/предпочтений пользователя (если есть): ${JSON.stringify(userHistory)}
Дай развернутый, интересное и полезный ответ с конкретными рекомендациями или объяснением на русском языке.`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.6-flash",
      contents: fullUserPrompt,
      config: {
        systemInstruction
      }
    });

    res.json({ reply: response.text || "Не удалось сгенерировать ответ." });
  } catch (error: any) {
    console.error("Gemini assistant error:", error);
    res.status(500).json({ error: error.message || "Ошибка сервера при вызове AI" });
  }
});

// Vite Middleware & Static Server integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AnimiX Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
export { app };

if (!process.env.VERCEL) {
  startServer();
}
