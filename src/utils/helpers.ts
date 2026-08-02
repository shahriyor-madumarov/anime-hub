import { MediaFormat, MediaStatus, UserWatchStatus } from "../types";
import { apiFetch, getAuthToken } from "./auth";

export const GENRE_MAP_RU: Record<string, string> = {
  Action: "Экшен",
  Adventure: "Приключения",
  Comedy: "Комедия",
  Drama: "Драма",
  Ecchi: "Эччи",
  Fantasy: "Фэнтези",
  Hentai: "Хентай (18+)",
  Horror: "Ужасы",
  "Mahou Shoujo": "Махо-сёдзё",
  Mecha: "Меха",
  Music: "Музыка",
  Mystery: "Детектив / Мистика",
  Psychological: "Психологическое",
  Romance: "Романтика",
  SciFi: "Научная фантастика",
  "Sci-Fi": "Научная фантастика",
  SliceOfLife: "Повседневность",
  "Slice of Life": "Повседневность",
  Sports: "Спорт",
  Supernatural: "Сверхъестественное",
  Thriller: "Триллер",
};

export const FORMAT_MAP_RU: Record<MediaFormat, string> = {
  TV: "ТВ Сериал",
  TV_SHORT: "Короткометражка ТВ",
  MOVIE: "Фильм",
  SPECIAL: "Спешел",
  OVA: "OVA",
  ONA: "ONA",
  MANGA: "Манга",
  NOVEL: "Ранобэ",
  ONE_SHOT: "Ваншот",
};

export const STATUS_MAP_RU: Record<MediaStatus, string> = {
  FINISHED: "Завершен",
  RELEASING: "Онгоинг (выходит)",
  NOT_YET_RELEASED: "Анонсирован",
  CANCELLED: "Отменен",
  HIATUS: "В перерыве",
};

export const USER_STATUS_MAP_RU: Record<UserWatchStatus, string> = {
  WATCHING: "Смотрю",
  COMPLETED: "Просмотрено",
  PLANNING: "В планах",
  DROPPED: "Брошено",
  READING: "Читаю",
};

export function getRussianGenre(genre: string): string {
  return GENRE_MAP_RU[genre] || genre;
}

export function getCountryOfOriginInfo(countryCode?: string): { flag: string; nameRu: string; labelRu: string; formatLabelRu: string; readingDirection: string } {
  if (!countryCode) return { flag: "🌐", nameRu: "Неизвестно", labelRu: "Произведение", formatLabelRu: "Манга / Комикс", readingDirection: "Стандартный" };
  
  const upper = countryCode.toUpperCase();
  if (upper === "KR") {
    return {
      flag: "🇰🇷",
      nameRu: "Южная Корея",
      labelRu: "Манхва",
      formatLabelRu: "Манхва (Корейский вебтун)",
      readingDirection: "Сверху вниз (Формат Вебтун / Webtoon)"
    };
  }
  if (upper === "CN" || upper === "TW") {
    return {
      flag: "🇨🇳",
      nameRu: "Китай",
      labelRu: "Маньхуа",
      formatLabelRu: "Маньхуа (Китайский комикс)",
      readingDirection: "Сверху вниз (Вебтун) / Слева направо"
    };
  }
  if (upper === "JP") {
    return {
      flag: "🇯🇵",
      nameRu: "Япония",
      labelRu: "Манга",
      formatLabelRu: "Японская манга",
      readingDirection: "Справа налево (Традиционный японский)"
    };
  }
  return {
    flag: "🌐",
    nameRu: countryCode,
    labelRu: "Комикс",
    formatLabelRu: "Комикс",
    readingDirection: "Слева направо"
  };
}

export function getMediaCategoryLabel(media: { type: string; format: MediaFormat; countryOfOrigin?: string }): string {
  if (media.type === 'MANGA') {
    const country = media.countryOfOrigin?.toUpperCase();
    if (country === 'KR') return 'Манхва';
    if (country === 'CN' || country === 'TW') return 'Маньхуа';
    if (media.format === 'NOVEL') return 'Ранобэ';
    if (media.format === 'ONE_SHOT') return 'Ваншот';
    return 'Манга';
  }
  return FORMAT_MAP_RU[media.format] || media.format;
}

