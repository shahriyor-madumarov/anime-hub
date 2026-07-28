import React from "react";
import { Clock, Tv, ChevronRight, Calendar } from "lucide-react";
import { AiringSchedule, MediaItem } from "../types";
import { formatTimeUntilAiring, getPrimaryTitle, getRussianFormat } from "../utils/helpers";

interface AiringTodaySectionProps {
  schedules: AiringSchedule[];
  onSelectMedia: (media: MediaItem) => void;
  onOpenCalendar: () => void;
}

export const AiringTodaySection: React.FC<AiringTodaySectionProps> = ({ schedules, onSelectMedia, onOpenCalendar }) => {
  // Filter schedules for today / near future
  const todaySchedules = schedules.slice(0, 8);

  if (todaySchedules.length === 0) return null;

  return (
    <section className="my-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              График релиза серий
            </h2>
            <p className="text-xs text-zinc-400">Сегодняшние эпизоды с таймером обратного отсчета</p>
          </div>
        </div>

        <button 
          onClick={onOpenCalendar}
          className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
        >
          <Calendar className="w-3.5 h-3.5" /> Календарь на неделю <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal Scroll Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {todaySchedules.map((schedule) => {
          const media = schedule.media;
          if (!media) return null;

          const title = getPrimaryTitle(media.title);
          const cover = media.coverImage?.extraLarge || media.coverImage?.large;

          return (
            <div 
              key={schedule.id}
              onClick={() => onSelectMedia(media)}
              className="flex items-center p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-red-500/50 transition-all duration-200 cursor-pointer group shadow-md"
            >
              {/* Poster */}
              <div className="relative w-16 h-22 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
                {cover ? (
                  <img 
                    src={cover} 
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                    <Tv className="w-6 h-6" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white">
                  {schedule.episode} сер.
                </span>
              </div>

              {/* Text Info */}
              <div className="ml-3 flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    {getRussianFormat(media.format)}
                  </span>
                  <h4 className="font-semibold text-xs text-white line-clamp-2 group-hover:text-red-400 transition-colors mt-0.5">
                    {title}
                  </h4>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-red-400 bg-red-950/40 border border-red-900/40 px-2 py-1 rounded-md w-fit">
                  <Clock className="w-3 h-3 text-red-500" />
                  <span>{formatTimeUntilAiring(schedule.timeUntilAiring)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
