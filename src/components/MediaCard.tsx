import React, { useState } from "react";
import { Star, Play, Plus, Check, Bookmark, Tv, BookOpen, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { MediaItem } from "../types";
import { getPrimaryTitle, getSubtitle, getRussianFormat, getMediaCategoryLabel, getRussianGenre, getUserList, saveUserListItem } from "../utils/helpers";

interface MediaCardProps {
  media: MediaItem;
  onClick: (media: MediaItem) => void;
  onQuickAdd?: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, onClick, onQuickAdd }) => {
  const primaryTitle = getPrimaryTitle(media.title);
  const subtitle = getSubtitle(media.title);
  const userList = getUserList();
  const userItem = userList[media.id];

  // Image integrity rule: only use official cover image or fallback placeholder
  const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;
  const isAdultContent = Boolean(media.isAdult || media.genres?.includes("Hentai"));
  const [showAdultContent, setShowAdultContent] = React.useState<boolean>(false);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userItem) {
      saveUserListItem(media.id, {
        ...userItem,
        status: userItem.status === 'COMPLETED' ? 'WATCHING' : 'COMPLETED'
      });
    } else {
      saveUserListItem(media.id, {
        mediaId: media.id,
        media,
        status: media.type === 'MANGA' ? 'READING' : 'WATCHING',
        progress: 0
      });
    }
    if (onQuickAdd) onQuickAdd();
  };

  return (
    <div 
      onClick={() => onClick(media)}
      className="group relative flex flex-col bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-950/20 transition-all duration-300 cursor-pointer"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={primaryTitle}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-900 text-zinc-500">
            {media.type === 'MANGA' ? <BookOpen className="w-10 h-10 mb-2 opacity-50" /> : <Tv className="w-10 h-10 mb-2 opacity-50" />}
            <span className="text-xs font-medium">{primaryTitle}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          {/* Format & 18+ Badges */}
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-zinc-950/80 text-zinc-300 backdrop-blur-md border border-white/10">
              {getMediaCategoryLabel(media)}
            </span>
            {(media.isAdult || media.genres?.includes("Hentai")) && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-red-600 text-white backdrop-blur-md shadow">
                18+
              </span>
            )}
          </div>

          {/* Score Badge */}
          {media.averageScore ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/90 text-zinc-950 backdrop-blur-md shadow-md">
              <Star className="w-3 h-3 fill-zinc-950 stroke-none" />
              <span>{(media.averageScore / 10).toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        {/* Bottom Quick Status Indicator */}
        {userItem && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-600/90 text-white backdrop-blur-md flex items-center gap-1 shadow">
              <Check className="w-3 h-3" />
              {userItem.status === 'WATCHING' ? 'Смотрю' : userItem.status === 'COMPLETED' ? 'Завершено' : 'В списке'}
            </span>
          </div>
        )}

        {/* Hover Quick Action Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-zinc-950/40 backdrop-blur-[2px]">
          <button 
            onClick={handleBookmark}
            className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center"
            title={userItem ? "Изменить в списке" : "Добавить в список"}
          >
            {userItem ? <Bookmark className="w-5 h-5 fill-current" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Content Meta */}
      <div className="p-3 flex flex-col flex-grow justify-between bg-gradient-to-b from-zinc-900/80 to-zinc-950/90">
        <div>
          <h3 className="font-semibold text-sm text-zinc-100 line-clamp-1 group-hover:text-red-400 transition-colors">
            {primaryTitle}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/50 pt-2">
          <span>
            {media.type === 'MANGA' ? (
              media.chapters ? `${media.chapters} гл.` : (media.status === 'RELEASING' ? 'Онгоинг' : '—')
            ) : (
              media.episodes ? `${media.episodes} сер.` : (media.nextAiringEpisode ? `Эп. ${media.nextAiringEpisode.episode}` : (media.status === 'RELEASING' ? 'Онгоинг' : 'Анонс'))
            )}
          </span>
          <span className="text-zinc-500">
            {media.genres?.[0] ? getRussianGenre(media.genres[0]) : (media.seasonYear || '')}
          </span>
        </div>
      </div>
    </div>
  );
};
