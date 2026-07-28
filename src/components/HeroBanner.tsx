import React from "react";
import { Star, Play, Bookmark, Sparkles, Calendar, Layers } from "lucide-react";
import { MediaItem } from "../types";
import { getPrimaryTitle, getRussianFormat, getRussianGenre, getUserList, saveUserListItem } from "../utils/helpers";

interface HeroBannerProps {
  items: MediaItem[];
  onSelectMedia: (media: MediaItem) => void;
  onOpenLightbox: (imageUrl: string, title: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items, onSelectMedia, onOpenLightbox }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const featured = items[currentIndex] || items[0];

  React.useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (!featured) return null;

  const primaryTitle = getPrimaryTitle(featured.title);
  const userList = getUserList();
  const userItem = userList[featured.id];
  const bannerArt = featured.bannerImage || featured.coverImage?.extraLarge;
  const coverArt = featured.coverImage?.extraLarge || featured.coverImage?.large;

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveUserListItem(featured.id, {
      mediaId: featured.id,
      media: featured,
      status: featured.type === 'MANGA' ? 'READING' : 'WATCHING',
      progress: 0
    });
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl my-6">
      {/* Background Banner */}
      <div className="absolute inset-0 z-0">
        {bannerArt && (
          <img 
            src={bannerArt} 
            alt={primaryTitle}
            className="w-full h-full object-cover object-center filter blur-[1px] brightness-[0.45] transition-all duration-1000 scale-105"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/40" />
      </div>

      {/* Hero Content Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 md:py-14 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
        {/* Left Text Column */}
        <div className="md:col-span-8 flex flex-col items-start space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5" /> Тренды сезона
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700">
              {getRussianFormat(featured.format)}
            </span>
            {featured.averageScore && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-zinc-950 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-zinc-950 stroke-none" />
                {(featured.averageScore / 10).toFixed(1)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            {primaryTitle}
          </h1>

          {/* Genres & Year */}
          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-zinc-300">
            {featured.seasonYear && (
              <span className="flex items-center gap-1 text-zinc-400">
                <Calendar className="w-4 h-4 text-red-500" /> {featured.seasonYear} г.
              </span>
            )}
            {featured.episodes && (
              <span className="flex items-center gap-1 text-zinc-400">
                <Layers className="w-4 h-4 text-red-500" /> {featured.episodes} сер.
              </span>
            )}
            <div className="flex flex-wrap gap-1.5">
              {featured.genres?.slice(0, 4).map((g) => (
                <span key={g} className="px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-300 text-xs border border-zinc-700/50">
                  {getRussianGenre(g)}
                </span>
              ))}
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-sm md:text-base text-zinc-300/90 line-clamp-3 max-w-2xl font-normal leading-relaxed">
            {featured.russianDescription || featured.description?.replace(/<[^>]*>?/gm, '') || "Описание недоступно."}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button 
              onClick={() => onSelectMedia(featured)}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-950/50 hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-current" /> Открыть карточку
            </button>

            <button 
              onClick={handleBookmark}
              className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 border ${
                userItem 
                  ? "bg-zinc-800 text-red-400 border-red-500/50" 
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${userItem ? "fill-current text-red-500" : ""}`} />
              {userItem ? "В списке" : "Добавить в список"}
            </button>
          </div>
        </div>

        {/* Right Poster Column — Visible on Mobile & Desktop */}
        <div className="md:col-span-4 flex justify-center md:justify-end mt-2 md:mt-0">
          {coverArt && (
            <div 
              onClick={() => onOpenLightbox(coverArt, primaryTitle)}
              className="relative group cursor-pointer aspect-[2/3] w-36 sm:w-48 md:w-56 rounded-xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300"
            >
              <img 
                src={coverArt} 
                alt={primaryTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                  Увеличить постер
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-6 z-20 flex items-center space-x-2">
          {items.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-6 bg-red-500" : "w-2 bg-zinc-700 hover:bg-zinc-500"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
