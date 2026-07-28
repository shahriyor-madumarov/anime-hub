import React, { useState } from "react";
import { Calendar as CalendarIcon, Clock, Filter, Tv, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { AiringSchedule, MediaItem } from "../types";
import { formatAiringTime, formatTimeUntilAiring, getDayOfWeekRu, getPrimaryTitle, getRussianFormat, getRussianGenre } from "../utils/helpers";

interface ReleaseCalendarViewProps {
  schedules: AiringSchedule[];
  onSelectMedia: (media: MediaItem) => void;
}

const DAYS_OF_WEEK = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье"
];

export const ReleaseCalendarView: React.FC<ReleaseCalendarViewProps> = ({ schedules, onSelectMedia }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const today = new Date().getDay(); // 0 is Sunday
    return today === 0 ? 6 : today - 1; // Map to 0 (Monday) .. 6 (Sunday)
  });

  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");

  // Group schedules by Day of Week
  const groupedByDay: Record<string, AiringSchedule[]> = {
    Понедельник: [],
    Вторник: [],
    Среда: [],
    Четверг: [],
    Пятница: [],
    Суббота: [],
    Воскресенье: []
  };

  // Collect all available genres for filtering
  const allGenresSet = new Set<string>();

  schedules.forEach((sch) => {
    if (!sch.media) return;
    const dayName = getDayOfWeekRu(sch.airingAt);
    if (groupedByDay[dayName]) {
      groupedByDay[dayName].push(sch);
    }
    sch.media.genres?.forEach((g) => allGenresSet.add(g));
  });

  const dayName = DAYS_OF_WEEK[selectedDayIndex];
  const activeSchedules = (groupedByDay[dayName] || []).filter((sch) => {
    if (selectedGenre !== "ALL") {
      return sch.media?.genres?.includes(selectedGenre);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-red-500" />
            Календарь релизов аниме
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Расписание выхода новых серий на неделю с автоматическим пересчетом под ваше местное время
          </p>
        </div>

        {/* Genre Filter */}
        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl">
          <Filter className="w-4 h-4 text-zinc-400 ml-2" />
          <select 
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-transparent text-xs text-white border-none focus:outline-none cursor-pointer py-1 pr-2"
          >
            <option value="ALL" className="bg-zinc-900 text-white">Все жанры</option>
            {Array.from(allGenresSet).map((g) => (
              <option key={g} value={g} className="bg-zinc-900 text-white">
                {getRussianGenre(g)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Days Tabs Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-8">
        {DAYS_OF_WEEK.map((day, idx) => {
          const count = (groupedByDay[day] || []).length;
          const isSelected = idx === selectedDayIndex;

          return (
            <button 
              key={day}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border font-bold transition-all duration-200 ${
                isSelected 
                  ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/50 scale-[1.02]" 
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/80"
              }`}
            >
              <span className="text-xs font-semibold">{day}</span>
              <span className={`text-[11px] mt-1 px-2 py-0.5 rounded-full font-bold ${
                isSelected ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
              }`}>
                {count} {count === 1 ? "релиз" : count > 1 && count < 5 ? "релиза" : "релизов"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Content */}
      {activeSchedules.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-400 my-8">
          <Clock className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
          <h3 className="text-base font-semibold text-zinc-300">На выбранный день релизов не найдено</h3>
          <p className="text-xs text-zinc-500 mt-1">Попробуйте выбрать другой день недели или сбросить фильтр по жанрам.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeSchedules.map((schedule) => {
            const media = schedule.media;
            if (!media) return null;

            const title = getPrimaryTitle(media.title);
            const cover = media.coverImage?.extraLarge || media.coverImage?.large;

            return (
              <div 
                key={schedule.id}
                onClick={() => onSelectMedia(media)}
                className="flex p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90 hover:border-red-500/50 transition-all duration-300 cursor-pointer group shadow-lg"
              >
                {/* Poster */}
                <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
                  {cover ? (
                    <img 
                      src={cover} 
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                      <Tv className="w-8 h-8" />
                    </div>
                  )}
                  {media.averageScore && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-zinc-950 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {(media.averageScore / 10).toFixed(1)}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="ml-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <span>{getRussianFormat(media.format)}</span>
                      <span className="text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/50">
                        {schedule.episode} серия
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white line-clamp-2 mt-1.5 group-hover:text-red-400 transition-colors">
                      {title}
                    </h3>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {media.genres?.slice(0, 3).map((g) => (
                        <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {getRussianGenre(g)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Airing Time & Countdown */}
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {formatAiringTime(schedule.airingAt)}
                    </span>
                    <span className="text-red-400 font-bold">
                      {formatTimeUntilAiring(schedule.timeUntilAiring)}
                    </span>
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