export function getRussianFormat(format: MediaFormat): string {
  return FORMAT_MAP_RU[format] || format;
}

export function getRussianStatus(status: MediaStatus): string {
  return STATUS_MAP_RU[status] || status;
}

export function getPrimaryTitle(title?: { russian?: string; romaji?: string; english?: string; native?: string }): string {
  if (!title) return "Без названия";
  return title.russian || title.romaji || title.english || title.native || "Без названия";
}

export function getSubtitle(title?: { russian?: string; romaji?: string; english?: string }): string | null {
  if (!title) return null;
  if (title.russian && title.romaji && title.russian !== title.romaji) return title.romaji;
  if (title.english && title.romaji && title.english !== title.romaji) return title.english;
  return null;
}

// User local storage & server sync helpers
const USER_LIST_KEY = "animix_user_list_v1";

export function getUserList(): Record<number, any> {
  try {
    const raw = localStorage.getItem(USER_LIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function notifyWatchlistUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("animix_watchlist_updated"));
  }
}

export async function syncWatchlistWithServer(): Promise<Record<number, any>> {
  if (!getAuthToken()) {
    return getUserList();
  }
  try {
    const res = await apiFetch("/api/user/watchlist");
    if (res.ok) {
      const data = await res.json();
      if (data && data.watchlist) {
        localStorage.setItem(USER_LIST_KEY, JSON.stringify(data.watchlist));
        notifyWatchlistUpdated();
        return data.watchlist;
      }
    }
  } catch (e) {
    console.error("Failed to sync watchlist from server", e);
  }
  return getUserList();
}

export function saveUserListItem(mediaId: number, item: any) {
  try {
    const list = getUserList();
    const updatedItem = {
      ...item,
      updatedAt: new Date().toISOString()
    };
    list[mediaId] = updatedItem;
    localStorage.setItem(USER_LIST_KEY, JSON.stringify(list));
    notifyWatchlistUpdated();

    if (getAuthToken()) {
      apiFetch("/api/user/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, item: updatedItem })
      }).catch((e) => console.error("Failed to persist watchlist item to server", e));
    }
  } catch (e) {
    console.error("Failed to save user list item", e);
  }
}

export function removeUserListItem(mediaId: number) {
  try {
    const list = getUserList();
    delete list[mediaId];
    localStorage.setItem(USER_LIST_KEY, JSON.stringify(list));
    notifyWatchlistUpdated();

    if (getAuthToken()) {
      apiFetch(`/api/user/watchlist/${mediaId}`, {
        method: "DELETE"
      }).catch((e) => console.error("Failed to delete watchlist item on server", e));
    }
  } catch (e) {
    console.error("Failed to remove user list item", e);
  }
}

// Recently Viewed Helpers & Server Sync
const RECENTLY_VIEWED_KEY = "animix_recently_viewed_v1";

export function notifyRecentlyViewedUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("animix_recently_viewed_updated"));
  }
}

export function getRecentlyViewed(): any[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(media: any) {
  if (!media || !media.id) return;
  try {
    const list = getRecentlyViewed();
    const filtered = list.filter((item) => item && item.id !== media.id);
    const updated = [media, ...filtered].slice(0, 20);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    notifyRecentlyViewedUpdated();

    if (getAuthToken()) {
      apiFetch("/api/user/recently-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media })
      }).catch((e) => console.error("Failed to sync recently viewed item to server", e));
    }
  } catch (e) {
    console.error("Failed to save recently viewed item", e);
  }
}

