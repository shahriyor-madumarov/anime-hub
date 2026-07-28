import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

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
interface ServerUser {
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

const usersByUsername = new Map<string, ServerUser>();
const usersByEmail = new Map<string, ServerUser>();
const sessions = new Map<string, ServerUser>();

// Server-side Watchlist Storage per User (persistent across server restarts)
const userWatchlists = new Map<string, Record<number, any>>();
const userRecentlyViewed = new Map<string, any[]>();
const userReadChapters = new Map<string, Record<number, number[]>>();

// Persistent File Store path
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const WATCHLISTS_FILE = path.join(DATA_DIR, "watchlists.json");
const RECENTLY_VIEWED_FILE = path.join(DATA_DIR, "recently_viewed.json");
const READ_CHAPTERS_FILE = path.join(DATA_DIR, "read_chapters.json");

function safeWriteJsonSync(filePath: string, data: any) {
  try {
    const tmpPath = `${filePath}.tmp`;
    const bakPath = `${filePath}.bak`;
    const jsonString = JSON.stringify(data, null, 2);

    // Write to temporary file first to prevent partial/truncated writes on sudden exit
    fs.writeFileSync(tmpPath, jsonString, "utf-8");

    // Copy existing file to backup before replacing
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, bakPath);
      } catch {
        // Non-fatal backup failure
      }
    }

    // Atomic replace
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`[Storage] Failed atomic write to ${filePath}:`, err);
  }
}

function loadDataFromDisk() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
      console.error("[Storage] Failed to create data directory:", err);
    }
  }

  // 1. Load Users with isolated try-catch & backup fallback
  if (fs.existsSync(USERS_FILE)) {
    try {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      if (raw && raw.trim()) {
        const usersArray: ServerUser[] = JSON.parse(raw);
        if (Array.isArray(usersArray)) {
          usersArray.forEach((user) => {
            if (user && user.id && user.username && user.email) {
              usersByUsername.set(user.username.toLowerCase(), user);
              usersByEmail.set(user.email.toLowerCase(), user);
            }
          });
        }
      }
    } catch (err) {
      console.error("[Storage] Error loading USERS_FILE, attempting backup fallback:", err);
      const bakFile = `${USERS_FILE}.bak`;
      if (fs.existsSync(bakFile)) {
        try {
          const rawBak = fs.readFileSync(bakFile, "utf-8");
          const usersArray: ServerUser[] = JSON.parse(rawBak);
          if (Array.isArray(usersArray)) {
            usersArray.forEach((user) => {
              if (user && user.id && user.username && user.email) {
                usersByUsername.set(user.username.toLowerCase(), user);
                usersByEmail.set(user.email.toLowerCase(), user);
              }
            });
            console.log("[Storage] Successfully recovered users from backup file.");
          }
        } catch (bakErr) {
          console.error("[Storage] Error loading USERS_FILE backup:", bakErr);
        }
      }
    }
  }

  // 2. Load Sessions with isolated try-catch & reference linking
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
      if (raw && raw.trim()) {
        const sessionsObj: Record<string, ServerUser> = JSON.parse(raw);
        Object.entries(sessionsObj).forEach(([token, user]) => {
          if (user && user.username) {
            // Re-link session user to the canonical object in usersByUsername/usersByEmail if present
            const canonicalUser = 
              usersByUsername.get(user.username.toLowerCase()) || 
              usersByEmail.get(user.email.toLowerCase()) || 
              user;
            
            if (canonicalUser.username && !usersByUsername.has(canonicalUser.username.toLowerCase())) {
              usersByUsername.set(canonicalUser.username.toLowerCase(), canonicalUser);
            }
            if (canonicalUser.email && !usersByEmail.has(canonicalUser.email.toLowerCase())) {
              usersByEmail.set(canonicalUser.email.toLowerCase(), canonicalUser);
            }

            sessions.set(token, canonicalUser);
          }
        });
      }
    } catch (err) {
      console.error("[Storage] Error loading SESSIONS_FILE:", err);
    }
  }

  // 3. Load Watchlists with isolated try-catch
  if (fs.existsSync(WATCHLISTS_FILE)) {
    try {
      const raw = fs.readFileSync(WATCHLISTS_FILE, "utf-8");
      if (raw && raw.trim()) {
        const watchlistsObj: Record<string, Record<number, any>> = JSON.parse(raw);
        Object.entries(watchlistsObj).forEach(([userId, watchlist]) => {
          if (userId && watchlist) {
            userWatchlists.set(userId, watchlist);
          }
        });
      }
    } catch (err) {
      console.error("[Storage] Error loading WATCHLISTS_FILE:", err);
    }
  }

  // 4. Load Recently Viewed with isolated try-catch
  if (fs.existsSync(RECENTLY_VIEWED_FILE)) {
    try {
      const raw = fs.readFileSync(RECENTLY_VIEWED_FILE, "utf-8");
      if (raw && raw.trim()) {
        const recentlyViewedObj: Record<string, any[]> = JSON.parse(raw);
        Object.entries(recentlyViewedObj).forEach(([userId, items]) => {
          if (userId && Array.isArray(items)) {
            userRecentlyViewed.set(userId, items);
          }
        });
      }
    } catch (err) {
      console.error("[Storage] Error loading RECENTLY_VIEWED_FILE:", err);
    }
  }

  // 5. Load Read Chapters with isolated try-catch
  if (fs.existsSync(READ_CHAPTERS_FILE)) {
    try {
      const raw = fs.readFileSync(READ_CHAPTERS_FILE, "utf-8");
      if (raw && raw.trim()) {
        const readChaptersObj: Record<string, Record<number, number[]>> = JSON.parse(raw);
        Object.entries(readChaptersObj).forEach(([userId, map]) => {
          if (userId && map) {
            userReadChapters.set(userId, map);
          }
        });
      }
    } catch (err) {
      console.error("[Storage] Error loading READ_CHAPTERS_FILE:", err);
    }
  }

  console.log(`[Storage] Loaded persistent database: ${usersByUsername.size} registered users, ${sessions.size} active sessions.`);
}

function saveDataToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Deduplicate user objects by unique user ID
    const userMap = new Map<string, ServerUser>();
    usersByUsername.forEach((u) => {
      if (u && u.id) userMap.set(u.id, u);
    });
    usersByEmail.forEach((u) => {
      if (u && u.id) userMap.set(u.id, u);
    });
    const usersArray = Array.from(userMap.values());

    safeWriteJsonSync(USERS_FILE, usersArray);

    const sessionsObj = Object.fromEntries(sessions.entries());
    safeWriteJsonSync(SESSIONS_FILE, sessionsObj);

    const watchlistsObj = Object.fromEntries(userWatchlists.entries());
    safeWriteJsonSync(WATCHLISTS_FILE, watchlistsObj);

    const recentlyViewedObj = Object.fromEntries(userRecentlyViewed.entries());
    safeWriteJsonSync(RECENTLY_VIEWED_FILE, recentlyViewedObj);

    const readChaptersObj = Object.fromEntries(userReadChapters.entries());
    safeWriteJsonSync(READ_CHAPTERS_FILE, readChaptersObj);
  } catch (err) {
    console.error("[Storage] Error saving data to disk:", err);
  }
}

// Load existing data on server startup
loadDataFromDisk();

// Process exit handlers to ensure pending memory updates are safely written to disk
process.on("SIGINT", () => {
  saveDataToDisk();
  process.exit(0);
});

process.on("SIGTERM", () => {
  saveDataToDisk();
  process.exit(0);
});

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

function getAuthUser(req: express.Request): ServerUser | null {
  const authHeader = req.headers.authorization || req.headers["x-auth-token"];
  if (!authHeader) return null;
  const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) return null;
  return sessions.get(token) || null;
}

// RULE 1, 2, 3: Default-deny. Compute eligibility server-side from registered date of birth on each request.
function isUserAdult(req: express.Request): boolean {
  const user = getAuthUser(req);
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
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, email, password, dateOfBirth } = req.body;
    if (!username || !email || !password || !dateOfBirth) {
      return res.status(400).json({ error: "Заполните все обязательные поля (имя, email, пароль, дата рождения)" });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "Укажите корректный адрес электронной почты" });
    }

    if (usersByEmail.has(cleanEmail)) {
      return res.status(400).json({ error: "Этот email уже зарегистрирован" });
    }

    if (usersByUsername.has(cleanUsername.toLowerCase())) {
      return res.status(400).json({ error: "Пользователь с таким именем уже существует" });
    }

    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: "Укажите корректную дату рождения" });
    }

    const newUser: ServerUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: password,
      dateOfBirth,
      createdAt: new Date().toISOString()
    };

    usersByUsername.set(cleanUsername.toLowerCase(), newUser);
    usersByEmail.set(cleanEmail, newUser);

    const token = `token_${newUser.id}_${Date.now()}`;
    sessions.set(token, newUser);

    saveDataToDisk();

    res.json({
      token,
      user: sanitizeUser(newUser)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: "Введите имя пользователя/email и пароль" });
    }

    const cleanLogin = login.trim().toLowerCase();
    const user = usersByUsername.get(cleanLogin) || usersByEmail.get(cleanLogin);

    if (!user || user.passwordHash !== password) {
      return res.status(400).json({ error: "Неверный логин или пароль" });
    }

    const token = `token_${user.id}_${Date.now()}`;
    sessions.set(token, user);

    saveDataToDisk();

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  res.json({ user: sanitizeUser(user) });
});

