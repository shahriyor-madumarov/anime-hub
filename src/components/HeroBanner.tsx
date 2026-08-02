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
    <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800/90 shadow-2xl my-4 sm:my-6 transition-all min-h-[360px] sm:min-h-[420px] lg:max-h-[500px] flex items-center">
      {/* Background Banner with Glass Overlay */}
      <div className="absolute inset-0 z-0">
        {bannerArt && (
          <img 
            src={bannerArt} 
            alt={primaryTitle}
            className="w-full h-full object-cover object-center filter blur-[1px] brightness-[0.35] transition-all duration-1000 scale-105"
            referrerPolicy="no-referrer"
          />
        )}
        {/* Dark gradient overlay behind left text column */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/95 to-zinc-950/30 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50 z-[1]" />
      </div>

      {/* Hero Content Grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
        {/* Left Text Column */}
        <div className="md:col-span-8 flex flex-col items-start space-y-3 sm:space-y-4 w-full">
          
          {/* Dark Glass Container for Text Legibility */}
          <div className="bg-zinc-950/75 p-3.5 sm:p-5 md:p-6 rounded-2xl border border-white/10 backdrop-blur-md space-y-3 w-full overflow-hidden">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-full">
              <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 sm:gap-1.5 shadow-md">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Тренды сезона
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-zinc-900/90 text-zinc-200 border border-zinc-700/80">
                {getRussianFormat(featured.format)}
              </span>
              {featured.averageScore && (
                <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-amber-500 text-zinc-950 flex items-center gap-1 shadow">
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-zinc-950 stroke-none" />
                  {(featured.averageScore / 10).toFixed(1)}
                </span>
              )}
            </div>

            {/* Title - max 2 lines */}
            <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-lg line-clamp-2 break-words">
              {primaryTitle}
            </h1>

            {/* Genres & Year */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-zinc-300 max-w-full">
              {featured.seasonYear && (
                <span className="flex items-center gap-1 text-zinc-300 font-semibold shrink-0">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" /> {featured.seasonYear} г.
                </span>
              )}
              {featured.episodes && (
                <span className="flex items-center gap-1 text-zinc-300 font-semibold shrink-0">
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" /> {featured.episodes} сер.
                </span>
              )}
              <div className="flex flex-wrap gap-1.5 max-w-full">
                {featured.genres?.slice(0, 4).map((g) => (
                  <span key={g} className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-zinc-800/90 text-zinc-100 text-[11px] sm:text-xs font-semibold border border-zinc-700/80 shadow-sm shrink-0">
                    {getRussianGenre(g)}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <p className="text-xs sm:text-sm text-zinc-300/90 line-clamp-2 max-w-2xl font-normal leading-relaxed">
              {featured.russianDescription || featured.description?.replace(/<[^>]*>?/gm, '') || "Описание недоступно."}
            </p>

            {/* Action Buttons - Stacked on mobile (<480px), full width */}
            <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2.5 sm:gap-3 pt-2 w-full">
              <button 
                onClick={() => onSelectMedia(featured)}
                className="w-full min-[480px]:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-current" /> Смотреть карточку
              </button>

              <button 
                onClick={handleBookmark}
                className={`w-full min-[480px]:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer active:scale-95 shrink-0 ${
                  userItem 
                    ? "bg-zinc-800 text-red-400 border-red-500/50" 
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${userItem ? "fill-current text-red-500" : ""}`} />
                {userItem ? "В списке" : "Добавить в список"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Poster Column */}
        <div className="md:col-span-4 hidden md:flex justify-end">
          {coverArt && (
            <div 
              onClick={() => onOpenLightbox(coverArt, primaryTitle)}
              className="relative group cursor-pointer aspect-[2/3] w-36 sm:w-44 lg:w-48 rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300 max-h-[340px]"
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
              <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                  Увеличить
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-4 sm:right-6 z-20 flex items-center space-x-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Слайд ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? "w-6 bg-red-500" : "w-2 bg-zinc-600 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
