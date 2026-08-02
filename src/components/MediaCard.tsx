import React from "react";
import { Star, Plus, Check, Bookmark, Tv, BookOpen } from "lucide-react";
import { MediaItem } from "../types";
import { getPrimaryTitle, getSubtitle, getMediaCategoryLabel, getRussianGenre, getUserList, saveUserListItem } from "../utils/helpers";

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

  const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;

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
      className="group relative flex flex-col h-full bg-zinc-900/60 rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-red-500/60 hover:shadow-2xl hover:shadow-red-950/30 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer active:scale-98 select-none"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950 flex-shrink-0">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={primaryTitle}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-900 text-zinc-500">
            {media.type === 'MANGA' ? <BookOpen className="w-10 h-10 mb-2 opacity-50" /> : <Tv className="w-10 h-10 mb-2 opacity-50" />}
            <span className="text-xs font-medium line-clamp-2">{primaryTitle}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-85 group-hover:opacity-65 transition-opacity pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between z-10 pointer-events-none gap-1">
          {/* Format & 18+ Badges */}
          <div className="flex items-center gap-1 flex-wrap min-w-0 max-w-[calc(100%-3rem)]">
            <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase bg-zinc-950/90 text-zinc-200 backdrop-blur-md border border-white/10 shadow-sm truncate">
              {getMediaCategoryLabel(media)}
            </span>
            {(media.isAdult || media.genres?.includes("Hentai")) && (
              <span className="px-1 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black tracking-wider bg-red-600 text-white backdrop-blur-md shadow-md shrink-0">
                18+
              </span>
            )}
          </div>

          {/* Score Badge */}
          {media.averageScore ? (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black bg-amber-500 text-zinc-950 backdrop-blur-md shadow-md shrink-0">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-zinc-950 stroke-none" />
              <span>{(media.averageScore / 10).toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        {/* Bottom Quick Status Indicator */}
        {userItem && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white backdrop-blur-md flex items-center gap-1 shadow-md">
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
              {userItem.status === 'WATCHING' ? 'Смотрю' : userItem.status === 'COMPLETED' ? 'Завершено' : 'В списке'}
            </span>
          </div>
        )}

        {/* Hover / Touch Quick Action Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-zinc-950/40 backdrop-blur-[2px]">
          <button 
            onClick={handleBookmark}
            aria-label={userItem ? "Изменить в списке" : "Добавить в список"}
            className="min-h-[48px] min-w-[48px] p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-90"
            title={userItem ? "Изменить в списке" : "Добавить в список"}
          >
            {userItem ? <Bookmark className="w-5 h-5 fill-current" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Content Meta */}
      <div className="p-3 flex flex-col flex-grow justify-between bg-gradient-to-b from-zinc-900/90 to-zinc-950">
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-1 group-hover:text-red-400 transition-colors leading-tight">
            {primaryTitle}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2 font-medium">
          <span>
            {media.type === 'MANGA' ? (
              media.chapters ? `${media.chapters} гл.` : (media.status === 'RELEASING' ? 'Онгоинг' : '—')
            ) : (
              media.episodes ? `${media.episodes} сер.` : (media.nextAiringEpisode ? `Эп. ${media.nextAiringEpisode.episode}` : (media.status === 'RELEASING' ? 'Онгоинг' : 'Анонс'))
            )}
          </span>
          <span className="text-zinc-400 truncate max-w-[80px]">
            {media.genres?.[0] ? getRussianGenre(media.genres[0]) : (media.seasonYear || '')}
          </span>
        </div>
      </div>
    </div>
  );
};
