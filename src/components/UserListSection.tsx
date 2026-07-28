import React, { useState } from "react";
import { Bookmark, Star, Check, Trash2, Plus, Play, BookOpen, Tv, BarChart2 } from "lucide-react";
import { MediaItem, UserListItem, UserWatchStatus } from "../types";
import { getPrimaryTitle, getRussianFormat, getUserList, removeUserListItem, saveUserListItem, USER_STATUS_MAP_RU, toggleChapterRead } from "../utils/helpers";
import { SeasonalGoalTracker } from "./SeasonalGoalTracker";

interface UserListSectionProps {
  onSelectMedia: (media: MediaItem) => void;
}

export const UserListSection: React.FC<UserListSectionProps> = ({ onSelectMedia }) => {
  const [activeTab, setActiveTab] = useState<UserWatchStatus>("WATCHING");
  const [userList, setUserListState] = useState<Record<number, UserListItem>>(() => getUserList());

  React.useEffect(() => {
    const handleUpdate = () => {
      setUserListState(getUserList());
    };
    window.addEventListener("animix_watchlist_updated", handleUpdate);
    window.addEventListener("animix_read_chapters_updated", handleUpdate);
    return () => {
      window.removeEventListener("animix_watchlist_updated", handleUpdate);
      window.removeEventListener("animix_read_chapters_updated", handleUpdate);
    };
  }, []);

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

  const handleRemove = (mediaId: number) => {
    removeUserListItem(mediaId);
    setUserListState(getUserList());
  };

  const allItems: UserListItem[] = Object.values(userList);
  const filteredItems = allItems.filter((i) => i.status === activeTab);

  // Statistics calculation
  const totalTitles = allItems.length;
  const completedTitles = allItems.filter((i) => i.status === "COMPLETED").length;
  const watchingTitles = allItems.filter((i) => i.status === "WATCHING" || i.status === "READING").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Title & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-red-500 fill-current" />
            Мой Список Просмотра
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Ваши закладки, прогресс просмотра серий и чтение глав манги
          </p>
        </div>

        {/* Stats Summary Widget */}
        <div className="flex items-center space-x-4 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
          <div className="text-center px-3">
            <span className="text-xs text-zinc-500 block font-medium">Всего</span>
            <span className="text-base font-black text-white">{totalTitles}</span>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-center px-3">
            <span className="text-xs text-zinc-500 block font-medium">Смотрю</span>
            <span className="text-base font-black text-red-400">{watchingTitles}</span>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-center px-3">
            <span className="text-xs text-zinc-500 block font-medium">Завершено</span>
            <span className="text-base font-black text-emerald-400">{completedTitles}</span>
          </div>
        </div>
      </div>

      {/* Seasonal Goal Tracker Widget */}
      <SeasonalGoalTracker completedCount={completedTitles} />

      {/* Status Tabs Header */}
      <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-2">
        {(["WATCHING", "PLANNING", "COMPLETED", "DROPPED"] as UserWatchStatus[]).map((tab) => {
          const count = allItems.filter((i) => i.status === tab).length;
          const isSelected = activeTab === tab;

          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border ${
                isSelected 
                  ? "bg-red-600 border-red-500 text-white shadow-lg" 
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <span>{USER_STATUS_MAP_RU[tab]}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* User Items List Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 text-zinc-500 my-8">
          <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold text-zinc-300">В этой категории пока нет тайтлов</h3>
          <p className="text-xs text-zinc-500 mt-1">Добавляйте аниме и мангу из каталога или с главной страницы.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const media = item.media;
            if (!media) return null;

            const title = getPrimaryTitle(media.title);
            const cover = media.coverImage?.extraLarge || media.coverImage?.large;
            const maxEpisodes = media.type === 'MANGA' ? media.chapters : media.episodes;

            return (
              <div 
                key={item.mediaId}
                className="flex p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all group"
              >
                {/* Poster */}
                <div 
                  onClick={() => onSelectMedia(media)}
                  className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-950 cursor-pointer"
                >
                  <img 
                    src={cover} 
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80";
                    }}
                  />
                </div>

                {/* Info */}
                <div className="ml-4 flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        {getRussianFormat(media.format)}
                      </span>
                      <button 
                        onClick={() => handleRemove(item.mediaId)}
                        className="p-1 text-zinc-600 hover:text-red-500 transition-colors"
                        title="Удалить из списка"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 
                      onClick={() => onSelectMedia(media)}
                      className="font-bold text-sm text-white line-clamp-1 group-hover:text-red-400 transition-colors cursor-pointer mt-0.5"
                    >
                      {title}
                    </h3>

                    {/* Progress Control */}
                    <div className="mt-2.5 flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-300 font-semibold">
                        Прогресс: <strong className="text-red-400">{item.progress}</strong> / {maxEpisodes || "—"}
                      </span>
                      <button 
                        onClick={() => handleProgressIncrement(item.mediaId, item.progress, maxEpisodes, media)}
                        className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow min-h-[36px] cursor-pointer"
                        title={media.type === 'MANGA' ? "Добавить +1 прочитанную главу" : "Добавить +1 серию"}
                      >
                        <Plus className="w-3.5 h-3.5" /> +1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
