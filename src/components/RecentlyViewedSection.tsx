import React, { useState, useEffect } from "react";
import { History, Trash2, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";
import { getRecentlyViewed, clearRecentlyViewed, syncRecentlyViewedWithServer } from "../utils/helpers";

interface RecentlyViewedSectionProps {
  onSelectMedia: (media: MediaItem) => void;
  onShowToast?: (message: string, type?: "success" | "info" | "error") => void;
}

export const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({ onSelectMedia, onShowToast }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [localToast, setLocalToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const refreshItems = () => {
    setItems(getRecentlyViewed());
  };

  useEffect(() => {
    refreshItems();
    syncRecentlyViewedWithServer().then((list) => {
      if (list && list.length > 0) {
        setItems(list);
      }
    });

    const handleUpdate = () => refreshItems();
    window.addEventListener("animix_recently_viewed_updated", handleUpdate);
    return () => {
      window.removeEventListener("animix_recently_viewed_updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (localToast) {
      const timer = setTimeout(() => setLocalToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [localToast]);

  if (items.length === 0) {
    return null;
  }

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    if (!confirm("Очистить историю просмотренных аниме и манги?")) {
      return;
    }

    setIsDeleting(true);

    try {
      await clearRecentlyViewed();

      setItems([]);

      const successMsg = "История успешно очищена.";
      if (onShowToast) {
        onShowToast(successMsg, "success");
      } else {
        setLocalToast({ message: successMsg, type: "success" });
      }
    } catch (err: any) {
      console.error("Failed to clear recently viewed history:", err);
      const errorMsg = "Не удалось очистить историю. Проверьте соединение с сетью.";
      if (onShowToast) {
        onShowToast(errorMsg, "error");
      } else {
        setLocalToast({ message: errorMsg, type: "error" });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="my-10 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-sm relative overflow-hidden">
      {/* Decorative subtle background gradient blur */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {localToast && (
        <div className={`mb-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg backdrop-blur-md animate-in fade-in ${
          localToast.type === "error"
            ? "bg-red-950/90 border-red-500/50 text-red-200"
            : "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
        }`}>
          <div className="flex items-center gap-2">
            {localToast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{localToast.message}</span>
          </div>
          <button type="button" onClick={() => setLocalToast(null)} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Вы недавно смотрели</h2>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold font-mono">
                {items.length}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Быстрый доступ к релизам, которые вы открывали ранее
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          disabled={isDeleting}
          className="text-xs font-semibold text-zinc-400 hover:text-red-400 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
          title="Очистить историю просмотров"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          <span>{isDeleting ? "Очистка..." : "Очистить историю"}</span>
        </button>
      </div>

      {/* Grid of recently viewed items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10">
        {items.slice(0, 12).map((media) => (
          <MediaCard key={`recently-viewed-${media.id}`} media={media} onClick={onSelectMedia} />
        ))}
      </div>
    </section>
  );
};