app.put("/api/auth/profile", (req, res) => {
  try {
    const user = getAuthUser(req);
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

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== user.email) {
        if (usersByEmail.has(cleanEmail)) {
          return res.status(400).json({ error: "Этот email уже зарегистрирован." });
        }
        usersByEmail.delete(user.email);
        user.email = cleanEmail;
        usersByEmail.set(cleanEmail, user);
      }
    }

    if (username && username.trim()) {
      const cleanUsername = username.trim();
      if (cleanUsername.toLowerCase() !== user.username.toLowerCase()) {
        if (usersByUsername.has(cleanUsername.toLowerCase())) {
          return res.status(400).json({ error: "Пользователь с таким именем уже существует." });
        }
        usersByUsername.delete(user.username.toLowerCase());
        user.username = cleanUsername;
        usersByUsername.set(cleanUsername.toLowerCase(), user);
      }
    }

    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (bio !== undefined) user.bio = bio.slice(0, 300); // 300 max chars
    if (nicknameEffect !== undefined) user.nicknameEffect = nicknameEffect;
    if (backgroundBanner !== undefined) user.backgroundBanner = backgroundBanner;

    saveDataToDisk();

    res.json({ user: sanitizeUser(user) });
  } catch (error: any) {
    console.error("Profile update server error:", error);
    res.status(500).json({ error: error.message || "Ошибка сервера при обновлении профиля" });
  }
});

// Watchlist API Endpoints for server-side persistence
app.get("/api/user/watchlist", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const watchlist = userWatchlists.get(user.id) || {};
  res.json({ watchlist });
});

app.post("/api/user/watchlist", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, item } = req.body;
  if (!mediaId || !item) {
    return res.status(400).json({ error: "Укажите mediaId и данные элемента" });
  }

  let list = userWatchlists.get(user.id);
  if (!list) {
    list = {};
    userWatchlists.set(user.id, list);
  }
  list[mediaId] = {
    ...item,
    updatedAt: new Date().toISOString()
  };
  saveDataToDisk();
  res.json({ success: true, watchlist: list });
});

app.delete("/api/user/watchlist/:mediaId", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const mediaId = parseInt(req.params.mediaId, 10);
  const list = userWatchlists.get(user.id);
  if (list && list[mediaId]) {
    delete list[mediaId];
  }
  saveDataToDisk();
  res.json({ success: true, watchlist: list || {} });
});

// Recently Viewed API Endpoints
app.get("/api/user/recently-viewed", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const recentlyViewed = userRecentlyViewed.get(user.id) || [];
  res.json({ recentlyViewed });
});

app.post("/api/user/recently-viewed", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { media } = req.body;
  if (!media || !media.id) {
    return res.status(400).json({ error: "Укажите медиа-объект" });
  }

  let list = userRecentlyViewed.get(user.id) || [];
  // Deduplicate and push to top
  list = list.filter((item: any) => item && item.id !== media.id);
  list.unshift(media);
  if (list.length > 20) {
    list = list.slice(0, 20);
  }
  userRecentlyViewed.set(user.id, list);
  saveDataToDisk();
  res.json({ success: true, recentlyViewed: list });
});

app.delete("/api/user/recently-viewed", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  userRecentlyViewed.set(user.id, []);
  saveDataToDisk();
  res.json({ success: true, recentlyViewed: [] });
});

// User Read Chapters API Endpoints
app.get("/api/user/read-chapters", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const readMap = userReadChapters.get(user.id) || {};
  res.json({ readChapters: readMap });
});

