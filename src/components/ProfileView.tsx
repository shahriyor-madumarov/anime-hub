import React, { useState, useEffect } from "react";
import { 
  User, ShieldCheck, ShieldAlert, Sparkles, Edit3, Camera, Save, 
  Tv, BookOpen, Film, Bookmark, Play, Plus, Check, ExternalLink, Calendar, Mail, Lock,
  RefreshCw, CheckCircle2
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
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  onSelectMedia,
  onNavigateTab
}) => {
  const [bio, setBio] = useState(currentUser.bio || "");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [userList, setUserListState] = useState<Record<number, UserListItem>>(() => getUserList());

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncNotification, setSyncNotification] = useState<{
    show: boolean;
    message: string;
  } | null>(null);

  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await forceSyncUserDataWithServer();
      setUserListState(getUserList());
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      setLastSyncTime(timeStr);
      setSyncNotification({
        show: true,
        message: `Синхронизация завершена! Все записи (${result.watchlistCount}), прочитанные главы и история просмотра обновлены.`
      });
      setTimeout(() => {
        setSyncNotification(null);
      }, 5000);
    } catch (e) {
      console.error("Sync error", e);
      setSyncNotification({
        show: true,
        message: "Данные списка и глав обновлены локально."
      });
      setTimeout(() => setSyncNotification(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen for watchlist and read chapter updates
  useEffect(() => {
    const handleWatchlistUpdate = () => {
      setUserListState(getUserList());
    };
    window.addEventListener("animix_watchlist_updated", handleWatchlistUpdate);
    window.addEventListener("animix_read_chapters_updated", handleWatchlistUpdate);
    return () => {
      window.removeEventListener("animix_watchlist_updated", handleWatchlistUpdate);
      window.removeEventListener("animix_read_chapters_updated", handleWatchlistUpdate);
    };
  }, []);

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
    } catch (e) {
      console.error("Failed to save bio", e);
      const updatedUser = { ...currentUser, bio: newBio };
      onUpdateUser(updatedUser);
      const token = getAuthToken() || "demo_token";
      saveAuthData(token, updatedUser);
      setIsEditingBio(false);
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
    } catch (e) {
      console.error("Failed to update profile customization", e);
      const updatedUser = { ...currentUser, ...updates };
      onUpdateUser(updatedUser);
      const token = getAuthToken() || "demo_token";
      saveAuthData(token, updatedUser);
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

  const allItems: UserListItem[] = Object.values(userList);

  // Separate currently watching (Anime) and currently reading (Manga)
  const currentlyWatchingAnime = allItems.filter(
    (item) => item.status === "WATCHING" && item.media?.type !== "MANGA"
  );

  const currentlyReadingManga = allItems.filter(
    (item) => (item.status === "WATCHING" || item.status === "READING") && item.media?.type === "MANGA"
  );

  const completedCount = allItems.filter((i) => i.status === "COMPLETED").length;
  const totalCount = allItems.length;

  const defaultBanner = PRESET_BANNERS[0].url;
  const bannerUrl = currentUser.backgroundBanner || defaultBanner;
  const avatarUrl = currentUser.avatarUrl || PRESET_AVATARS[0].url;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* 1. HEADER ROW — PROFILE CARD WITH BACKGROUND BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
        {/* Background Banner Image with Dark Gradient Overlay */}
        <div className="relative h-64 sm:h-72 md:h-80 w-full overflow-hidden">
          <img
            src={bannerUrl}
            alt="Profile Banner"
            className="w-full h-full object-cover object-center filter brightness-90 transition-all duration-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultBanner;
            }}
          />
          {/* Subtle Gradient Overlays for readable text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />

          {/* Top Right Action Buttons (Sync Now + Customization) */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5">
            {/* Sync Now Button */}
            <button
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold backdrop-blur-md border transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isSyncing
                  ? "bg-red-950/80 text-red-200 border-red-500/50 cursor-wait"
                  : "bg-black/60 hover:bg-black/90 text-white border-white/10 hover:border-red-500/50"
              }`}
              title="Синхронизировать историю просмотра, список и прочитанные главы с сервером"
            >
              <RefreshCw className={`w-4 h-4 text-red-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Синхронизация..." : "Синхронизировать"}</span>
            </button>

            {/* Profile Customization Button */}
            <button
              onClick={() => setIsCustomizeModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/90 text-white text-xs font-bold backdrop-blur-md border border-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:border-red-500/50"
            >
              <Sparkles className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Оформление профиля</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner Toast */}
        {syncNotification && syncNotification.show && (
          <div className="mx-6 mt-4 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium shadow-xl animate-in fade-in backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncNotification.message}</span>
            </div>
            {lastSyncTime && (
              <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0 ml-2">
                в {lastSyncTime}
              </span>
            )}
          </div>
        )}

        {/* Header Profile Content Overlay */}
        <div className="relative z-10 -mt-24 sm:-mt-28 px-6 sm:px-8 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
            {/* Small Square Avatar with Rounded Corners */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-zinc-950 bg-zinc-900 shadow-2xl relative z-10">
                <img
                  src={avatarUrl}
                  alt={currentUser.username}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                  }}
                />
              </div>
              <button
                onClick={() => setIsCustomizeModalOpen(true)}
                className="absolute inset-0 z-20 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-red-400" />
              </button>
            </div>

            {/* User Info (Nickname, Effect, Age Label ONLY, Bio) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {/* Nickname with Effect */}
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  <NicknameEffect
                    nickname={currentUser.username}
                    effectId={currentUser.nicknameEffect || "none"}
                  />
                </h1>

                {/* COMPUTED AGE LABEL ONLY (No DOB revealed) */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-200 text-xs font-bold shadow-md">
                    {currentUser.age} лет
                  </span>

                  {/* 18+ Verification Badge */}
                  {currentUser.isAdultVerified ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 18+
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-[11px] flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> &lt;18
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Bio Description */}
              <div className="max-w-xl">
                {isEditingBio ? (
                  <div className="space-y-2 mt-2">
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
                          onClick={() => {
                            setBio(currentUser.bio || "");
                            setIsEditingBio(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handleSaveBio}
                          disabled={savingBio}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingBio ? "Сохранение..." : "Сохранить"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group/bio flex items-start gap-2 mt-1">
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic">
                      {currentUser.bio ? `«${currentUser.bio}»` : "Нажмите, чтобы добавить описание о себе..."}
                    </p>
                    <button
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

          {/* Quick Stats Summary Widgets */}
          <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
            <div className="bg-zinc-900/80 border border-zinc-800/80 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <Tv className="w-4 h-4 text-red-500" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Смотрю</span>
                <span className="text-sm font-black text-white">{currentlyWatchingAnime.length} релиза</span>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/80 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <Check className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Завершено</span>
                <span className="text-sm font-black text-white">{completedCount} тайтла</span>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/80 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Всего в списке</span>
                <span className="text-sm font-black text-white">{totalCount} записей</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GENRE PREFERENCES PIE CHART VISUALIZER */}
      <GenrePreferencesChart userListItems={allItems} />

      {/* 3. "CURRENTLY WATCHING" SECTION ("СЕЙЧАС СМОТРЮ") */}
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
            onClick={() => onNavigateTab("userlist")}
            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Весь список</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Watching List Content */}
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
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80";
                      }}
                    />
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/80 backdrop-blur-md text-white border border-white/10">
                      {formatRu}
                    </span>
                  </div>

                  {/* Card Info & Episode Progress */}
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

                    {/* Progress Increment Button */}
                    <button
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
          /* Friendly Empty State for Currently Watching */
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
              onClick={() => onNavigateTab("anime")}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-950/50 inline-flex items-center gap-2 cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>Перейти в каталог аниме</span>
            </button>
          </div>
        )}
      </section>

      {/* 3. "CURRENTLY READING" SECTION ("СЕЙЧАС ЧИТАЮ MANGA") */}
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
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80";
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
              onClick={() => onNavigateTab("manga")}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-lg shadow-amber-950/50 inline-flex items-center gap-2 cursor-pointer"
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
      />
    </div>
  );
};
