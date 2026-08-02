import React, { useState, useEffect } from "react";
import { 
  User, ShieldCheck, ShieldAlert, Sparkles, Edit3, Camera, Save, 
  Tv, BookOpen, Film, Bookmark, Play, Plus, Check, ExternalLink, Calendar, Mail, Lock,
  RefreshCw, CheckCircle2, Heart, Star, MessageSquare, Trash2, Loader2, Upload, AlertCircle, X, LogOut
} from "lucide-react";
import { MediaItem, UserListItem, UserProfile } from "../types";
import { getPrimaryTitle, getRussianFormat, getUserList, saveUserListItem, USER_STATUS_MAP_RU, toggleChapterRead, forceSyncUserDataWithServer } from "../utils/helpers";
import { NicknameEffect } from "./NicknameEffect";
import { ProfileCustomizationModal, PRESET_BANNERS, PRESET_AVATARS } from "./ProfileCustomizationModal";
import { GenrePreferencesChart } from "./GenrePreferencesChart";
import { apiFetch, getAuthToken, saveAuthData } from "../utils/auth";

interface ProfileViewProps {
  currentUser: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onSelectMedia: (media: MediaItem) => void;
  onNavigateTab: (tab: string) => void;
  onLogoutClick?: () => void;
}

interface UserStatsData {
  favoriteCount: number;
  watchlistCount: number;
  commentCount: number;
  ratingCount: number;
}