export async function clearRecentlyViewed(): Promise<void> {
  try {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
    notifyRecentlyViewedUpdated();

    if (getAuthToken()) {
      const res = await apiFetch("/api/user/recently-viewed", {
        method: "DELETE"
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to clear history on server (${res.status})`);
      }
    }
  } catch (e) {
    console.error("Failed to clear recently viewed list", e);
    throw e;
  }
}

export async function syncRecentlyViewedWithServer(): Promise<any[]> {
  if (!getAuthToken()) {
    return getRecentlyViewed();
  }
  try {
    const res = await apiFetch("/api/user/recently-viewed");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.recentlyViewed)) {
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(data.recentlyViewed));
        notifyRecentlyViewedUpdated();
        return data.recentlyViewed;
      }
    }
  } catch (e) {
    console.error("Failed to sync recently viewed from server", e);
  }
  return getRecentlyViewed();
}

// Format seconds into Russian days/hours/minutes countdown
export function formatTimeUntilAiring(seconds: number): string {
  if (seconds <= 0) return "Уже вышло";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} дн.`);
  if (hours > 0) parts.push(`${hours} ч.`);
  parts.push(`${minutes} мин.`);

  return parts.join(" ");
}

export function formatAiringTime(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * 1000);
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function getDayOfWeekRu(timestampSeconds: number): string {
  const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const date = new Date(timestampSeconds * 1000);
  return days[date.getDay()];
}

// Chapter Read Tracking Helpers & Server Sync
const READ_CHAPTERS_KEY = "animix_read_chapters_v1";

export function notifyReadChaptersUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("animix_read_chapters_updated"));
  }
}

export function getReadChaptersMap(): Record<number, number[]> {
  try {
    const raw = localStorage.getItem(READ_CHAPTERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getReadChaptersForMedia(mediaId: number): number[] {
  const map = getReadChaptersMap();
  return map[mediaId] || [];
}

export async function syncReadChaptersWithServer(): Promise<Record<number, number[]>> {
  if (!getAuthToken()) {
    return getReadChaptersMap();
  }
  try {
    const res = await apiFetch("/api/user/read-chapters");
    if (res.ok) {
      const data = await res.json();
      if (data && data.readChapters) {
        localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(data.readChapters));
        notifyReadChaptersUpdated();
        return data.readChapters;
      }
    }
  } catch (e) {
    console.error("Failed to sync read chapters from server", e);
  }
  return getReadChaptersMap();
}

export function toggleChapterRead(mediaId: number, chapterNumber: number, totalChapters?: number, media?: any) {
  try {
    const map = getReadChaptersMap();
    let current = map[mediaId] || [];
    if (current.includes(chapterNumber)) {
      current = current.filter((ch) => ch !== chapterNumber);
    } else {
      current = [...current, chapterNumber].sort((a, b) => a - b);
    }
    map[mediaId] = current;
    localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(map));
    notifyReadChaptersUpdated();

    // Auto update user watchlist progress and status
    const list = getUserList();
    const existing = list[mediaId];
    if (existing || media) {
      const itemMedia = existing?.media || media;
      const readCount = current.length;
      let newStatus = existing?.status || "READING";

      // Automatic status update "reading" -> "completed" when all released/available chapters are read
      if (totalChapters && totalChapters > 0 && readCount >= totalChapters) {
        newStatus = "COMPLETED";
      } else if (readCount > 0 && (newStatus === "PLANNING" || !existing)) {
        newStatus = itemMedia?.type === "MANGA" ? "READING" : "WATCHING";
      }

      saveUserListItem(mediaId, {
        ...(existing || { mediaId, media: itemMedia, score: 0 }),
        progress: readCount,
        status: newStatus
      });
    }

    if (getAuthToken()) {
      apiFetch("/api/user/read-chapters/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, chapterNumber })
      }).catch((e) => console.error("Failed to sync chapter toggle to server", e));
    }
  } catch (e) {
    console.error("Failed to toggle chapter read status", e);
  }
}