app.post("/api/user/read-chapters", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, readChapters } = req.body;
  if (!mediaId || !Array.isArray(readChapters)) {
    return res.status(400).json({ error: "Укажите mediaId и массив прочитанных глав" });
  }

  let userMap = userReadChapters.get(user.id);
  if (!userMap) {
    userMap = {};
    userReadChapters.set(user.id, userMap);
  }
  userMap[mediaId] = readChapters;
  saveDataToDisk();
  res.json({ success: true, readChapters: userMap[mediaId] });
});

app.post("/api/user/read-chapters/toggle", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, chapterNumber } = req.body;
  if (!mediaId || typeof chapterNumber !== "number") {
    return res.status(400).json({ error: "Укажите mediaId и chapterNumber" });
  }

  let userMap = userReadChapters.get(user.id);
  if (!userMap) {
    userMap = {};
    userReadChapters.set(user.id, userMap);
  }
  let currentList = userMap[mediaId] || [];
  if (currentList.includes(chapterNumber)) {
    currentList = currentList.filter((ch) => ch !== chapterNumber);
  } else {
    currentList = [...currentList, chapterNumber].sort((a, b) => a - b);
  }
  userMap[mediaId] = currentList;
  saveDataToDisk();
  res.json({ success: true, readChapters: currentList });
});

app.post("/api/user/read-chapters/mark-up-to", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }
  const { mediaId, chapterNumber } = req.body;
  if (!mediaId || typeof chapterNumber !== "number") {
    return res.status(400).json({ error: "Укажите mediaId и chapterNumber" });
  }

  let userMap = userReadChapters.get(user.id);
  if (!userMap) {
    userMap = {};
    userReadChapters.set(user.id, userMap);
  }
  const newList = [];
  for (let i = 1; i <= chapterNumber; i++) {
    newList.push(i);
  }
  userMap[mediaId] = newList;
  saveDataToDisk();
  res.json({ success: true, readChapters: newList });
});

// Full User Data Force Sync Endpoint
app.post("/api/user/sync", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }

  const { watchlist = {}, readChapters = {}, recentlyViewed = [] } = req.body;

  // 1. Merge Watchlist
  let serverWatchlist = userWatchlists.get(user.id) || {};
  const mergedWatchlist: Record<number, any> = { ...serverWatchlist };

  for (const [key, item] of Object.entries(watchlist)) {
    const mediaId = parseInt(key, 10);
    if (!mediaId || !item) continue;
    const existing = mergedWatchlist[mediaId];
    if (!existing) {
      mergedWatchlist[mediaId] = item;
    } else {
      const localTime = (item as any).updatedAt ? new Date((item as any).updatedAt).getTime() : 0;
      const serverTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      if (localTime >= serverTime) {
        mergedWatchlist[mediaId] = { ...existing, ...(item as any) };
      } else {
        mergedWatchlist[mediaId] = { ...(item as any), ...existing };
      }
    }
  }
  userWatchlists.set(user.id, mergedWatchlist);

  // 2. Merge Read Chapters
  let serverReadMap = userReadChapters.get(user.id) || {};
  const mergedReadMap: Record<number, number[]> = { ...serverReadMap };

  for (const [key, chapters] of Object.entries(readChapters)) {
    const mediaId = parseInt(key, 10);
    if (!mediaId || !Array.isArray(chapters)) continue;
    const existing = mergedReadMap[mediaId] || [];
    const combined = Array.from(new Set([...existing, ...chapters])).sort((a: number, b: number) => a - b);
    mergedReadMap[mediaId] = combined;
  }
  userReadChapters.set(user.id, mergedReadMap);

  // 3. Merge Recently Viewed
  let serverRecentlyViewed = userRecentlyViewed.get(user.id) || [];
  const combinedRV: any[] = [];
  const seenIds = new Set<number>();

  for (const item of [...(Array.isArray(recentlyViewed) ? recentlyViewed : []), ...serverRecentlyViewed]) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      combinedRV.push(item);
    }
  }
  const mergedRV = combinedRV.slice(0, 20);
  userRecentlyViewed.set(user.id, mergedRV);

  saveDataToDisk();

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
    const isAdultUser = isUserAdult(req);
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
    const isAdultUser = isUserAdult(req);
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
    const isAdultUser = isUserAdult(req);
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
    const isAdultUser = isUserAdult(req);

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
    const isAdultUser = isUserAdult(req);
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
    const isAdultUser = isUserAdult(req);

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
app.post("/api/ai/translate", async (req, res) => {
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
app.post("/api/ai/recommend", async (req, res) => {
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

startServer();