function formatJoinDate(createdAt?: string): string {
  if (!createdAt) return "В сообществе с 2025 г.";
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "В сообществе с 2025 г.";
    return `В сообществе с ${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;
  } catch {
    return "В сообществе с 2025 г.";
  }
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  onSelectMedia,
  onNavigateTab,
  onLogoutClick,
}) => {
  const [bio, setBio] = useState(currentUser.bio || "");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"avatar" | "effect" | "banner">("avatar");

  const [userList, setUserListState] = useState<Record<number, UserListItem>>(() => getUserList());

  // Backend Stats State
  const [stats, setStats] = useState<UserStatsData>({
    favoriteCount: 0,
    watchlistCount: Object.keys(getUserList()).length,
    commentCount: 0,
    ratingCount: 0,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Upload progress states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Toast Notifications
  const [toastNotification, setToastNotification] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Fetch User Stats from backend
  const fetchUserStats = async () => {
    try {
      const res = await apiFetch("/api/user/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          favoriteCount: data.favoriteCount ?? 0,
          watchlistCount: data.watchlistCount ?? Object.keys(getUserList()).length,
          commentCount: data.commentCount ?? 0,
          ratingCount: data.ratingCount ?? 0,
        });
      } else {
        // Fallback stats based on local storage
        const listItems = Object.values(getUserList());
        setStats((prev) => ({
          ...prev,
          watchlistCount: listItems.length,
          ratingCount: listItems.filter((i) => (i.score || 0) > 0).length,
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch user stats from server", e);
      const listItems = Object.values(getUserList());
      setStats((prev) => ({
        ...prev,
        watchlistCount: listItems.length,
        ratingCount: listItems.filter((i) => (i.score || 0) > 0).length,
      }));
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, [currentUser.id]);

  // Listen for watchlist and read chapter updates
  useEffect(() => {
    const handleWatchlistUpdate = () => {
      const newList = getUserList();
      setUserListState(newList);
      setStats((prev) => ({ ...prev, watchlistCount: Object.keys(newList).length }));
    };
    window.addEventListener("animix_watchlist_updated", handleWatchlistUpdate);
    window.addEventListener("animix_read_chapters_updated", handleWatchlistUpdate);
    return () => {
      window.removeEventListener("animix_watchlist_updated", handleWatchlistUpdate);
      window.removeEventListener("animix_read_chapters_updated", handleWatchlistUpdate);
    };
  }, []);

  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await forceSyncUserDataWithServer();
      const newList = getUserList();
      setUserListState(newList);
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      setLastSyncTime(timeStr);
      showToast(`Синхронизация завершена! Все записи (${result.watchlistCount}), прочитанные главы и история обновлены.`);
      await fetchUserStats();
    } catch (e) {
      console.error("Sync error", e);
      showToast("Данные списка и глав обновлены локально.", "info");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveBio = async () => {
    if (bio.length > 300) return;
    setSavingBio(true);
    const newBio = bio.trim();
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: newBio })
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && data.user) {
          onUpdateUser(data.user);
          const token = getAuthToken();
          if (token) saveAuthData(token, data.user);
        }
      } else {
        const updatedUser = { ...currentUser, bio: newBio };
        onUpdateUser(updatedUser);
        const token = getAuthToken() || "demo_token";
        saveAuthData(token, updatedUser);
      }
      setIsEditingBio(false);
      showToast("Описание профиля успешно обновлено!");
    } catch (e) {
      console.error("Failed to save bio", e);
      const updatedUser = { ...currentUser, bio: newBio };
      onUpdateUser(updatedUser);
      const token = getAuthToken() || "demo_token";
      saveAuthData(token, updatedUser);
      setIsEditingBio(false);
      showToast("Описание сохранено локально.", "info");
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveProfileCustomization = async (updates: Partial<UserProfile>) => {
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && data.user) {
          onUpdateUser(data.user);
          const token = getAuthToken();
          if (token) saveAuthData(token, data.user);
        }
      } else {
        const updatedUser = { ...currentUser, ...updates };
        onUpdateUser(updatedUser);
        const token = getAuthToken() || "demo_token";
        saveAuthData(token, updatedUser);
      }
      showToast("Настройки профиля упешно сохранены!");
    } catch (e) {
      console.error("Failed to update profile customization", e);
      const updatedUser = { ...currentUser, ...updates };
      onUpdateUser(updatedUser);
      const token = getAuthToken() || "demo_token";
      saveAuthData(token, updatedUser);
      showToast("Настройки профиля применены локально.", "info");
    }
  };

  // Direct File Upload Handlers for Avatar and Banner
  const handleDirectAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Максимальный размер файла — 5 МБ", "error");
      return;
    }

    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target?.result as string;
      try {
        const res = await apiFetch("/api/user/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, mimeType: file.type })
        });
        const data = await res.json();
        if (res.ok && data.avatarUrl) {
          onUpdateUser({ ...currentUser, avatarUrl: data.avatarUrl });
          showToast("Аватар успешно загружен и опубликован!");
        } else {
          onUpdateUser({ ...currentUser, avatarUrl: base64Data });
          showToast("Аватар обновлен.");
        }
      } catch (err) {
        console.error("Avatar upload error:", err);
        onUpdateUser({ ...currentUser, avatarUrl: base64Data });
        showToast("Аватар применен локально.", "info");
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDirectBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Максимальный размер файла — 5 МБ", "error");
      return;
    }

    setUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target?.result as string;
      try {
        const res = await apiFetch("/api/user/banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, mimeType: file.type })
        });
        const data = await res.json();
        if (res.ok && data.backgroundBanner) {
          onUpdateUser({ ...currentUser, backgroundBanner: data.backgroundBanner });
          showToast("Обложка профиля успешно обновлена!");
        } else {
          onUpdateUser({ ...currentUser, backgroundBanner: base64Data });
          showToast("Обложка профиля обновлена.");
        }
      } catch (err) {
        console.error("Banner upload error:", err);
        onUpdateUser({ ...currentUser, backgroundBanner: base64Data });
        showToast("Обложка применена локально.", "info");
      } finally {
        setUploadingBanner(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await apiFetch("/api/user/avatar", { method: "DELETE" });
      const defaultAvatar = PRESET_AVATARS[0].url;
      onUpdateUser({ ...currentUser, avatarUrl: defaultAvatar });
      showToast("Аватар удален.");
    } catch (err) {
      console.error("Avatar removal error:", err);
      onUpdateUser({ ...currentUser, avatarUrl: PRESET_AVATARS[0].url });
      showToast("Аватар сброшен.", "info");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveBanner = async () => {
    setUploadingBanner(true);
    try {
      const res = await apiFetch("/api/user/banner", { method: "DELETE" });
      const defaultBanner = PRESET_BANNERS[0].url;
      onUpdateUser({ ...currentUser, backgroundBanner: defaultBanner });
      showToast("Обложка профиля удалена.");
    } catch (err) {
      console.error("Banner removal error:", err);
      onUpdateUser({ ...currentUser, backgroundBanner: PRESET_BANNERS[0].url });
      showToast("Обложка сброшена.", "info");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleProgressIncrement = (mediaId: number, currentProgress: number, maxProgress?: number, media?: MediaItem) => {
    const item = userList[mediaId];
    const newProgress = maxProgress ? Math.min(currentProgress + 1, maxProgress) : currentProgress + 1;
    if (media) {
      toggleChapterRead(mediaId, newProgress, maxProgress, media);
    } else if (item) {
      saveUserListItem(mediaId, {
        ...item,
        progress: newProgress,
        status: maxProgress && newProgress >= maxProgress ? "COMPLETED" : item.status
      });
    }
    setUserListState(getUserList());
  };

  const openCustomizationTab = (tab: "avatar" | "effect" | "banner") => {
    setModalInitialTab(tab);
    setIsCustomizeModalOpen(true);
  };

  const allItems: UserListItem[] = Object.values(userList);

  const currentlyWatchingAnime = allItems.filter(
    (item) => item.status === "WATCHING" && item.media?.type !== "MANGA"
  );

  const currentlyReadingManga = allItems.filter(
    (item) => (item.status === "WATCHING" || item.status === "READING") && item.media?.type === "MANGA"
  );

  const completedCount = allItems.filter((i) => i.status === "COMPLETED").length;
  const defaultBanner = PRESET_BANNERS[0].url;
  const bannerUrl = currentUser.backgroundBanner || defaultBanner;
  const avatarUrl = currentUser.avatarUrl || PRESET_AVATARS[0].url;

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-10">
      {/* 1. HEADER ROW — PROFILE CARD WITH BACKGROUND BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
        {/* Background Banner Image with Dark Gradient Overlay */}
        <div className="relative h-48 sm:h-72 md:h-80 w-full overflow-hidden group">
          <img
            src={bannerUrl}
            alt="Profile Banner"
            className="w-full h-full object-cover object-center filter brightness-90 transition-all duration-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultBanner;
            }}
          />

          {uploadingBanner && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-30 text-white">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <span className="text-xs font-bold">Загрузка обложки...</span>
            </div>
          )}

          {/* Subtle Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />

          {/* Banner Quick Actions (Change/Upload/Delete Banner) */}
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <label className="px-3 py-2 rounded-xl bg-black/80 hover:bg-black/95 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg hover:border-red-500/50 min-h-[44px]">
              <Camera className="w-4 h-4 text-red-400" />
              <span className="inline text-[11px] sm:text-xs">Изменить обложку</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleDirectBannerUpload}
                disabled={uploadingBanner}
                className="hidden"
              />
            </label>

            {currentUser.backgroundBanner && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                disabled={uploadingBanner}
                className="p-2 rounded-xl bg-black/80 hover:bg-red-950/80 text-red-400 hover:text-red-300 text-xs font-bold backdrop-blur-md border border-white/20 hover:border-red-500/50 transition-all flex items-center justify-center cursor-pointer shadow-lg min-h-[44px] min-w-[44px]"
                title="Удалить обложку"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Top Right Action Buttons (Sync + Edit Profile Modal + Logout) */}
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2.5 max-w-[calc(100%-1.25rem)] justify-end">
            {/* Sync Now Button */}
            <button
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
              className={`px-3 py-2 rounded-xl text-xs font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 cursor-pointer shadow-lg min-h-[44px] ${
                isSyncing
                  ? "bg-red-950/80 text-red-200 border-red-500/50 cursor-wait"
                  : "bg-black/70 hover:bg-black/90 text-white border-white/20 hover:border-red-500/50"
              }`}
              title="Синхронизировать данные"
            >
              <RefreshCw className={`w-4 h-4 text-red-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isSyncing ? "Синхронизация..." : "Синхронизировать"}</span>
            </button>

            {/* Profile Customization Button */}
            <button
              type="button"
              onClick={() => openCustomizationTab("avatar")}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold backdrop-blur-md border border-red-500/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Редактировать профиль</span>
              <span className="sm:hidden text-[11px]">Профиль</span>
            </button>

            {/* Logout Button */}
            {onLogoutClick && (
              <button
                type="button"
                onClick={onLogoutClick}
                className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white text-xs font-bold backdrop-blur-md border border-red-800/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg min-h-[44px]"
                title="Выйти из аккаунта"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            )}
          </div>
        </div>

        {/* Header Profile Content Overlay */}
        <div className="relative z-10 -mt-12 sm:-mt-24 px-3 sm:px-8 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 items-center sm:items-start text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 text-center sm:text-left w-full">
            {/* Square Avatar Container */}
            <div className="relative group shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-zinc-950 bg-zinc-900 shadow-2xl relative z-10">
                <img
                  src={avatarUrl}
                  alt={currentUser.username}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                  }}
                />
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Avatar Hover Actions */}
              <div className="absolute inset-0 z-20 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-transform hover:scale-110 shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleDirectAvatarUpload}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
                {currentUser.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-red-900 text-zinc-300 hover:text-white cursor-pointer transition-transform hover:scale-110 shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Удалить аватар"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* User Info (Nickname, Age, Join Date, Bio) */}
            <div className="space-y-2 flex-1 max-w-2xl w-full flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                {/* Nickname with Effect */}
                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight break-words">
                  <NicknameEffect
                    nickname={currentUser.username}
                    effectId={currentUser.nicknameEffect || "none"}
                  />
                </h1>

                {/* AGE & VERIFICATION BADGE */}
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <span className="px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-200 text-xs font-bold shadow-md">
                    {currentUser.age} лет
                  </span>

                  {/* 18+ Verification Badge */}
                  {currentUser.isAdultVerified ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 18+ Подтвержден
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-[11px] flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> До 18 лет
                    </span>
                  )}
                </div>
              </div>

              {/* Join Date / Registration Date */}
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-zinc-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{formatJoinDate(currentUser.createdAt)}</span>
              </div>

              {/* Editable Bio Description */}
              <div className="pt-1">
                {isEditingBio ? (
                  <div className="space-y-2">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 300))}
                      placeholder="Расскажите о себе, любимых аниме и жанрах..."
                      className="w-full bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500 resize-none"
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {bio.length} / 300 символов
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBio(currentUser.bio || "");
                            setIsEditingBio(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 cursor-pointer min-h-[36px]"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBio}
                          disabled={savingBio}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1 min-h-[36px]"
                        >
                          {savingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          <span>{savingBio ? "Сохранение..." : "Сохранить"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group/bio flex items-start justify-center sm:justify-start gap-2">
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic max-w-xl">
                      {currentUser.bio ? `«${currentUser.bio}»` : "Нажмите редактировать, чтобы добавить информацию о себе..."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(true)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                      title="Редактировать описание"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastNotification && (
        <div
          className={`mx-auto max-w-xl p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xl backdrop-blur-md animate-in fade-in ${
            toastNotification.type === "error"
              ? "bg-red-950/90 border-red-500/50 text-red-200"
              : toastNotification.type === "info"
              ? "bg-amber-950/90 border-amber-500/50 text-amber-200"
              : "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastNotification.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. STATISTICS DASHBOARD CARDS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Статистика профиля</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Favorite Count */}
          <div className="bg-zinc-900/90 border border-zinc-800/90 hover:border-red-500/50 p-4 rounded-2xl space-y-2 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Избранное</span>
              <div className="p-2 rounded-xl bg-red-600/10 text-red-500 group-hover:scale-110 transition-transform">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.favoriteCount}
            </div>
            <span className="text-[11px] text-zinc-500 block">Сохраненные релизы</span>
          </div>

          {/* Watchlist Count */}
          <div className="bg-zinc-900/90 border border-zinc-800/90 hover:border-amber-500/50 p-4 rounded-2xl space-y-2 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">В списке</span>
              <div className="p-2 rounded-xl bg-amber-600/10 text-amber-500 group-hover:scale-110 transition-transform">
                <Bookmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.watchlistCount}
            </div>
            <span className="text-[11px] text-zinc-500 block">Аниме и манга</span>
          </div>

          {/* Comment Count */}
          <div className="bg-zinc-900/90 border border-zinc-800/90 hover:border-blue-500/50 p-4 rounded-2xl space-y-2 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Комментарии</span>
              <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.commentCount}
            </div>
            <span className="text-[11px] text-zinc-500 block">Опубликовано постов</span>
          </div>

          {/* Rating Count */}
          <div className="bg-zinc-900/90 border border-zinc-800/90 hover:border-emerald-500/50 p-4 rounded-2xl space-y-2 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Оценки</span>
              <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.ratingCount}
            </div>
            <span className="text-[11px] text-zinc-500 block">Поставлено отзывов</span>
          </div>
        </div>
      </section>

      {/* 3. GENRE PREFERENCES PIE CHART VISUALIZER */}
      <GenrePreferencesChart userListItems={allItems} />

      {/* 4. "CURRENTLY WATCHING" SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Сейчас смотрю</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold font-mono">
                  {currentlyWatchingAnime.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Аниме из вашего списка просмотра в процессе отслеживания
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("userlist")}
            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Весь список</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {currentlyWatchingAnime.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {currentlyWatchingAnime.map((item) => {
              const title = getPrimaryTitle(item.media.title);
              const maxEp = item.media.episodes || 0;
              const formatRu = getRussianFormat(item.media.format);

              return (
                <div
                  key={`watching-${item.mediaId}`}
                  className="group bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-red-500/60 transition-all duration-300 shadow-lg flex flex-col justify-between"
                >
                  <div
                    onClick={() => onSelectMedia(item.media)}
                    className="relative aspect-[2/3] overflow-hidden cursor-pointer bg-zinc-950"
                  >
                    <img
                      src={item.media.coverImage.large}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                      }}
                    />
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/80 backdrop-blur-md text-white border border-white/10">
                      {formatRu}
                    </span>
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => onSelectMedia(item.media)}
                        className="font-bold text-xs text-white line-clamp-1 group-hover:text-red-400 transition-colors cursor-pointer"
                      >
                        {title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                        <span>Прогресс:</span>
                        <strong className="text-white font-mono font-bold">
                          {item.progress} {maxEp ? `/ ${maxEp}` : "сер."}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProgressIncrement(item.mediaId, item.progress, maxEp || undefined, item.media)}
                      className="w-full py-1.5 rounded-xl bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                      title="Добавить +1 просмотренную серию"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Серия</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <Tv className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Ничего не смотрю сейчас — самое время начать что-то новое!
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Добавляйте релизы в статус «Смотрю», чтобы видеть их прямо на главной странице профиля
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("anime")}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-950/50 inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Film className="w-4 h-4" />
              <span>Перейти в каталог аниме</span>
            </button>
          </div>
        )}
      </section>

      {/* 5. "CURRENTLY READING" SECTION */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Сейчас читаю</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-600/20 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
                  {currentlyReadingManga.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Манга и ранобэ из вашего списка в процессе чтения
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("userlist")}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Весь список</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {currentlyReadingManga.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {currentlyReadingManga.map((item) => {
              const title = getPrimaryTitle(item.media.title);
              const maxCh = item.media.chapters || 0;

              return (
                <div
                  key={`reading-${item.mediaId}`}
                  className="group bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-amber-500/60 transition-all duration-300 shadow-lg flex flex-col justify-between"
                >
                  <div
                    onClick={() => onSelectMedia(item.media)}
                    className="relative aspect-[2/3] overflow-hidden cursor-pointer bg-zinc-950"
                  >
                    <img
                      src={item.media.coverImage.large}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                      }}
                    />
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-600 text-white">
                      МАНГА
                    </span>
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => onSelectMedia(item.media)}
                        className="font-bold text-xs text-white line-clamp-1 group-hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                        <span>Прогресс:</span>
                        <strong className="text-white font-mono font-bold">
                          {item.progress} {maxCh ? `/ ${maxCh}` : "глав"}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProgressIncrement(item.mediaId, item.progress, maxCh || undefined, item.media)}
                      className="w-full py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                      title="Прочитано +1 глава"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Глава</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Пока ничего не читаете — откройте каталог манги!
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Отслеживайте прочитанные главы и тома любимых произведений
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("manga")}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-lg shadow-amber-950/50 inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <BookOpen className="w-4 h-4" />
              <span>Перейти в каталог манги</span>
            </button>
          </div>
        )}
      </section>

      {/* Profile Customization Modal */}
      <ProfileCustomizationModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfileCustomization}
        initialTab={modalInitialTab}
      />
    </div>
  );
};