export function markUpToChapterRead(mediaId: number, chapterNumber: number, totalChapters?: number, media?: any) {
  try {
    const map = getReadChaptersMap();
    const newList: number[] = [];
    for (let i = 1; i <= chapterNumber; i++) {
      newList.push(i);
    }
    map[mediaId] = newList;
    localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(map));
    notifyReadChaptersUpdated();

    // Auto update user watchlist progress & status
    const list = getUserList();
    const existing = list[mediaId];
    if (existing || media) {
      const itemMedia = existing?.media || media;
      const readCount = newList.length;
      let newStatus = existing?.status || "READING";

      if (totalChapters && totalChapters > 0 && readCount >= totalChapters) {
        newStatus = "COMPLETED";
      } else if (readCount > 0 && (newStatus === "PLANNING" || !existing)) {
        newStatus = itemMedia?.type === "MANGA" ? "READING" : "WATCHING";
      }

      saveUserListItem(mediaId, {
        ...(existing || { mediaId, media: itemMedia, score: 0 }),
        progress: readCount,
        status: newStatus
      });
    }

    if (getAuthToken()) {
      apiFetch("/api/user/read-chapters/mark-up-to", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, chapterNumber })
      }).catch((e) => console.error("Failed to sync mark-up-to chapters to server", e));
    }
  } catch (e) {
    console.error("Failed to mark up to chapter read", e);
  }
}

export function clearAllReadChaptersForMedia(mediaId: number) {
  try {
    const map = getReadChaptersMap();
    map[mediaId] = [];
    localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(map));
    notifyReadChaptersUpdated();

    const list = getUserList();
    if (list[mediaId]) {
      saveUserListItem(mediaId, {
        ...list[mediaId],
        progress: 0
      });
    }

    if (getAuthToken()) {
      apiFetch("/api/user/read-chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, readChapters: [] })
      }).catch((e) => console.error("Failed to clear read chapters on server", e));
    }
  } catch (e) {
    console.error("Failed to clear read chapters for media", e);
  }
}

export async function forceSyncUserDataWithServer(): Promise<{
  success: boolean;
  syncedAt?: string;
  watchlistCount: number;
  readChaptersCount: number;
  recentlyViewedCount: number;
}> {
  const localWatchlist = getUserList();
  const localReadChapters = getReadChaptersMap();
  const localRecentlyViewed = getRecentlyViewed();

  if (!getAuthToken()) {
    notifyWatchlistUpdated();
    notifyReadChaptersUpdated();
    notifyRecentlyViewedUpdated();
    return {
      success: true,
      syncedAt: new Date().toISOString(),
      watchlistCount: Object.keys(localWatchlist).length,
      readChaptersCount: Object.keys(localReadChapters).length,
      recentlyViewedCount: localRecentlyViewed.length
    };
  }

  try {
    const res = await apiFetch("/api/user/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        watchlist: localWatchlist,
        readChapters: localReadChapters,
        recentlyViewed: localRecentlyViewed
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        if (data.watchlist) {
          localStorage.setItem(USER_LIST_KEY, JSON.stringify(data.watchlist));
          notifyWatchlistUpdated();
        }
        if (data.readChapters) {
          localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(data.readChapters));
          notifyReadChaptersUpdated();
        }
        if (data.recentlyViewed) {
          localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(data.recentlyViewed));
          notifyRecentlyViewedUpdated();
        }
        return {
          success: true,
          syncedAt: data.syncedAt || new Date().toISOString(),
          watchlistCount: Object.keys(data.watchlist || localWatchlist).length,
          readChaptersCount: Object.keys(data.readChapters || localReadChapters).length,
          recentlyViewedCount: (data.recentlyViewed || localRecentlyViewed).length
        };
      }
    }
  } catch (e) {
    console.error("Force sync failed", e);
  }

  notifyWatchlistUpdated();
  notifyReadChaptersUpdated();
  notifyRecentlyViewedUpdated();
  return {
    success: true,
    syncedAt: new Date().toISOString(),
    watchlistCount: Object.keys(localWatchlist).length,
    readChaptersCount: Object.keys(localReadChapters).length,
    recentlyViewedCount: localRecentlyViewed.length
  };
}
